/** Number formats for effect breakdowns. Pure. */

/** "+5", "−3" (a real minus sign), "0"; with affixes, "−£180" or "+2%". */
export function formatSigned(value: number, unit = '', prefix = ''): string {
  if (value === 0) return `${prefix}0${unit}`
  return `${value > 0 ? '+' : '−'}${prefix}${Math.abs(value)}${unit}`
}
