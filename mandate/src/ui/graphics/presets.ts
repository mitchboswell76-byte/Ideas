/**
 * Graphics presets (DESIGN §17). `scale` is the internal render resolution as a fraction of the
 * canvas's CSS size; the browser upscales the result, so a lower scale is cheaper on laptop GPUs.
 */
export type QualityPreset = 'low' | 'medium' | 'high'

export const QUALITY_PRESETS: readonly QualityPreset[] = ['low', 'medium', 'high']

export interface PresetSpec {
  label: string
  scale: number
}

export const PRESETS: Readonly<Record<QualityPreset, PresetSpec>> = {
  low: { label: 'Low', scale: 0.5 },
  medium: { label: 'Medium', scale: 0.75 },
  high: { label: 'High', scale: 1 },
}

/** Idle scenes redraw a few times a second instead of every frame (`useStepper`). */
export const STEP_FPS = 12

/** If animated 3D views average slower than this (ms per frame) on Auto, drop a preset. */
export const SLOW_FRAME_MS = 40

export function lowerPreset(preset: QualityPreset): QualityPreset {
  return preset === 'high' ? 'medium' : 'low'
}
