import { describe, expect, it } from 'vitest'
import { UK_SEATS } from '../src/data/uk.ts'
import type { Seat } from '../src/data/types.ts'
import {
  buildHexMap,
  edgesBetween,
  hexNeighbours,
  isOddRow,
  rawCentre,
  type HexCell,
} from '../src/ui/map/uk/hex.ts'

const segments = (d: string) => d.split('M').filter(Boolean).length

describe('hex geometry', () => {
  it('treats negative odd rows as odd', () => {
    expect([-3, -1, 1, 3].every(isOddRow)).toBe(true)
    expect([-2, 0, 2].some(isOddRow)).toBe(false)
    // Odd rows are shifted half a hex right; rows grow upwards (y shrinks).
    expect(rawCentre(0, -1).x - rawCentre(0, -2).x).toBeCloseTo(Math.sqrt(3) / 2)
    expect(rawCentre(0, 1).y).toBeLessThan(rawCentre(0, 0).y)
  })

  it('finds six neighbours at one hex spacing', () => {
    for (const r of [-2, -1, 0, 1]) {
      const c = rawCentre(5, r)
      for (const [q2, r2] of hexNeighbours(5, r)) {
        const n = rawCentre(q2, r2)
        expect(Math.hypot(n.x - c.x, n.y - c.y)).toBeCloseTo(Math.sqrt(3))
      }
    }
  })

  const cell = (id: string, q: number, r: number): HexCell => {
    const { x, y } = rawCentre(q, r)
    return { id, q, r, cx: x, cy: y, d: '' }
  }
  const origin = { x: 0, y: 0 }

  it('outlines a lone hex with six edges and shares none within a group', () => {
    expect(segments(edgesBetween([cell('a', 0, 0)], null, origin))).toBe(6)
    const pair = [cell('a', 0, 0), cell('b', 1, 0)]
    expect(segments(edgesBetween(pair, null, origin))).toBe(10)
    expect(edgesBetween(pair, () => 'same', origin)).toBe('')
    // Different groups: the shared edge is drawn once.
    expect(segments(edgesBetween(pair, (id) => id, origin))).toBe(1)
  })
})

describe('UK hex map', () => {
  const map = buildHexMap(UK_SEATS.seats, UK_SEATS.regions)
  const byCell = new Map(map.cells.map((c) => [`${c.q},${c.r}`, c]))

  it('places 650 hexes inside the frame', () => {
    expect(map.cells).toHaveLength(650)
    for (const c of map.cells) {
      expect(c.cx).toBeGreaterThan(0)
      expect(c.cy).toBeGreaterThan(0)
      expect(c.cx).toBeLessThan(map.width)
      expect(c.cy).toBeLessThan(map.height)
    }
  })

  it('has symmetric neighbours', () => {
    for (const c of map.cells) {
      for (const [q, r] of hexNeighbours(c.q, c.r)) {
        const n = byCell.get(`${q},${r}`)
        if (!n) continue
        const back = hexNeighbours(n.q, n.r).some(([q2, r2]) => q2 === c.q && r2 === c.r)
        expect(back, `${c.id}-${n.id}`).toBe(true)
      }
    }
  })

  it('draws coast, nation and region borders, with a label per region', () => {
    expect(segments(map.outline)).toBeGreaterThan(100)
    expect(segments(map.nations)).toBeGreaterThan(10)
    expect(segments(map.regions)).toBeGreaterThan(segments(map.nations))
    expect(map.regionLabels.map((l) => l.name).sort()).toEqual(
      UK_SEATS.regions.map((r) => r.name).sort(),
    )
  })

  it('puts region labels inside their own region, apart from each other', () => {
    const at = (name: string) => map.regionLabels.find((l) => l.name === name)!
    const cellAt = (l: { x: number; y: number }) =>
      map.cells.find((c) => c.cx === l.x && c.cy === l.y)!
    for (const label of map.regionLabels) {
      const seat = UK_SEATS.seats.find((s) => s.id === cellAt(label).id)!
      const region = UK_SEATS.regions.find((r) => r.id === seat.region)!
      expect(region.name).toBe(label.name)
    }
    // The South East wraps round London; its label must not sit on London's.
    const london = at('London')
    const southEast = at('South East')
    expect(Math.hypot(london.x - southEast.x, london.y - southEast.y)).toBeGreaterThan(5)
  })

  it('keeps nations apart only where they meet', () => {
    const seats: Seat[] = UK_SEATS.seats
    const wales = seats.filter((s) => s.nation === 'wales')
    const walesMap = buildHexMap(wales, UK_SEATS.regions)
    expect(walesMap.nations).toBe('')
    expect(segments(walesMap.outline)).toBeGreaterThan(20)
  })
})
