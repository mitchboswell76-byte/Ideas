import { describe, expect, it } from 'vitest'
import { Engine } from '../src/sim/engine.ts'
import { hashJson } from '../src/sim/hash.ts'
import {
  SaveError,
  decodeSave,
  encodeSave,
  migrate,
  parseSave,
  serialiseSave,
  unpackSave,
  type Migration,
} from '../src/sim/save.ts'
import type { System } from '../src/sim/scheduler.ts'
import { GAME_VERSION, SAVE_VERSION } from '../src/sim/version.ts'
import { createWorld } from '../src/sim/world.ts'

const SAVED_AT = '2026-10-05T12:00:00.000Z'

const noise: System = {
  id: 'noise',
  cadence: 'daily',
  run: (world, ctx) => void (world.flags.n = ctx.rng.next()),
}

describe('save / load', () => {
  it('round-trips through JSON', () => {
    const world = createWorld({ seed: 'save' })
    const save = parseSave(serialiseSave(world, SAVED_AT))
    expect(save).toEqual({
      version: SAVE_VERSION,
      gameVersion: GAME_VERSION,
      savedAt: SAVED_AT,
      world,
    })
  })

  it('round-trips through gzip, and a loaded game continues identically', async () => {
    const straight = new Engine(createWorld({ seed: 'resume' }), [noise])
    straight.runDays(200)

    const first = new Engine(createWorld({ seed: 'resume' }), [noise])
    first.runDays(80)
    const bytes = await encodeSave(first.world, SAVED_AT)
    expect(bytes[0]).toBe(0x1f) // gzip magic
    const resumed = new Engine((await decodeSave(bytes)).world, [noise])
    resumed.runDays(120)

    expect(hashJson(resumed.world)).toBe(hashJson(straight.world))
  })

  it('walks the migration chain one version at a time', () => {
    const table: Record<number, Migration> = {
      0: (s) => ({ ...s, gameVersion: '0.0.1', savedAt: String(s.when) }),
      1: (s) => ({ ...s, world: { ...(s.world as object), renamed: true } }),
    }
    const world = createWorld({ seed: 'old' })
    const v0 = { version: 0, when: SAVED_AT, world }
    const save = migrate(v0, table, 2)
    expect(save.version).toBe(2)
    expect(save.savedAt).toBe(SAVED_AT)
    expect(save.world).toMatchObject({ renamed: true })
  })

  it('reads a plain JSON export as well as gzip bytes', async () => {
    const world = createWorld({ seed: 'json' })
    const json = await unpackSave(await encodeSave(world, SAVED_AT))
    expect(json).toBe(serialiseSave(world, SAVED_AT))
    const plain = new TextEncoder().encode(json)
    expect((await decodeSave(plain)).world).toEqual(world)
  })

  it('rejects saves it cannot read', async () => {
    const world = createWorld({ seed: 'bad' })
    expect(() => migrate({ version: SAVE_VERSION + 1, savedAt: SAVED_AT, world })).toThrow(
      /newer version/,
    )
    expect(() => migrate({ version: 0, savedAt: SAVED_AT, world }, {}, 1)).toThrow(/No migration/)
    expect(() => migrate({ savedAt: SAVED_AT, world })).toThrow(SaveError)
    expect(() => migrate({ version: SAVE_VERSION, savedAt: SAVED_AT, world: {} })).toThrow(
      /damaged/,
    )
    expect(() => parseSave('{not json')).toThrow(/valid save file/)
    await expect(decodeSave(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/valid save file/)
    // gzip magic, broken stream
    await expect(decodeSave(new Uint8Array([0x1f, 0x8b, 0, 0]))).rejects.toThrow(/valid save file/)
  })
})
