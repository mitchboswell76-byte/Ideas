/**
 * What the player's machine can draw: WebGL 2 support (three.js needs it), the GPU's renderer
 * string, and the preset and view that suit it. The pure functions are unit-tested; `probeGpu`
 * touches the DOM and runs once at start-up.
 */
import type { QualityPreset } from './presets.ts'

export type ViewMode = '3d' | '2d'

export interface GpuProbe {
  webgl: boolean
  /** Unmasked renderer string when the browser shares it, e.g. "Intel(R) UHD Graphics 620". */
  renderer: string | null
}

export interface RendererGuess {
  preset: QualityPreset
  /** A CPU rasteriser (no GPU acceleration): 3D will be slow. */
  software: boolean
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i
const HIGH = /geforce|nvidia|quadro|rtx|radeon (rx|pro)|apple m\d|intel.*\barc\b/i
const MEDIUM = /iris|radeon|apple gpu/i
const LOW = /intel|mali|adreno|powervr/i

/** Best-guess preset from the renderer string. Unknown GPUs get Medium. */
export function presetForRenderer(renderer: string | null): RendererGuess {
  if (!renderer) return { preset: 'medium', software: false }
  if (SOFTWARE.test(renderer)) return { preset: 'low', software: true }
  if (HIGH.test(renderer)) return { preset: 'high', software: false }
  if (MEDIUM.test(renderer)) return { preset: 'medium', software: false }
  if (LOW.test(renderer)) return { preset: 'low', software: false }
  return { preset: 'medium', software: false }
}

export interface ViewEnvironment {
  webgl: boolean
  reducedMotion: boolean
  /** Viewport width in CSS pixels. */
  width: number
}

/** Below this width the game starts in 2D (DESIGN §17). */
export const NARROW_WIDTH = 900

/**
 * The view to start in: 2D without WebGL (always), otherwise the player's saved choice, otherwise
 * 2D for reduced motion or narrow screens and 3D for everyone else.
 */
export function defaultView(env: ViewEnvironment, saved: ViewMode | null): ViewMode {
  if (!env.webgl) return '2d'
  if (saved) return saved
  return env.reducedMotion || env.width < NARROW_WIDTH ? '2d' : '3d'
}

/** Create a throwaway WebGL 2 context to read support and the renderer string, then release it. */
export function probeGpu(): GpuProbe {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return { webgl: false, renderer: null }
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { webgl: true, renderer: renderer || null }
  } catch {
    return { webgl: false, renderer: null }
  }
}
