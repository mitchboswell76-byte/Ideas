/**
 * The Commons Library's briefing *General election 2024: results and analysis* (CBP-10009), as a
 * text version of the PDF (`data-raw/manual/cbp-10009-ge2024-briefing.md`). Section 5 has two
 * tables per seat: 5.1 (winner, runner-up, majority, MP, new MP?) and 5.2 (hold or gain against
 * the notional 2019 result, vote shares and their change, electorate, turnout).
 *
 * The build uses it two ways: to check every seat's figures against the result files (the only
 * independent check Northern Ireland's hand-copied results get), and for what no other file has:
 * which seats changed hands since 2019 and each party's change in vote share.
 */
import type { Ge2024Party, Ge2024Result } from '../../src/data/types.ts'
import type { Nation } from '../../src/sim/world.ts'
import { partyFromCode, type BaseResult } from './ge2024.ts'

export interface BriefingSeat {
  name: string
  nation: Nation
  winner: Ge2024Party
  second: Ge2024Party
  majority: number
  /** Majority as % of valid votes, 1 dp. */
  majorityShare: number
  /** Winning candidate as the briefing names them. */
  mp: string
  newMp: boolean
  /** Who notionally held the seat in 2019 (on the new boundaries): the winner, if a hold. */
  held2019: Ge2024Party
  /** Vote share by the parties the nation's table lists, and `other` (%, 1 dp). */
  share: Partial<Record<Ge2024Party, number>>
  /** Change since 2019 in percentage points; missing where the briefing prints none. */
  change: Partial<Record<Ge2024Party, number>>
  electorate: number
  /** Valid votes as % of the electorate, 1 dp. */
  turnout: number
}

/** 5.2's party column headings. */
const COLUMN_PARTIES: Record<string, Ge2024Party> = {
  CON: 'con',
  LAB: 'lab',
  LD: 'ld',
  SNP: 'snp',
  PC: 'pc',
  Green: 'green',
  Reform: 'reform',
  DUP: 'dup',
  SF: 'sf',
  SDLP: 'sdlp',
  Alliance: 'alliance',
  UUP: 'uup',
  Other: 'other',
}

const TABLES: [Nation, string][] = [
  ['england', '#### England: voting by constituency'],
  ['scotland', '#### Scotland: voting by constituency'],
  ['wales', '#### Wales: voting by constituency'],
  ['northern-ireland', '#### Northern Ireland: voting by constituency'],
]

/** Seat names compared without case, accents, punctuation or "&" vs "and". */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '')
}

/** The rows of the first Markdown table after `heading`, header row first. */
function tableAfter(lines: readonly string[], heading: string): string[][] {
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) throw new Error(`briefing: no "${heading}"`)
  let i = start + 1
  while (i < lines.length && !lines[i]!.startsWith('|')) i++
  const rows: string[][] = []
  for (; i < lines.length && lines[i]!.startsWith('|'); i++) {
    const cells = lines[i]!.split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue
    rows.push(cells)
  }
  if (rows.length < 2) throw new Error(`briefing: empty table after "${heading}"`)
  return rows
}

const count = (cell: string, where: string): number => {
  const n = Number(cell.replace(/,/g, ''))
  if (!Number.isInteger(n) || n < 0) throw new Error(`briefing: ${cell} in ${where} is not a count`)
  return n
}

/** `29.0%`, `+18.6%`, `-0.0%` → number; `-` (none printed) → null. */
const percent = (cell: string, where: string): number | null => {
  if (cell === '-' || cell === '–') return null
  const m = /^([+-]?\d+(?:\.\d+)?)%$/.exec(cell)
  if (!m) throw new Error(`briefing: ${cell} in ${where} is not a percentage`)
  return Number(m[1]) + 0 // -0 → 0
}

/** "Lab hold" → the winner; "Lab gain from Con" → Con. */
export function heldIn2019(cell: string, winner: Ge2024Party, where: string): Ge2024Party {
  const m = /^(\S+) (?:hold|gain from (\S+))$/.exec(cell)
  if (!m) throw new Error(`briefing: "${cell}" in ${where} is not a hold or gain`)
  if (partyFromCode(m[1]!) !== winner) {
    throw new Error(`briefing: ${where} says "${cell}" but 5.1 has ${winner} winning`)
  }
  return m[2] ? partyFromCode(m[2]) : winner
}

export function parseBriefing(text: string): BriefingSeat[] {
  const lines = text.split(/\r?\n/)
  const winners = new Map<string, string[]>()
  const [head51, ...rows51] = tableAfter(lines, '### 5.1 ')
  if (head51!.length !== 7 || head51![0] !== 'Constituency') {
    throw new Error(`briefing: unexpected 5.1 columns ${head51!.join(', ')}`)
  }
  for (const row of rows51) winners.set(nameKey(row[0]!), row)

  const seats: BriefingSeat[] = []
  for (const [nation, heading] of TABLES) {
    const [head, ...rows] = tableAfter(lines, heading)
    const col = (label: string) => {
      const i = head!.indexOf(label)
      if (i < 0) throw new Error(`briefing: ${nation} table has no "${label}" column`)
      return i
    }
    const parties = head!.flatMap((h) => {
      const m = /^(\S+) % 2024$/.exec(h)
      if (!m) return []
      const party = COLUMN_PARTIES[m[1]!]
      if (!party) throw new Error(`briefing: unknown party column ${h}`)
      return [[party, col(h), col(`${m[1]} change (pts)`)] as const]
    })
    for (const row of rows) {
      const name = row[0]!
      const where = `${name} (${nation})`
      if (row.length !== head!.length) throw new Error(`briefing: ${where} has ${row.length} cells`)
      const w = winners.get(nameKey(name))
      if (!w) throw new Error(`briefing: ${where} is not in table 5.1`)
      winners.delete(nameKey(name))
      const winner = partyFromCode(w[1]!)
      const share: Partial<Record<Ge2024Party, number>> = {}
      const change: Partial<Record<Ge2024Party, number>> = {}
      for (const [party, s, c] of parties) {
        share[party] = percent(row[s]!, where) ?? 0
        const delta = percent(row[c]!, where)
        if (delta !== null) change[party] = delta
      }
      if (w[6] !== 'Yes' && w[6] !== 'No') throw new Error(`briefing: ${where} new MP "${w[6]}"`)
      seats.push({
        name,
        nation,
        winner,
        second: partyFromCode(w[2]!),
        majority: count(w[3]!, where),
        majorityShare: percent(w[4]!, where)!,
        mp: w[5]!,
        newMp: w[6] === 'Yes',
        held2019: heldIn2019(row[col('Hold or gain?')]!, winner, where),
        share,
        change,
        electorate: count(row[col('Electorate')]!, where),
        turnout: percent(row[col('Turnout')]!, where)!,
      })
    }
  }
  if (winners.size) {
    throw new Error(
      `briefing: in 5.1 but not 5.2: ${[...winners.values()].map((r) => r[0]).join(', ')}`,
    )
  }
  return seats
}

/** Rounded the way the briefing prints shares: 1 dp, with a little room for its own rounding. */
const SHARE_SLACK = 0.051

/**
 * Differences between a seat's result and the briefing, in words (empty when they agree). Party
 * shares are compared column by column; `other` is every party the table has no column for.
 */
export function compareWithBriefing(result: BaseResult, seat: BriefingSeat): string[] {
  const out: string[] = []
  const { votes, valid, electorate } = result
  if (!votes || !valid || !electorate) return ['no votes to compare']
  if (result.winner !== seat.winner) out.push(`winner ${result.winner}, briefing ${seat.winner}`)
  if (result.second !== seat.second) out.push(`second ${result.second}, briefing ${seat.second}`)
  if (result.majority !== seat.majority) {
    out.push(`majority ${result.majority}, briefing ${seat.majority}`)
  }
  if (result.electorate !== seat.electorate) {
    out.push(`electorate ${result.electorate}, briefing ${seat.electorate}`)
  }
  const turnout = (100 * valid) / electorate
  if (Math.abs(turnout - seat.turnout) > SHARE_SLACK) {
    out.push(`turnout ${turnout.toFixed(2)}, briefing ${seat.turnout}`)
  }
  const listed = Object.keys(seat.share).filter((p) => p !== 'other') as Ge2024Party[]
  let rest = valid
  for (const party of listed) {
    const n = votes[party] ?? 0
    rest -= n
    const share = (100 * n) / valid
    if (Math.abs(share - seat.share[party]!) > SHARE_SLACK) {
      out.push(`${party} ${share.toFixed(2)}%, briefing ${seat.share[party]}%`)
    }
  }
  const other = (100 * rest) / valid
  if (Math.abs(other - (seat.share.other ?? 0)) > SHARE_SLACK) {
    out.push(`other ${other.toFixed(2)}%, briefing ${seat.share.other}%`)
  }
  return out
}

export interface Corrections {
  note: string
  asOf: string
  seats: Record<
    string,
    { name: string; votes: Partial<Record<Ge2024Party, number>>; source: string; reason: string }
  >
}

/** Replaces the listed parties' votes; valid votes move by the same amount. */
export function applyCorrections(results: BaseResult[], file: Corrections): BaseResult[] {
  const unused = new Set(Object.keys(file.seats))
  const out = results.map((r) => {
    const fix = file.seats[r.id]
    if (!fix) return r
    unused.delete(r.id)
    if (!r.votes || r.valid === null)
      throw new Error(`corrections: ${r.id} has no votes to correct`)
    const votes = { ...r.votes }
    let valid = r.valid
    for (const [party, n] of Object.entries(fix.votes) as [Ge2024Party, number][]) {
      valid += n - (votes[party] ?? 0)
      votes[party] = n
    }
    return { ...r, votes, valid }
  })
  if (unused.size) throw new Error(`corrections: no result for ${[...unused].join(', ')}`)
  return out
}

/**
 * Joins the briefing onto the results by seat name: electorates come from the briefing ("correct
 * as of election day"; the GB mirror has some that are not), then every other figure must agree
 * or the build stops. Adds who held each seat in 2019, the change in shares and new MPs.
 */
export function joinBriefing(
  results: readonly BaseResult[],
  names: ReadonlyMap<string, string>,
  briefing: readonly BriefingSeat[],
): { results: Ge2024Result[]; electorates: string[]; mpNames: string[] } {
  const byName = new Map(briefing.map((b) => [nameKey(b.name), b]))
  if (byName.size !== briefing.length) throw new Error('briefing: two seats share a name')
  const electorates: string[] = []
  const mpNames: string[] = []
  const problems: string[] = []
  const joined = results.map((r): Ge2024Result => {
    const name = names.get(r.id) ?? r.id
    const seat = byName.get(nameKey(name))
    if (!seat) throw new Error(`briefing: no row for ${r.id} ${name}`)
    byName.delete(nameKey(name))
    let result = r
    if (r.electorate !== seat.electorate) {
      electorates.push(`${name} ${r.electorate ?? '?'} → ${seat.electorate}`)
      result = { ...r, electorate: seat.electorate }
    }
    const diff = compareWithBriefing(result, seat)
    if (diff.length) problems.push(`${r.id} ${name}: ${diff.join('; ')}`)
    if (result.mp && nameKey(`${result.mp.first} ${result.mp.last}`) !== nameKey(seat.mp)) {
      mpNames.push(`${name}: ${result.mp.first} ${result.mp.last} / briefing ${seat.mp}`)
    }
    return {
      ...result,
      newMp: seat.newMp,
      since2019: { held: seat.held2019, change: seat.change },
    }
  })
  if (problems.length) {
    throw new Error(`Results disagree with the briefing:\n  ${problems.join('\n  ')}`)
  }
  if (byName.size) {
    throw new Error(
      `briefing: rows with no seat: ${[...byName.values()].map((b) => b.name).join(', ')}`,
    )
  }
  return { results: joined, electorates, mpNames }
}
