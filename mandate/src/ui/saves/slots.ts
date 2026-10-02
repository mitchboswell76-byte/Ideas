/**
 * Save slots in IndexedDB: slot metadata and save bytes live in separate stores, written in one
 * transaction, so listing slots never loads the saves themselves.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface SlotMeta {
  id: string
  name: string
  /** ISO timestamp (real time). */
  savedAt: string
  /** In-game date, `YYYY-MM-DD`. */
  gameDate: string
  gameVersion: string
  /** Compressed size in bytes. */
  size: number
}

/** Reserved slot IDs; manual slots use `newSlotId()`. */
export const AUTOSAVE_SLOT = 'auto'
export const QUICKSAVE_SLOT = 'quick'

export interface SaveSlots {
  /** Newest first. */
  list(): Promise<SlotMeta[]>
  /** Creates or overwrites the slot `meta.id`. */
  write(meta: SlotMeta, bytes: Uint8Array<ArrayBuffer>): Promise<void>
  read(id: string): Promise<Uint8Array<ArrayBuffer>>
  remove(id: string): Promise<void>
}

interface SaveDb extends DBSchema {
  slots: { key: string; value: SlotMeta }
  saveData: { key: string; value: Uint8Array<ArrayBuffer> }
}

export function newSlotId(): string {
  return `slot_${crypto.randomUUID().slice(0, 8)}`
}

export function indexedDbSlots(dbName = 'mandate'): SaveSlots {
  let db: Promise<IDBPDatabase<SaveDb>> | null = null

  const open = (): Promise<IDBPDatabase<SaveDb>> => {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('Browser storage is unavailable; use Export instead'))
    }
    db ??= openDB<SaveDb>(dbName, 1, {
      upgrade(database) {
        database.createObjectStore('slots', { keyPath: 'id' })
        database.createObjectStore('saveData')
      },
    }).catch((error: unknown) => {
      db = null
      throw error
    })
    return db
  }

  return {
    async list() {
      const slots = await (await open()).getAll('slots')
      return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    },
    async write(meta, bytes) {
      const tx = (await open()).transaction(['slots', 'saveData'], 'readwrite')
      await Promise.all([
        tx.objectStore('slots').put(meta),
        tx.objectStore('saveData').put(bytes, meta.id),
        tx.done,
      ])
    },
    async read(id) {
      const bytes = await (await open()).get('saveData', id)
      if (!bytes) throw new Error('That save slot is empty')
      return bytes
    },
    async remove(id) {
      const tx = (await open()).transaction(['slots', 'saveData'], 'readwrite')
      await Promise.all([
        tx.objectStore('slots').delete(id),
        tx.objectStore('saveData').delete(id),
        tx.done,
      ])
    },
  }
}
