/**
 * UK map modes (DESIGN §17: Paradox map modes): Party (2024 winner), Majority, Turnout and
 * Demographics (a census field). Pure; value ramps are CSS tokens (`map.css`), party colours come
 * from the data and are used only to mean parties.
 */
import type { CensusField, CensusSeat, Ge2024Party, Ge2024Result } from '../../../data/types.ts'
import { formatCount, formatPercent } from '../../kit/numbers.ts'
import type { LegendRow } from '../legend.ts'

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

export const NO_DATA = 'var(--map-nodata)'
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

function rangeLabels(breaks: readonly number[], format: (v: number) => string): string[] {
  if (!breaks.length) return []
  const labels = [`Under ${format(breaks[0]!)}`]
  for (let i = 1; i < breaks.length; i++) {
    labels.push(`${format(breaks[i - 1]!)} to ${format(breaks[i]!)}`)
  }
  labels.push(`${format(breaks[breaks.length - 1]!)} or more`)
  return labels
}

/** The map key. Party mode lists parties by seats won; value modes list their ramp. */
export function legendFor(
  seats: readonly SeatData[],
  spec: ModeSpec,
  partyName: (p: Ge2024Party) => string,
): LegendRow[] {
  if (spec.mode === 'party') {
    const won = new Map<Ge2024Party, number>()
    for (const s of seats) won.set(s.result.winner, (won.get(s.result.winner) ?? 0) + 1)
    return [...won]
      .sort((a, b) => b[1] - a[1] || partyName(a[0]).localeCompare(partyName(b[0]), 'en'))
      .map(([party, n]) => ({ swatch: spec.colours[party], label: `${partyName(party)} ${n}` }))
  }
  const format =
    spec.mode === 'demographics'
      ? (v: number) => formatField(spec.field, v)
      : (v: number) => formatPercent(v, 0)
  const labels = rangeLabels(spec.breaks, format)
  if (spec.mode === 'majority') {
    labels[0] += ' (marginal)'
    labels[labels.length - 1] += ' (safe)'
  }
  const rows: LegendRow[] = labels.map((label, i) => ({ swatch: rampToken(i), label }))
  if (seats.some((s) => valueOf(s, spec.mode, spec.field) === null)) {
    rows.push({ swatch: NO_DATA, label: 'No data' })
  }
  return rows
}

/** Why some seats have no data in this mode, for the legend note. */
export function legendNote(spec: ModeSpec): string | null {
  switch (spec.mode) {
    case 'party':
      return 'General election, 4 July 2024.'
    case 'majority':
    case 'turnout':
      return 'No data: Northern Ireland (winners only so far).'
    case 'demographics':
      return 'Census 2021 (Scotland 2022). No data: Northern Ireland, some Scottish measures.'
  }
}
