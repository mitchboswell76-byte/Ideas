/**
 * Deterministic random numbers: sfc32 (Small Fast Counting, 128-bit state). The only source of
 * randomness the simulation may use — never `Math.random`.
 */
import { hash128 } from './hash.ts'

/** Four unsigned 32-bit words. Lives in `world.rngState` so saves capture it. */
export type RngState = [number, number, number, number]

/** Derive a well-mixed starting state from a seed and warm the generator up. */
export function seedState(seed: string | number): RngState {
  const state = hash128(String(seed))
  const rng = new Rng(state)
  for (let i = 0; i < 15; i++) rng.nextU32()
  return state
}

export class Rng {
  /** Mutated in place on every draw, so the owner (the World) always holds the current state. */
  readonly state: RngState

  constructor(state: RngState) {
    this.state = state
  }

  /** Next raw unsigned 32-bit integer. */
  nextU32(): number {
    const s = this.state
    let a = s[0] | 0
    let b = s[1] | 0
    let c = s[2] | 0
    let d = s[3] | 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    s[0] = a >>> 0
    s[1] = b >>> 0
    s[2] = c >>> 0
    s[3] = d >>> 0
    return t >>> 0
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296
  }

  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rng.int: bad range [${min}, ${max}]`)
    }
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** True with probability p (0–1). */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Rng.pick: empty list')
    return items[this.int(0, items.length - 1)]
  }

  /** Pick one item with probability proportional to `weight(item)`; non-positive weights never win. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    let total = 0
    for (const item of items) total += Math.max(0, weight(item))
    if (!(total > 0)) throw new RangeError('Rng.weighted: no positive weights')
    let roll = this.next() * total
    let last: T | undefined
    for (const item of items) {
      const w = Math.max(0, weight(item))
      if (w <= 0) continue
      last = item
      roll -= w
      if (roll < 0) return item
    }
    return last as T
  }

  /** Fisher–Yates shuffle, in place. Returns the same array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      const tmp = items[i]
      items[i] = items[j]
      items[j] = tmp
    }
    return items
  }

  /** Normally distributed value (Box–Muller). No cached spare, so state stays four words. */
  normal(mean = 0, sd = 1): number {
    const u1 = 1 - this.next()
    const u2 = this.next()
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }
}
