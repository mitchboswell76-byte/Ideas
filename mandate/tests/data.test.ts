import { describe, expect, it } from 'vitest'
import type { Ge2024Party } from '../src/data/types.ts'
import { CENSUS, GE2024, UK_SEATS } from '../src/data/uk.ts'
import { COUNTRIES, WORLD_110M } from '../src/data/world.ts'

/** Published GE2024 result (House of Commons Library, CBP-10009). */
const SEAT_TOTALS: Partial<Record<Ge2024Party, number>> = {
  lab: 411,
  con: 121,
  ld: 72,
  snp: 9,
  sf: 7,
  ind: 6,
  reform: 5,
  dup: 5,
  green: 4,
  pc: 4,
  sdlp: 2,
  alliance: 1,
  uup: 1,
  tuv: 1,
  speaker: 1,
}

const count = <T extends string>(values: T[]) => {
  const out: Partial<Record<T, number>> = {}
  for (const v of values) out[v] = (out[v] ?? 0) + 1
  return out
}

describe('UK seats', () => {
  const { seats, regions } = UK_SEATS

  it('has 650 seats with unique ids and hex cells', () => {
    expect(seats).toHaveLength(650)
    expect(new Set(seats.map((s) => s.id)).size).toBe(650)
    expect(new Set(seats.map((s) => `${s.q},${s.r}`)).size).toBe(650)
    expect(count(seats.map((s) => s.nation))).toEqual({
      england: 543,
      scotland: 57,
      wales: 32,
      'northern-ireland': 18,
    })
  })

  it('puts every seat in a named region of its own nation', () => {
    expect(regions).toHaveLength(12)
    const byId = new Map(regions.map((r) => [r.id, r]))
    for (const seat of seats) expect(byId.get(seat.region)?.nation).toBe(seat.nation)
  })

  it('keeps Welsh spellings', () => {
    expect(seats.find((s) => s.id === 'W07000112')?.name).toBe('Ynys Môn')
  })
})

describe('GE2024 results', () => {
  const { results } = GE2024

  it('lines up with the seats', () => {
    expect(results.map((r) => r.id)).toEqual(UK_SEATS.seats.map((s) => s.id))
  })

  it('reproduces the published seat totals', () => {
    expect(count(results.map((r) => r.winner))).toEqual(SEAT_TOTALS)
  })

  it('has consistent votes wherever votes are known', () => {
    for (const r of results) {
      if (!r.votes) continue
      const votes = r.votes
      const total = Object.values(votes).reduce((a, b) => a + b, 0)
      expect(total, r.id).toBe(r.valid)
      const named = (Object.keys(votes) as Ge2024Party[]).filter((p) => p !== 'other')
      const w = votes[r.winner]!
      for (const p of named) expect(w, `${r.id} ${p}`).toBeGreaterThanOrEqual(votes[p]!)
      if (r.second && r.second !== 'other') expect(w - votes[r.second]!, r.id).toBe(r.majority)
      expect(r.electorate!, r.id).toBeGreaterThan(r.valid!)
    }
  })

  it('has votes for all of GB; only hand-entered Northern Ireland winners lack them', () => {
    for (const r of results) {
      if (r.source === 'manual') {
        expect(r.id.startsWith('N'), r.id).toBe(true)
        expect(r).toMatchObject({ verified: false, votes: null })
      } else {
        expect(r).toMatchObject({ verified: true })
        expect(r.votes, r.id).not.toBeNull()
        expect(r.mp, r.id).not.toBeNull()
      }
    }
  })
})

describe('Census', () => {
  it('has one row per seat with percentages in range', () => {
    expect(CENSUS.seats.map((s) => s.id)).toEqual(UK_SEATS.seats.map((s) => s.id))
    for (const seat of CENSUS.seats) {
      for (const [field, value] of Object.entries(seat)) {
        if (field === 'id' || field === 'population' || field === 'density' || value === null)
          continue
        expect(value, `${seat.id} ${field}`).toBeGreaterThanOrEqual(0)
        expect(value, `${seat.id} ${field}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('covers GB and leaves Northern Ireland empty', () => {
    for (const seat of CENSUS.seats) {
      if (seat.id.startsWith('N')) expect(seat.population).toBeNull()
      // Smallest is Na h-Eileanan an Iar, a protected island seat.
      else expect(seat.population, seat.id).toBeGreaterThan(20_000)
    }
  })
})

describe('World', () => {
  it('names 177 countries with unique ids and names', () => {
    expect(COUNTRIES).toHaveLength(177)
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(177)
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(177)
    expect(COUNTRIES.find((c) => c.id === '826')?.name).toBe('United Kingdom')
    expect(COUNTRIES.some((c) => c.name.includes('.'))).toBe(false)
  })

  it('matches the TopoJSON geometries', () => {
    const geometries = WORLD_110M.objects.countries.geometries
    expect(geometries.map((g) => g.id).sort()).toEqual(COUNTRIES.map((c) => c.id).sort())
    expect(Object.keys(WORLD_110M.objects)).toEqual(['countries'])
  })
})
