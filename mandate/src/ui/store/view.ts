/**
 * View mode (3D or 2D) and graphics quality, per browser (DESIGN §17). The GPU is probed once when
 * this module loads; choices persist in localStorage.
 */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { defaultView, presetForRenderer, probeGpu, type ViewMode } from '../graphics/detect.ts'
import { lowerPreset, QUALITY_PRESETS, type QualityPreset } from '../graphics/presets.ts'
import { readLocal, writeLocal } from './settings.ts'

export type QualitySetting = 'auto' | QualityPreset

/**
 * Something is drawn in 3D (T9: character portraits, rendered offscreen and cached as images), so
 * the 3D/2D toggle and the graphics settings are shown. 2D view draws the illustrated avatars.
 * The persistent 3D layer (`WorldLayer`) is still not mounted: no screen has a live 3D scene yet.
 */
export const HAS_3D_VIEW = true

export const QUALITY_SETTINGS: readonly QualitySetting[] = ['auto', ...QUALITY_PRESETS]

const VIEW_KEY = 'mandate.view'
const QUALITY_KEY = 'mandate.quality'
/** Auto's current pick: the detected preset, lowered after slow animated views. */
const AUTO_KEY = 'mandate.quality.auto'

function parseView(value: string | null): ViewMode | null {
  return value === '3d' || value === '2d' ? value : null
}

function parsePreset(value: string | null): QualityPreset | null {
  return QUALITY_PRESETS.find((p) => p === value) ?? null
}

function parseQuality(value: string | null): QualitySetting {
  return QUALITY_SETTINGS.find((q) => q === value) ?? 'auto'
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

interface ViewState {
  /** WebGL 2 is available (three.js needs it). */
  webgl: boolean
  renderer: string | null
  /** The GPU is a software rasteriser. */
  software: boolean
  /** Auto's current preset. */
  autoPreset: QualityPreset
  quality: QualitySetting
  /** The preset in use. */
  preset: QualityPreset
  view: ViewMode
  setView(view: ViewMode): void
  setQuality(quality: QualitySetting): void
  /** An animated view ran slowly: on Auto, use the next preset down from now on. */
  reportSlowFrames(): void
}

const resolve = (quality: QualitySetting, autoPreset: QualityPreset): QualityPreset =>
  quality === 'auto' ? autoPreset : quality

export const viewStore = createStore<ViewState>()((set, get) => {
  const gpu = probeGpu()
  const guess = presetForRenderer(gpu.renderer)
  const autoPreset = parsePreset(readLocal(AUTO_KEY)) ?? guess.preset
  const quality = parseQuality(readLocal(QUALITY_KEY))
  const view = defaultView(
    { webgl: gpu.webgl, reducedMotion: prefersReducedMotion(), width: window.innerWidth },
    parseView(readLocal(VIEW_KEY)),
  )
  return {
    webgl: gpu.webgl,
    renderer: gpu.renderer,
    software: guess.software,
    autoPreset,
    quality,
    preset: resolve(quality, autoPreset),
    view,
    setView(next) {
      if (next === '3d' && !get().webgl) return
      set({ view: next })
      writeLocal(VIEW_KEY, next)
    },
    setQuality(next) {
      set({ quality: next, preset: resolve(next, get().autoPreset) })
      writeLocal(QUALITY_KEY, next)
    },
    reportSlowFrames() {
      const { quality, autoPreset } = get()
      if (quality !== 'auto' || autoPreset === 'low') return
      const lowered = lowerPreset(autoPreset)
      set({ autoPreset: lowered, preset: lowered })
      writeLocal(AUTO_KEY, lowered)
    },
  }
})

export function useView<T>(selector: (state: ViewState) => T): T {
  return useStore(viewStore, selector)
}
