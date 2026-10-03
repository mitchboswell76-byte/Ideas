import { describe, expect, it } from 'vitest'
import { emptyCensus, withDensity } from '../scripts/data/census.ts'

describe('withDensity', () => {
  it('fills a missing density from the boundary area and keeps published ones', () => {
    const scot = { ...emptyCensus('S1'), population: 50_000 }
    const eng = { ...emptyCensus('E1'), population: 80_000, density: 20.6 }
    const ni = emptyCensus('N1')
    const out = withDensity(
      [scot, eng, ni],
      new Map([
        ['S1', 4000],
        ['E1', 1],
        ['N1', 5000],
      ]),
    )
    expect(out.map((s) => s.density)).toEqual([12.5, 20.6, null])
  })

  it('fails loudly when a seat that needs a density has no area', () => {
    expect(() => withDensity([{ ...emptyCensus('S1'), population: 1 }], new Map())).toThrow(
      /no boundary area/,
    )
  })
})
