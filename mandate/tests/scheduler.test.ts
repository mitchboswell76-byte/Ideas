import { describe, expect, it } from 'vitest'
import { MONDAY, civil, dayFromIso, weekday } from '../src/sim/clock.ts'
import { Engine } from '../src/sim/engine.ts'
import type { Cadence, System } from '../src/sim/scheduler.ts'
import { createWorld } from '../src/sim/world.ts'

describe('scheduler', () => {
  it('runs each cadence on the right days over a year', () => {
    const runs: Record<Cadence, number[]> = { daily: [], weekly: [], monthly: [], yearly: [] }
    const systems: System[] = (Object.keys(runs) as Cadence[]).map((cadence) => ({
      id: cadence,
      cadence,
      run: (_world, ctx) => void runs[cadence].push(ctx.day),
    }))
    // Start on 31 Dec so the first tick simulates 1 Jan 2027.
    const engine = new Engine(createWorld({ seed: 1, startDate: '2026-12-31' }), systems)
    engine.runDays(365)

    expect(runs.daily).toHaveLength(365)
    expect(runs.weekly).toHaveLength(52)
    expect(runs.weekly.every((d) => weekday(d) === MONDAY)).toBe(true)
    expect(runs.monthly.map((d) => civil(d).d)).toEqual(Array(12).fill(1))
    expect(runs.yearly).toEqual([dayFromIso('2027-01-01')])
  })

  it('runs due systems in registration order, after bus period events', () => {
    const order: string[] = []
    const make = (id: string, cadence: Cadence): System => ({
      id,
      cadence,
      run: () => void order.push(id),
    })
    const listener: System = {
      id: 'listener',
      on: {
        dayStarted: () => void order.push('dayStarted'),
        monthStarted: () => void order.push('monthStarted'),
      },
    }
    const systems = [make('b', 'monthly'), make('a', 'daily'), listener, make('c', 'daily')]
    const engine = new Engine(createWorld({ seed: 1, startDate: '2026-12-31' }), systems)
    engine.tick()
    expect(order).toEqual(['dayStarted', 'monthStarted', 'b', 'a', 'c'])
  })

  it('rejects misconfigured systems', () => {
    const world = createWorld({ seed: 1 })
    const run = () => {}
    expect(() => new Engine(world, [{ id: 'x' }, { id: 'x' }])).toThrow(/Duplicate/)
    expect(() => new Engine(world, [{ id: 'x', cadence: 'daily' }])).toThrow(/cadence and run/)
    expect(() => new Engine(world, [{ id: 'x', run }])).toThrow(/cadence and run/)
  })
})
