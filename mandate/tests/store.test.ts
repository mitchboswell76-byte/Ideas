import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createSimBridge, type SimBridge } from '../src/runtime/bridge.ts'
import {
  DEFAULT_AUTO_PAUSE,
  type AutoPauseSettings,
  type FromRunner,
} from '../src/runtime/protocol.ts'
import { indexedDbSlots } from '../src/ui/saves/slots.ts'
import { LOG_LIMIT, createGameStore } from '../src/ui/store/game.ts'
import { parseAutoPause, type SettingsStorage } from '../src/ui/store/settings.ts'

let dbCount = 0

function memorySettings(initial: AutoPauseSettings = { ...DEFAULT_AUTO_PAUSE }) {
  const saved: AutoPauseSettings[] = []
  const settings: SettingsStorage = {
    loadAutoPause: () => ({ ...initial }),
    saveAutoPause: (s) => void saved.push(s),
  }
  return { settings, saved }
}

/** A real main-thread runner behind the store, with fresh IndexedDB slots. */
async function bootedStore() {
  const bridge = createSimBridge({ createWorker: null })
  let clock = 0
  const store = createGameStore({
    bridge,
    slots: indexedDbSlots(`store-${++dbCount}`),
    settings: memorySettings().settings,
    now: () => new Date(Date.UTC(2026, 9, 1, 12, 0, clock++)).toISOString(),
  })
  await store.getState().boot('store-seed')
  return { store, bridge }
}

/** Bridge stub: records what the store sends and lets the test play runner messages. */
function stubBridge() {
  const sent: unknown[] = []
  let listener: (msg: FromRunner) => void = () => {}
  const bridge: SimBridge = {
    ready: Promise.resolve('worker'),
    send: (msg) => void sent.push(msg),
    request: () => Promise.reject(new Error('not used')),
    subscribe: (fn) => {
      listener = fn
      return () => {}
    },
    dispose: () => {},
  }
  return { bridge, sent, emit: (msg: FromRunner) => listener(msg) }
}

describe('game store', () => {
  it('boots a new game and mirrors the runner clock and speed', async () => {
    const { store, bridge } = await bootedStore()
    expect(store.getState()).toMatchObject({ mode: 'main', date: '2026-10-01', speed: 0 })

    store.getState().step(5)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-06'))

    store.getState().setSpeed(5)
    await vi.waitFor(() => expect(store.getState().speed).toBe(5))
    store.getState().togglePause()
    await vi.waitFor(() => expect(store.getState()).toMatchObject({ speed: 0, resumeSpeed: 5 }))
    bridge.dispose()
  })

  it('saves to a slot and loads it back', async () => {
    const { store, bridge } = await bootedStore()
    store.getState().step(10)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-11'))
    await store.getState().saveTo('a', 'First')
    expect(store.getState().slots).toMatchObject([
      { id: 'a', name: 'First', gameDate: '2026-10-11', size: expect.any(Number) },
    ])

    store.getState().step(30)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-11-10'))
    await store.getState().loadFrom('a')
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-11'))
    expect(store.getState().lastError).toBeNull()

    await store.getState().quickSave()
    await store.getState().quickSave()
    expect(store.getState().slots.map((s) => s.id)).toEqual(['quick', 'a'])
    await store.getState().deleteSlot('a')
    expect(store.getState().slots.map((s) => s.id)).toEqual(['quick'])
    bridge.dispose()
  })

  it('exports bytes that import back, and reports a bad import', async () => {
    const { store, bridge } = await bootedStore()
    store.getState().step(3)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-04'))
    const save = await store.getState().saveBytes()
    expect(save?.date).toBe('2026-10-04')

    await store.getState().newGame('other')
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-01'))
    await store.getState().loadBytes(save!.bytes)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-04'))

    await store.getState().loadBytes(new Uint8Array([0, 1]))
    expect(store.getState().lastError).toBe('Not a valid .mandate save file')
    store.getState().dismissError()
    expect(store.getState().lastError).toBeNull()
    bridge.dispose()
  })

  it('keeps the newest notifications, capped', () => {
    const { bridge, emit } = stubBridge()
    const store = createGameStore({
      bridge,
      slots: indexedDbSlots('unused'),
      settings: memorySettings().settings,
    })
    const note = (text: string) => ({ kind: 'news' as const, text })
    emit({ type: 'tick', summary: { day: 1, date: 'd1', notifications: [note('a'), note('b')] } })
    emit({ type: 'tick', summary: { day: 2, date: 'd2', notifications: [] } })
    expect(store.getState()).toMatchObject({ day: 2, date: 'd2' })
    expect(store.getState().log).toEqual([
      { kind: 'news', text: 'b', date: 'd1' },
      { kind: 'news', text: 'a', date: 'd1' },
    ])
    const many = Array.from({ length: LOG_LIMIT + 5 }, (_, i) => note(`n${i}`))
    emit({ type: 'tick', summary: { day: 3, date: 'd3', notifications: many } })
    expect(store.getState().log).toHaveLength(LOG_LIMIT)
    expect(store.getState().log[0]?.text).toBe(`n${LOG_LIMIT + 4}`)

    emit({ type: 'status', speed: 0, resumeSpeed: 2, pausedBy: 'election' })
    expect(store.getState()).toMatchObject({ speed: 0, resumeSpeed: 2, pausedBy: 'election' })
    emit({ type: 'fatal', message: 'boom' })
    expect(store.getState().fatal).toBe('boom')
  })

  it('applies, persists and forwards auto-pause settings', async () => {
    const { bridge, sent } = stubBridge()
    const { settings, saved } = memorySettings({ ...DEFAULT_AUTO_PAUSE, choice: false })
    const store = createGameStore({ bridge, slots: indexedDbSlots('unused'), settings })
    expect(store.getState().autoPause.choice).toBe(false)

    store.getState().setAutoPause('election', false)
    const expected = { ...DEFAULT_AUTO_PAUSE, choice: false, election: false }
    expect(store.getState().autoPause).toEqual(expected)
    expect(saved).toEqual([expected])
    expect(sent).toEqual([{ type: 'autoPause', settings: expected }])
  })

  it('parses stored auto-pause settings defensively', () => {
    expect(parseAutoPause(null)).toEqual(DEFAULT_AUTO_PAUSE)
    expect(parseAutoPause('not json')).toEqual(DEFAULT_AUTO_PAUSE)
    expect(parseAutoPause('{"election":false,"choice":"no","bogus":true}')).toEqual({
      ...DEFAULT_AUTO_PAUSE,
      election: false,
    })
  })
})
