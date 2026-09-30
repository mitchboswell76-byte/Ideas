/** Colour helpers for data-driven colours (party colours, personal colours). Pure. */

export type Rgb = readonly [r: number, g: number, b: number]

/** `#rgb` or `#rrggbb` → 0–255 channels; `null` if it isn't a hex colour. */
export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between two luminances (1–21). */
export function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export const INK_LIGHT = '#ffffff'
export const INK_DARK = '#111418'

/** Text colour for a coloured background (a party-tinted header): whichever contrasts more. */
export function readableInk(background: string): typeof INK_LIGHT | typeof INK_DARK {
  const rgb = parseHex(background)
  if (!rgb) return INK_LIGHT
  const bg = luminance(rgb)
  const dark = luminance(parseHex(INK_DARK)!)
  return contrast(bg, 1) >= contrast(bg, dark) ? INK_LIGHT : INK_DARK
}
