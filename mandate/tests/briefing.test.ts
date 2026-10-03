import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  applyCorrections,
  compareWithBriefing,
  heldIn2019,
  nameKey,
  parseBriefing,
  type BriefingSeat,
} from '../scripts/data/briefing.ts'
import type { BaseResult } from '../scripts/data/ge2024.ts'

const result = (over: Partial<BaseResult> = {}): BaseResult => ({
  id: 'E1',
  winner: 'lab',
  second: 'con',
  electorate: 80_000,
  valid: 50_000,
  rejected: 100,
  majority: 2_000,
  votes: { lab: 20_000, con: 18_000, ld: 7_000, other: 5_000 },
  mp: { first: 'A', last: 'B', gender: 'female' },
  declared: null,
  verified: true,
  source: 'hoc-mirror',
  ...over,
})

const seat = (over: Partial<BriefingSeat> = {}): BriefingSeat => ({
  name: 'Somewhere',
  nation: 'england',
  winner: 'lab',
  second: 'con',
  majority: 2_000,
  majorityShare: 4,
  mp: 'A B',
  newMp: true,
  held2019: 'con',
  share: { lab: 40, con: 36, ld: 14, other: 10 },
  change: { lab: 8 },
  electorate: 80_000,
  turnout: 62.5,
  ...over,
})

describe('briefing helpers', () => {
  it('matches seat names across accents, case, punctuation and "&"', () => {
    expect(nameKey('Ynys Môn')).toBe(nameKey('YNYS MON'))
    expect(nameKey('Brighton Kemptown & Peacehaven')).toBe(
      nameKey('Brighton Kemptown and Peacehaven'),
    )
  })

  it('reads holds and gains, and rejects a row that disagrees with 5.1', () => {
    expect(heldIn2019('Lab hold', 'lab', 'x')).toBe('lab')
    expect(heldIn2019('LD gain from Con', 'ld', 'x')).toBe('con')
    expect(() => heldIn2019('Con hold', 'lab', 'x')).toThrow(/5\.1 has lab/)
    expect(() => heldIn2019('Lab win', 'lab', 'x')).toThrow(/not a hold or gain/)
  })

  it('agrees with a matching result and lists every difference otherwise', () => {
    expect(compareWithBriefing(result(), seat())).toEqual([])
    const diff = compareWithBriefing(result({ majority: 1_999, electorate: 79_000 }), seat())
    expect(diff).toContain('majority 1999, briefing 2000')
    expect(diff.some((d) => d.startsWith('electorate'))).toBe(true)
    expect(diff.some((d) => d.startsWith('turnout'))).toBe(true)
  })

  it('applies corrections and moves valid votes with them', () => {
    const [fixed] = applyCorrections([result()], {
      note: '',
      asOf: '',
      seats: { E1: { name: 'Somewhere', votes: { ld: 7_500 }, source: '', reason: '' } },
    })
    expect(fixed).toMatchObject({ valid: 50_500, votes: { ld: 7_500 } })
    expect(() =>
      applyCorrections([result()], {
        note: '',
        asOf: '',
        seats: { E9: { name: 'Nowhere', votes: {}, source: '', reason: '' } },
      }),
    ).toThrow(/no result for E9/)
  })
})

describe('the CBP-10009 text', () => {
  const text = readFileSync(
    new URL('../data-raw/manual/cbp-10009-ge2024-briefing.md', import.meta.url),
    'utf8',
  )
  const seats = parseBriefing(text)

  it('has all 650 seats, by nation', () => {
    expect(seats).toHaveLength(650)
    const by = (n: BriefingSeat['nation']) => seats.filter((s) => s.nation === n).length
    expect([by('england'), by('scotland'), by('wales'), by('northern-ireland')]).toEqual([
      543, 57, 32, 18,
    ])
  })

  it('reads a known seat', () => {
    const lagan = seats.find((s) => s.name === 'Lagan Valley')!
    expect(lagan).toMatchObject({
      winner: 'alliance',
      second: 'dup',
      majority: 2959,
      held2019: 'dup',
      electorate: 82201,
    })
  })
})
