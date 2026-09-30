import { describe, expect, it } from 'vitest'
import { attributeBand, clampAttribute } from '../src/ui/kit/attributes.ts'
import { INK_DARK, INK_LIGHT, parseHex, readableInk } from '../src/ui/kit/colour.ts'
import { placeBeside, placeFloating } from '../src/ui/kit/place.ts'
import { formatSigned } from '../src/ui/kit/numbers.ts'
import { nextSort, sortRows } from '../src/ui/kit/table.ts'
import { majorityOf, voteLayout } from '../src/ui/kit/vote.ts'

describe('colour', () => {
  it('parses hex colours', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('0af')).toEqual([0, 170, 255])
    expect(parseHex('red')).toBeNull()
  })

  it('picks the more readable ink for a background', () => {
    expect(readableInk('#000000')).toBe(INK_LIGHT)
    expect(readableInk('#ffffff')).toBe(INK_DARK)
    expect(readableInk('#1f4e9c')).toBe(INK_LIGHT) // deep blue
    expect(readableInk('#f2c230')).toBe(INK_DARK) // yellow
    expect(readableInk('#56606b')).toBe(INK_LIGHT) // placeholder slate
    expect(readableInk('not a colour')).toBe(INK_LIGHT)
  })
})

describe('attributes', () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 2],
    [9, 2],
    [10, 3],
    [13, 3],
    [14, 4],
    [16, 4],
    [17, 5],
    [20, 5],
  ] as const)('%i is band %i', (value, band) => {
    expect(attributeBand(value)).toBe(band)
  })

  it('rounds and clamps to 1–20', () => {
    expect(clampAttribute(0)).toBe(1)
    expect(clampAttribute(25)).toBe(20)
    expect(clampAttribute(13.6)).toBe(14)
    expect(clampAttribute(Number.NaN)).toBe(1)
    expect(attributeBand(99)).toBe(5)
  })
})

describe('sortRows', () => {
  const rows = [
    { name: 'Seat 10', n: 3 },
    { name: 'seat 2', n: null },
    { name: 'Seat 1', n: 3 },
    { name: 'Abbey', n: 12 },
  ]

  it('sorts numbers numerically, stable on ties, blanks last both ways', () => {
    expect(sortRows(rows, (r) => r.n, 'asc').map((r) => r.name)).toEqual([
      'Seat 10',
      'Seat 1',
      'Abbey',
      'seat 2',
    ])
    expect(sortRows(rows, (r) => r.n, 'desc').map((r) => r.name)).toEqual([
      'Abbey',
      'Seat 10',
      'Seat 1',
      'seat 2',
    ])
  })

  it('sorts text naturally, ignoring case', () => {
    expect(sortRows(rows, (r) => r.name, 'asc').map((r) => r.name)).toEqual([
      'Abbey',
      'Seat 1',
      'seat 2',
      'Seat 10',
    ])
  })

  it('does not mutate the input', () => {
    const copy = [...rows]
    sortRows(rows, (r) => r.name, 'desc')
    expect(rows).toEqual(copy)
  })

  it('flips the direction on the same column', () => {
    expect(nextSort(null, 'a')).toEqual({ key: 'a', dir: 'desc' })
    expect(nextSort({ key: 'a', dir: 'desc' }, 'a')).toEqual({ key: 'a', dir: 'asc' })
    expect(nextSort({ key: 'a', dir: 'asc' }, 'b', 'asc')).toEqual({ key: 'b', dir: 'asc' })
  })
})

describe('voteLayout', () => {
  it('needs more than half', () => {
    expect(majorityOf(650)).toBe(326)
    expect(majorityOf(649)).toBe(325)
    expect(majorityOf(0)).toBe(1)
  })

  it('lays out shares and the majority line', () => {
    const v = voteLayout({ for: 300, against: 200, undecided: 150 })
    expect(v.majority).toBe(326)
    expect(v.majorityAt).toBeCloseTo(326 / 650)
    expect(v.shares.for + v.shares.against + v.shares.undecided).toBeCloseTo(1)
    expect(v.outcome).toBe('open')
  })

  it('settles once the majority is reached or out of reach', () => {
    expect(voteLayout({ for: 326, against: 0, undecided: 324 }).outcome).toBe('passes')
    expect(voteLayout({ for: 100, against: 325, undecided: 225 }).outcome).toBe('fails')
    expect(voteLayout({ for: 100, against: 324, undecided: 226 }).outcome).toBe('open')
  })

  it('counts seats outside the three groups as undecided space', () => {
    const v = voteLayout({ for: 10, against: 10, undecided: 0 }, 100)
    expect(v.majority).toBe(51)
    expect(v.shares.undecided).toBeCloseTo(0.8)
  })
})

describe('placeFloating', () => {
  const viewport = { width: 1000, height: 800 }
  const size = { width: 300, height: 200 }

  it('goes below the anchor when there is room', () => {
    expect(placeFloating({ left: 100, top: 100, width: 50, height: 20 }, size, viewport)).toEqual({
      left: 100,
      top: 126,
      side: 'below',
    })
  })

  it('flips above near the bottom and clamps to the right edge', () => {
    expect(placeFloating({ left: 900, top: 700, width: 50, height: 20 }, size, viewport)).toEqual({
      left: 692,
      top: 494,
      side: 'above',
    })
  })

  it('uses the roomier side when neither fits', () => {
    const tall = { width: 300, height: 700 }
    expect(placeFloating({ left: 0, top: 300, width: 50, height: 20 }, tall, viewport)).toEqual({
      left: 8,
      top: 326,
      side: 'below',
    })
    expect(placeFloating({ left: 0, top: 500, width: 50, height: 20 }, tall, viewport).side).toBe(
      'above',
    )
  })
})

describe('formatSigned', () => {
  it('uses a real minus sign and places affixes', () => {
    expect(formatSigned(5)).toBe('+5')
    expect(formatSigned(-3)).toBe('−3')
    expect(formatSigned(0, '%')).toBe('0%')
    expect(formatSigned(-180, '', '£')).toBe('−£180')
    expect(formatSigned(2, '%')).toBe('+2%')
  })
})

describe('placeBeside', () => {
  const viewport = { width: 1000, height: 800 }
  const size = { width: 300, height: 200 }
  const anchor = { left: 150, top: 400, width: 60, height: 18 }

  it('goes right of the parent, level with the anchor', () => {
    const parent = { left: 100, top: 380, width: 340, height: 150 }
    expect(placeBeside(anchor, parent, size, viewport)).toEqual({
      left: 446,
      top: 392,
      side: 'right',
    })
  })

  it('goes left when the right is full, and stays on screen vertically', () => {
    const parent = { left: 600, top: 700, width: 340, height: 90 }
    const low = { ...anchor, top: 760 }
    expect(placeBeside(low, parent, size, viewport)).toEqual({ left: 294, top: 592, side: 'left' })
  })

  it('falls back to below/above the anchor when neither side fits', () => {
    const parent = { left: 200, top: 100, width: 600, height: 150 }
    expect(placeBeside(anchor, parent, size, viewport).side).toBe('below')
  })
})
