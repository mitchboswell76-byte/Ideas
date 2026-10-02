import { describe, expect, it } from 'vitest'
import { Rng, seedState, type RngState } from '../src/sim/rng.ts'

const draws = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.nextU32())

describe('sfc32 rng', () => {
  it('matches the reference sfc32 output', () => {
    expect(draws(new Rng([1, 2, 3, 4]), 4)).toEqual([7, 34, 56623200, 188882296])
  })

  it('pins seeding so saves and replays stay stable', () => {
    expect(seedState('mandate')).toEqual([3933142559, 2502865601, 3831312067, 948075427])
  })

  it('is deterministic per seed and differs across seeds', () => {
    expect(draws(new Rng(seedState('a')), 20)).toEqual(draws(new Rng(seedState('a')), 20))
    expect(draws(new Rng(seedState('a')), 20)).not.toEqual(draws(new Rng(seedState('b')), 20))
    expect(seedState(42)).toEqual(seedState('42'))
  })

  it('keeps its state in the shared array, so a copy resumes the sequence', () => {
    const state = seedState('resume')
    const rng = new Rng(state)
    draws(rng, 10)
    const snapshot = [...state] as RngState
    expect(draws(new Rng(snapshot), 10)).toEqual(draws(rng, 10))
    expect(state.every((n) => Number.isInteger(n) && n >= 0 && n < 2 ** 32)).toBe(true)
  })

  it('int covers the inclusive range and nothing outside it', () => {
    const rng = new Rng(seedState('int'))
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) seen.add(rng.int(-2, 3))
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2, 3])
    expect(() => rng.int(3, 2)).toThrow(RangeError)
  })

  it('next stays in [0, 1) with a plausible mean', () => {
    const rng = new Rng(seedState('mean'))
    let sum = 0
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
      sum += x
    }
    expect(sum / 10_000).toBeCloseTo(0.5, 1)
  })

  it('pick, weighted, shuffle and normal behave', () => {
    const rng = new Rng(seedState('helpers'))
    expect(['x', 'y']).toContain(rng.pick(['x', 'y']))
    expect(() => rng.pick([])).toThrow(RangeError)

    const counts = { a: 0, b: 0, never: 0 }
    const weights = { a: 1, b: 3, never: 0 }
    const keys = ['a', 'b', 'never'] as const
    for (let i = 0; i < 8000; i++) counts[rng.weighted(keys, (k) => weights[k])]++
    expect(counts.never).toBe(0)
    expect(counts.b / counts.a).toBeGreaterThan(2.5)
    expect(counts.b / counts.a).toBeLessThan(3.5)
    expect(() => rng.weighted(keys, () => 0)).toThrow(RangeError)

    const items = Array.from({ length: 20 }, (_, i) => i)
    const shuffled = rng.shuffle([...items])
    expect(shuffled).not.toEqual(items)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items)

    let total = 0
    for (let i = 0; i < 5000; i++) total += rng.normal(10, 2)
    expect(total / 5000).toBeCloseTo(10, 0)
  })
})
