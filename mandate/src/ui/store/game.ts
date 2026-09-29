/**
 * The UI's view of the running game, mirrored from runner messages, plus the actions the UI can
 * take. Vanilla Zustand store so it can be created and tested without React.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Command } from '../../sim/command.ts'
import type { Notification, PauseReason } from '../../sim/scheduler.ts'
import { GAME_VERSION } from '../../sim/version.ts'
import type { BridgeMode, SimBridge } from '../../runtime/bridge.ts'
import type {
  AutoPauseSettings,
  GameDate,
  RunnerStatus,
  SaveData,
  Speed,
} from '../../runtime/protocol.ts'
import { AUTOSAVE_SLOT, QUICKSAVE_SLOT, type SaveSlots, type SlotMeta } from '../saves/slots.ts'
import type { AutosaveCadence, SettingsStorage } from './settings.ts'

/** Notifications kept for the log, newest first. */
export const LOG_LIMIT = 50

/** Shortest real-time gap between autosaves, so fast speeds don't save every half second. */
export const AUTOSAVE_MIN_GAP_MS = 60_000

/** The game-time period an autosave cadence counts in (`YYYY-MM` or `YYYY`); `null` when off. */
function autosavePeriod(date: string | null, cadence: AutosaveCadence): string | null {
  if (date === null || cadence === 'off') return null
  return date.slice(0, cadence === 'monthly' ? 7 : 4)
}

export interface LoggedNotification extends Notification {
  /** In-game date of the tick that produced it. */
  date: string
}

export interface GameState extends RunnerStatus {
  mode: 'starting' | BridgeMode
  day: number | null
  date: string | null
  autoPause: AutoPauseSettings
  autosave: AutosaveCadence
  log: LoggedNotification[]
  /** The simulation crashed; shown until a new game or load. */
  fatal: string | null
  /** Last failed action (save, load, storage), for a dismissible message. */
  lastError: string | null
  slots: SlotMeta[]

  /** Wait for the runner, apply settings and list saves. The title screen starts or loads a game. */
  boot(): Promise<void>
  newGame(seed: string): Promise<void>
  setSpeed(speed: Speed): void
  togglePause(): void
  step(days: number): void
  send(cmd: Command): void
  setAutoPause(reason: PauseReason, on: boolean): void
  setAutosave(cadence: AutosaveCadence): void
  refreshSlots(): Promise<void>
  saveTo(id: string, name: string): Promise<void>
  quickSave(): Promise<void>
  loadFrom(id: string): Promise<void>
  deleteSlot(id: string): Promise<void>
  /** Current game as save bytes (for export); `null` if it failed (see `lastError`). */
  saveBytes(): Promise<SaveData | null>
  /** Load save bytes (from an imported file). */
  loadBytes(bytes: Uint8Array<ArrayBuffer>): Promise<void>
  dismissError(): void
}

export interface GameStoreDeps {
  bridge: SimBridge
  slots: SaveSlots
  settings: SettingsStorage
  /** Real-time ISO timestamp for `savedAt`. */
  now?: () => string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createGameStore({
  bridge,
  slots,
  settings,
  now = () => new Date().toISOString(),
}: GameStoreDeps): StoreApi<GameState> {
  /** Autosave bookkeeping: the period of the current game date, and when we last autosaved. */
  let lastPeriod: string | null = null
  let lastAutosaveAt = -Infinity
  let autosaving = false
  /** Loads/new games in flight; their ticks must not count as time passing in either game. */
  let replacing = 0

  const store = createStore<GameState>()((set, get) => {
    /** Run an action; failures land in `lastError` instead of rejecting. */
    const attempt = async <T>(action: () => Promise<T>): Promise<T | null> => {
      try {
        return await action()
      } catch (error) {
        set({ lastError: errorMessage(error) })
        return null
      }
    }
    /** Swap in another game (new or loaded) and reset the per-game UI state on success. */
    const replaceGame = async (action: () => Promise<GameDate>): Promise<void> => {
      replacing++
      try {
        const loaded = await attempt(action)
        if (loaded) set({ log: [], fatal: null, lastError: null })
        lastPeriod = autosavePeriod(loaded?.date ?? get().date, get().autosave)
      } finally {
        replacing--
      }
    }

    return {
      mode: 'starting',
      day: null,
      date: null,
      speed: 0,
      resumeSpeed: 1,
      pausedBy: null,
      autoPause: settings.loadAutoPause(),
      autosave: settings.loadAutosave(),
      log: [],
      fatal: null,
      lastError: null,
      slots: [],

      async boot() {
        const mode = await bridge.ready
        set({ mode })
        bridge.send({ type: 'autoPause', settings: get().autoPause })
        await get().refreshSlots()
      },
      newGame: (seed) => replaceGame(() => bridge.request({ type: 'newGame', options: { seed } })),
      setSpeed: (speed) => bridge.send({ type: 'speed', speed }),
      togglePause: () => bridge.send({ type: 'togglePause' }),
      step: (days) => bridge.send({ type: 'step', days }),
      send: (cmd) => bridge.send({ type: 'cmd', cmd }),
      setAutoPause(reason, on) {
        const autoPause = { ...get().autoPause, [reason]: on }
        set({ autoPause })
        settings.saveAutoPause(autoPause)
        bridge.send({ type: 'autoPause', settings: autoPause })
      },
      setAutosave(cadence) {
        set({ autosave: cadence })
        settings.saveAutosave(cadence)
        lastPeriod = autosavePeriod(get().date, cadence)
      },
      async refreshSlots() {
        const list = await attempt(() => slots.list())
        if (list) set({ slots: list })
      },
      async saveTo(id, name) {
        const savedAt = now()
        const written = await attempt(async () => {
          const { bytes, date } = await bridge.request({ type: 'save', savedAt })
          const meta = { id, name, savedAt, gameDate: date, gameVersion: GAME_VERSION }
          await slots.write({ ...meta, size: bytes.byteLength }, bytes)
          return true
        })
        if (written) await get().refreshSlots()
      },
      quickSave: () => get().saveTo(QUICKSAVE_SLOT, 'Quicksave'),
      loadFrom: (id) =>
        replaceGame(async () => bridge.request({ type: 'load', bytes: await slots.read(id) })),
      async deleteSlot(id) {
        if (await attempt(() => slots.remove(id).then(() => true))) await get().refreshSlots()
      },
      saveBytes: () => attempt(() => bridge.request({ type: 'save', savedAt: now() })),
      loadBytes: (bytes) => replaceGame(() => bridge.request({ type: 'load', bytes })),
      dismissError: () => set({ lastError: null }),
    }
  })

  /** Write the autosave slot when a tick enters a new month/year of game time. */
  const autosaveOnTick = (date: string): void => {
    if (replacing > 0) return
    const period = autosavePeriod(date, store.getState().autosave)
    const entered = lastPeriod !== null && period !== null && period !== lastPeriod
    lastPeriod = period
    if (!entered || autosaving) return
    const at = Date.parse(now())
    if (at - lastAutosaveAt < AUTOSAVE_MIN_GAP_MS) return
    lastAutosaveAt = at
    autosaving = true
    void store
      .getState()
      .saveTo(AUTOSAVE_SLOT, 'Autosave')
      .finally(() => (autosaving = false))
  }

  bridge.subscribe((msg) => {
    switch (msg.type) {
      case 'tick': {
        const { day, date, notifications } = msg.summary
        autosaveOnTick(date)
        if (!notifications.length) {
          store.setState({ day, date })
          break
        }
        const fresh = notifications.map((n) => ({ ...n, date })).reverse()
        store.setState((s) => ({ day, date, log: [...fresh, ...s.log].slice(0, LOG_LIMIT) }))
        break
      }
      case 'status': {
        const { speed, resumeSpeed, pausedBy } = msg
        store.setState({ speed, resumeSpeed, pausedBy })
        break
      }
      case 'fatal':
        store.setState({ fatal: msg.message })
        break
    }
  })

  return store
}
