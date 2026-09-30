/** World countries (Natural Earth 1:110m). Import lazily from UI code (~110 KB of JSON). */
import countries from './generated/countries.json'
import topology from './generated/world-110m.json'
import type { CountryInfo, WorldTopology } from './types.ts'

export const COUNTRIES: CountryInfo[] = countries.countries
export const WORLD_110M = topology as WorldTopology
