import { describe, expect, it, vi } from 'vitest'
import type { FromRunner, Request } from '../src/runtime/protocol.ts'
import { SimRunner } from '../src/runtime/runner.ts'
import { toIso } from '../src/sim/clock.ts'
import { defineCommand, type Command } from '../src/sim/command.ts'
import { hashJson } from '../src/sim/hash.ts'
import type { PauseReason, System } from '../src/sim/scheduler.ts'
import type { World } from '../src/sim/world.ts'
import { ManualHost } from './helpers/manualHost.ts'

interface SetFlag extends Command {
  type: 'setFlag'
  key: string
  value: number
}

/** Random walk plus a command, so worlds diverge unless runs are identical. */
const walker: System = {
  id: 'walker',
  cadence: 'daily',
  run(world, ctx) {
    world.flags.walk = Number(world.flags.walk ?? 0) + ctx.rng.int(-1, 1)
  },
  commands: {
    setFlag: defineCommand<SetFlag>((cmd, world) => {
      world.flags[cmd.key] = cmd.value
    }),
  },
}

/** Emits a pausing notification every `every` days. */
function pauser(reason: PauseReason, every: number): System {
  return {
    id: `pauser-${reason}`,
    cadence: 'daily',
    run(world, ctx) {
      const n = Number(world.flags.pauserDays ?? 0) + 1
      world.flags.pauserDays = n
      if (n % every === 0) ctx.emit({ kind: 'alert', text: `${reason} ${n}`, pause: reason })
    },
  }
}

let requestId = 0

async function request(runner: SimRunner, host: ManualHost, req: Request): Promise<FromRunner> {
  const id = ++requestId
  runner.handle({ type: 'request', id, req })
  return vi.waitFor(() => {
    const result = host.of('result').find((m) => m.id === id)
    if (!result) throw new Error('waiting')
    return result
  })
}

async function started(systems: readonly System[] = [walker]) {
  const host = new ManualHost()
  const runner = new SimRunner(host, systems)
  const result = await request(runner, host, { type: 'newGame', options: { seed: 'runner' } })
  expect(result).toMatchObject({ ok: true, data: { date: '2026-10-01' } })
  host.clear()
  return { host, runner }
}

function lastDate(host: ManualHost): string | undefined {
  return host.of('tick').at(-1)?.summary.date
}

async function worldOf(runner: SimRunner, host: ManualHost): Promise<World> {
  const result = await request(runner, host, { type: 'query', what: 'world', args: undefined })
  if (result.type !== 'result' || !result.ok) throw new Error('query failed')
  return result.data as World
}

describe('SimRunner', () => {
  it('starts a new game paused and reports its date', async () => {
    const host = new ManualHost()
    const runner = new SimRunner(host, [walker])
    await request(runner, host, {
      type: 'newGame',
      options: { seed: 'x', startDate: '2030-05-01' },
    })
    expect(host.lastStatus()).toMatchObject({ speed: 0, pausedBy: null })
    expect(lastDate(host)).toBe('2030-05-01')
    host.advance(10_000)
    expect(host.of('tick')).toHaveLength(1)
  })

  it('ticks at the interval for each speed', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'speed', speed: 1 })
    expect(host.lastStatus()).toMatchObject({ speed: 1, resumeSpeed: 1 })
    host.advance(999)
    expect(host.of('tick')).toHaveLength(0)
    host.advance(1)
    expect(lastDate(host)).toBe('2026-10-02')
    host.advance(2000)
    expect(host.of('tick')).toHaveLength(3)

    host.clear()
    runner.handle({ type: 'speed', speed: 4 })
    host.advance(800)
    expect(host.of('tick')).toHaveLength(10)

    host.clear()
    runner.handle({ type: 'speed', speed: 5 })
    host.advance(160)
    expect(host.of('tick')).toHaveLength(10)
  })

  it('pauses, and toggles back to the previous speed', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'speed', speed: 3 })
    host.advance(600)
    runner.handle({ type: 'togglePause' })
    expect(host.lastStatus()).toMatchObject({ speed: 0, resumeSpeed: 3 })
    expect(host.pendingTimers).toBe(0)
    host.advance(5000)
    expect(host.of('tick')).toHaveLength(3)
    runner.handle({ type: 'togglePause' })
    expect(host.lastStatus()).toMatchObject({ speed: 3 })
    host.advance(200)
    expect(host.of('tick')).toHaveLength(4)
  })

  it('catches up at most one tick after the host was starved', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'speed', speed: 4 })
    host.time += 10_000 // e.g. a throttled background tab: the timer fires very late
    host.advance(0)
    // The late tick plus one immediate catch-up, then back on the 80 ms beat.
    expect(host.of('tick')).toHaveLength(2)
    host.advance(79)
    expect(host.of('tick')).toHaveLength(2)
    host.advance(1)
    expect(host.of('tick')).toHaveLength(3)
  })

  it('ignores speed changes and steps with no game', () => {
    const host = new ManualHost()
    const runner = new SimRunner(host, [walker])
    runner.handle({ type: 'speed', speed: 3 })
    runner.handle({ type: 'step', days: 5 })
    expect(host.lastStatus()).toMatchObject({ speed: 0 })
    expect(host.pendingTimers).toBe(0)
  })

  it('applies commands on the next tick', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'cmd', cmd: { type: 'setFlag', key: 'x', value: 7 } as SetFlag })
    expect((await worldOf(runner, host)).flags.x).toBeUndefined()
    runner.handle({ type: 'step', days: 1 })
    expect((await worldOf(runner, host)).flags.x).toBe(7)
  })

  it('steps while paused, in time slices with one summary per slice', async () => {
    let host!: ManualHost
    const slow: System = {
      id: 'slow',
      cadence: 'daily',
      run: () => void (host.time += 3), // each tick "takes" 3 ms; budget is 8 ms
    }
    const setup = await started([slow])
    host = setup.host
    const { runner } = setup
    runner.handle({ type: 'step', days: 10 })
    // First slice runs synchronously: 3 ticks (9 ms ≥ 8 ms), then yields.
    expect(host.of('tick')).toHaveLength(1)
    expect(lastDate(host)).toBe('2026-10-04')
    host.advance(0)
    expect(lastDate(host)).toBe('2026-10-11')
    expect(host.of('tick')).toHaveLength(4)
    expect(host.pendingTimers).toBe(0)
  })

  it('ignores step while running', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'speed', speed: 1 })
    runner.handle({ type: 'step', days: 30 })
    expect(host.of('tick')).toHaveLength(0)
  })

  it('auto-pauses on enabled reasons only', async () => {
    const { host, runner } = await started([pauser('election', 3), pauser('choice', 5)])
    runner.handle({
      type: 'autoPause',
      settings: { election: false, choice: true, investigation: true, activityDone: true },
    })
    runner.handle({ type: 'speed', speed: 4 })
    host.advance(80 * 10)
    // Elections on days 3 don't pause; the choice on day 5 does.
    expect(host.of('tick')).toHaveLength(5)
    expect(host.lastStatus()).toMatchObject({ speed: 0, resumeSpeed: 4, pausedBy: 'choice' })
    expect(host.pendingTimers).toBe(0)

    runner.handle({ type: 'togglePause' })
    expect(host.lastStatus()).toMatchObject({ speed: 4, pausedBy: null })
  })

  it('stops a step early on auto-pause', async () => {
    const { host, runner } = await started([pauser('investigation', 4)])
    runner.handle({ type: 'step', days: 30 })
    host.advance(0)
    expect(lastDate(host)).toBe('2026-10-05')
    expect(host.lastStatus()).toMatchObject({ speed: 0, pausedBy: 'investigation' })
    expect(host.pendingTimers).toBe(0)
    const notes = host.of('tick').flatMap((t) => t.summary.notifications)
    expect(notes).toEqual([{ kind: 'alert', text: 'investigation 4', pause: 'investigation' }])
  })

  it('saves and loads: the loaded game continues exactly like the original', async () => {
    const straight = await started()
    straight.runner.handle({ type: 'step', days: 200 })
    straight.host.advance(0)

    const { host, runner } = await started()
    runner.handle({ type: 'step', days: 80 })
    const saved = await request(runner, host, { type: 'save', savedAt: '2026-10-05T12:00:00.000Z' })
    if (saved.type !== 'result' || !saved.ok) throw new Error('save failed')
    const data = saved.data as { bytes: Uint8Array<ArrayBuffer>; date: string }
    expect(data.date).toBe(toIso(host.of('tick').at(-1)!.summary.day))

    runner.handle({ type: 'step', days: 500 }) // wander off, then load
    const loaded = await request(runner, host, { type: 'load', bytes: data.bytes })
    expect(loaded).toMatchObject({ ok: true, data: { date: data.date } })
    expect(host.lastStatus()).toMatchObject({ speed: 0 })
    runner.handle({ type: 'step', days: 120 })
    host.advance(0)

    const a = await worldOf(straight.runner, straight.host)
    const b = await worldOf(runner, host)
    expect(hashJson(b)).toBe(hashJson(a))
  })

  it('rejects bad save bytes and keeps the current game', async () => {
    const { host, runner } = await started()
    runner.handle({ type: 'step', days: 3 })
    const before = hashJson(await worldOf(runner, host))
    const bad = new Uint8Array([1, 2, 3])
    expect(await request(runner, host, { type: 'load', bytes: bad })).toMatchObject({
      ok: false,
      error: 'Not a valid .mandate save file',
    })
    expect(hashJson(await worldOf(runner, host))).toBe(before)
  })

  it('answers queries and reports unknown ones', async () => {
    const { host, runner } = await started()
    expect(
      await request(runner, host, { type: 'query', what: 'clock', args: undefined }),
    ).toMatchObject({
      ok: true,
      data: { day: expect.any(Number) },
    })
    expect(
      await request(runner, host, {
        type: 'query',
        what: 'entity',
        args: { table: 'parties', id: 'pty_x' },
      }),
    ).toMatchObject({ ok: true, data: null })
    const bogus = { type: 'query', what: 'nope', args: undefined } as unknown as Request
    expect(await request(runner, host, bogus)).toMatchObject({
      ok: false,
      error: 'Unknown query: nope',
    })
  })

  it('refuses to save with no game', async () => {
    const host = new ManualHost()
    const runner = new SimRunner(host, [walker])
    expect(await request(runner, host, { type: 'save', savedAt: 'x' })).toMatchObject({
      ok: false,
      error: 'No game is running',
    })
  })

  it('pauses and reports when the simulation throws', async () => {
    const broken: System = {
      id: 'broken',
      cadence: 'daily',
      run(world) {
        if (world.clock.day - world.clock.startDay === 3) throw new Error('boom')
      },
    }
    const { host, runner } = await started([broken])
    runner.handle({ type: 'speed', speed: 5 })
    host.advance(1000)
    expect(host.of('fatal')).toEqual([{ type: 'fatal', message: 'boom' }])
    expect(host.lastStatus()).toMatchObject({ speed: 0 })
    expect(host.pendingTimers).toBe(0)
  })
})
