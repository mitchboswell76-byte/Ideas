/**
 * Drives the Engine in real time: speeds, pause/auto-pause, stepping, requests (new game, save,
 * load, queries). Environment-agnostic — the host supplies messaging and timers — so the same code
 * runs in the Web Worker, on the main thread (fallback) and in tests with a manual clock.
 */
import { toIso } from '../sim/clock.ts'
import { Engine, type TickSummary } from '../sim/engine.ts'
import { decodeSave, encodeSave } from '../sim/save.ts'
import type { Notification, PauseReason, System } from '../sim/scheduler.ts'
import { defaultSystems } from '../sim/systems/index.ts'
import { createWorld, type World } from '../sim/world.ts'
import {
  DEFAULT_AUTO_PAUSE,
  MAX_STEP_DAYS,
  TICK_MS,
  isSpeed,
  type AutoPauseSettings,
  type FromRunner,
  type GameDate,
  type Request,
  type RunSpeed,
  type Speed,
  type ToRunner,
} from './protocol.ts'
import { runQuery } from './queries.ts'

export interface RunnerHost {
  post(msg: FromRunner, transfer: Transferable[]): void
  /** Milliseconds, monotonic. */
  now(): number
  setTimer(fn: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
  /** How long a batch of `step` ticks may run before yielding to the event loop (ms). */
  sliceBudgetMs: number
}

/** Host backed by the global timers (worker or main thread). */
export function timerHost(post: RunnerHost['post'], sliceBudgetMs: number): RunnerHost {
  return {
    post,
    now: () => performance.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    sliceBudgetMs,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class SimRunner {
  private readonly host: RunnerHost
  private readonly systems: readonly System[]
  private engine: Engine | null = null
  private speed: Speed = 0
  private resumeSpeed: RunSpeed = 1
  private pausedBy: PauseReason | null = null
  private autoPause: AutoPauseSettings = { ...DEFAULT_AUTO_PAUSE }
  private timer: unknown = null
  /** Host time the next tick is due, while running. */
  private due = 0
  /** Days left in the current `step`. */
  private stepLeft = 0

  constructor(host: RunnerHost, systems: readonly System[] = defaultSystems) {
    this.host = host
    this.systems = systems
  }

  handle(msg: ToRunner): void {
    switch (msg.type) {
      case 'cmd':
        this.engine?.enqueue(msg.cmd)
        break
      case 'speed':
        if (isSpeed(msg.speed)) this.setSpeed(msg.speed)
        break
      case 'togglePause':
        this.setSpeed(this.speed === 0 ? this.resumeSpeed : 0)
        break
      case 'step':
        this.step(msg.days)
        break
      case 'autoPause':
        this.autoPause = { ...DEFAULT_AUTO_PAUSE, ...msg.settings }
        break
      case 'request':
        void this.request(msg.id, msg.req)
        break
    }
  }

  /** Stop all timers (the bridge is shutting down). */
  dispose(): void {
    this.cancel()
    this.speed = 0
  }

  private setSpeed(speed: Speed): void {
    this.cancel()
    this.speed = this.engine ? speed : 0
    if (this.speed > 0) {
      this.resumeSpeed = this.speed as RunSpeed
      this.pausedBy = null
      this.due = this.host.now() + TICK_MS[this.resumeSpeed]
      this.arm()
    }
    this.postStatus()
  }

  private arm(): void {
    this.timer = this.host.setTimer(this.loop, Math.max(0, this.due - this.host.now()))
  }

  private readonly loop = (): void => {
    this.timer = null
    if (this.speed === 0) return
    const summary = this.tick()
    if (!summary) return
    this.host.post({ type: 'tick', summary }, [])
    if (this.checkAutoPause(summary.notifications)) return
    // Drift-corrected; when behind (throttled tab, slow tick) run the next tick at once but never
    // build up a backlog.
    this.due = Math.max(this.due + TICK_MS[this.speed as RunSpeed], this.host.now())
    this.arm()
  }

  private step(days: number): void {
    if (!this.engine || this.speed !== 0 || !Number.isInteger(days) || days < 1) return
    const idle = this.stepLeft === 0
    this.stepLeft = Math.min(this.stepLeft + days, MAX_STEP_DAYS)
    if (!idle) return
    if (this.pausedBy) {
      this.pausedBy = null
      this.postStatus()
    }
    this.slice()
  }

  /** Run step ticks until the slice budget is spent, then yield and continue. */
  private readonly slice = (): void => {
    this.timer = null
    const start = this.host.now()
    const notifications: Notification[] = []
    let last: TickSummary | null = null
    let failed = false
    while (this.stepLeft > 0) {
      const summary = this.tick()
      if (!summary) {
        failed = true
        break
      }
      last = summary
      this.stepLeft--
      notifications.push(...summary.notifications)
      if (this.pauseReason(summary.notifications)) break
      if (this.host.now() - start >= this.host.sliceBudgetMs) break
    }
    if (last) this.host.post({ type: 'tick', summary: { ...last, notifications } }, [])
    if (failed || this.checkAutoPause(notifications)) return
    if (this.stepLeft > 0) this.timer = this.host.setTimer(this.slice, 0)
  }

  private tick(): TickSummary | null {
    try {
      return this.engine ? this.engine.tick() : null
    } catch (error) {
      this.cancel()
      this.speed = 0
      this.postStatus()
      this.host.post({ type: 'fatal', message: errorMessage(error) }, [])
      return null
    }
  }

  private pauseReason(notifications: readonly Notification[]): PauseReason | null {
    for (const n of notifications) if (n.pause && this.autoPause[n.pause]) return n.pause
    return null
  }

  private checkAutoPause(notifications: readonly Notification[]): boolean {
    const reason = this.pauseReason(notifications)
    if (!reason) return false
    this.cancel()
    this.speed = 0
    this.pausedBy = reason
    this.postStatus()
    return true
  }

  private cancel(): void {
    if (this.timer !== null) this.host.clearTimer(this.timer)
    this.timer = null
    this.stepLeft = 0
  }

  private postStatus(): void {
    const { speed, resumeSpeed, pausedBy } = this
    this.host.post({ type: 'status', speed, resumeSpeed, pausedBy }, [])
  }

  private async request(id: number, req: Request): Promise<void> {
    try {
      const [data, transfer] = await this.fulfil(req)
      this.host.post({ type: 'result', id, ok: true, data }, transfer)
    } catch (error) {
      this.host.post({ type: 'result', id, ok: false, error: errorMessage(error) }, [])
    }
  }

  private async fulfil(req: Request): Promise<[unknown, Transferable[]]> {
    switch (req.type) {
      case 'newGame':
        return [this.start(createWorld(req.options)), []]
      case 'load':
        return [this.start((await decodeSave(req.bytes)).world), []]
      case 'save': {
        const engine = this.requireEngine()
        const day = engine.world.clock.day
        // encodeSave serialises before its first await, so later ticks can't leak into the save.
        const bytes = await encodeSave(engine.world, req.savedAt)
        return [{ day, date: toIso(day), bytes }, [bytes.buffer]]
      }
      case 'query':
        return [runQuery(this.requireEngine().world, req.what, req.args), []]
    }
  }

  private requireEngine(): Engine {
    if (!this.engine) throw new Error('No game is running')
    return this.engine
  }

  /** Replace the running game; the clock stops until the player starts it. */
  private start(world: World): GameDate {
    this.cancel()
    this.engine = new Engine(world, this.systems)
    this.speed = 0
    this.pausedBy = null
    this.postStatus()
    const day = world.clock.day
    const date = toIso(day)
    this.host.post({ type: 'tick', summary: { day, date, notifications: [] } }, [])
    return { day, date }
  }
}
