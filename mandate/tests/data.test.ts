import { describe, expect, it } from 'vitest'
import type { Ge2024Party } from '../src/data/types.ts'
import { CENSUS, GE2024, UK_SEATS } from '../src/data/uk.ts'
import { BLOCS, COUNTRIES } from '../src/data/world.ts'
import { WORLD_MAP } from '../src/data/worldMap.ts'
import { WORLD_110M } from '../src/data/worldTopology.ts'

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

  it('has full results for all 650 seats (Northern Ireland transcribed by hand)', () => {
    for (const r of results) {
      if (r.source === 'manual') expect(r.id.startsWith('N'), r.id).toBe(true)
      expect(r).toMatchObject({ verified: true })
      expect(r.votes, r.id).not.toBeNull()
      expect(r.mp, r.id).not.toBeNull()
      expect(r.majority, r.id).not.toBeNull()
    }
  })

  it('matches the published Northern Ireland party totals', () => {
    const total = (p: Ge2024Party) =>
      results.filter((r) => r.id.startsWith('N')).reduce((a, r) => a + (r.votes?.[p] ?? 0), 0)
    expect(total('sf')).toBe(210891)
    expect(total('dup')).toBe(172058)
    expect(total('alliance')).toBe(117191)
    expect(total('uup')).toBe(94779)
    expect(total('sdlp')).toBe(86861)
    expect(total('tuv')).toBe(48685)
  })
})

describe('GE2024 party colours', () => {
  it('gives every party a distinct #rrggbb colour', () => {
    const parties = Object.keys(GE2024.parties)
    expect(Object.keys(GE2024.colours)).toEqual(parties)
    for (const c of Object.values(GE2024.colours)) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    expect(new Set(Object.values(GE2024.colours)).size).toBe(parties.length)
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

  it('has a density for every GB seat (Scotland worked out from boundary areas)', () => {
    for (const seat of CENSUS.seats) {
      if (seat.id.startsWith('N')) continue
      expect(seat.density, seat.id).toBeGreaterThan(0)
    }
  })
})

describe('World', () => {
  const byId = new Map(COUNTRIES.map((c) => [c.id, c]))

  it('names 176 countries (Antarctica dropped) with unique ids and names', () => {
    expect(COUNTRIES).toHaveLength(176)
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(176)
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(176)
    expect(byId.get('826')?.name).toBe('United Kingdom')
    expect(byId.has('010')).toBe(false)
    expect(COUNTRIES.some((c) => c.name.includes('.'))).toBe(false)
  })

  it('matches the TopoJSON geometries and the map shapes', () => {
    const geometries = WORLD_110M.objects.countries.geometries
    const ids = COUNTRIES.map((c) => c.id).sort()
    expect(geometries.map((g) => g.id).sort()).toEqual(ids)
    expect(Object.keys(WORLD_110M.objects)).toEqual(['countries'])
    expect(WORLD_MAP.shapes.map((s) => s.id)).toEqual(ids)
  })

  it('gives every country a region, sub-region and capital', () => {
    for (const c of COUNTRIES) {
      expect(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'], c.name).toContain(c.region)
      expect(c.subregion, c.name).not.toBe('')
      expect(c.capital, c.name).not.toBe('')
    }
    expect(byId.get('826')).toMatchObject({
      iso3: 'GBR',
      region: 'Europe',
      subregion: 'Northern Europe',
      capital: 'London',
      status: 'state',
      neighbours: ['372'],
    })
    expect(byId.get('XKX')).toMatchObject({ region: 'Europe', status: 'limited', iso3: null })
    expect(byId.get('398')?.capital).toBe('Astana')
  })

  it('links territories to their states', () => {
    const territories = COUNTRIES.filter((c) => c.status === 'territory')
    expect(territories.map((c) => c.name).sort()).toEqual([
      'Falkland Islands',
      'French Southern and Antarctic Lands',
      'Greenland',
      'New Caledonia',
      'Puerto Rico',
    ])
    for (const t of territories) expect(byId.get(t.sovereign!)?.status).toBe('state')
    expect(byId.get('238')).toMatchObject({
      sovereign: '826',
      statusText: 'British Overseas Territory',
    })
    for (const c of COUNTRIES) expect(Boolean(c.statusText)).toBe(c.status !== 'state')
  })

  it('lists symmetric land borders', () => {
    for (const c of COUNTRIES) {
      for (const n of c.neighbours) expect(byId.get(n)?.neighbours, `${c.id}-${n}`).toContain(c.id)
    }
    expect(byId.get('250')?.neighbours).toEqual(expect.arrayContaining(['724', '076', '740']))
  })

  it('never gives neighbours the same political colour', () => {
    const colour = new Map(WORLD_MAP.shapes.map((s) => [s.id, s.colour]))
    for (const c of COUNTRIES) {
      for (const n of c.neighbours) expect(colour.get(n), `${c.id}-${n}`).not.toBe(colour.get(c.id))
      if (c.sovereign) expect(colour.get(c.id)).toBe(colour.get(c.sovereign))
    }
  })

  it('projects shapes inside the map with labels in their focus box', () => {
    const { width, height } = WORLD_MAP
    expect(width).toBe(1000)
    for (const s of WORLD_MAP.shapes) {
      const [x0, y0, x1, y1] = s.focus
      expect(s.d.startsWith('M'), s.id).toBe(true)
      expect(x0).toBeGreaterThanOrEqual(0)
      expect(y0).toBeGreaterThanOrEqual(0)
      expect(x1).toBeLessThanOrEqual(width)
      expect(y1).toBeLessThanOrEqual(height)
      expect(x1 - x0, s.id).toBeLessThan(width / 2)
    }
    // France's label is in mainland France, not pulled towards French Guiana.
    const france = WORLD_MAP.shapes.find((s) => s.id === '250')!
    const uk = WORLD_MAP.shapes.find((s) => s.id === '826')!
    expect(Math.abs(france.label[0] - uk.label[0])).toBeLessThan(30)
  })

  it('has the checked bloc memberships', () => {
    const size = Object.fromEntries(BLOCS.map((b) => [b.id, b.members.length]))
    expect(size).toEqual({
      nato: 32,
      eu: 27,
      g7: 7,
      g20: 19,
      brics: 10,
      commonwealth: 56,
      fiveEyes: 5,
      p5: 5,
    })
    const uk = byId.get('826')!
    expect(uk.blocs).toEqual(['nato', 'g7', 'g20', 'commonwealth', 'fiveEyes', 'p5'])
    expect(byId.get('682')?.blocs).not.toContain('brics') // Saudi Arabia: invited, not confirmed
    for (const b of BLOCS) {
      const onMap = b.members.filter((id) => byId.has(id))
      expect(onMap.length + b.offMap.length, b.id).toBe(b.members.length)
      for (const id of onMap) expect(byId.get(id)!.blocs).toContain(b.id)
    }
    expect(BLOCS.find((b) => b.id === 'eu')?.offMap).toEqual(['Malta'])
  })
})
