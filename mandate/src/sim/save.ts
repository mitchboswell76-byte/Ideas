/**
 * Save format (DESIGN §3): `{ version, gameVersion, savedAt, world }` as JSON, gzip-compressed for
 * storage and `.mandate` export; the published Artifact exports the plain JSON as `.json` instead.
 * Pure: the caller supplies `savedAt` and does the storing.
 */
import { GAME_VERSION, SAVE_VERSION } from './version.ts'
import type { World } from './world.ts'

export interface SaveFile {
  version: number
  gameVersion: string
  /** ISO timestamp from the caller (the sim has no wall clock). */
  savedAt: string
  world: World
}

/** A save as plain JSON at some older version. */
export type RawSave = { version: number } & Record<string, unknown>

/** Returns the save upgraded by one version; `migrate` sets the new `version` number. */
export type Migration = (save: RawSave) => Record<string, unknown>

/** `migrations[v]` upgrades a version-v save to v+1. Add one whenever SAVE_VERSION is bumped. */
export const migrations: Readonly<Record<number, Migration>> = {}

export class SaveError extends Error {
  override name = 'SaveError'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWorldLike(value: unknown): boolean {
  if (!isObject(value) || !isObject(value.clock)) return false
  const { rngState } = value
  return (
    Number.isInteger(value.clock.day) &&
    Array.isArray(rngState) &&
    rngState.length === 4 &&
    rngState.every((n) => Number.isInteger(n))
  )
}

/** Upgrade a parsed save to `target` via the migration chain, then sanity-check it. */
export function migrate(
  raw: unknown,
  table: Readonly<Record<number, Migration>> = migrations,
  target: number = SAVE_VERSION,
): SaveFile {
  if (!isObject(raw)) throw new SaveError('Save is not an object')
  const { version } = raw
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new SaveError('Save has no valid version number')
  }
  if (version > target) {
    throw new SaveError(
      `Save is from a newer version of the game (v${version}; this build reads v${target})`,
    )
  }
  let save = raw as RawSave
  while (save.version < target) {
    const step = table[save.version]
    if (!step) throw new SaveError(`No migration from save v${save.version}`)
    save = { ...step(save), version: save.version + 1 }
  }
  if (typeof save.savedAt !== 'string' || !isWorldLike(save.world)) {
    throw new SaveError('Save is missing or has a damaged world')
  }
  return save as unknown as SaveFile
}

export function serialiseSave(world: World, savedAt: string): string {
  const save: SaveFile = { version: SAVE_VERSION, gameVersion: GAME_VERSION, savedAt, world }
  return JSON.stringify(save)
}

export function parseSave(json: string): SaveFile {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new SaveError('Not a valid save file')
  }
  return migrate(raw)
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** gzip-compressed save bytes (IndexedDB value / `.mandate` file). */
export async function encodeSave(world: World, savedAt: string): Promise<Uint8Array<ArrayBuffer>> {
  const json = new TextEncoder().encode(serialiseSave(world, savedAt))
  return transform(json, new CompressionStream('gzip'))
}

/** gzip streams start with these two bytes; anything else is read as plain JSON. */
function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b
}

/** The JSON text inside save bytes: a gzip `.mandate` file/slot, or a plain `.json` export. */
export async function unpackSave(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!isGzip(bytes)) return new TextDecoder().decode(bytes)
  try {
    return new TextDecoder().decode(await transform(bytes, new DecompressionStream('gzip')))
  } catch {
    throw new SaveError('Not a valid save file')
  }
}

/** Reads either save file format (see {@link unpackSave}) and migrates it to the current version. */
export async function decodeSave(bytes: Uint8Array<ArrayBuffer>): Promise<SaveFile> {
  return parseSave(await unpackSave(bytes))
}
