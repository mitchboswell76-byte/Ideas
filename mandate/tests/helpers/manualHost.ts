import type { FromRunner } from '../../src/runtime/protocol.ts'
import type { RunnerHost } from '../../src/runtime/runner.ts'

interface Timer {
  id: number
  at: number
  fn: () => void
}

/** A runner host with a hand-cranked clock; messages are collected, not delivered. */
export class ManualHost implements RunnerHost {
  time = 0
  sliceBudgetMs = 8
  readonly messages: FromRunner[] = []
  private timers: Timer[] = []
  private nextId = 1

  post = (msg: FromRunner): void => {
    this.messages.push(msg)
  }
  now = (): number => this.time
  setTimer = (fn: () => void, ms: number): number => {
    const id = this.nextId++
    this.timers.push({ id, at: this.time + ms, fn })
    return id
  }
  clearTimer = (handle: unknown): void => {
    this.timers = this.timers.filter((t) => t.id !== handle)
  }

  get pendingTimers(): number {
    return this.timers.length
  }

  /**
   * Move the clock forward, firing due timers in time order (including ones they schedule).
   * Work done by a timer may push the clock past the target; time never goes backwards.
   */
  advance(ms: number): void {
    const end = this.time + ms
    for (;;) {
      const next = this.timers
        .filter((t) => t.at <= Math.max(end, this.time))
        .sort((a, b) => a.at - b.at || a.id - b.id)[0]
      if (!next) break
      this.timers = this.timers.filter((t) => t !== next)
      this.time = Math.max(this.time, next.at)
      next.fn()
    }
    this.time = Math.max(this.time, end)
  }

  of<T extends FromRunner['type']>(type: T): Extract<FromRunner, { type: T }>[] {
    return this.messages.filter((m): m is Extract<FromRunner, { type: T }> => m.type === type)
  }

  lastStatus(): Extract<FromRunner, { type: 'status' }> | undefined {
    return this.of('status').at(-1)
  }

  clear(): void {
    this.messages.length = 0
  }
}
