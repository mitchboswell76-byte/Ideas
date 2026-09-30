/**
 * Natural Earth 1:110m countries (via the `world-atlas` package) → the TopoJSON the maps are
 * projected from, with every country given an id, plus the country index: regions and capitals
 * from the country-codes file, hand-entered corrections and statuses, and bloc memberships.
 */
import type { Bloc, CountryInfo, CountryStatus, WorldRegion } from '../../src/data/types.ts'
import { WORLD_REGIONS } from '../../src/data/types.ts'
import type { CsvRow } from './csv.ts'

interface Geometry {
  type: string
  id?: string
  properties: { name: string }
}

export interface Topology {
  type: 'Topology'
  objects: { countries: { geometries: Geometry[] } } & Record<string, unknown>
}

/** No state, so no role in the game; it would also take a fifth of the map's height. */
const DROPPED = new Set(['010'])

/** Natural Earth has no ISO code for these; user-assigned X codes keep ids unique. */
const MISSING_IDS: Record<string, string> = {
  Kosovo: 'XKX',
  'N. Cyprus': 'XNC',
  Somaliland: 'XSL',
}

/** Natural Earth's short labels → the names a UK player expects. */
const DISPLAY_NAMES: Record<string, string> = {
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Central African Rep.': 'Central African Republic',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'Falkland Is.': 'Falkland Islands',
  'Fr. S. Antarctic Lands': 'French Southern and Antarctic Lands',
  'N. Cyprus': 'Northern Cyprus',
  'S. Sudan': 'South Sudan',
  'Solomon Is.': 'Solomon Islands',
  'W. Sahara': 'Western Sahara',
  eSwatini: 'Eswatini',
  Macedonia: 'North Macedonia',
  'United States of America': 'United States',
}

export interface CountryName {
  id: string
  name: string
}

/**
 * Returns a copy with ids filled in, display names applied and Antarctica dropped, plus the
 * names sorted.
 */
export function prepareWorld(source: Topology): { topology: Topology; countries: CountryName[] } {
  const topology = structuredClone(source)
  const all = topology.objects.countries
  all.geometries = all.geometries.filter((g) => !DROPPED.has(g.id ?? ''))
  const countries: CountryName[] = []
  for (const g of all.geometries) {
    const raw = g.properties.name
    const id = g.id ?? MISSING_IDS[raw]
    if (!id) throw new Error(`Country ${raw} has no id`)
    const name = DISPLAY_NAMES[raw] ?? raw
    g.id = id
    g.properties = { name }
    countries.push({ id, name })
  }
  // Drop the land layer: the maps draw countries only.
  for (const key of Object.keys(topology.objects)) {
    if (key !== 'countries') delete topology.objects[key]
  }
  countries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return { topology, countries }
}

/** `data-raw/manual/world-extra.json` */
export interface WorldExtra {
  asOf: string
  units: Record<string, { iso3: null; region: string; subregion: string; capital: string }>
  status: Record<
    string,
    { status: Exclude<CountryStatus, 'state'>; sovereign?: string; text: string }
  >
  capitals: Record<string, string>
}

/** `data-raw/manual/world-blocs.json` */
export interface BlocsSource {
  asOf: string
  blocs: {
    id: string
    name: string
    full: string
    about: string
    members: string[]
    alsoIncludes?: string[]
  }[]
}

const isRegion = (v: string): v is WorldRegion => (WORLD_REGIONS as readonly string[]).includes(v)

/** Joins the names to the country-codes rows (by ISO numeric), corrections and blocs. */
export function countryFacts(
  names: readonly CountryName[],
  codes: readonly CsvRow[],
  extra: WorldExtra,
  blocsSource: BlocsSource,
  neighbours: ReadonlyMap<string, readonly string[]>,
): { countries: CountryInfo[]; blocs: Bloc[] } {
  const byNumeric = new Map<string, CsvRow>()
  const byIso3 = new Map<string, CsvRow>()
  for (const row of codes) {
    const numeric = row['ISO3166-1-numeric']
    if (numeric) byNumeric.set(numeric.padStart(3, '0'), row)
    if (row['ISO3166-1-Alpha-3']) byIso3.set(row['ISO3166-1-Alpha-3'], row)
  }
  const onMap = new Set(names.map((c) => c.id))

  const blocs: Bloc[] = blocsSource.blocs.map((b) => {
    const members = b.members.map((iso3) => {
      const numeric = byIso3.get(iso3)?.['ISO3166-1-numeric']
      if (!numeric) throw new Error(`Bloc ${b.id}: unknown country code ${iso3}`)
      return numeric.padStart(3, '0')
    })
    if (new Set(members).size !== members.length) throw new Error(`Bloc ${b.id}: duplicate member`)
    const offMap = members
      .filter((id) => !onMap.has(id))
      .map((id) => byNumeric.get(id)!.official_name_en!.replace(/^Saint /, 'St '))
      .sort((x, y) => x.localeCompare(y, 'en'))
    return {
      id: b.id,
      name: b.name,
      full: b.full,
      about: b.about,
      members,
      offMap,
      alsoIncludes: b.alsoIncludes ?? [],
    }
  })

  const countries = names.map(({ id, name }): CountryInfo => {
    const row = byNumeric.get(id)
    const unit = extra.units[id]
    if (!row && !unit) throw new Error(`${name} (${id}) is not in country-codes or world-extra`)
    const region = unit?.region ?? row!['Region Name']!
    if (!isRegion(region)) throw new Error(`${name}: unknown region "${region}"`)
    const subregion =
      unit?.subregion || row?.['Intermediate Region Name'] || row?.['Sub-region Name'] || ''
    if (!subregion) throw new Error(`${name}: no sub-region`)
    const capital = extra.capitals[id] ?? unit?.capital ?? row?.Capital ?? ''
    if (!capital) throw new Error(`${name}: no capital`)

    const independent = row?.is_independent ?? 'Yes'
    const special = extra.status[id]
    if (independent !== 'Yes' && !special) {
      throw new Error(`${name} is "${independent}" in country-codes: add it to world-extra status`)
    }
    const info: CountryInfo = {
      id,
      name,
      iso3: row?.['ISO3166-1-Alpha-3'] ?? null,
      region,
      subregion,
      capital,
      status: special?.status ?? 'state',
      blocs: blocs.filter((b) => b.members.includes(id)).map((b) => b.id),
      neighbours: [...(neighbours.get(id) ?? [])],
    }
    if (special?.sovereign) {
      if (!onMap.has(special.sovereign)) throw new Error(`${name}: unknown sovereign`)
      info.sovereign = special.sovereign
    }
    if (special) info.statusText = special.text
    return info
  })
  return { countries, blocs }
}
