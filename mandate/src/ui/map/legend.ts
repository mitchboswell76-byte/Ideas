/**
 * The map key's content (`MapKey`): a categorical list (parties, regions, blocs) and/or a stepped
 * value scale, plus a short note. Pure, so the modes can build it and tests can read it.
 */

/** One entry in a categorical key. */
export interface KeyItem {
  /** What it matches on the map (party code, region, `none` for no data): used to highlight. */
  id: string
  /** CSS colour for the swatch. */
  swatch: string
  label: string
  /** A number shown after the label, e.g. seats won. */
  count?: number
  /** Draw the swatch as an outline (e.g. the home country). */
  outline?: boolean
  /** Draw the swatch hatched (no figure for these places). */
  hatch?: boolean
}

/**
 * A threshold scale (Bostock's threshold key, as in FT and Guardian election maps): one cell per
 * step, the break values printed between the cells, and words at the two ends.
 */
export interface KeyScale {
  steps: { id: string; swatch: string }[]
  /** `steps.length - 1` break labels, between consecutive cells. */
  ticks: string[]
  low: string
  high: string
}

export interface MapKeyData {
  title: string
  scale: KeyScale | null
  items: KeyItem[]
  note: string | null
}

/** "Under 5%", "5% to 10%", "30% or more": a scale cell's range. */
export function stepLabel(ticks: readonly string[], i: number): string {
  if (i === 0) return `Under ${ticks[0]}`
  if (i >= ticks.length) return `${ticks[ticks.length - 1]} or more`
  return `${ticks[i - 1]} to ${ticks[i]}`
}
