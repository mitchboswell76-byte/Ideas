import { describe, expect, it } from 'vitest'
import { formatBytes, formatLongDate, formatShortDate } from '../src/ui/format.ts'

describe('UI formats', () => {
  it('formats game dates in UK style', () => {
    expect(formatLongDate('2026-10-01')).toBe('Thursday 1 October 2026')
    expect(formatShortDate('2026-10-01')).toBe('Thu 1 Oct 2026')
    expect(formatShortDate('2028-02-29')).toBe('Tue 29 Feb 2028')
    expect(formatLongDate(null)).toBe('—')
  })

  it('formats sizes', () => {
    expect(formatBytes(280)).toBe('280 B')
    expect(formatBytes(2560)).toBe('2.5 KB')
  })
})
