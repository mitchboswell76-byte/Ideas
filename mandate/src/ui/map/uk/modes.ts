/**
 * UK map modes (DESIGN §17: Paradox map modes): Party (2024 winner), Majority, Turnout and
 * Demographics (a census field). Pure; value ramps are CSS tokens (`map.css`), party colours come
 * from the data and are used only to mean parties.
 */
import type { CensusField, CensusSeat, Ge2024Party, Ge2024Result } from '../../../data/types.ts'
import type { Nation } from '../../../sim/world.ts'
import { formatCount, formatPercent } from '../../kit/numbers.ts'
import type { KeyItem, MapKeyData } from '../legend.ts'

export const UK_MODES = ['party', 'majority', 'turnout', 'demographics'] as const
export type UkMode = (typeof UK_MODES)[number]
/** Shown but not available: swing needs polls and the opinion model (T13). */
export const UK_LATER_MODES = ['swing'] as const

export const UK_MODE_LABELS: Record<UkMode | (typeof UK_LATER_MODES)[number], string> = {
  party: 'Party',
  majority: 'Majority',
  turnout: 'Turnout',
  demographics: 'Demographics',
  swing: 'Swing',
}

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

/** What the current mode shows; breaks are precomputed for the quantile modes. */
export interface ModeSpec {
  mode: UkMode
  field: CensusField
  breaks: readonly number[]
  colours: Record<Ge2024Party, string>
}

/** The number a value mode colours by, or null (Party mode, or no data). */
export function valueOf(seat: SeatData, mode: UkMode, field: CensusField): number | null {
  switch (mode) {
    case 'party':
      return null
    case 'majority':
      return majorityShare(seat.result)
    case 'turnout':
      return turnoutShare(seat.result)
    case 'demographics':
      return seat.census[field]
  }
}

/** Breaks for a mode: fixed for Majority, quintiles of the data for Turnout and Demographics. */
export function breaksFor(
  seats: readonly SeatData[],
  mode: UkMode,
  field: CensusField,
): readonly number[] {
  if (mode === 'party') return []
  if (mode === 'majority') return MAJORITY_BREAKS
  const values = seats.map((s) => valueOf(s, mode, field)).filter((v) => v !== null)
  return quantileBreaks(values)
}

export function fillOf(seat: SeatData, spec: ModeSpec): string {
  if (spec.mode === 'party') return spec.colours[seat.result.winner]
  const value = valueOf(seat, spec.mode, spec.field)
  return value === null ? NO_DATA : rampToken(binOf(value, spec.breaks))
}

/** Which key entry a seat belongs to: its party, its step on the scale, or `none`. */
export function keyOf(seat: SeatData, spec: ModeSpec): string {
  if (spec.mode === 'party') return seat.result.winner
  const value = valueOf(seat, spec.mode, spec.field)
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
  }
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
export function gapsOf(seats: readonly SeatData[], mode: UkMode, field: CensusField): Nation[] {
  const gaps = new Set<Nation>()
  for (const s of seats) if (valueOf(s, mode, field) === null) gaps.add(s.nation)
  return NATION_ORDER.filter((n) => gaps.has(n))
}

/** Where a census measure has figures: the nations with no gaps, e.g. "Great Britain". */
export function coverageOf(seats: readonly SeatData[], field: CensusField): string {
  const gaps = gapsOf(seats, 'demographics', field)
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
}

/** Why some seats are hatched, in words a player can use. */
function gapNote(gaps: readonly Nation[], field: CensusField, mode: UkMode): string | null {
  if (!gaps.length) return null
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
  const [low, high] = SCALE_ENDS[spec.mode]
  const gaps = gapsOf(seats, spec.mode, spec.field)
  const items: KeyItem[] = gaps.length
    ? [{ id: 'none', swatch: NO_DATA_SWATCH, label: 'No figure', hatch: true }]
    : []
  const notes: string[] = []
  if (spec.mode === 'demographics') {
    notes.push('Census 2021 (Scotland 2022).')
    if (spec.field === 'density') notes.push("Scotland's from boundary areas.")
  } else {
    notes.push('Share of valid votes, 4 July 2024.')
  }
  const gap = gapNote(gaps, spec.field, spec.mode)
  if (gap) notes.push(gap)
  return {
    title:
      spec.mode === 'demographics' ? fieldLabel : spec.mode === 'majority' ? 'Majority' : 'Turnout',
    scale: {
      steps: Array.from({ length: spec.breaks.length + 1 }, (_, i) => ({
        id: `step${i}`,
        swatch: rampToken(i),
      })),
      ticks: tickLabels(spec.mode, spec.field, spec.breaks),
      low,
      high,
    },
    items,
    note: notes.join(' '),
  }
}
