/** A row in a map key. */
export interface LegendRow {
  /** CSS colour for the swatch. */
  swatch: string
  label: string
  /** Draw the swatch as an outline (e.g. the home country). */
  outline?: boolean
}
