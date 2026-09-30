import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createSimBridge, type SimBridge } from '../src/runtime/bridge.ts'
import {
  DEFAULT_AUTO_PAUSE,
  type AutoPauseSettings,
  type FromRunner,
} from '../src/runtime/protocol.ts'
import { AUTOSAVE_SLOT, indexedDbSlots } from '../src/ui/saves/slots.ts'
import { AUTOSAVE_MIN_GAP_MS, LOG_LIMIT, createGameStore } from '../src/ui/store/game.ts'
import {
  parseAutoPause,
  parseAutosave,
  type AutosaveCadence,
  type SettingsStorage,
} from '../src/ui/store/settings.ts'

let dbCount = 0

function memorySettings(
  initial: AutoPauseSettings = { ...DEFAULT_AUTO_PAUSE },
  autosave: AutosaveCadence = 'off',
) {
  const saved: AutoPauseSettings[] = []
  const savedAutosave: AutosaveCadence[] = []
  const settings: SettingsStorage = {
    loadAutoPause: () => ({ ...initial }),
    saveAutoPause: (s) => void saved.push(s),
    loadAutosave: () => autosave,
    saveAutosave: (c) => void savedAutosave.push(c),
  }
  return { settings, saved, savedAutosave }
}

/**
 * A real main-thread runner behind the store, with fresh IndexedDB slots. Real time starts at
 * noon on 1 Oct 2026 and moves one second per `now()` call unless the test moves `clock.ms`.
 */
async function bootedStore(autosave: AutosaveCadence = 'off') {
  const bridge = createSimBridge({ createWorker: null })
  const clock = { ms: Date.UTC(2026, 9, 1, 12) }
  const store = createGameStore({
    bridge,
    slots: indexedDbSlots(`store-${++dbCount}`),
    settings: memorySettings(undefined, autosave).settings,
    now: () => new Date((clock.ms += 1000)).toISOString(),
  })
  await store.getState().boot()
  await store.getState().newGame('store-seed')
  return { store, bridge, clock }
}

const autosaveSlot = (store: Awaited<ReturnType<typeof bootedStore>>['store']) =>
  store.getState().slots.find((s) => s.id === AUTOSAVE_SLOT)

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
  it('boots without starting a game, so the title screen decides', async () => {
    const store = createGameStore({
      bridge: createSimBridge({ createWorker: null }),
      slots: indexedDbSlots(`store-${++dbCount}`),
      settings: memorySettings().settings,
    })
    await store.getState().boot()
    expect(store.getState()).toMatchObject({ mode: 'main', date: null, slots: [] })
  })

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
    expect(store.getState().lastError).toBe('Not a valid save file')
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
      { id: 2, kind: 'news', text: 'b', date: 'd1', read: false },
      { id: 1, kind: 'news', text: 'a', date: 'd1', read: false },
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

  it('marks inbox items read and unread', () => {
    const { bridge, emit } = stubBridge()
    const store = createGameStore({
      bridge,
      slots: indexedDbSlots('unused'),
      settings: memorySettings().settings,
    })
    const note = (text: string) => ({ kind: 'info' as const, text })
    emit({ type: 'tick', summary: { day: 1, date: 'd1', notifications: [note('a'), note('b')] } })
    const [b, a] = store.getState().log
    store.getState().markRead(a!.id)
    expect(store.getState().log.map((n) => n.read)).toEqual([false, true])
    store.getState().markRead(a!.id, false)
    expect(store.getState().log.map((n) => n.read)).toEqual([false, false])
    const before = store.getState().log
    store.getState().markRead(999)
    expect(store.getState().log.every((n, i) => n === before[i])).toBe(true)
    store.getState().markAllRead()
    expect(store.getState().log.map((n) => n.read)).toEqual([true, true])
    expect(b!.id).toBeGreaterThan(a!.id)
  })

  it('starts a new career with the welcome mail, but not a loaded one', async () => {
    const { store, bridge } = await bootedStore()
    expect(store.getState().log).toMatchObject([
      { kind: 'info', from: 'Mandate', date: '2026-10-01', read: false },
    ])
    await store.getState().saveTo('a', 'First')
    await store.getState().loadFrom('a')
    expect(store.getState().log).toEqual([])
    bridge.dispose()
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

  it('autosaves when game time enters a new month, at most once a minute of real time', async () => {
    const { store, bridge, clock } = await bootedStore('monthly')
    store.getState().step(20)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-21'))
    expect(autosaveSlot(store)).toBeUndefined()

    store.getState().step(20)
    await vi.waitFor(() => expect(autosaveSlot(store)).toMatchObject({ name: 'Autosave' }))
    const first = autosaveSlot(store)!.savedAt

    // Another month boundary straight away is inside the real-time gap: no new autosave.
    store.getState().step(31)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-12-11'))
    await store.getState().refreshSlots()
    expect(autosaveSlot(store)!.savedAt).toBe(first)

    clock.ms += AUTOSAVE_MIN_GAP_MS
    store.getState().step(31)
    await vi.waitFor(() => expect(autosaveSlot(store)!.savedAt).not.toBe(first))
    expect(autosaveSlot(store)!.gameDate.slice(0, 7)).toBe('2027-01')
    bridge.dispose()
  })

  it('does not autosave when a load moves the date, or when off', async () => {
    const { store, bridge, clock } = await bootedStore('monthly')
    await store.getState().saveTo('early', 'Early')
    store.getState().step(40)
    await vi.waitFor(() => expect(autosaveSlot(store)).toBeDefined())
    const first = autosaveSlot(store)!.savedAt

    // Loading a save from another month must not overwrite the autosave with the loaded game.
    clock.ms += AUTOSAVE_MIN_GAP_MS
    await store.getState().loadFrom('early')
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-01'))
    store.getState().step(1)
    await vi.waitFor(() => expect(store.getState().date).toBe('2026-10-02'))
    await store.getState().refreshSlots()
    expect(autosaveSlot(store)!.savedAt).toBe(first)

    store.getState().setAutosave('off')
    store.getState().step(100)
    await vi.waitFor(() => expect(store.getState().date).toBe('2027-01-10'))
    await store.getState().refreshSlots()
    expect(autosaveSlot(store)!.savedAt).toBe(first)

    store.getState().setAutosave('yearly')
    store.getState().step(365)
    await vi.waitFor(() => expect(autosaveSlot(store)!.savedAt).not.toBe(first))
    expect(autosaveSlot(store)!.gameDate.slice(0, 4)).toBe('2028')
    bridge.dispose()
  })

  it('persists the autosave cadence', () => {
    const { bridge } = stubBridge()
    const { settings, savedAutosave } = memorySettings(undefined, 'yearly')
    const store = createGameStore({ bridge, slots: indexedDbSlots('unused'), settings })
    expect(store.getState().autosave).toBe('yearly')
    store.getState().setAutosave('off')
    expect(store.getState().autosave).toBe('off')
    expect(savedAutosave).toEqual(['off'])
  })

  it('parses stored settings defensively', () => {
    expect(parseAutosave(null)).toBe('monthly')
    expect(parseAutosave('weekly')).toBe('monthly')
    expect(parseAutosave('yearly')).toBe('yearly')
    expect(parseAutoPause(null)).toEqual(DEFAULT_AUTO_PAUSE)
    expect(parseAutoPause('not json')).toEqual(DEFAULT_AUTO_PAUSE)
    expect(parseAutoPause('{"election":false,"choice":"no","bogus":true}')).toEqual({
      ...DEFAULT_AUTO_PAUSE,
      election: false,
    })
  })
})
