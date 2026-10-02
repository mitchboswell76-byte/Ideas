import { describe, expect, it } from 'vitest'
import { defineCommand, type Command } from '../src/sim/command.ts'
import { Engine } from '../src/sim/engine.ts'
import { hashJson } from '../src/sim/hash.ts'
import type { System } from '../src/sim/scheduler.ts'
import { createWorld, newId } from '../src/sim/world.ts'

interface SetFlag extends Command {
  type: 'setFlag'
  key: string
  value: number
}

/** Test system: a random walk in `flags.walk`, plus a command and a notification. */
const walker: System = {
  id: 'walker',
  cadence: 'daily',
  run(world, ctx) {
    const current = Number(world.flags.walk ?? 0)
    world.flags.walk = current + ctx.rng.int(-1, 1)
    if (ctx.rng.chance(0.01)) world.flags[newId(world, 'nws')] = ctx.day
    if (world.flags.walk === 10) ctx.emit({ kind: 'news', text: 'Walk reached 10' })
  },
  commands: {
    setFlag: defineCommand<SetFlag>((cmd, world) => {
      world.flags[cmd.key] = cmd.value
    }),
  },
}

describe('engine', () => {
  it('advances one day per tick and reports the simulated date', () => {
    const engine = new Engine(createWorld({ seed: 's' }))
    expect(engine.tick()).toEqual({
      day: engine.world.clock.day,
      date: '2026-10-02',
      notifications: [],
    })
    expect(engine.runDays(30).date).toBe('2026-11-01')
  })

  it('applies queued commands at the start of the next tick, not before', () => {
    const engine = new Engine(createWorld({ seed: 's' }), [walker])
    const applied: Command[] = []
    engine.bus.on('commandApplied', ({ command }) => applied.push(command))
    const cmd: SetFlag = { type: 'setFlag', key: 'x', value: 7 }
    engine.enqueue(cmd)
    expect(engine.world.flags.x).toBeUndefined()
    engine.tick()
    expect(engine.world.flags.x).toBe(7)
    expect(applied).toEqual([cmd])
  })

  it('turns unknown commands into an alert instead of crashing', () => {
    const engine = new Engine(createWorld({ seed: 's' }))
    engine.enqueue({ type: 'nope' })
    expect(engine.tick().notifications).toEqual([{ kind: 'alert', text: 'Unknown command: nope' }])
  })

  it('rejects two handlers for one command', () => {
    const other: System = { id: 'other', commands: { setFlag: () => {} } }
    expect(() => new Engine(createWorld({ seed: 's' }), [walker, other])).toThrow(/two handlers/)
  })

  it('is deterministic: same seed and commands give the same world', () => {
    const run = (seed: string) => {
      const engine = new Engine(createWorld({ seed }), [walker])
      engine.runDays(400)
      engine.enqueue({ type: 'setFlag', key: 'mid', value: 1 } as SetFlag)
      engine.runDays(700)
      return hashJson(engine.world)
    }
    expect(run('alpha')).toBe(run('alpha'))
    expect(run('alpha')).not.toBe(run('beta'))
  })

  it('surfaces system notifications in the tick summary', () => {
    const shouter: System = {
      id: 'shouter',
      cadence: 'weekly',
      run: (_w, ctx) => ctx.emit({ kind: 'info', text: 'Monday', pause: 'choice' }),
    }
    const engine = new Engine(createWorld({ seed: 's' }), [shouter])
    const summary = engine.runDays(14)
    expect(summary.notifications).toHaveLength(2)
    expect(summary.notifications[0]).toMatchObject({ text: 'Monday', pause: 'choice' })
  })

  it('generates sequential prefixed IDs', () => {
    const world = createWorld({ seed: 's' })
    expect([newId(world, 'chr'), newId(world, 'chr'), newId(world, 'pol')]).toEqual([
      'chr_000001',
      'chr_000002',
      'pol_000001',
    ])
  })
})
