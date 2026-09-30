/** UI-side randomness. The simulation never uses this: it has its own seeded RNG (`ctx.rng`). */

/** A fresh seed for a new game (until character creation supplies one, T10). */
export function randomSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join('')
}
