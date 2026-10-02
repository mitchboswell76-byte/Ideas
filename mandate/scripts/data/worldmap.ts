/**
 * Projects the world TopoJSON into the SVG paths the World screen draws (Natural Earth I), so the
 * game ships no projection code: per-country paths, focus boxes and label points, the border and
 * coast meshes, and political map colours.
 */
import { geoNaturalEarth1, geoPath, type GeoContext, type GeoProjection } from 'd3-geo'
import { feature, mesh, neighbors } from 'topojson-client'
import type { GeometryCollection, Topology as TopoTopology } from 'topojson-specification'
import type { WorldMapFile, WorldShape } from '../../src/data/types.ts'
import type { Topology } from './world.ts'

/** Map units across; the UI scales the map to fit. */
export const MAP_WIDTH = 1000
const PAD = 4
/** Political colours to spread countries over; neighbours never share one. */
export const POLITICAL_COLOURS = 6

/** One decimal place is finer than the 1:110m source at any zoom the map allows. */
const tenths = (v: number) => Math.round(v * 10)
const round1 = (v: number) => tenths(v) / 10

/** A number in tenths as compact SVG path text: 5 → ".5", -15 → "-1.5". */
function num(t: number): string {
  const s = String(t / 10)
  return s.replace(/^(-?)0\./, '$1.')
}

/**
 * A d3 path context that writes relative, one-decimal SVG commands (about half the size of
 * d3's absolute output). Offsets are taken between rounded points, so no error builds up.
 */
export class PathWriter implements GeoContext {
  private out = ''
  private x = 0
  private y = 0
  private startX = 0
  private startY = 0
  private started = false
  /** Inside a run of line segments (one `l` covers them all). */
  private inLine = false
  /** Whether the last token was a command letter (no separator needed before a number). */
  private afterCommand = false

  private pair(dx: number, dy: number) {
    const a = num(dx)
    const b = num(dy)
    const sep = (s: string) => (s.startsWith('-') ? '' : ' ')
    this.out += (this.afterCommand ? '' : sep(a)) + a + sep(b) + b
    this.afterCommand = false
  }

  moveTo(x: number, y: number): void {
    const X = tenths(x)
    const Y = tenths(y)
    if (this.started) {
      this.out += 'm'
      this.afterCommand = true
      this.pair(X - this.x, Y - this.y)
    } else {
      this.out += `M${num(X)} ${num(Y)}`
      this.afterCommand = false
      this.started = true
    }
    this.x = this.startX = X
    this.y = this.startY = Y
    this.inLine = false
  }

  lineTo(x: number, y: number): void {
    const X = tenths(x)
    const Y = tenths(y)
    if (X === this.x && Y === this.y) return
    if (!this.inLine) {
      this.out += 'l'
      this.afterCommand = true
      this.inLine = true
    }
    this.pair(X - this.x, Y - this.y)
    this.x = X
    this.y = Y
  }

  closePath(): void {
    this.out += 'z'
    this.afterCommand = true
    this.inLine = false
    this.x = this.startX
    this.y = this.startY
  }

  beginPath(): void {}

  arc(): void {
    throw new Error('Map shapes have no point geometries')
  }

  result(): string {
    return this.out
  }
}

type Geo = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name: string }>

export function pathOf(projection: GeoProjection, object: GeoJSON.GeoJsonObject): string {
  const writer = new PathWriter()
  geoPath(projection, writer)(object as GeoJSON.Feature)
  return writer.result()
}

/** Collects projected rings, so parts can be measured after antimeridian clipping. */
export class RingCollector implements GeoContext {
  rings: [number, number][][] = []
  moveTo(x: number, y: number): void {
    this.rings.push([[x, y]])
  }
  lineTo(x: number, y: number): void {
    this.rings.at(-1)!.push([x, y])
  }
  closePath(): void {}
  beginPath(): void {}
  arc(): void {
    throw new Error('Map shapes have no point geometries')
  }
}

/**
 * The largest projected ring and its centroid: what "centre on map" frames (mainland France,
 * not French Guiana; Russia west of the antimeridian) and where the name goes.
 */
export function largestRing(ring: readonly [number, number][][]): {
  box: [number, number, number, number]
  centre: [number, number]
} {
  let best: { area: number; cx: number; cy: number; ring: readonly [number, number][] } | null =
    null
  for (const r of ring) {
    let a = 0
    let cx = 0
    let cy = 0
    for (let i = 0; i < r.length; i++) {
      const [x0, y0] = r[i]!
      const [x1, y1] = r[(i + 1) % r.length]!
      const cross = x0 * y1 - x1 * y0
      a += cross
      cx += (x0 + x1) * cross
      cy += (y0 + y1) * cross
    }
    const area = Math.abs(a / 2)
    if (!best || area > best.area) best = { area, cx: cx / (3 * a), cy: cy / (3 * a), ring: r }
  }
  if (!best) throw new Error('Shape has no rings')
  const xs = best.ring.map((p) => p[0])
  const ys = best.ring.map((p) => p[1])
  return {
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    centre: [best.cx, best.cy],
  }
}

/**
 * Greedy colouring: most-connected first, each takes the least-used colour none of its
 * neighbours has (so the palette is used evenly). Territories take their state's colour.
 */
export function colourGraph(
  ids: readonly string[],
  neighbours: ReadonlyMap<string, readonly string[]>,
  sovereignOf: ReadonlyMap<string, string>,
  colours = POLITICAL_COLOURS,
): Map<string, number> {
  const out = new Map<string, number>()
  const used = new Array<number>(colours).fill(0)
  const degree = (id: string) => neighbours.get(id)?.length ?? 0
  const order = ids
    .filter((id) => !sovereignOf.has(id))
    .sort((a, b) => degree(b) - degree(a) || a.localeCompare(b))
  for (const id of order) {
    const taken = new Set((neighbours.get(id) ?? []).map((n) => out.get(n)))
    let pick = -1
    for (let c = 0; c < colours; c++) {
      if (taken.has(c)) continue
      if (pick < 0 || used[c]! < used[pick]!) pick = c
    }
    if (pick < 0) throw new Error(`${id}: no free colour among ${colours}`)
    out.set(id, pick)
    used[pick]!++
  }
  for (const [id, sovereign] of sovereignOf) {
    const colour = out.get(sovereign)
    if (colour === undefined) throw new Error(`${id}: sovereign ${sovereign} is not on the map`)
    if ((neighbours.get(id) ?? []).some((n) => out.get(n) === colour)) {
      throw new Error(`${id}: its state's colour clashes with a neighbour`)
    }
    out.set(id, colour)
  }
  return out
}

/** Land neighbours by id, from shared arcs. */
export function neighbourMap(topology: Topology): Map<string, string[]> {
  const geometries = topology.objects.countries.geometries
  const lists = neighbors(geometries as never)
  return new Map(
    geometries.map((g, i) => [
      g.id!,
      lists[i]!.filter((j) => j !== i)
        .map((j) => geometries[j]!.id!)
        .sort((a, b) => a.localeCompare(b)),
    ]),
  )
}

export function projectWorld(
  topology: Topology,
  sovereignOf: ReadonlyMap<string, string>,
): WorldMapFile {
  const topo = topology as unknown as TopoTopology<{ countries: GeometryCollection }>
  const collection = feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection<
    Geo['geometry'],
    Geo['properties']
  >
  const projection = geoNaturalEarth1().fitWidth(MAP_WIDTH - 2 * PAD, collection)
  const [tx, ty] = projection.translate()
  projection.translate([tx + PAD, ty + PAD])
  const path = geoPath(projection)
  const [, [, bottom]] = path.bounds(collection)
  const height = Math.ceil(bottom + PAD)

  const neighbours = neighbourMap(topology)
  const colours = colourGraph([...neighbours.keys()], neighbours, sovereignOf)

  const shapes: WorldShape[] = collection.features.map((f) => {
    const id = String(f.id)
    const rings = new RingCollector()
    geoPath(projection, rings)(f)
    const {
      box: [x0, y0, x1, y1],
      centre: [lx, ly],
    } = largestRing(rings.rings)
    return {
      id,
      d: pathOf(projection, f),
      focus: [round1(x0), round1(y0), round1(x1), round1(y1)],
      label: [round1(lx), round1(ly)],
      colour: colours.get(id)!,
    }
  })
  shapes.sort((a, b) => a.id.localeCompare(b.id))

  const countries = topo.objects.countries
  return {
    width: MAP_WIDTH,
    height,
    shapes,
    borders: pathOf(
      projection,
      mesh(topo, countries, (a, b) => a !== b),
    ),
    coast: pathOf(
      projection,
      mesh(topo, countries, (a, b) => a === b),
    ),
  }
}
