import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, parseTheme } from '../src/ui/store/theme.ts'

describe('parseTheme', () => {
  it('keeps known themes and defaults to dark', () => {
    expect(DEFAULT_THEME).toBe('dark')
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme(null)).toBe('dark')
    expect(parseTheme('sepia')).toBe('dark')
  })

  it('maps the old Night / Paper names', () => {
    expect(parseTheme('night')).toBe('dark')
    expect(parseTheme('paper')).toBe('light')
  })
})
