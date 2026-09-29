import { describe, expect, it } from 'vitest'
import {
  GLYPH_HEIGHT,
  ICON_NAMES,
  bitmapPath,
  glyph,
  hasGlyph,
  icon,
  inkRuns,
  textBitmap,
} from '../src/ui/pixel/font.ts'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const PUNCTUATION = ` .,:;!?'"-+=/()<>&£%#*_`

describe('bitmap font', () => {
  it('draws every letter and digit 5 wide and 7 tall, with some ink', () => {
    for (const ch of LETTERS) {
      const g = glyph(ch)
      expect(g, ch).toMatchObject({ width: 5, height: GLYPH_HEIGHT })
      expect(
        g.rows.every((row) => row.length === 5),
        ch,
      ).toBe(true)
      expect(g.rows.flat().some(Boolean), ch).toBe(true)
    }
  })

  it('gives punctuation consistent rows', () => {
    for (const ch of PUNCTUATION) {
      expect(hasGlyph(ch), ch).toBe(true)
      const g = glyph(ch)
      expect(g.height, ch).toBe(GLYPH_HEIGHT)
      expect(
        g.rows.every((row) => row.length === g.width),
        ch,
      ).toBe(true)
    }
  })

  it('draws lower case as capitals and unknown characters as ?', () => {
    expect(glyph('m')).toEqual(glyph('M'))
    expect(hasGlyph('é')).toBe(false)
    expect(glyph('é')).toEqual(glyph('?'))
  })

  it('draws every icon 7×7', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(10)
    for (const name of ICON_NAMES) {
      const b = icon(name)
      expect(b, name).toMatchObject({ width: 7, height: 7 })
      expect(
        b.rows.every((row) => row.length === 7),
        name,
      ).toBe(true)
    }
  })

  it('lays out text with tracking between glyphs', () => {
    const b = textBitmap('A.I', { tracking: 1 })
    expect(b.width).toBe(5 + 1 + 1 + 1 + 5)
    expect(b.rows[6]![6]).toBe(true) // the full stop
    expect(textBitmap('').width).toBe(0)
    expect(textBitmap('AA', { tracking: 3 }).width).toBe(13)
  })

  it('turns ink into horizontal runs and an SVG path covering the same pixels', () => {
    const t = glyph('T')
    const runs = inkRuns(t)
    expect(runs[0]).toEqual([0, 0, 5])
    expect(runs.slice(1)).toEqual(Array.from({ length: 6 }, (_, i) => [2, i + 1, 1]))
    const inked = t.rows.flat().filter(Boolean).length
    expect(runs.reduce((n, [, , len]) => n + len, 0)).toBe(inked)
    expect(bitmapPath(t).startsWith('M0 0h5v1h-5z')).toBe(true)
  })
})
