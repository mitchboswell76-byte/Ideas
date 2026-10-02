/** Tonal (grey) versions of colours, for the menu backdrop. Pure. */

/** OKLab lightness (0–1) of a `#rrggbb` colour. */
export function oklabLightness(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const l = 0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!
  const m = 0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!
  const s = 0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!
  return 0.2104542553 * Math.cbrt(l) + 0.793617785 * Math.cbrt(m) - 0.0040720468 * Math.cbrt(s)
}

/** How much text colour to mix into the background (percent, 8–26) for a colour's lightness. */
export function tonalMix(hex: string): number {
  return Math.round(8 + 18 * oklabLightness(hex))
}
