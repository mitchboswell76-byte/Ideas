/** FM-style attribute values (DESIGN §17): 1–20, coloured by band. Pure. */

export const ATTRIBUTE_MIN = 1
export const ATTRIBUTE_MAX = 20

/** Colour band 1–5 (`--attr-1` … `--attr-5`): red, orange, yellow, green, blue-green. */
export type AttributeBand = 1 | 2 | 3 | 4 | 5

/** Band upper bounds, inclusive: 1–5, 6–9, 10–13, 14–16, 17–20. */
const BAND_TOPS = [5, 9, 13, 16] as const

/** Round and clamp to the 1–20 scale. */
export function clampAttribute(value: number): number {
  if (!Number.isFinite(value)) return ATTRIBUTE_MIN
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, Math.round(value)))
}

export function attributeBand(value: number): AttributeBand {
  const v = clampAttribute(value)
  const i = BAND_TOPS.findIndex((top) => v <= top)
  return (i === -1 ? 5 : i + 1) as AttributeBand
}
