/** Number formats for effect breakdowns. Pure. */

/** "+5", "−3" (a real minus sign), "0"; with affixes, "−£180" or "+2%". */
export function formatSigned(value: number, unit = '', prefix = ''): string {
  if (value === 0) return `${prefix}0${unit}`
  return `${value > 0 ? '+' : '−'}${prefix}${Math.abs(value)}${unit}`
}

/** "48,544": thousands separators (no Intl, so output is the same everywhere). */
export function formatCount(value: number): string {
  const sign = value < 0 ? '−' : ''
  return sign + String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "11.7%" to one decimal place. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}
