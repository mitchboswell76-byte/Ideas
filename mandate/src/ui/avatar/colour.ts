/** Small hex colour helpers for avatar palettes (pure). */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (rgb: readonly number[]) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`

/** `a` → `b` by `t` (0–1), in sRGB. */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a)
  const y = parse(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

/** Darker (f < 1) or lighter (f > 1). */
export function shade(hex: string, f: number): string {
  return f < 1 ? mix(hex, '#000000', 1 - f) : mix(hex, '#ffffff', f - 1)
}

/** Relative luminance (0–1), for picking readable or contrasting parts. */
export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
