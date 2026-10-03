/**
 * UK map modes (DESIGN §17: Paradox map modes): Party (2024 winner), Majority, Turnout,
 * Demographics (a census field) and Since 2019 (seats changing hands, swing, change in a party's
 * share). Pure; value ramps are CSS tokens (`map.css`), party colours come from the data and are
 * used only to mean parties.
 */
import type { CensusField, CensusSeat, Ge2024Party, Ge2024Result } from '../../../data/types.ts'
import type { Nation } from '../../../sim/world.ts'
import { formatCount, formatPercent } from '../../kit/numbers.ts'
import type { KeyItem, MapKeyData } from '../legend.ts'

export const UK_MODES = ['party', 'majority', 'turnout', 'demographics', 'change'] as const
export type UkMode = (typeof UK_MODES)[number]

export const UK_MODE_LABELS: Record<UkMode, string> = {
  party: 'Party',
  majority: 'Majority',
  turnout: 'Turnout',
  demographics: 'Demographics',
  change: 'Since 2019',
}

/** Parties whose change in vote share Since 2019 can show (the briefing's table columns). */
export const CHANGE_PARTIES = [
  'lab',
  'con',
  'ld',
  'reform',
  'green',
  'snp',
  'pc',
  'sf',
  'dup',
  'alliance',
  'uup',
  'sdlp',
] as const satisfies readonly Ge2024Party[]
export type ChangeParty = (typeof CHANGE_PARTIES)[number]

/** Since 2019 shows seats that changed hands, the Conservative–Labour swing or one party's share. */
export type ChangeMeasure = 'gains' | 'swing' | ChangeParty

export function parseChangeMeasure(value: string): ChangeMeasure {
  if (value === 'gains' || value === 'swing') return value
  return (CHANGE_PARTIES as readonly string[]).includes(value) ? (value as ChangeParty) : 'gains'
}

/** Percentage points; both scales centre on 0 so the colour changes side there. */
export const SWING_BREAKS = [-10, -5, 0, 5, 10, 15, 20] as const
export const CHANGE_BREAKS = [-20, -10, -5, 0, 5, 10, 20] as const
/** How much of the side's colour each step away from 0 mixes in (the rest is `--map-zero`). */
const CHANGE_TONES = [22, 40, 58, 78, 100] as const

/** Steps in a value ramp (`--map-seq-0` … `--map-seq-4`). */
export const RAMP_STEPS = 5
/** Majority as a share of valid votes: under 5% is marginal, 30% or more is safe. */
export const MAJORITY_BREAKS = [5, 10, 20, 30] as const

/** Seats with no figure are hatched (an SVG pattern `UkMap` defines), not a flat grey. */
export const NO_DATA = 'url(#ukmap-nodata)'
/** The key's swatch for it (CSS hatching in `.map-key__swatch--hatch`). */
export const NO_DATA_SWATCH = 'var(--map-nodata)'
export const rampToken = (step: number) => `var(--map-seq-${step})`

/** Majority as % of valid votes, or null where only the winner is known. */
export function majorityShare(r: Ge2024Result): number | null {
  return r.majority !== null && r.valid ? (100 * r.majority) / r.valid : null
}

/** Valid votes as % of the electorate (the Commons Library's turnout). */
export function turnoutShare(r: Ge2024Result): number | null {
  return r.valid !== null && r.electorate ? (100 * r.valid) / r.electorate : null
}

/** A party's share of valid votes, or null when votes are not known. */
export function voteShare(r: Ge2024Result, party: Ge2024Party): number | null {
  return r.votes && r.valid ? (100 * (r.votes[party] ?? 0)) / r.valid : null
}

/**
 * Butler swing from Conservative to Labour since 2019: the mean of Labour's rise and the
 * Conservatives' fall, in points. Null where the briefing has no column for either.
 */
export function swingConLab(r: Ge2024Result): number | null {
  const { lab, con } = r.since2019.change
  return lab === undefined || con === undefined ? null : (lab - con) / 2
}

/** "+5", "−10", "0": a change in points for keys and lines. */
export function signed(value: number, dp = 0): string {
  const abs = Math.abs(value).toFixed(dp)
  if (Number(abs) === 0) return (0).toFixed(dp)
  return `${value > 0 ? '+' : '−'}${abs}`
}

/**
 * `bins - 1` breaks splitting the values into equal-count groups (quintiles by default), rounded
 * to one decimal place (whole numbers above 1,000) so the legend reads cleanly.
 */
export function quantileBreaks(values: readonly number[], bins = RAMP_STEPS): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return []
  const out: number[] = []
  for (let i = 1; i < bins; i++) {
    const v = sorted[Math.min(sorted.length - 1, Math.floor((i * sorted.length) / bins))]!
    const rounded = Math.abs(v) >= 1000 ? Math.round(v) : Math.round(v * 10) / 10
    if (!out.length || rounded > out[out.length - 1]!) out.push(rounded)
  }
  return out
}

/** Which bin a value falls in: 0 below the first break, `breaks.length` at or above the last. */
export function binOf(value: number, breaks: readonly number[]): number {
  let bin = 0
  while (bin < breaks.length && value >= breaks[bin]!) bin++
  return bin
}

/** A census value for display: people as a count, density per hectare, the rest as %. */
export function formatField(field: CensusField, value: number): string {
  if (field === 'population') return formatCount(value)
  if (field === 'density') return `${value.toFixed(1)} per ha`
  return formatPercent(value)
}

export interface SeatData {
  nation: Nation
  result: Ge2024Result
  census: CensusSeat
}

/** Which mode and option: enough to say what a seat's value is. */
export interface ModeQuery {
  mode: UkMode
  field: CensusField
  measure: ChangeMeasure
}

/** What the current mode shows; breaks are precomputed for the quantile modes. */
export interface ModeSpec extends ModeQuery {
  breaks: readonly number[]
  colours: Record<Ge2024Party, string>
}

/** Modes that colour by category (a party, held or gained), not along a scale. */
export const isCategorical = (q: ModeQuery) =>
  q.mode === 'party' || (q.mode === 'change' && q.measure === 'gains')

/** The number a value mode colours by, or null (a categorical mode, or no data). */
export function valueOf(seat: SeatData, q: ModeQuery): number | null {
  switch (q.mode) {
    case 'party':
      return null
    case 'majority':
      return majorityShare(seat.result)
    case 'turnout':
      return turnoutShare(seat.result)
    case 'demographics':
      return seat.census[q.field]
    case 'change':
      if (q.measure === 'gains') return null
      if (q.measure === 'swing') return swingConLab(seat.result)
      return seat.result.since2019.change[q.measure] ?? null
  }
}

/**
 * Breaks for a mode: fixed for Majority and Since 2019 (so parties compare), quintiles of the data
 * for Turnout and Demographics.
 */
export function breaksFor(seats: readonly SeatData[], q: ModeQuery): readonly number[] {
  if (isCategorical(q)) return []
  if (q.mode === 'majority') return MAJORITY_BREAKS
  if (q.mode === 'change') return q.measure === 'swing' ? SWING_BREAKS : CHANGE_BREAKS
  const values = seats.map((s) => valueOf(s, q)).filter((v) => v !== null)
  return quantileBreaks(values)
}

/** Steps away from 0 on a Since 2019 scale: 1 for the steps either side of it. */
function stepsFromZero(step: number, breaks: readonly number[]): number {
  const zero = breaks.indexOf(0) + 1
  return step >= zero ? step - zero + 1 : zero - step
}

/**
 * A Since 2019 step's colour: the side's colour (the party's for a rise or for Labour's side of the
 * swing; grey for a fall; the Conservatives' for their side of the swing) mixed into
 * `--map-zero`, stronger with each step away from 0.
 */
export function changeTone(step: number, spec: ModeSpec): string {
  const zero = spec.breaks.indexOf(0) + 1
  const rise = step >= zero
  const colour =
    spec.measure === 'swing'
      ? spec.colours[rise ? 'lab' : 'con']
      : rise
        ? spec.colours[spec.measure as ChangeParty]
        : 'var(--map-loss)'
  const tone = CHANGE_TONES[Math.min(stepsFromZero(step, spec.breaks), CHANGE_TONES.length) - 1]
  return tone === 100 ? colour : `color-mix(in oklab, ${colour} ${tone}%, var(--map-zero))`
}

/** A scale step's colour in the current mode. */
export function stepTone(step: number, spec: ModeSpec): string {
  return spec.mode === 'change' ? changeTone(step, spec) : rampToken(step)
}

export function fillOf(seat: SeatData, spec: ModeSpec): string {
  if (spec.mode === 'party') return spec.colours[seat.result.winner]
  if (isCategorical(spec)) {
    const { winner, since2019 } = seat.result
    return since2019.held === winner ? 'var(--map-hold)' : spec.colours[winner]
  }
  const value = valueOf(seat, spec)
  return value === null ? NO_DATA : stepTone(binOf(value, spec.breaks), spec)
}

/** Which key entry a seat belongs to: its party, held, its step on the scale, or `none`. */
export function keyOf(seat: SeatData, spec: ModeSpec): string {
  if (spec.mode === 'party') return seat.result.winner
  if (isCategorical(spec)) {
    const { winner, since2019 } = seat.result
    return since2019.held === winner ? 'held' : winner
  }
  const value = valueOf(seat, spec)
  return value === null ? 'none' : `step${binOf(value, spec.breaks)}`
}

/** The tooltip line under the seat name. */
export function modeLine(
  seat: SeatData,
  spec: ModeSpec,
  partyName: (p: Ge2024Party) => string,
): string {
  const winner = partyName(seat.result.winner)
  switch (spec.mode) {
    case 'party':
      return `Won by ${winner} (July 2024)`
    case 'majority': {
      const share = majorityShare(seat.result)
      return share === null
        ? `${winner}; majority not known`
        : `${winner} majority ${formatCount(seat.result.majority!)} (${formatPercent(share)})`
    }
    case 'turnout': {
      const share = turnoutShare(seat.result)
      return share === null ? 'Turnout not known' : `Turnout ${formatPercent(share)}`
    }
    case 'demographics': {
      const v = seat.census[spec.field]
      return v === null ? 'No census figure' : formatField(spec.field, v)
    }
    case 'change':
      return changeLine(seat.result, spec.measure, partyName)
  }
}

function changeLine(
  r: Ge2024Result,
  measure: ChangeMeasure,
  partyName: (p: Ge2024Party) => string,
): string {
  if (measure === 'gains') {
    return r.since2019.held === r.winner
      ? `${partyName(r.winner)} hold`
      : `${partyName(r.winner)} gain from ${partyName(r.since2019.held)}`
  }
  if (measure === 'swing') {
    const swing = swingConLab(r)
    if (swing === null) return 'No Conservative–Labour swing figure'
    const [from, to] = swing >= 0 ? ['Conservative', 'Labour'] : ['Labour', 'Conservative']
    return `${Math.abs(swing).toFixed(1)}-point swing, ${from} to ${to}`
  }
  const change = r.since2019.change[measure]
  const share = voteShare(r, measure)
  if (change === undefined || share === null) return `No figure for ${partyName(measure)} here`
  const moved =
    Math.abs(change) < 0.05
      ? 'no change'
      : `${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} points`
  return `${partyName(measure)} ${formatPercent(share)}, ${moved}`
}

const NATION_NAMES: Record<Nation, string> = {
  england: 'England',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland',
}
const NATION_ORDER: Nation[] = ['england', 'wales', 'scotland', 'northern-ireland']

/** "A", "A and B", "A, B and C". */
export function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Nations where some seat has no figure in this mode. */
export function gapsOf(seats: readonly SeatData[], q: ModeQuery): Nation[] {
  if (isCategorical(q)) return []
  const gaps = new Set<Nation>()
  for (const s of seats) if (valueOf(s, q) === null) gaps.add(s.nation)
  return NATION_ORDER.filter((n) => gaps.has(n))
}

/** Where a census measure has figures: the nations with no gaps, e.g. "Great Britain". */
export function coverageOf(seats: readonly SeatData[], field: CensusField): string {
  const gaps = gapsOf(seats, { mode: 'demographics', field, measure: 'gains' })
  const covered = NATION_ORDER.filter((n) => !gaps.includes(n))
  if (gaps.length === 0) return 'United Kingdom'
  if (gaps.length === 1 && gaps[0] === 'northern-ireland') return 'Great Britain'
  return listOf(covered.map((n) => NATION_NAMES[n]))
}

/**
 * Break values for the key's ticks, short enough to sit between 40px cells: whole percentages
 * where that keeps them apart, people in thousands, density without its unit (the title has it).
 */
export function tickLabels(mode: UkMode, field: CensusField, breaks: readonly number[]): string[] {
  const percent = (dp: number) => breaks.map((v) => formatPercent(v, dp))
  if (mode === 'change') return breaks.map((v) => signed(v))
  if (mode === 'majority' || mode === 'turnout') return percent(0)
  if (field === 'population') return breaks.map((v) => `${Math.round(v / 1000)}k`)
  const short = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)))
  const labels = field === 'density' ? breaks.map(short) : breaks.map((v) => `${short(v)}%`)
  // Rounding must not make two breaks look the same.
  if (new Set(labels).size === labels.length) return labels
  return field === 'density' ? breaks.map((v) => v.toFixed(1)) : percent(1)
}

const SCALE_ENDS: Record<Exclude<UkMode, 'party'>, [string, string]> = {
  majority: ['Marginal', 'Safe'],
  turnout: ['Lower', 'Higher'],
  demographics: ['Lower', 'Higher'],
  change: ['Fell', 'Rose'],
}

/** Parties that stand in one nation only (the rest of the map is hatched for them). */
const ONE_NATION: Partial<Record<ChangeParty, string>> = {
  snp: 'Scotland',
  pc: 'Wales',
  sf: 'Northern Ireland',
  dup: 'Northern Ireland',
  alliance: 'Northern Ireland',
  uup: 'Northern Ireland',
  sdlp: 'Northern Ireland',
}

const NOTIONAL = 'Points, against notional 2019 results on the new boundaries (Commons Library).'

/** Why some seats are hatched, in words a player can use. */
function gapNote(
  gaps: readonly Nation[],
  q: ModeQuery,
  partyName: (p: Ge2024Party) => string,
): string | null {
  if (!gaps.length) return null
  const { mode, field, measure } = q
  if (mode === 'change') {
    if (measure === 'swing') {
      return "Hatched: Northern Ireland's results have no Conservative or Labour column."
    }
    const party = partyName(measure as ChangeParty)
    const only = ONE_NATION[measure as ChangeParty]
    return only
      ? `Hatched: ${party} stands in ${only} only.`
      : `Hatched: Northern Ireland's results have no ${party} column.`
  }
  if (mode === 'demographics' && field === 'welshSpeakers') {
    return 'Hatched: the Welsh-language question is asked in Wales only.'
  }
  const ni = gaps.includes('northern-ireland')
  const others = gaps.filter((n) => n !== 'northern-ireland').map((n) => NATION_NAMES[n])
  const parts: string[] = []
  if (others.length) parts.push(`${listOf(others)}'s census source has no figure for this`)
  if (ni) parts.push("Northern Ireland's census (NISRA) is not in the game's data yet")
  return `Hatched: ${parts.join('; ')}.`
}

/** The map key: parties by seats won, or the mode's stepped scale. */
export function mapKeyFor(
  seats: readonly SeatData[],
  spec: ModeSpec,
  partyName: (p: Ge2024Party) => string,
  fieldLabel: string,
): MapKeyData {
  if (spec.mode === 'party') {
    const won = new Map<Ge2024Party, number>()
    for (const s of seats) won.set(s.result.winner, (won.get(s.result.winner) ?? 0) + 1)
    const items: KeyItem[] = [...won]
      .sort((a, b) => b[1] - a[1] || partyName(a[0]).localeCompare(partyName(b[0]), 'en'))
      .map(([party, n]) => ({
        id: party,
        swatch: spec.colours[party],
        label: partyName(party),
        count: n,
      }))
    return { title: 'Seats won, 4 July 2024', scale: null, items, note: null }
  }
  if (isCategorical(spec)) return gainsKey(seats, spec, partyName)
  const [low, high] =
    spec.measure === 'swing' && spec.mode === 'change'
      ? ['To Con', 'To Lab']
      : SCALE_ENDS[spec.mode]
  const gaps = gapsOf(seats, spec)
  const items: KeyItem[] = gaps.length
    ? [{ id: 'none', swatch: NO_DATA_SWATCH, label: 'No figure', hatch: true }]
    : []
  const notes: string[] = []
  if (spec.mode === 'demographics') {
    notes.push('Census 2021 (Scotland 2022).')
    if (spec.field === 'density') notes.push("Scotland's from boundary areas.")
  } else if (spec.mode === 'change') {
    notes.push(NOTIONAL)
    if (spec.measure === 'reform') notes.push("Reform's is measured from the Brexit Party's.")
  } else {
    notes.push('Share of valid votes, 4 July 2024.')
  }
  const gap = gapNote(gaps, spec, partyName)
  if (gap) notes.push(gap)
  const titles: Record<Exclude<UkMode, 'party'>, string> = {
    majority: 'Majority',
    turnout: 'Turnout',
    demographics: fieldLabel,
    change:
      spec.measure === 'swing'
        ? 'Swing, Conservative to Labour'
        : `${partyName(spec.measure as ChangeParty)} share, change`,
  }
  return {
    title: titles[spec.mode],
    scale: {
      steps: Array.from({ length: spec.breaks.length + 1 }, (_, i) => ({
        id: `step${i}`,
        swatch: stepTone(i, spec),
      })),
      ticks: tickLabels(spec.mode, spec.field, spec.breaks),
      low,
      high,
    },
    items,
    note: notes.join(' '),
  }
}

/** Since 2019, seats changing hands: held seats, then each party's gains, most first. */
function gainsKey(
  seats: readonly SeatData[],
  spec: ModeSpec,
  partyName: (p: Ge2024Party) => string,
): MapKeyData {
  let held = 0
  const gains = new Map<Ge2024Party, number>()
  for (const { result } of seats) {
    if (result.since2019.held === result.winner) held++
    else gains.set(result.winner, (gains.get(result.winner) ?? 0) + 1)
  }
  const items: KeyItem[] = [...gains]
    .sort((a, b) => b[1] - a[1] || partyName(a[0]).localeCompare(partyName(b[0]), 'en'))
    .map(([party, n]) => ({
      id: party,
      swatch: spec.colours[party],
      label: `${partyName(party)} gain`,
      count: n,
    }))
  items.push({ id: 'held', swatch: 'var(--map-hold)', label: 'Held', count: held })
  return {
    title: 'Seats that changed hands',
    scale: null,
    items,
    note: 'Against notional 2019 results on the new boundaries (Commons Library).',
  }
}
