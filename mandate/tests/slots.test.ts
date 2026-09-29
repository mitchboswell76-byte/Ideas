import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { QUICKSAVE_SLOT, indexedDbSlots, newSlotId, type SlotMeta } from '../src/ui/saves/slots.ts'

let dbCount = 0
const freshSlots = () => indexedDbSlots(`test-${++dbCount}`)

function meta(id: string, savedAt: string): SlotMeta {
  return { id, name: id, savedAt, gameDate: '2026-10-01', gameVersion: '0.1.0', size: 3 }
}

describe('IndexedDB save slots', () => {
  it('writes, lists newest first, reads and deletes', async () => {
    const slots = freshSlots()
    expect(await slots.list()).toEqual([])
    await slots.write(meta('a', '2026-10-01T10:00:00.000Z'), new Uint8Array([1, 2, 3]))
    await slots.write(meta('b', '2026-10-02T10:00:00.000Z'), new Uint8Array([4, 5, 6]))
    expect((await slots.list()).map((s) => s.id)).toEqual(['b', 'a'])
    expect(Array.from(await slots.read('a'))).toEqual([1, 2, 3])

    await slots.remove('b')
    expect((await slots.list()).map((s) => s.id)).toEqual(['a'])
    await expect(slots.read('b')).rejects.toThrow('That save slot is empty')
  })

  it('overwrites a slot with the same id', async () => {
    const slots = freshSlots()
    await slots.write(meta(QUICKSAVE_SLOT, '2026-10-01T10:00:00.000Z'), new Uint8Array([1]))
    await slots.write(meta(QUICKSAVE_SLOT, '2026-10-01T11:00:00.000Z'), new Uint8Array([2]))
    const list = await slots.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.savedAt).toBe('2026-10-01T11:00:00.000Z')
    expect(Array.from(await slots.read(QUICKSAVE_SLOT))).toEqual([2])
  })

  it('persists across connections to the same database', async () => {
    await indexedDbSlots('shared').write(meta('x', '2026-10-01T10:00:00.000Z'), new Uint8Array([9]))
    expect((await indexedDbSlots('shared').list()).map((s) => s.id)).toEqual(['x'])
  })

  it('makes distinct manual slot ids', () => {
    const id = newSlotId()
    expect(id).toMatch(/^slot_[0-9a-f]{8}$/)
    expect(newSlotId()).not.toBe(id)
  })
})
