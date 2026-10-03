import { describe, expect, it } from 'vitest'
import { CENSUS, GE2024 } from '../src/data/uk.ts'
import type { CensusSeat, Ge2024Party, Ge2024Result } from '../src/data/types.ts'
import { formatCount, formatPercent } from '../src/ui/kit/numbers.ts'
import {
  binOf,
  breaksFor,
  CHANGE_BREAKS,
  fillOf,
  coverageOf,
  formatField,
  keyOf,
  listOf,
  MAJORITY_BREAKS,
  mapKeyFor,
  majorityShare,
  modeLine,
  NO_DATA,
  quantileBreaks,
  signed,
  SWING_BREAKS,
  swingConLab,
  tickLabels,
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
  newMp: false,
  since2019: { held: 'con', change: { lab: 8, con: -12, reform: 14 } },
  ...over,
})

const census = { id: 'E1', age65plus: 20, population: 110_000 } as unknown as CensusSeat
const seat = (over: Partial<Ge2024Result> = {}): SeatData => ({
  nation: 'england',
  result: result(over),
  census,
})

const spec = (
  mode: ModeSpec['mode'],
  breaks: number[] = [],
  measure: ModeSpec['measure'] = 'gains',
): ModeSpec => ({
  mode,
  field: 'age65plus',
  measure,
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
  const nationOf = (id: string): SeatData['nation'] =>
    id.startsWith('E')
      ? 'england'
      : id.startsWith('W')
        ? 'wales'
        : id.startsWith('S')
          ? 'scotland'
          : 'northern-ireland'
  const seats: SeatData[] = CENSUS.seats.map((c) => ({
    nation: nationOf(c.id),
    result: results.get(c.id)!,
    census: c,
  }))

  it('lists parties by seats won in the Party key', () => {
    const key = mapKeyFor(seats, spec('party'), partyName, '')
    expect(key.scale).toBeNull()
    expect(key.items.slice(0, 4).map((r) => [r.label, r.count])).toEqual([
      ['Labour', 411],
      ['Conservative', 121],
      ['Liberal Democrats', 72],
      ['SNP', 9],
    ])
    expect(key.items[0]).toMatchObject({ id: 'lab', swatch: GE2024.colours.lab })
  })

  it('draws value modes as a stepped scale, with no gaps now Northern Ireland has results', () => {
    const majority = mapKeyFor(seats, spec('majority', [...MAJORITY_BREAKS]), partyName, '')
    expect(majority.scale).toMatchObject({
      ticks: ['5%', '10%', '20%', '30%'],
      low: 'Marginal',
      high: 'Safe',
    })
    expect(majority.scale!.steps.map((s) => s.id)).toEqual([
      'step0',
      'step1',
      'step2',
      'step3',
      'step4',
    ])
    expect(majority.items).toEqual([])
    const turnout = breaksFor(seats, { mode: 'turnout', field: 'age65plus', measure: 'gains' })
    expect(turnout).toHaveLength(4)
    expect(turnout[0]).toBeGreaterThan(40)
    expect(turnout[3]).toBeLessThan(75)
  })

  it('hatches census gaps and says why', () => {
    const degree = mapKeyFor(
      seats,
      { ...spec('demographics', [20, 25, 30, 35]), field: 'degree' },
      partyName,
      'Degree-level qualification',
    )
    expect(degree.title).toBe('Degree-level qualification')
    expect(degree.items).toEqual([
      { id: 'none', swatch: 'var(--map-nodata)', label: 'No figure', hatch: true },
    ])
    expect(degree.note).toContain("Scotland's census source has no figure")
    expect(degree.note).toContain('Northern Ireland')
    const welsh = mapKeyFor(
      seats,
      { ...spec('demographics', [5, 10, 15, 20]), field: 'welshSpeakers' },
      partyName,
      'Can speak Welsh',
    )
    expect(welsh.note).toContain('asked in Wales only')
  })

  it('says where each census measure has figures', () => {
    expect(coverageOf(seats, 'age65plus')).toBe('Great Britain')
    expect(coverageOf(seats, 'density')).toBe('Great Britain')
    expect(coverageOf(seats, 'degree')).toBe('England and Wales')
    expect(coverageOf(seats, 'welshSpeakers')).toBe('Wales')
    expect(listOf(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('files each seat under its key entry, for picking out from the key', () => {
    expect(keyOf(seat(), spec('party'))).toBe('lab')
    expect(keyOf(seat(), spec('majority', [...MAJORITY_BREAKS]))).toBe('step0')
    expect(keyOf(seat({ majority: null }), spec('majority', [...MAJORITY_BREAKS]))).toBe('none')
  })
})

describe('key ticks', () => {
  it('keeps tick labels short and distinct', () => {
    expect(tickLabels('majority', 'age65plus', [5, 10, 20, 30])).toEqual([
      '5%',
      '10%',
      '20%',
      '30%',
    ])
    expect(tickLabels('demographics', 'degree', [26.3, 29.9, 34.2, 39.9])).toEqual([
      '26%',
      '30%',
      '34%',
      '40%',
    ])
    expect(tickLabels('demographics', 'muslim', [0.4, 1.1, 2.5, 6.8])).toEqual([
      '0.4%',
      '1.1%',
      '2.5%',
      '6.8%',
    ])
    expect(tickLabels('demographics', 'density', [2.2, 5.7, 17.3, 37.1])).toEqual([
      '2.2',
      '5.7',
      '17',
      '37',
    ])
    expect(tickLabels('demographics', 'population', [93_215, 99_870])).toEqual(['93k', '100k'])
    // 26.3 and 26.4 would both round to 26%: fall back to one decimal place.
    expect(tickLabels('demographics', 'degree', [26.3, 26.4])).toEqual(['26.3%', '26.4%'])
  })
})

describe('Since 2019', () => {
  it('measures the Butler swing from the change in Labour and Conservative shares', () => {
    expect(swingConLab(seat().result)).toBe(10)
    expect(swingConLab(seat({ since2019: { held: 'dup', change: { dup: -4 } } }).result)).toBeNull()
    expect(signed(10)).toBe('+10')
    expect(signed(-4.25, 1)).toBe('−4.3')
    expect(signed(-0.01, 1)).toBe('0.0')
  })

  it('colours gains by the winner and holds in one neutral', () => {
    const gains = spec('change', [], 'gains')
    expect(fillOf(seat(), gains)).toBe(GE2024.colours.lab)
    expect(keyOf(seat(), gains)).toBe('lab')
    const held = seat({ since2019: { held: 'lab', change: {} } })
    expect(fillOf(held, gains)).toBe('var(--map-hold)')
    expect(keyOf(held, gains)).toBe('held')
  })

  it('lists gains by party with the held count last', () => {
    const key = mapKeyFor(
      [seat(), seat(), seat({ since2019: { held: 'lab', change: {} } })],
      spec('change', [], 'gains'),
      partyName,
      '',
    )
    expect(key.items.map((i) => [i.label, i.count])).toEqual([
      ['Labour gain', 2],
      ['Held', 1],
    ])
  })

  it('steps away from 0 in the party colour for rises and grey for falls', () => {
    // Reform +14: the third step above 0.
    const reform = spec('change', [...CHANGE_BREAKS], 'reform')
    expect(fillOf(seat(), reform)).toBe(
      `color-mix(in oklab, ${GE2024.colours.reform} 58%, var(--map-zero))`,
    )
    // Conservatives −12: the third step below 0.
    const con = spec('change', [...CHANGE_BREAKS], 'con')
    expect(fillOf(seat(), con)).toBe('color-mix(in oklab, var(--map-loss) 58%, var(--map-zero))')
    // No figure for a party the seat's nation doesn't list.
    expect(fillOf(seat(), spec('change', [...CHANGE_BREAKS], 'snp'))).toBe(NO_DATA)
    // The swing's sides take the two parties' colours.
    const swing = spec('change', [...SWING_BREAKS], 'swing')
    expect(fillOf(seat(), swing)).toContain(GE2024.colours.lab)
    expect(mapKeyFor([seat()], swing, partyName, '').scale).toMatchObject({
      low: 'To Con',
      high: 'To Lab',
      ticks: ['−10', '−5', '0', '+5', '+10', '+15', '+20'],
    })
  })
})
