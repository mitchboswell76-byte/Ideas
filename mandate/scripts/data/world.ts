/**
 * Natural Earth 1:110m countries (via the `world-atlas` package) → the TopoJSON the maps draw,
 * with every country given an id, plus a small name index.
 */
import type { CountryInfo } from '../../src/data/types.ts'

interface Geometry {
  type: string
  id?: string
  properties: { name: string }
}

export interface Topology {
  type: 'Topology'
  objects: { countries: { geometries: Geometry[] } } & Record<string, unknown>
}

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

/** Returns a copy with ids filled in and display names applied, plus the sorted index. */
export function prepareWorld(source: Topology): { topology: Topology; countries: CountryInfo[] } {
  const topology = structuredClone(source)
  const countries: CountryInfo[] = []
  for (const g of topology.objects.countries.geometries) {
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
