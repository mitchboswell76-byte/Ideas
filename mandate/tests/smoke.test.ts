import { describe, expect, it } from 'vitest'
import { GAME_VERSION, SAVE_VERSION } from '../src/sim/version.ts'

describe('build metadata', () => {
  it('exposes a semver game version and a positive save version', () => {
    expect(GAME_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(SAVE_VERSION).toBeGreaterThan(0)
  })
})
