/**
 * The UK map's data, joined once per load: seats, 2024 results and census measures by seat, and
 * the hex geometry. Part of the lazy UK map chunk.
 */
import { CENSUS } from '../../../data/census.ts'
import { GE2024 } from '../../../data/ge2024.ts'
import type { Ge2024Party, Seat } from '../../../data/types.ts'
import { UK_SEATS } from '../../../data/ukSeats.ts'
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

export const HEX = buildHexMap(SEATS, UK_SEATS.regions)
export const CELL_BY_ID = new Map(HEX.cells.map((c) => [c.id, c]))

export const PARTY_COLOURS = GE2024.colours
export const partyName = (p: Ge2024Party) => GE2024.parties[p]
export const CENSUS_FIELDS = CENSUS.fields

/** Framing a seat shows it with its neighbours around it. */
export const seatBox = (id: string) => {
  const c = CELL_BY_ID.get(id)
  return c ? ([c.cx - 4, c.cy - 4, c.cx + 4, c.cy + 4] as const) : undefined
}
