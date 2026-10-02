import { geoArea } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import {
  parseBoundary,
  placeLabel,
  projectUk,
  rewind,
  type SeatFeature,
} from '../scripts/data/ukmap.ts'
import type { Region, Seat } from '../src/data/types.ts'
import { UK_MAP } from '../src/data/ukMap.ts'
import { UK_SEATS } from '../src/data/ukSeats.ts'
import { seatLabelsThatFit } from '../src/ui/map/uk/labels.ts'
import { parseUkLayout, ukLayoutStore, ukMapStore } from '../src/ui/store/map.ts'

/** A lon/lat square as RFC 7946 GeoJSON would wind it (outer ring anticlockwise). */
function square(id: string, lon: number, lat: number, size = 0.1): SeatFeature {
  return {
    type: 'Feature',
    properties: { PCON24CD: id, PCON24NM: id },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lon, lat],
          [lon + size, lat],
          [lon + size, lat + size],
          [lon, lat + size],
          [lon, lat],
        ],
      ],
    },
  }
}

const signedArea = (ring: number[][]) => {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!
    const [x1, y1] = ring[(i + 1) % ring.length]!
    a += x0! * y1! - x1! * y0!
  }
  return a / 2
}

const seat = (id: string, region: string, nation: Seat['nation']): Seat => ({
  id,
  name: id,
  nation,
  region,
  type: 'county',
  q: 0,
  r: 0,
})

describe('UK map build', () => {
  it('winds outer rings clockwise and holes anticlockwise, as d3 expects', () => {
    const outer = square('a', 0, 0).geometry.coordinates[0] as number[][]
    expect(signedArea(outer)).toBeGreaterThan(0)
    rewind(outer, true)
    expect(signedArea(outer)).toBeLessThan(0)
    const hole = [...outer].reverse()
    rewind(hole, false)
    expect(signedArea(hole)).toBeGreaterThan(0)
  })

  it('reads one feature per file and rewinds it (a seat is not the whole sphere)', () => {
    const f = parseBoundary(`${JSON.stringify(square('E1', -2, 52))}\n`)
    expect(geoArea(f)).toBeLessThan(0.001)
    expect(() => parseBoundary('{"type":"Feature"}\n{"type":"Feature"}')).toThrow(/one feature/)
    expect(() =>
      parseBoundary(JSON.stringify({ ...square('E1', 0, 0), geometry: { type: 'Point' } })),
    ).toThrow(/not a polygon/)
  })

  it('puts the label inside the largest part, with room to the nearest edge', () => {
    const islet: [number, number][] = [
      [100, 100],
      [101, 100],
      [101, 101],
      [100, 101],
    ]
    // An L shape: its centroid would sit outside it, the pole of inaccessibility does not.
    const l: [number, number][] = [
      [0, 0],
      [40, 0],
      [40, 10],
      [10, 10],
      [10, 40],
      [0, 40],
    ]
    const { focus, label, room } = placeLabel([islet, l])
    expect(focus).toEqual([0, 0, 40, 40])
    const [x, y] = label
    expect(x < 10 || y < 10).toBe(true)
    // At the inner corner the clear circle has radius 10√2 / (1 + √2) ≈ 5.86 (to within 0.5).
    expect(room).toBeGreaterThan(5)
    expect(room).toBeLessThanOrEqual(6)
  })

  it('projects seats with shared borders split into seat, region and nation meshes', () => {
    const seats = [
      seat('E1', 'R1', 'england'),
      seat('E2', 'R1', 'england'),
      seat('E3', 'R2', 'england'),
      seat('W1', 'W', 'wales'),
    ]
    const regions: Region[] = [
      { id: 'R1', name: 'One', nation: 'england' },
      { id: 'R2', name: 'Two', nation: 'england' },
      { id: 'W', name: 'Wales', nation: 'wales' },
    ]
    // Four squares in a row, west to east: W1 | E1 | E2 | E3.
    const features = [
      square('W1', -2.2, 52),
      square('E1', -2.1, 52),
      square('E2', -2.0, 52),
      square('E3', -1.9, 52),
    ].map((f) => parseBoundary(JSON.stringify(f)))
    const places = [
      { name: 'Middle', bounds: [-2.05, 52.02, -1.95, 52.08] as [number, number, number, number] },
    ]
    const map = projectUk(features, seats, regions, places, 1)

    expect(map.height).toBe(2000)
    expect(map.width).toBeGreaterThan(map.height) // four squares side by side
    expect(map.shapes.map((s) => s.id)).toEqual(['E1', 'E2', 'E3', 'W1'])
    for (const s of map.shapes) {
      expect(s.d).toMatch(/^M/)
      expect(s.room).toBeGreaterThan(0)
    }
    expect(map.seatBorders).toMatch(/^M/) // E1 | E2
    expect(map.regionBorders).toMatch(/^M/) // E2 | E3
    expect(map.nationBorders).toMatch(/^M/) // W1 | E1
    expect(map.coast).toMatch(/^M/)
    expect(map.regionLabels.map((l) => l.id)).toEqual(['R1', 'R2', 'W'])
    const [x0, , x1] = map.places[0]!.box
    const e1 = map.shapes[0]!.focus
    const e2 = map.shapes[1]!.focus
    expect(x0).toBeGreaterThan(e1[0])
    expect(x1).toBeLessThan(e2[2])

    expect(() => projectUk(features.slice(1), seats, regions, [])).toThrow(/W1 .* no boundary/)
    expect(() =>
      projectUk(
        [...features, parseBoundary(JSON.stringify(square('X9', 0, 50)))],
        seats,
        regions,
        [],
      ),
    ).toThrow(/X9 is not one of the 650/)
  })
})

describe('UK map data', () => {
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x <= UK_MAP.width && y <= UK_MAP.height

  it('has one shape per seat, in seat order, inside the map', () => {
    expect(UK_MAP.shapes.map((s) => s.id)).toEqual(UK_SEATS.seats.map((s) => s.id))
    for (const s of UK_MAP.shapes) {
      expect(s.d).toMatch(/^M/)
      const [x0, y0, x1, y1] = s.focus
      expect(inside(x0, y0) && inside(x1, y1)).toBe(true)
      expect(s.label[0]).toBeGreaterThanOrEqual(x0)
      expect(s.label[0]).toBeLessThanOrEqual(x1)
      expect(s.label[1]).toBeGreaterThanOrEqual(y0)
      expect(s.label[1]).toBeLessThanOrEqual(y1)
      expect(s.room).toBeGreaterThan(0)
    }
  })

  it('is taller than wide, with every border layer and a label per region', () => {
    expect(UK_MAP.height).toBe(2000)
    expect(UK_MAP.width).toBeLessThan(UK_MAP.height)
    for (const d of [
      UK_MAP.seatBorders,
      UK_MAP.regionBorders,
      UK_MAP.nationBorders,
      UK_MAP.coast,
    ]) {
      expect(d.length).toBeGreaterThan(100)
    }
    expect(UK_MAP.regionLabels.map((l) => l.id).sort()).toEqual(
      UK_SEATS.regions.map((r) => r.id).sort(),
    )
  })

  it('puts north at the top: Orkney and Shetland above Peckham', () => {
    const y = (id: string) => UK_MAP.shapes.find((s) => s.id === id)!.label[1]
    expect(y('S14000051')).toBeLessThan(y('E14001421'))
  })

  it('frames each city round its seats (London round the Cities of London and Westminster)', () => {
    expect(UK_MAP.places.map((p) => p.name)).toContain('London')
    const london = UK_MAP.places.find((p) => p.name === 'London')!.box
    const [lx, ly] = UK_MAP.shapes.find((s) => s.id === 'E14001172')!.label
    expect(lx > london[0] && lx < london[2] && ly > london[1] && ly < london[3]).toBe(true)
    for (const p of UK_MAP.places) {
      expect(inside(p.box[0], p.box[1]) && inside(p.box[2], p.box[3])).toBe(true)
    }
  })
})

describe('UK map labels and layout', () => {
  const labels = [
    { id: 'big', x: 0, y: 0, room: 20 },
    { id: 'tiny', x: 0, y: 0, room: 1 },
  ]
  const names: Record<string, string> = { big: 'Ross, Skye and Lochaber', tiny: 'Peckham' }

  it('shows a seat name once it fits round its label point', () => {
    const at = (s: number) => seatLabelsThatFit(labels, (id) => names[id]!, s).map((l) => l.id)
    expect(at(0.1)).toEqual([])
    expect(at(3)).toEqual(['big'])
    expect(at(40)).toEqual(['big', 'tiny'])
  })

  it('remembers the layout and shows the whole map when it changes', () => {
    expect(parseUkLayout('hex')).toBe('hex')
    expect(parseUkLayout('voxels')).toBe('map')
    expect(parseUkLayout(null)).toBe('map')
    ukMapStore.getState().setView({ k: 4, x: 10, y: 10 })
    ukLayoutStore.getState().setLayout('hex')
    expect(ukLayoutStore.getState().layout).toBe('hex')
    expect(ukMapStore.getState().view).toBeNull()
    ukLayoutStore.getState().setLayout('map')
  })

  it('asks the map to frame a box without changing the selection', () => {
    ukMapStore.getState().select('E14001421')
    const before = ukMapStore.getState().focus?.n ?? 0
    ukMapStore.getState().frame([1, 2, 3, 4])
    const { focus, selected } = ukMapStore.getState()
    expect(focus).toEqual({ id: null, box: [1, 2, 3, 4], n: before + 1 })
    expect(selected).toBe('E14001421')
  })
})
