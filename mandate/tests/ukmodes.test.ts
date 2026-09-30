import { describe, expect, it } from 'vitest'
import { CENSUS, GE2024 } from '../src/data/uk.ts'
import type { CensusSeat, Ge2024Party, Ge2024Result } from '../src/data/types.ts'
import { formatCount, formatPercent } from '../src/ui/kit/numbers.ts'
import {
  binOf,
  breaksFor,
  fillOf,
  formatField,
  legendFor,
  MAJORITY_BREAKS,
  majorityShare,
  modeLine,
  NO_DATA,
  quantileBreaks,
  turnoutShare,
  type ModeSpec,
  type SeatData,
} from '../src/ui/map/uk/modes.ts'

const partyName = (p: Ge2024Party) => GE2024.parties[p]

const result = (over: Partial<Ge2024Result> = {}): Ge2024Result => ({
  id: 'E1',
  winner: 'lab',
  second: 'con',
  electorate: 80_000,
  valid: 50_000,
  rejected: 100,
  majority: 2_000,
  votes: { lab: 20_000, con: 18_000, other: 12_000 },
  mp: null,
  declared: null,
  verified: true,
  source: 'hoc',
  ...over,
})

const census = { id: 'E1', age65plus: 20, population: 110_000 } as unknown as CensusSeat
const seat = (over: Partial<Ge2024Result> = {}): SeatData => ({ result: result(over), census })

const spec = (mode: ModeSpec['mode'], breaks: number[] = []): ModeSpec => ({
  mode,
  field: 'age65plus',
  breaks,
  colours: GE2024.colours,
})

describe('number formats', () => {
  it('formats counts and percentages', () => {
    expect(formatCount(48_544)).toBe('48,544')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(-1_234_567)).toBe('−1,234,567')
    expect(formatPercent(11.66)).toBe('11.7%')
  })
})

describe('UK map modes', () => {
  it('computes majority and turnout the Commons Library way', () => {
    expect(majorityShare(result())).toBe(4)
    expect(turnoutShare(result())).toBe(62.5)
    const ni = result({ valid: null, majority: null, electorate: null, votes: null })
    expect(majorityShare(ni)).toBeNull()
    expect(turnoutShare(ni)).toBeNull()
  })

  it('bins values at their breaks', () => {
    expect(binOf(4.99, MAJORITY_BREAKS)).toBe(0)
    expect(binOf(5, MAJORITY_BREAKS)).toBe(1)
    expect(binOf(29.9, MAJORITY_BREAKS)).toBe(3)
    expect(binOf(30, MAJORITY_BREAKS)).toBe(4)
    expect(quantileBreaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([3, 5, 7, 9])
    expect(quantileBreaks([2, 2, 2, 2, 2])).toEqual([2])
    expect(quantileBreaks([])).toEqual([])
  })

  it('fills by mode, with no data where the value is missing', () => {
    expect(fillOf(seat(), spec('party'))).toBe(GE2024.colours.lab)
    expect(fillOf(seat(), spec('majority', [...MAJORITY_BREAKS]))).toBe('var(--map-seq-0)')
    expect(fillOf(seat({ majority: null }), spec('majority', [...MAJORITY_BREAKS]))).toBe(NO_DATA)
    expect(fillOf(seat(), spec('demographics', [10, 15, 18, 25]))).toBe('var(--map-seq-3)')
  })

  it('describes a seat for each mode', () => {
    expect(modeLine(seat(), spec('party'), partyName)).toBe('Won by Labour (July 2024)')
    expect(modeLine(seat(), spec('majority'), partyName)).toBe('Labour majority 2,000 (4.0%)')
    expect(modeLine(seat(), spec('turnout'), partyName)).toBe('Turnout 62.5%')
    expect(modeLine(seat(), spec('demographics'), partyName)).toBe('20.0%')
  })

  it('formats census fields by kind', () => {
    expect(formatField('population', 117_430)).toBe('117,430')
    expect(formatField('density', 20.63)).toBe('20.6 per ha')
    expect(formatField('degree', 31.25)).toBe('31.3%')
  })

  const results = new Map(GE2024.results.map((r) => [r.id, r]))
  const seats: SeatData[] = CENSUS.seats.map((c) => ({ result: results.get(c.id)!, census: c }))

  it('lists parties by seats won in the Party key', () => {
    const rows = legendFor(seats, spec('party'), partyName)
    expect(rows.slice(0, 4).map((r) => r.label)).toEqual([
      'Labour 411',
      'Conservative 121',
      'Liberal Democrats 72',
      'SNP 9',
    ])
    expect(rows[0]!.swatch).toBe(GE2024.colours.lab)
  })

  it('labels value ramps, with a no-data row where some seats lack data', () => {
    const majority = legendFor(seats, spec('majority', [...MAJORITY_BREAKS]), partyName)
    expect(majority.map((r) => r.label)).toEqual([
      'Under 5% (marginal)',
      '5% to 10%',
      '10% to 20%',
      '20% to 30%',
      '30% or more (safe)',
      'No data', // Northern Ireland: winners only
    ])
    const turnout = breaksFor(seats, 'turnout', 'age65plus')
    expect(turnout).toHaveLength(4)
    expect(turnout[0]).toBeGreaterThan(40)
    expect(turnout[3]).toBeLessThan(75)
  })
})
