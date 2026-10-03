import { describe, expect, it } from 'vitest'
import type { CsvRow } from '../scripts/data/csv.ts'
import { fromHocCsv, fromManual, fromSummaries, parseDeclared } from '../scripts/data/ge2024.ts'

/** A row in the Bristol summaries layout; Chorley and Islington North below use real GE2024 figures. */
function summaryRow(values: Partial<CsvRow>): CsvRow {
  return {
    ONSConstID: 'E14000000',
    ConstituencyName: 'Test',
    Region: 'North West',
    ConstituencyType: 'County',
    Winner24: 'Lab',
    Second24: 'Con',
    ConVote24: '0',
    LabVote24: '0',
    LDVote24: '0',
    RUKVote24: '0',
    GreenVote24: '0',
    SNPVote24: '0',
    PCVote24: '0',
    OtherVote24: '0',
    TotalVote24: '0',
    RejectedVote24: '0',
    Electorate24: '0',
    Majority24: '0',
    MPFirstName24: 'A',
    MPSurname24: 'B',
    MPGender24: 'Female',
    ...values,
  } as CsvRow
}

const chorley = summaryRow({
  ONSConstID: 'E14001170',
  ConstituencyName: 'Chorley',
  Winner24: 'Spk',
  Second24: 'Green',
  GreenVote24: '4663',
  OtherVote24: '29301',
  TotalVote24: '33964',
  RejectedVote24: '1198',
  Electorate24: '74801',
  Majority24: String((20575 / 33964) * 100),
  MPGender24: 'Male',
})

const islingtonNorth = summaryRow({
  ONSConstID: 'E14001305',
  ConstituencyName: 'Islington North',
  ConstituencyType: 'Borough',
  Region: 'London',
  Winner24: 'Ind',
  Second24: 'Lab',
  ConVote24: '1950',
  LabVote24: '16873',
  LDVote24: '1661',
  RUKVote24: '1710',
  GreenVote24: '2660',
  OtherVote24: '24152',
  TotalVote24: '49006',
  Electorate24: '72852',
  Majority24: String((7247 / 49006) * 100),
  MPGender24: 'Male',
})

describe('fromSummaries', () => {
  it('recovers the winner from "other" using the majority', () => {
    const { results, meta } = fromSummaries([chorley, islingtonNorth])
    expect(results[0]).toMatchObject({
      winner: 'speaker',
      second: 'green',
      majority: 20575,
      votes: { speaker: 25238, green: 4663, other: 4063 },
      verified: true,
      source: 'hoc-mirror',
    })
    expect(results[1].votes).toEqual({
      con: 1950,
      lab: 16873,
      ld: 1661,
      reform: 1710,
      green: 2660,
      ind: 24120,
      other: 32,
    })
    expect(meta.get('E14001305')).toEqual({
      name: 'Islington North',
      type: 'borough',
      region: 'London',
    })
  })

  it('recovers an unlisted runner-up and keeps unknown parties as other', () => {
    const row = summaryRow({
      Winner24: 'Lab',
      Second24: 'WPB',
      LabVote24: '100',
      ConVote24: '20',
      OtherVote24: '90',
      TotalVote24: '210',
      Majority24: String((40 / 210) * 100),
    })
    expect(fromSummaries([row]).results[0].votes).toEqual({
      lab: 100,
      con: 20,
      workers: 60,
      other: 30,
    })
    const unknown = summaryRow({ ...row, Second24: 'INet' })
    expect(fromSummaries([unknown]).results[0]).toMatchObject({
      second: 'other',
      votes: { lab: 100, con: 20, other: 90 },
    })
  })

  it('rejects votes that do not add up or a fractional majority', () => {
    expect(() => fromSummaries([summaryRow({ LabVote24: '5', TotalVote24: '6' })])).toThrow(
      /sum to 5/,
    )
    expect(() =>
      fromSummaries([summaryRow({ LabVote24: '3', TotalVote24: '3', Majority24: '50' })]),
    ).toThrow(/not whole/)
  })
})

describe('fromHocCsv', () => {
  const hocRow = (values: Record<string, string>): CsvRow => ({
    'ONS ID': 'N05000012',
    'Constituency name': 'North Antrim',
    'Region name': 'Northern Ireland',
    'Constituency type': 'County',
    'Declaration time': '05/07/2024 04:50',
    'Member first name': 'A',
    'Member surname': 'B',
    'Member gender': 'Male',
    'First party': 'TUV',
    'Second party': 'DUP',
    Electorate: '1000',
    'Valid votes': '600',
    'Invalid votes': '5',
    Majority: '50',
    Con: '0',
    Lab: '0',
    LD: '0',
    RUK: '0',
    Green: '0',
    SNP: '0',
    PC: '0',
    DUP: '200',
    SF: '100',
    SDLP: '0',
    UUP: '0',
    APNI: '0',
    'All other candidates': '300',
    'Of which other winner': '250',
    ...values,
  })

  it('maps official columns and splits the other winner out', () => {
    const { results, meta } = fromHocCsv([hocRow({})])
    expect(results[0]).toMatchObject({
      id: 'N05000012',
      winner: 'tuv',
      second: 'dup',
      majority: 50,
      votes: { dup: 200, sf: 100, tuv: 250, other: 50 },
      declared: '2024-07-05T04:50',
      source: 'hoc',
    })
    expect(meta.get('N05000012')?.type).toBe('county')
  })

  it('names the missing columns', () => {
    const row = hocRow({})
    delete row['Declaration time']
    expect(() => fromHocCsv([row])).toThrow(/missing columns declarationtime/)
  })
})

describe('parseDeclared', () => {
  it('normalises UK and ISO date-times', () => {
    expect(parseDeclared('5/7/2024 3:45')).toBe('2024-07-05T03:45')
    expect(parseDeclared('2024-07-05 03:45:00')).toBe('2024-07-05T03:45')
    expect(parseDeclared('')).toBeNull()
  })
})

describe('fromManual', () => {
  const seat = (candidates: [string, number][]) => ({
    note: '',
    asOf: '2024-07-04',
    seats: {
      N05000013: {
        electorate: 70000,
        rejected: 100,
        mp: { first: 'A', last: 'B', gender: 'male' },
        candidates,
        source: 'https://example.org',
      },
    },
  })

  it('builds full results: valid votes, majority, winner and runner-up', () => {
    const [r] = fromManual(
      seat([
        ['alliance', 300],
        ['dup', 500],
        ['pbp', 50],
      ]),
    )
    expect(r).toMatchObject({
      winner: 'dup',
      second: 'alliance',
      valid: 850,
      majority: 200,
      electorate: 70000,
      rejected: 100,
      votes: { dup: 500, alliance: 300, other: 50 },
      verified: true,
      source: 'manual',
    })
  })

  it('keeps an independent who came first or second; later independents count as other', () => {
    const [r] = fromManual(
      seat([
        ['ind', 900],
        ['alliance', 600],
        ['ind', 40],
        ['aontu', 10],
      ]),
    )
    expect(r!.votes).toEqual({ ind: 900, alliance: 600, other: 50 })
    expect(r).toMatchObject({ winner: 'ind', second: 'alliance', majority: 300 })
  })

  it('rejects a party standing twice and bad counts', () => {
    expect(() =>
      fromManual(
        seat([
          ['sf', 10],
          ['sf', 5],
        ]),
      ),
    ).toThrow(/stands twice/)
    expect(() =>
      fromManual(
        seat([
          ['sf', 10],
          ['dup', -1],
        ]),
      ),
    ).toThrow(/votes/)
  })
})
