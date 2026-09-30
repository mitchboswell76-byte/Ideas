/**
 * Builds the bundled data in `src/data/generated/` from pinned sources (see docs/DATA_SOURCES.md):
 *  - uk-seats.json     650 Westminster seats: name, nation, region, type, hex cell
 *  - ge2024.json       2024 general election results per seat
 *  - census2021.json   Census measures per seat (England and Wales 2021, Scotland 2022)
 *  - world-110m.json   Natural Earth 1:110m countries (TopoJSON) + countries.json name index
 * Usage: npm run data [-- --refresh]   (--refresh re-downloads instead of using data-raw/.cache)
 * Optional: put the Commons Library's HoC-GE2024-results-by-constituency.csv in data-raw/ to use
 * official results for all 650 seats (and declaration times) instead of the GB mirror + manual NI.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type {
  CensusFile,
  Ge2024File,
  Ge2024Party,
  Ge2024Result,
  Region,
  Seat,
  SeatsFile,
} from '../src/data/types.ts'
import { GE2024_PARTIES } from '../src/data/types.ts'
import type { Nation } from '../src/sim/world.ts'
import { CENSUS_FIELDS, censusFromSummaries, emptyCensus } from './data/census.ts'
import { parseCsv } from './data/csv.ts'
import { fromHocCsv, fromManual, fromSummaries, type ManualWinners } from './data/ge2024.ts'
import { parseHexjson } from './data/hexjson.ts'
import { fetchCached, SOURCES } from './data/sources.ts'
import { prepareWorld, type Topology } from './data/world.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RAW = `${ROOT}data-raw/`
const CACHE = `${RAW}.cache/`
const OUT = `${ROOT}src/data/generated/`
const HOC_CSV = `${RAW}HoC-GE2024-results-by-constituency.csv`
const SEAT_COUNT = 650

const NATIONS: Record<string, Nation> = {
  E: 'england',
  S: 'scotland',
  W: 'wales',
  N: 'northern-ireland',
}

function nationOf(id: string): Nation {
  const nation = NATIONS[id[0]]
  if (!nation) throw new Error(`${id}: unknown nation prefix`)
  return nation
}

/** Pretty enough to diff: top-level keys on their own lines, one array element per line. */
function stringify(file: object): string {
  const entries = Object.entries(file).map(([key, value]) => {
    const body =
      Array.isArray(value) && value.length > 0
        ? `[\n${value.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`
        : JSON.stringify(value)
    return `  ${JSON.stringify(key)}: ${body}`
  })
  return `{\n${entries.join(',\n')}\n}\n`
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  const hex = parseHexjson(await fetchCached(SOURCES.hexjson, CACHE, refresh))
  const ids = Object.keys(hex.hexes).sort()
  if (ids.length !== SEAT_COUNT)
    throw new Error(`hexjson has ${ids.length} seats, not ${SEAT_COUNT}`)

  const summaryRows = parseCsv(await fetchCached(SOURCES.summaries, CACHE, refresh))
  const gb = fromSummaries(summaryRows)
  const hoc = existsSync(HOC_CSV) ? fromHocCsv(parseCsv(await readFile(HOC_CSV, 'utf8'))) : null
  const manualFile = JSON.parse(
    await readFile(`${RAW}manual/ni-ge2024-winners.json`, 'utf8'),
  ) as ManualWinners
  const manual = fromManual(manualFile)

  const byId = (list: Ge2024Result[]) => new Map(list.map((r) => [r.id, r]))
  const hocResults = byId(hoc?.results ?? [])
  const gbResults = byId(gb.results)
  const manualResults = byId(manual)
  for (const [label, map] of [
    ['HoC CSV', hocResults],
    ['GB summaries', gbResults],
    ['NI winners', manualResults],
  ] as const) {
    for (const id of map.keys()) {
      if (!hex.hexes[id]) throw new Error(`${label}: ${id} is not a seat in the hexjson`)
    }
  }

  // Region names come from the result files (the hexjson has codes only).
  const regionNames = new Map<string, string>([['N92000002', 'Northern Ireland']])
  for (const [id, meta] of [...gb.meta, ...(hoc?.meta ?? [])]) {
    const code = hex.hexes[id].region
    const known = regionNames.get(code)
    if (meta.region && !known) regionNames.set(code, meta.region)
  }

  const seats: Seat[] = []
  const results: Ge2024Result[] = []
  for (const id of ids) {
    const h = hex.hexes[id]
    const meta = hoc?.meta.get(id) ?? gb.meta.get(id)
    const result = hocResults.get(id) ?? gbResults.get(id) ?? manualResults.get(id)
    if (!result) throw new Error(`${id} (${h.n}) has no result in any source`)
    if (meta && meta.name.localeCompare(h.n, 'en', { sensitivity: 'base' }) !== 0) {
      console.warn(
        `name differs for ${id}: results "${meta.name}", hexjson "${h.n}" (kept hexjson)`,
      )
    }
    // hexjson names keep diacritics (Ynys Môn) that the GB mirror drops; the HoC file wins if given.
    seats.push({
      id,
      name: hoc?.meta.get(id)?.name ?? h.n,
      nation: nationOf(id),
      region: h.region,
      type: meta?.type ?? null,
      q: h.q,
      r: h.r,
    })
    results.push(result)
  }

  const regions: Region[] = [...new Set(seats.map((s) => s.region))].sort().map((code) => {
    const name = regionNames.get(code)
    if (!name) throw new Error(`Region ${code} has no name`)
    return { id: code, name, nation: nationOf(code) }
  })

  const census = new Map(summaryRows.map((row) => [row.ONSConstID, censusFromSummaries(row)]))
  const censusSeats = ids.map((id) => census.get(id) ?? emptyCensus(id))

  const atlas = JSON.parse(
    await readFile(`${ROOT}node_modules/world-atlas/countries-110m.json`, 'utf8'),
  ) as Topology
  const world = prepareWorld(atlas)

  const seatsFile: SeatsFile = { asOf: '2024-07-04', layout: hex.layout, regions, seats }
  const ge2024File: Ge2024File = { asOf: '2024-07-04', parties: GE2024_PARTIES, results }
  const censusFile: CensusFile = {
    asOf: '2021-03-21',
    scotlandAsOf: '2022-03-20',
    fields: CENSUS_FIELDS,
    seats: censusSeats,
  }
  await mkdir(OUT, { recursive: true })
  await writeFile(`${OUT}uk-seats.json`, stringify(seatsFile))
  await writeFile(`${OUT}ge2024.json`, stringify(ge2024File))
  await writeFile(`${OUT}census2021.json`, stringify(censusFile))
  await writeFile(`${OUT}world-110m.json`, `${JSON.stringify(world.topology)}\n`)
  await writeFile(`${OUT}countries.json`, stringify({ countries: world.countries }))

  const totals = new Map<Ge2024Party, number>()
  for (const r of results) totals.set(r.winner, (totals.get(r.winner) ?? 0) + 1)
  const sources = new Map<string, number>()
  for (const r of results) sources.set(r.source, (sources.get(r.source) ?? 0) + 1)
  console.log(
    `${seats.length} seats in ${regions.length} regions; ${world.countries.length} countries`,
  )
  console.log(
    'Seats:',
    [...totals]
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `${GE2024_PARTIES[p]} ${n}`)
      .join(', '),
  )
  console.log('Results from:', [...sources].map(([s, n]) => `${s} ${n}`).join(', '))
  if (!hoc) console.log('No HoC CSV in data-raw/: Northern Ireland has winners only (unverified).')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
