import { describe, expect, it } from 'vitest'
import { defaultView, presetForRenderer } from '../src/ui/graphics/detect.ts'
import { lowerPreset } from '../src/ui/graphics/presets.ts'

describe('presetForRenderer', () => {
  it.each([
    ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'low', false],
    ['Intel(R) HD Graphics 520', 'low', false],
    [
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'medium',
      false,
    ],
    ['ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics Direct3D11)', 'high', false],
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', 'high', false],
    ['AMD Radeon RX 6700 XT', 'high', false],
    ['AMD Radeon(TM) Graphics', 'medium', false],
    ['Apple M2', 'high', false],
    [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      'low',
      true,
    ],
    ['llvmpipe (LLVM 15.0.7, 256 bits)', 'low', true],
    ['Mali-G78', 'low', false],
    ['Some Future GPU', 'medium', false],
  ] as const)('%s → %s', (renderer, preset, software) => {
    expect(presetForRenderer(renderer)).toEqual({ preset, software })
  })

  it('assumes Medium when the browser hides the renderer', () => {
    expect(presetForRenderer(null)).toEqual({ preset: 'medium', software: false })
  })
})

describe('defaultView', () => {
  const desktop = { webgl: true, reducedMotion: false, width: 1440 }

  it('starts in 3D on a capable desktop', () => {
    expect(defaultView(desktop, null)).toBe('3d')
  })

  it('starts in 2D without WebGL, whatever was saved', () => {
    expect(defaultView({ ...desktop, webgl: false }, '3d')).toBe('2d')
  })

  it('starts in 2D for reduced motion or narrow screens', () => {
    expect(defaultView({ ...desktop, reducedMotion: true }, null)).toBe('2d')
    expect(defaultView({ ...desktop, width: 899 }, null)).toBe('2d')
    expect(defaultView({ ...desktop, width: 900 }, null)).toBe('3d')
  })

  it("respects the player's saved choice when WebGL works", () => {
    expect(defaultView({ ...desktop, reducedMotion: true }, '3d')).toBe('3d')
    expect(defaultView(desktop, '2d')).toBe('2d')
  })
})

describe('lowerPreset', () => {
  it('steps down and stops at Low', () => {
    expect(lowerPreset('high')).toBe('medium')
    expect(lowerPreset('medium')).toBe('low')
    expect(lowerPreset('low')).toBe('low')
  })
})
