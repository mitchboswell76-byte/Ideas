/**
 * Shapes of the bundled data in `src/data/generated/` (written by `npm run data`, see
 * `scripts/build-data.ts` and docs/DATA_SOURCES.md). Constituencies are keyed by ONS code
 * (e.g. `E14001074`); the sim will prefix them (`con_E14001074`) when it loads them.
 */
import type { Nation } from '../sim/world.ts'

/** Parties as recorded in the 2024 results. Not the game's party list (T12). */
export const GE2024_PARTIES = {
  con: 'Conservative',
  lab: 'Labour',
  ld: 'Liberal Democrats',
  reform: 'Reform UK',
  green: 'Green',
  snp: 'SNP',
  pc: 'Plaid Cymru',
  dup: 'DUP',
  sf: 'Sinn Féin',
  sdlp: 'SDLP',
  uup: 'UUP',
  alliance: 'Alliance',
  tuv: 'TUV',
  workers: 'Workers Party',
  ind: 'Independent',
  speaker: 'Speaker',
  other: 'Other',
} as const

export type Ge2024Party = keyof typeof GE2024_PARTIES

export type SeatType = 'county' | 'borough' | 'burgh'

export interface Region {
  /** ONS region code (England) or nation code (Scotland, Wales, Northern Ireland). */
  id: string
  name: string
  nation: Nation
}

export interface Seat {
  /** ONS constituency code. */
  id: string
  name: string
  nation: Nation
  region: string
  /** Null where the source lacks it (Northern Ireland). */
  type: SeatType | null
  /** Hex column and row in the `layout` grid (row grows upwards, as in hexjson). */
  q: number
  r: number
}

export interface SeatsFile {
  asOf: string
  layout: 'odd-r'
  regions: Region[]
  seats: Seat[]
}

export interface Ge2024Result {
  id: string
  winner: Ge2024Party
  /** Null when only the winner is known. */
  second: Ge2024Party | null
  electorate: number | null
  /** Valid votes cast. Turnout = valid / electorate (the Commons Library convention). */
  valid: number | null
  rejected: number | null
  majority: number | null
  /** Votes by party; `other` is everyone not listed. Null when only the winner is known. */
  votes: Partial<Record<Ge2024Party, number>> | null
  /** MP as elected in July 2024 (later by-elections and defections are not applied). */
  mp: { first: string; last: string; gender: 'female' | 'male' } | null
  /** Declaration time (`YYYY-MM-DDTHH:MM`), only in the official Commons Library file. */
  declared: string | null
  /** False for hand-entered winners that have not been checked against the official file. */
  verified: boolean
  source: 'hoc' | 'hoc-mirror' | 'manual'
}

export interface Ge2024File {
  asOf: string
  parties: Record<Ge2024Party, string>
  results: Ge2024Result[]
}

/** Census measures per seat. Percentages (1 dp) unless noted; null where not published. */
export interface CensusSeat {
  id: string
  /** People (count). */
  population: number | null
  /** People per hectare. */
  density: number | null
  age16to24: number | null
  age65plus: number | null
  female: number | null
  whiteBritish: number | null
  bornOutsideUk: number | null
  christian: number | null
  muslim: number | null
  noReligion: number | null
  degree: number | null
  ownerOccupied: number | null
  socialRent: number | null
  privateRent: number | null
  professional: number | null
  routine: number | null
  retired: number | null
  badHealth: number | null
  noCar: number | null
  deprived: number | null
  welshSpeakers: number | null
}

export type CensusField = Exclude<keyof CensusSeat, 'id'>

export interface CensusFile {
  /** England and Wales census day; Scotland's census was a year later (`scotlandAsOf`). */
  asOf: string
  scotlandAsOf: string
  fields: Record<CensusField, string>
  seats: CensusSeat[]
}

/** UN M49 regions (the country-codes file). */
export const WORLD_REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'] as const
export type WorldRegion = (typeof WORLD_REGIONS)[number]

/**
 * `territory`: a dependency of `sovereign`; `limited`: a state with limited recognition;
 * `disputed`: a territory whose sovereignty is disputed.
 */
export type CountryStatus = 'state' | 'territory' | 'limited' | 'disputed'

export interface CountryInfo {
  /** ISO 3166-1 numeric code, or a user-assigned `X..` code where Natural Earth has none. */
  id: string
  name: string
  /** ISO 3166-1 alpha-3, null for the `X..` units. */
  iso3: string | null
  region: WorldRegion
  /** M49 intermediate region where there is one (e.g. Caribbean), else the sub-region. */
  subregion: string
  capital: string
  status: CountryStatus
  /** Set for territories: the id of the state they belong to. */
  sovereign?: string
  /** Set unless `status` is `state`, e.g. "British Overseas Territory". */
  statusText?: string
  /** Ids of the blocs it belongs to, in `BLOCS` order. */
  blocs: string[]
  /** Countries sharing a land border on the 1:110m map. */
  neighbours: string[]
}

export interface Bloc {
  id: string
  /** Short name, e.g. "NATO". */
  name: string
  full: string
  about: string
  /** Member ids, including ones too small for the 1:110m map. */
  members: string[]
  /** Members with no shape on the map (small islands), by name. */
  offMap: string[]
  /** Organisations that also belong, e.g. the EU in the G20. */
  alsoIncludes: string[]
}

export interface CountriesFile {
  /** When the bloc memberships and hand-entered facts were checked. */
  asOf: string
  blocs: Bloc[]
  countries: CountryInfo[]
}

/** The world map, projected at build time (Natural Earth I) into SVG paths. */
export interface WorldMapFile {
  width: number
  height: number
  shapes: WorldShape[]
  /** Land borders between countries, drawn once. */
  borders: string
  /** Coastlines. */
  coast: string
}

export interface WorldShape {
  id: string
  /** SVG path in map units. */
  d: string
  /**
   * [x0, y0, x1, y1] of the largest part, in map units: what "centre on map" frames (mainland
   * France, not French Guiana too) and how much room the name has.
   */
  focus: [number, number, number, number]
  /** Where the name goes: the centre of the largest part. */
  label: [number, number]
  /** Political map colour index; neighbours never share one, territories take their state's. */
  colour: number
}

/** Natural Earth countries as TopoJSON (the source the map paths are projected from). */
export interface WorldTopology {
  type: 'Topology'
  bbox: number[]
  transform: { scale: [number, number]; translate: [number, number] }
  arcs: number[][][]
  objects: {
    countries: {
      type: 'GeometryCollection'
      geometries: { type: string; id: string; arcs: unknown; properties: { name: string } }[]
    }
  }
}
