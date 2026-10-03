/**
 * Cached portrait images (DESIGN §4): each look is rendered once and reused; renders queue one per
 * frame. Three.js loads only when the first render is asked for, so this module stays tiny.
 */
import type { QualityPreset } from '../graphics/presets.ts'
import type { Rig } from './rig.ts'

export type Framing = 'bust' | 'full'

/** Image size per preset (Low renders smaller, DESIGN §17). Bust 5:6, full 3:5. */
const SIZES: Readonly<Record<Framing, Readonly<Record<QualityPreset, [number, number]>>>> = {
  bust: { low: [160, 192], medium: [240, 288], high: [340, 408] },
  full: { low: [180, 300], medium: [240, 400], high: [330, 550] },
}

/** Most portraits kept; the oldest image URL is released beyond this. */
const CACHE_LIMIT = 240

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
let failed = false

export function portraitKey(rig: Rig, framing: Framing, preset: QualityPreset): string {
  return `${rig.key}:${framing}:${preset}`
}

/** A finished render, if there is one. */
export function cachedPortrait(key: string): string | null {
  const url = cache.get(key)
  if (url) {
    // Refresh its place in the LRU order.
    cache.delete(key)
    cache.set(key, url)
  }
  return url ?? null
}

/** 3D portraits failed once (no WebGL, context refused): use the 2D illustration from now on. */
export function portraitsFailed(): boolean {
  return failed
}

let queue: Promise<unknown> = Promise.resolve()

const nextFrame = () =>
  new Promise<void>((resolve) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(() => resolve())
      : resolve(),
  )

export function requestPortrait(
  rig: Rig,
  framing: Framing,
  preset: QualityPreset,
): Promise<string> {
  const key = portraitKey(rig, framing, preset)
  const done = cachedPortrait(key)
  if (done) return Promise.resolve(done)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const [width, height] = SIZES[framing][preset]
  const job = queue
    .catch(() => undefined)
    .then(nextFrame)
    .then(() => import('./render.ts'))
    .then((m) => m.renderRig(rig, framing, { width, height }))
    .then((url) => {
      cache.set(key, url)
      while (cache.size > CACHE_LIMIT) {
        const [oldKey, oldUrl] = cache.entries().next().value as [string, string]
        cache.delete(oldKey)
        URL.revokeObjectURL(oldUrl)
      }
      return url
    })
    .catch((error: unknown) => {
      failed = true
      console.warn('Portraits fall back to 2D:', error)
      throw error
    })
    .finally(() => pending.delete(key))
  pending.set(key, job)
  queue = job
  return job
}
