import { describe, expect, it } from 'vitest'
import { parseCsv } from '../scripts/data/csv.ts'

describe('parseCsv', () => {
  it('reads header-keyed rows with LF or CRLF line ends', () => {
    expect(parseCsv('a,b\n1,2\n3,4\n')).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ])
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }])
  })

  it('handles quoted fields with commas, escaped quotes and newlines', () => {
    const rows = parseCsv('name,note\n"Argyll, Bute and South Lochaber","said ""hi""\nthen left"\n')
    expect(rows).toEqual([
      { name: 'Argyll, Bute and South Lochaber', note: 'said "hi"\nthen left' },
    ])
  })

  it('strips a BOM, keeps empty fields and skips blank lines', () => {
    expect(parseCsv('﻿a,b,c\n1,,3\n\n')).toEqual([{ a: '1', b: '', c: '3' }])
  })

  it('reads a last line without a newline', () => {
    expect(parseCsv('a\n1')).toEqual([{ a: '1' }])
  })

  it('rejects ragged rows and unterminated quotes', () => {
    expect(() => parseCsv('a,b\n1\n')).toThrow(/row 2 has 1 fields/)
    expect(() => parseCsv('a\n"open\n')).toThrow(/quoted field/)
  })
})
