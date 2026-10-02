import { describe, expect, it } from 'vitest'
import { colourGraph, largestRing, PathWriter } from '../scripts/data/worldmap.ts'
import type { Bloc, CountryInfo, WorldShape } from '../src/data/types.ts'
import {
  clampView,
  fitBox,
  homeView,
  MAX_ZOOM,
  panBy,
  toMap,
  transformOf,
  zoomAt,
  type Frame,
} from '../src/ui/map/viewport.ts'
import {
  fillOf,
  labelsThatFit,
  legendFor,
  legendNote,
  modeLine,
} from '../src/ui/map/world/modes.ts'
import { matchesSearch } from '../src/ui/map/search.ts'

/** A 1000 × 500 map in an 800 × 600 frame: width-limited, 0.8 px per unit at k = 1. */
const frame: Frame = { width: 800, height: 600, mapWidth: 1000, mapHeight: 500 }

describe('viewport', () => {
  it('fits the whole map at k = 1, centred on the short axis', () => {
    const home = homeView(frame)
    expect(home).toEqual({ k: 1, x: 500, y: 250 })
    expect(transformOf(home, frame)).toEqual({ tx: 0, ty: 100, s: 0.8 })
  })

  it('keeps the point under the cursor fixed when zooming', () => {
    const cursor = { x: 300, y: 280 }
    const before = toMap(homeView(frame), frame, cursor)
    const zoomed = zoomAt(homeView(frame), frame, cursor, 2)
    expect(zoomed.k).toBe(2)
    const after = toMap(zoomed, frame, cursor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps zoom and keeps the map on screen', () => {
    expect(zoomAt(homeView(frame), frame, { x: 400, y: 300 }, 0.1).k).toBe(1)
    expect(zoomAt(homeView(frame), frame, { x: 400, y: 300 }, 1000).k).toBe(MAX_ZOOM)
    // At k = 2 the frame shows 500 × 375 map units: the centre can't go past 250 from an edge.
    const far = clampView({ k: 2, x: -500, y: 9999 }, frame)
    expect(far).toEqual({ k: 2, x: 250, y: 500 - 187.5 })
    // Dragging right by 100 px at 1.6 px per unit moves the centre 62.5 units left.
    expect(panBy({ k: 2, x: 500, y: 250 }, frame, 100, 0).x).toBeCloseTo(437.5)
  })

  it('frames a box, zooming no further than the limit', () => {
    const view = fitBox([400, 200, 500, 250], frame, 0)
    expect(view.x).toBe(450)
    expect(view.y).toBe(225)
    expect(view.k).toBe(8) // 100 units wide could go to k 10
    expect(fitBox([0, 0, 1000, 500], frame).k).toBe(1)
  })
})

const country = (over: Partial<CountryInfo> = {}): CountryInfo => ({
  id: '826',
  name: 'United Kingdom',
  iso3: 'GBR',
  region: 'Europe',
  subregion: 'Northern Europe',
  capital: 'London',
  status: 'state',
  blocs: ['nato'],
  neighbours: ['372'],
  ...over,
})

const shape = (id: string, focus: WorldShape['focus'], colour = 0): WorldShape => ({
  id,
  d: 'M0 0z',
  focus,
  label: [(focus[0] + focus[2]) / 2, (focus[1] + focus[3]) / 2],
  colour,
})

const nato: Bloc = {
  id: 'nato',
  name: 'NATO',
  full: 'North Atlantic Treaty Organization',
  about: '',
  members: ['826', '250'],
  offMap: [],
  alsoIncludes: [],
}

describe('world map modes', () => {
  it('fills by mode', () => {
    const uk = country()
    const s = shape('826', [0, 0, 10, 10], 3)
    expect(fillOf(uk, s, 'political', null)).toBe('var(--map-land-3)')
    expect(fillOf(uk, s, 'region', null)).toBe('var(--map-region-europe)')
    expect(fillOf(uk, s, 'blocs', nato)).toBe('var(--map-member)')
    expect(fillOf(country({ blocs: [] }), s, 'blocs', nato)).toBe('var(--map-other)')
  })

  it('describes a country for each mode', () => {
    expect(modeLine(country(), 'political', null)).toBe('Capital: London')
    expect(modeLine(country({ statusText: 'British Overseas Territory' }), 'political', null)).toBe(
      'British Overseas Territory',
    )
    expect(modeLine(country(), 'region', null)).toBe('Europe · Northern Europe')
    expect(modeLine(country(), 'blocs', nato)).toBe('NATO: member')
    expect(modeLine(country({ blocs: [] }), 'blocs', nato)).toBe('NATO: not a member')
  })

  it('builds legends and notes', () => {
    expect(legendFor('region', null).map((r) => r.label)).toEqual([
      'Africa',
      'Americas',
      'Asia',
      'Europe',
      'Oceania',
      'Your country',
    ])
    expect(legendFor('blocs', nato)[0]!.label).toBe('NATO member')
    const eu = { ...nato, members: ['1', '2', '3'], offMap: ['Malta'] }
    expect(legendNote('blocs', eu)).toBe('2 of 3 members shown; too small for this map: Malta.')
    expect(legendNote('region', null)).toBeNull()
  })

  it('shows names only where they fit, largest first', () => {
    const shapes = [shape('a', [0, 0, 20, 10]), shape('b', [0, 0, 100, 40])]
    const names = (id: string) => (id === 'a' ? 'Aland' : 'Big Country')
    expect(labelsThatFit(shapes, names, 1).map((s) => s.id)).toEqual(['b'])
    expect(labelsThatFit(shapes, names, 4).map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('searches names without case or accents', () => {
    expect(matchesSearch("Côte d'Ivoire", 'cote')).toBe(true)
    expect(matchesSearch('United Kingdom', ' KING ')).toBe(true)
    expect(matchesSearch('France', 'spain')).toBe(false)
  })
})

describe('world map build', () => {
  it('writes compact relative paths from rounded points', () => {
    const w = new PathWriter()
    w.moveTo(10, 20)
    w.lineTo(10.54, 20)
    w.lineTo(10.54, 20.01) // rounds to the same point: skipped
    w.lineTo(9, 18.5)
    w.closePath()
    w.moveTo(12, 20)
    w.lineTo(13, 21)
    w.closePath()
    expect(w.result()).toBe('M10 20l.5 0-1.5-1.5zm2 0l1 1z')
  })

  it('picks the largest projected ring and its centroid', () => {
    const small: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    const big: [number, number][] = [
      [10, 10],
      [14, 10],
      [14, 12],
      [10, 12],
    ]
    expect(largestRing([small, big])).toEqual({ box: [10, 10, 14, 12], centre: [12, 11] })
  })

  it('colours a graph so neighbours differ, territories matching their state', () => {
    // A 4-cycle with a chord (a–c) plus a territory t of a with no land border.
    const n = new Map<string, string[]>([
      ['a', ['b', 'c', 'd']],
      ['b', ['a', 'c']],
      ['c', ['a', 'b', 'd']],
      ['d', ['a', 'c']],
      ['t', []],
    ])
    const colours = colourGraph([...n.keys()], n, new Map([['t', 'a']]), 4)
    for (const [id, list] of n) {
      for (const other of list) expect(colours.get(id)).not.toBe(colours.get(other))
    }
    expect(colours.get('t')).toBe(colours.get('a'))
    expect(() =>
      colourGraph(
        ['a', 'b'],
        new Map([
          ['a', ['b']],
          ['b', ['a']],
        ]),
        new Map(),
        1,
      ),
    ).toThrow(/no free colour/)
  })
})

describe('per-map zoom limit', () => {
  const frame = { width: 800, height: 600, mapWidth: 1000, mapHeight: 2000, maxZoom: 40 }

  it('lets a map zoom past the default limit when it sets its own', () => {
    expect(zoomAt(homeView(frame), frame, { x: 400, y: 300 }, 1000).k).toBe(40)
    expect(clampView({ k: 100, x: 500, y: 1000 }, frame).k).toBe(40)
    const { maxZoom: _, ...plain } = frame
    expect(clampView({ k: 100, x: 500, y: 1000 }, plain).k).toBe(MAX_ZOOM)
  })
})
