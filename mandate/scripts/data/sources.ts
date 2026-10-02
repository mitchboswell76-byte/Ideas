/**
 * Remote inputs for `npm run data`, pinned to a commit and a SHA-256 so rebuilds are reproducible.
 * Downloads are cached in `data-raw/.cache/` (gitignored); licences and attribution are in
 * docs/DATA_SOURCES.md.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface RemoteSource {
  file: string
  url: string
  sha256: string
}

const RAW = 'https://raw.githubusercontent.com'

export const SOURCES = {
  /** Open Innovations hex cartogram of the 2024 Westminster constituencies (MIT). */
  hexjson: {
    file: 'uk-constituencies-2023.hexjson',
    url: `${RAW}/odileeds/hexmaps/17982f91f7f21b84b6c876f952437c8986172811/maps/uk-constituencies-2023.hexjson`,
    sha256: '7a99cbd2f9574ee7e3fcb55a106189b7342d35c899e96554f51c06b6c73469d0',
  },
  /**
   * GB constituency file (University of Bristol): GE2024 results copied from the Commons Library
   * file (Open Parliament Licence) plus Census 2021 measures (Open Government Licence).
   */
  summaries: {
    file: 'ge2024-census-summaries-v1.1.csv',
    url: `${RAW}/ralphascott/UKGE24_wpc_census_summaries/d37264281d7ffa9eff6a86a01008c15e331022cc/2024-UK-General-Election-Census-Constituency-Summaries-File-v1.1.csv`,
    sha256: '981cd8b104683c95ffe9b7af5a1dd1a8a2b3e6d728c506212b6b7915a327fe8c',
  },
  /**
   * DataHub country codes (Public Domain Dedication and License): UN M49 regions, capitals and
   * independence status by ISO code.
   */
  countryCodes: {
    file: 'country-codes.csv',
    url: `${RAW}/datasets/country-codes/6a595f1a6f10b3d00175fe67375da88f64f7f76b/data/country-codes.csv`,
    sha256: '67b009b529330b0a6043551189f43faa785c9c3cc0011ad2bdb4eac876356c43',
  },
} satisfies Record<string, RemoteSource>

export function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/** Returns the source's text, from the cache when its hash still matches, else downloaded. */
export async function fetchCached(
  source: RemoteSource,
  cacheDir: string,
  refresh = false,
): Promise<string> {
  const path = join(cacheDir, source.file)
  if (!refresh && existsSync(path)) {
    const cached = await readFile(path)
    if (sha256(cached) === source.sha256) return cached.toString('utf8')
  }
  let bytes: Uint8Array
  try {
    const res = await fetch(source.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    bytes = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    throw new Error(
      `Download failed for ${source.url}: ${(err as Error).message}. Behind a proxy, run with ` +
        'NODE_USE_ENV_PROXY=1 (Node 22.21+).',
      { cause: err },
    )
  }
  const hash = sha256(bytes)
  if (hash !== source.sha256) {
    throw new Error(`${source.file}: SHA-256 ${hash} does not match the pinned ${source.sha256}`)
  }
  await mkdir(cacheDir, { recursive: true })
  await writeFile(path, bytes)
  return Buffer.from(bytes).toString('utf8')
}
