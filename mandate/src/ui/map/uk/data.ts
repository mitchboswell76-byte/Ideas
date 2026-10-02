/**
 * The UK map's data, joined once per load: seats, 2024 results and census measures by seat, and
 * the two layouts' geometry (real boundaries and hexes) behind one interface. Part of the lazy UK
 * map chunk.
 */
import { CENSUS } from '../../../data/census.ts'
import { GE2024 } from '../../../data/ge2024.ts'
import type { Ge2024Party, Seat } from '../../../data/types.ts'
import { UK_MAP } from '../../../data/ukMap.ts'
import { UK_SEATS } from '../../../data/ukSeats.ts'
import type { UkLayout } from '../../store/map.ts'
import type { Box } from '../viewport.ts'
import { buildHexMap } from './hex.ts'
import type { SeatData } from './modes.ts'

export const SEATS: readonly Seat[] = UK_SEATS.seats
export const SEAT_BY_ID = new Map(SEATS.map((s) => [s.id, s]))
export const REGION_NAME = new Map(UK_SEATS.regions.map((r) => [r.id, r.name]))

const results = new Map(GE2024.results.map((r) => [r.id, r]))
const census = new Map(CENSUS.seats.map((c) => [c.id, c]))
export const SEAT_DATA = new Map<string, SeatData>(
  SEATS.map((s) => [s.id, { result: results.get(s.id)!, census: census.get(s.id)! }]),
)
export const SEAT_LIST: readonly SeatData[] = [...SEAT_DATA.values()]

export const PARTY_COLOURS = GE2024.colours
export const partyName = (p: Ge2024Party) => GE2024.parties[p]
export const CENSUS_FIELDS = CENSUS.fields

export interface SeatLabel {
  id: string
  x: number
  y: number
  /** Distance to the seat's nearest edge, in map units. */
  room: number
}

/** What the map component draws, whichever layout is shown. */
export interface UkGeometry {
  width: number
  height: number
  shapes: readonly { id: string; d: string }[]
  /** Border layers, drawn in this order over the fills. */
  lines: readonly { kind: 'seats' | 'regions' | 'nations' | 'outline'; d: string }[]
  regionLabels: readonly { id: string; x: number; y: number }[]
  /** Seat name points (real map only: on the hexes a name never fits). */
  seatLabels: readonly SeatLabel[]
  /** The box to frame for a seat: the seat with its neighbours round it. */
  box(id: string): Box | undefined
  /** Closest zoom the player can reach, and the closest when framing a seat. */
  maxZoom: number
  focusZoom: number
}

const hex = buildHexMap(SEATS, UK_SEATS.regions)
const cellById = new Map(hex.cells.map((c) => [c.id, c]))
const regionIdByName = new Map(UK_SEATS.regions.map((r) => [r.name, r.id]))

const HEX_GEOMETRY: UkGeometry = {
  width: hex.width,
  height: hex.height,
  shapes: hex.cells,
  lines: [
    { kind: 'regions', d: hex.regions },
    { kind: 'nations', d: hex.nations },
    { kind: 'outline', d: hex.outline },
  ],
  regionLabels: hex.regionLabels.map((l) => ({ id: regionIdByName.get(l.name)!, x: l.x, y: l.y })),
  seatLabels: [],
  box(id) {
    const c = cellById.get(id)
    return c ? [c.cx - 4, c.cy - 4, c.cx + 4, c.cy + 4] : undefined
  },
  maxZoom: 12,
  focusZoom: 6,
}

const shapeById = new Map(UK_MAP.shapes.map((s) => [s.id, s]))

const MAP_GEOMETRY: UkGeometry = {
  width: UK_MAP.width,
  height: UK_MAP.height,
  shapes: UK_MAP.shapes,
  lines: [
    { kind: 'seats', d: UK_MAP.seatBorders },
    { kind: 'regions', d: UK_MAP.regionBorders },
    { kind: 'nations', d: UK_MAP.nationBorders },
    { kind: 'outline', d: UK_MAP.coast },
  ],
  regionLabels: UK_MAP.regionLabels,
  seatLabels: UK_MAP.shapes.map((s) => ({ id: s.id, x: s.label[0], y: s.label[1], room: s.room })),
  box(id) {
    const s = shapeById.get(id)
    if (!s) return undefined
    const [x0, y0, x1, y1] = s.focus
    // London seats are a few units across: frame enough round them to see where they are.
    const pad = Math.max(x1 - x0, y1 - y0) * 0.75 + 6
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]
  },
  maxZoom: 40,
  focusZoom: 24,
}

export const GEOMETRY: Record<UkLayout, UkGeometry> = { map: MAP_GEOMETRY, hex: HEX_GEOMETRY }

/** Quick zooms to cities (real map only). */
export const PLACES = UK_MAP.places
