/**
 * Seats and countries for the creator's Origins pickers: ids between the map data (ONS codes,
 * Natural Earth ids) and the sim (`con_…`, `cty_<ISO3>`), and their names.
 */
import { UK_SEATS } from '../../data/ukSeats.ts'
import { COUNTRIES } from '../../data/world.ts'
import { UK } from '../../sim/character/create.ts'
import type { ConstituencyId, CountryId, Nation } from '../../sim/world.ts'
import type { PickItem } from './SearchPick.tsx'

const REGION_NAME = new Map(UK_SEATS.regions.map((r) => [r.id, r.name]))
const SEAT_BY_ONS = new Map(UK_SEATS.seats.map((s) => [s.id, s]))

export const SEAT_ITEMS: readonly PickItem[] = UK_SEATS.seats.map((s) => ({
  id: s.id,
  name: s.name,
  meta: REGION_NAME.get(s.region) ?? '',
}))

const countryIdOf = (c: { id: string; iso3: string | null }) => `cty_${c.iso3 ?? c.id}` as CountryId

/** Sovereign states and territories, by name. */
export const COUNTRY_ITEMS: readonly PickItem[] = COUNTRIES.map((c) => ({
  id: c.id,
  name: c.name,
  meta: c.statusText ?? c.subregion,
})).sort((a, b) => a.name.localeCompare(b.name))

const BY_MAP_ID = new Map(COUNTRIES.map((c) => [c.id, c]))
const BY_COUNTRY_ID = new Map(COUNTRIES.map((c) => [countryIdOf(c), c]))

export function countryFromMap(mapId: string): CountryId | null {
  const c = BY_MAP_ID.get(mapId)
  return c ? countryIdOf(c) : null
}

export function mapIdOfCountry(id: CountryId): string | undefined {
  return BY_COUNTRY_ID.get(id)?.id
}

export function countryName(id: CountryId): string {
  return id === UK ? 'United Kingdom' : (BY_COUNTRY_ID.get(id)?.name ?? id.slice(4))
}

export const onsOf = (seat: ConstituencyId | undefined) => seat?.slice(4)

export function seatName(seat: ConstituencyId | undefined): string | null {
  const s = seat && SEAT_BY_ONS.get(seat.slice(4))
  return s ? s.name : null
}

export function seatNation(ons: string): Nation | null {
  return SEAT_BY_ONS.get(ons)?.nation ?? null
}
