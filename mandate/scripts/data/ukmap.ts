/**
 * Projects the 2024 Westminster constituency boundaries into the SVG paths the UK map draws, so
 * the game ships no projection code: per-seat paths, label points, the meshes for seat, region and
 * nation borders and the coast, region label points, and city zoom boxes.
 *
 * The projection is transverse Mercator on 2°W (the National Grid's meridian), so Britain looks as
 * it does on an Ordnance Survey map. Shapes are simplified as one topology, so neighbouring seats
 * keep sharing their border exactly (no slivers) and each border is drawn once.
 */
import { geoArea, geoPath, geoTransverseMercator, type GeoProjection } from 'd3-geo'
import polylabel from 'polylabel'
import { feature, merge, mesh } from 'topojson-client'
import { topology } from 'topojson-server'
import { filter, presimplify, quantile, simplify } from 'topojson-simplify'
import type { GeometryCollection, Polygon, MultiPolygon, Topology } from 'topojson-specification'
import type { Region, Seat, UkMapFile, UkShape } from '../../src/data/types.ts'
import { pathOf, RingCollector } from './worldmap.ts'

/** Map units top to bottom; the UI scales the map to fit. */
export const UK_MAP_HEIGHT = 2000
const PAD = 10
/** Share of boundary points kept, by visual weight (smallest triangles go first). */
const KEEP = 0.3
/**
 * Rings smaller than this (square degrees, about 0.1 km²) are dropped after simplifying: islets
 * nobody can see, and slivers that simplification collapses to a line (d3 reads a zero-area ring
 * as the whole sphere).
 */
const MIN_RING = 1e-5

type SeatGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon
export type SeatFeature = GeoJSON.Feature<SeatGeometry, { PCON24CD: string; PCON24NM: string }>

/** A hand-entered quick-zoom box (`data-raw/manual/uk-map-places.json`), in degrees. */
export interface PlaceBox {
  name: string
  /** [west, south, east, north] */
  bounds: [number, number, number, number]
}

/** The geography-bits files are one GeoJSON feature per line (`.geojsonl`). */
export function parseBoundary(text: string): SeatFeature {
  const lines = text.trim().split('\n')
  if (lines.length !== 1) throw new Error(`Expected one feature per file, got ${lines.length}`)
  const f = JSON.parse(lines[0]!) as SeatFeature
  const type = f.geometry?.type
  if (f.type !== 'Feature' || (type !== 'Polygon' && type !== 'MultiPolygon')) {
    throw new Error(`${f.properties?.PCON24CD ?? '?'}: not a polygon feature`)
  }
  rewindGeometry(f.geometry)
  return f
}

/**
 * Winds every ring the way d3-geo expects: outer rings clockwise, holes anticlockwise. GeoJSON
 * (RFC 7946) uses the opposite, and simplifying can flip a small ring; d3 reads a ring wound the
 * wrong way as "the whole sphere except this".
 */
export function rewindGeometry(geometry: SeatGeometry): void {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const polygon of polygons) polygon.forEach((ring, i) => rewind(ring, i === 0))
}

/** Turns a ring clockwise if it is an outer ring, anticlockwise if it is a hole. */
export function rewind(ring: GeoJSON.Position[], outer: boolean): void {
  const clockwise = ringArea(ring as [number, number][]) < 0
  if (clockwise !== outer) ring.reverse()
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** Mean Earth radius in km (IUGG), for areas from d3's steradians. */
const EARTH_RADIUS_KM = 6371.0088

/**
 * A seat's area in hectares, from its full-resolution boundary. Population ÷ this is within ±3% of
 * the ONS density for 90% of English and Welsh seats (median ratio 1.003), so it stands in where
 * the census source has no density (Scotland).
 */
export function hectaresOf(f: SeatFeature): number {
  return geoArea(f) * EARTH_RADIUS_KM ** 2 * 100
}

/** Signed area of a ring (shoelace); the sign gives its winding. */
function ringArea(ring: readonly [number, number][]): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!
    const [x1, y1] = ring[(i + 1) % ring.length]!
    a += x0 * y1 - x1 * y0
  }
  return a / 2
}

/** The largest projected ring of a shape (the mainland part, never a hole). */
function largest(rings: [number, number][][]): [number, number][] {
  let best: [number, number][] | null = null
  let bestArea = 0
  for (const r of rings) {
    const a = Math.abs(ringArea(r))
    if (a > bestArea) {
      best = r
      bestArea = a
    }
  }
  if (!best) throw new Error('Shape has no rings')
  return best
}

function projectedRings(projection: GeoProjection, object: GeoJSON.GeoJsonObject) {
  const rings = new RingCollector()
  geoPath(projection, rings)(object as GeoJSON.Feature)
  return rings.rings
}

/** Box, label point and label room of a shape's largest part. */
export function placeLabel(rings: [number, number][][]): Pick<UkShape, 'focus' | 'label' | 'room'> {
  const ring = largest(rings)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const pole = polylabel([ring], 0.5)
  return {
    focus: [
      round1(Math.min(...xs)),
      round1(Math.min(...ys)),
      round1(Math.max(...xs)),
      round1(Math.max(...ys)),
    ],
    label: [round1(pole[0]), round1(pole[1])],
    room: round1(pole.distance),
  }
}

type SeatsObject = GeometryCollection<{ region: string; nation: string }>

export function projectUk(
  features: readonly SeatFeature[],
  seats: readonly Seat[],
  regions: readonly Region[],
  places: readonly PlaceBox[],
  /** Share of points to keep (tests pass 1: their squares have no points to spare). */
  keep = KEEP,
): UkMapFile {
  const byId = new Map(features.map((f) => [f.properties.PCON24CD, f]))
  if (byId.size !== features.length) throw new Error('Boundaries list a seat twice')
  for (const s of seats) {
    if (!byId.has(s.id)) throw new Error(`${s.id} (${s.name}) has no boundary`)
  }
  const seatIds = new Set(seats.map((s) => s.id))
  for (const id of byId.keys()) {
    if (!seatIds.has(id)) throw new Error(`Boundary ${id} is not one of the 650 seats`)
  }

  const collection: GeoJSON.FeatureCollection<SeatGeometry> = {
    type: 'FeatureCollection',
    features: seats.map((s) => ({
      type: 'Feature',
      id: s.id,
      properties: { region: s.region, nation: s.nation },
      geometry: byId.get(s.id)!.geometry,
    })),
  }

  // Quantising to 1e6 steps keeps the source's 5 decimal places (about a metre).
  const raw = topology({ seats: collection }, 1e6) as Topology<{ seats: SeatsObject }>
  const pre = presimplify(raw)
  const thinned = keep >= 1 ? pre : simplify(pre, quantile(pre, keep))
  // The filter is handed a ring as arc indexes (the published types say points).
  const topo = filter(thinned, (ring) => {
    const polygon = feature(thinned, { type: 'Polygon', arcs: [ring] } as unknown as Polygon)
    return Math.abs(ringArea(polygon.geometry.coordinates[0] as [number, number][])) >= MIN_RING
  }) as Topology<{ seats: SeatsObject }>
  const object = topo.objects.seats

  // fitHeight puts the top-left of the bounds at (0, 0); shift it in by the padding.
  const projection = geoTransverseMercator().rotate([2, 0])
  projection.fitHeight(UK_MAP_HEIGHT - 2 * PAD, collection)
  const [tx, ty] = projection.translate()
  projection.translate([tx + PAD, ty + PAD])
  const [, [right]] = geoPath(projection).bounds(collection)
  const width = Math.ceil(right + PAD)

  const simplified = feature(topo, object) as GeoJSON.FeatureCollection<SeatGeometry>
  for (const f of simplified.features) {
    rewindGeometry(f.geometry)
    // More than a hemisphere means a ring came out inside-out.
    if (geoArea(f) > 2 * Math.PI) throw new Error(`${String(f.id)}: shape is inside-out`)
  }
  const shapes: UkShape[] = simplified.features.map((f) => ({
    id: String(f.id),
    d: pathOf(projection, f),
    ...placeLabel(projectedRings(projection, f)),
  }))

  type Props = { region: string; nation: string }
  const props = (g: unknown) => (g as { properties: Props }).properties
  const meshOf = (filter: (a: Props, b: Props) => boolean) =>
    pathOf(
      projection,
      mesh(topo, object, (a, b) => filter(props(a), props(b))),
    )
  // A seat's coast is an arc used by one geometry only (a === b).
  const coast = pathOf(
    projection,
    mesh(topo, object, (a, b) => a === b),
  )

  const regionLabels = regions.map((region) => {
    const members = object.geometries.filter((g) => props(g).region === region.id) as (
      Polygon | MultiPolygon
    )[]
    if (members.length === 0) throw new Error(`Region ${region.id} has no seats`)
    const merged = merge(topo, members)
    rewindGeometry(merged)
    const ring = largest(projectedRings(projection, merged))
    const [x, y] = polylabel([ring], 0.5)
    return { id: region.id, x: round1(x), y: round1(y) }
  })

  const projectedPlaces = places.map((p) => {
    const [w, s, e, n] = p.bounds
    const corners = [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
    ].map((c) => projection(c as [number, number])!)
    const xs = corners.map((c) => c[0])
    const ys = corners.map((c) => c[1])
    return {
      name: p.name,
      box: [
        round1(Math.min(...xs)),
        round1(Math.min(...ys)),
        round1(Math.max(...xs)),
        round1(Math.max(...ys)),
      ] as [number, number, number, number],
    }
  })

  return {
    width,
    height: UK_MAP_HEIGHT,
    shapes: shapes.sort((a, b) => a.id.localeCompare(b.id)),
    seatBorders: meshOf((a, b) => a !== b && a.region === b.region),
    regionBorders: meshOf((a, b) => a.region !== b.region && a.nation === b.nation),
    nationBorders: meshOf((a, b) => a.nation !== b.nation),
    coast,
    regionLabels,
    places: projectedPlaces,
  }
}
