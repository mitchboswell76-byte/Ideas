/**
 * GE2024 constituency results → `Ge2024Result`, from three inputs (best first):
 *  - the Commons Library's `HoC-GE2024-results-by-constituency.csv` (all 650 seats, if supplied),
 *  - the University of Bristol GB summaries file (632 seats, results copied from the Commons Library),
 *  - hand-transcribed Northern Ireland results (`data-raw/manual/ni-ge2024-results.json`).
 */
import {
  GE2024_PARTIES,
  type Ge2024Party,
  type Ge2024Result,
  type SeatType,
} from '../../src/data/types.ts'
import type { CsvRow } from './csv.ts'

/** Party codes used by the Commons Library (and copied by the summaries file). */
const PARTY_CODES: Record<string, Ge2024Party> = {
  Con: 'con',
  Lab: 'lab',
  LD: 'ld',
  RUK: 'reform',
  Green: 'green',
  SNP: 'snp',
  PC: 'pc',
  DUP: 'dup',
  SF: 'sf',
  SDLP: 'sdlp',
  UUP: 'uup',
  APNI: 'alliance',
  TUV: 'tuv',
  WPB: 'workers',
  Ind: 'ind',
  Spk: 'speaker',
}

/** Unknown codes (small parties, e.g. `INet`) count as `other`. */
export function partyFromCode(code: string): Ge2024Party {
  return PARTY_CODES[code.trim()] ?? 'other'
}

export interface SeatMeta {
  name: string
  type: SeatType | null
  region: string | null
}

export interface ResultsInput {
  results: Ge2024Result[]
  meta: Map<string, SeatMeta>
}

function int(row: CsvRow, col: string): number {
  const n = Number(row[col])
  if (!Number.isInteger(n) || n < 0) throw new Error(`${row[col]} in ${col} is not a count`)
  return n
}

function seatType(value: string | undefined): SeatType | null {
  const t = value?.trim().toLowerCase()
  return t === 'county' || t === 'borough' || t === 'burgh' ? t : null
}

function gender(value: string): 'female' | 'male' {
  const g = value.trim().toLowerCase()
  if (g !== 'female' && g !== 'male') throw new Error(`Unknown member gender ${value}`)
  return g
}

/**
 * Parties without their own column (independents, the Speaker, small parties) are inside
 * `other`. The winner's and runner-up's votes can still be recovered from the majority.
 */
function splitOther(
  votes: Partial<Record<Ge2024Party, number>>,
  winner: Ge2024Party,
  second: Ge2024Party,
  majority: number,
  winnerVotes?: number,
): void {
  const listed = (p: Ge2024Party) => p !== 'other' && votes[p] !== undefined
  const take = (p: Ge2024Party, n: number) => {
    votes[p] = n
    votes.other = (votes.other ?? 0) - n
  }
  if (winner !== 'other' && !listed(winner)) {
    const w = winnerVotes ?? (listed(second) ? votes[second]! + majority : undefined)
    if (w !== undefined) take(winner, w)
  }
  if (second !== 'other' && !listed(second) && listed(winner))
    take(second, votes[winner]! - majority)
  if ((votes.other ?? 0) < 0)
    throw new Error(`Negative other vote after splitting ${winner}/${second}`)
}

function dropZeros(votes: Partial<Record<Ge2024Party, number>>) {
  return Object.fromEntries(Object.entries(votes).filter(([, n]) => n > 0)) as Partial<
    Record<Ge2024Party, number>
  >
}

/** GB rows of the Bristol summaries file (columns `Con24` … `OtherVote24`). */
export function fromSummaries(rows: CsvRow[]): ResultsInput {
  const columns: [Ge2024Party, string][] = [
    ['con', 'ConVote24'],
    ['lab', 'LabVote24'],
    ['ld', 'LDVote24'],
    ['reform', 'RUKVote24'],
    ['green', 'GreenVote24'],
    ['snp', 'SNPVote24'],
    ['pc', 'PCVote24'],
    ['other', 'OtherVote24'],
  ]
  const meta = new Map<string, SeatMeta>()
  const results = rows.map((row): Ge2024Result => {
    const id = row.ONSConstID
    const valid = int(row, 'TotalVote24')
    const votes = Object.fromEntries(columns.map(([p, col]) => [p, int(row, col)]))
    const sum = Object.values(votes).reduce((a, b) => a + b, 0)
    if (sum !== valid) throw new Error(`${id}: votes sum to ${sum}, valid votes ${valid}`)
    // Majority is a percentage of valid votes; it must come back to a whole number of votes.
    const exact = (Number(row.Majority24) * valid) / 100
    const majority = Math.round(exact)
    if (Math.abs(exact - majority) > 1e-6) throw new Error(`${id}: majority ${exact} is not whole`)
    const winner = partyFromCode(row.Winner24)
    const second = partyFromCode(row.Second24)
    splitOther(votes, winner, second, majority)
    meta.set(id, {
      name: row.ConstituencyName,
      type: seatType(row.ConstituencyType),
      region: row.Region,
    })
    return {
      id,
      winner,
      second,
      electorate: int(row, 'Electorate24'),
      valid,
      rejected: int(row, 'RejectedVote24'),
      majority,
      votes: dropZeros(votes),
      mp: { first: row.MPFirstName24, last: row.MPSurname24, gender: gender(row.MPGender24) },
      declared: null,
      verified: true,
      source: 'hoc-mirror',
    }
  })
  return { results, meta }
}

/** Header → lower-case letters and digits, so small wording changes still match. */
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

const HOC_VOTES: [Ge2024Party, string][] = [
  ['con', 'con'],
  ['lab', 'lab'],
  ['ld', 'ld'],
  ['reform', 'ruk'],
  ['green', 'green'],
  ['snp', 'snp'],
  ['pc', 'pc'],
  ['dup', 'dup'],
  ['sf', 'sf'],
  ['sdlp', 'sdlp'],
  ['uup', 'uup'],
  ['alliance', 'apni'],
  ['other', 'allothercandidates'],
]

const HOC_REQUIRED = [
  'onsid',
  'constituencyname',
  'regionname',
  'constituencytype',
  'declarationtime',
  'memberfirstname',
  'membersurname',
  'membergender',
  'firstparty',
  'secondparty',
  'electorate',
  'validvotes',
  'invalidvotes',
  'majority',
  'ofwhichotherwinner',
  ...HOC_VOTES.map(([, col]) => col),
]

/** `05/07/2024 03:45`, `2024-07-05 03:45(:00)` → `2024-07-05T03:45`; anything else → null. */
export function parseDeclared(value: string): string | null {
  const v = value.trim()
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/.exec(v)
  if (m)
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${m[4].padStart(2, '0')}:${m[5]}`
  m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(v)
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, '0')}:${m[5]}`
  return null
}

/** The Commons Library's own constituency file (CBP-10009). */
export function fromHocCsv(rawRows: CsvRow[]): ResultsInput {
  if (rawRows.length === 0) throw new Error('HoC CSV has no rows')
  const rows = rawRows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), v])),
  )
  const missing = HOC_REQUIRED.filter((h) => !(h in rows[0]))
  if (missing.length > 0) {
    throw new Error(
      `HoC CSV is missing columns ${missing.join(', ')}; found: ${Object.keys(rawRows[0]).join(', ')}`,
    )
  }
  const meta = new Map<string, SeatMeta>()
  const results = rows.map((row): Ge2024Result => {
    const id = row.onsid.trim()
    const valid = int(row, 'validvotes')
    const votes = Object.fromEntries(HOC_VOTES.map(([p, col]) => [p, int(row, col)]))
    const sum = Object.values(votes).reduce((a, b) => a + b, 0)
    if (sum !== valid) throw new Error(`${id}: votes sum to ${sum}, valid votes ${valid}`)
    const majority = int(row, 'majority')
    const winner = partyFromCode(row.firstparty)
    const second = partyFromCode(row.secondparty)
    const otherWinner = int(row, 'ofwhichotherwinner')
    splitOther(votes, winner, second, majority, otherWinner > 0 ? otherWinner : undefined)
    meta.set(id, {
      name: row.constituencyname.trim(),
      type: seatType(row.constituencytype),
      region: row.regionname.trim(),
    })
    return {
      id,
      winner,
      second,
      electorate: int(row, 'electorate'),
      valid,
      rejected: int(row, 'invalidvotes'),
      majority,
      votes: dropZeros(votes),
      mp: {
        first: row.memberfirstname.trim(),
        last: row.membersurname.trim(),
        gender: gender(row.membergender),
      },
      declared: parseDeclared(row.declarationtime),
      verified: true,
      source: 'hoc',
    }
  })
  return { results, meta }
}

export interface ManualResults {
  note: string
  asOf: string
  seats: Record<
    string,
    {
      electorate: number
      rejected: number
      mp: { first: string; last: string; gender: string }
      /** Every candidate, best first, by party code (`ind` for independents). */
      candidates: [string, number][]
      /** The results page the figures were copied from. */
      source: string
    }
  >
}

/**
 * Hand-transcribed results for seats no reachable file covers (Northern Ireland), folded the way
 * the Commons Library files are: parties outside the game's list count as `other`, and so does
 * every independent except one who came first or second.
 */
export function fromManual(file: ManualResults): Ge2024Result[] {
  return Object.entries(file.seats).map(([id, seat]) => {
    const ranked = [...seat.candidates].sort((a, b) => b[1] - a[1])
    if (ranked.length < 2) throw new Error(`${id}: needs at least two candidates`)
    for (const [code, n] of ranked) {
      if (!Number.isInteger(n) || n < 0) throw new Error(`${id}: ${n} votes for ${code}`)
    }
    const partyOf = (code: string): Ge2024Party =>
      code in GE2024_PARTIES && code !== 'other' ? (code as Ge2024Party) : 'other'
    const [first, second] = ranked.map(([code]) => partyOf(code))
    const votes: Partial<Record<Ge2024Party, number>> = {}
    ranked.forEach(([code, n], place) => {
      let party = partyOf(code)
      if (party === 'ind' && place > 1) party = 'other'
      if (party !== 'other' && party !== 'ind' && votes[party] !== undefined) {
        throw new Error(`${id}: ${party} stands twice`)
      }
      votes[party] = (votes[party] ?? 0) + n
    })
    const valid = ranked.reduce((a, [, n]) => a + n, 0)
    return {
      id,
      winner: first!,
      second: second!,
      electorate: seat.electorate,
      valid,
      rejected: seat.rejected,
      majority: ranked[0]![1] - ranked[1]![1],
      votes: dropZeros(votes),
      mp: { first: seat.mp.first, last: seat.mp.last, gender: gender(seat.mp.gender) },
      declared: null,
      verified: true,
      source: 'manual',
    }
  })
}
