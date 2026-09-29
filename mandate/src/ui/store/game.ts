/**
 * The UI's view of the running game, mirrored from runner messages, plus the actions the UI can
 * take. Vanilla Zustand store so it can be created and tested without React.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Command } from '../../sim/command.ts'
import type { Notification, PauseReason } from '../../sim/scheduler.ts'
import { GAME_VERSION } from '../../sim/version.ts'
import type { BridgeMode, SimBridge } from '../../runtime/bridge.ts'
import type { AutoPauseSettings, RunnerStatus, SaveData, Speed } from '../../runtime/protocol.ts'
import { QUICKSAVE_SLOT, type SaveSlots, type SlotMeta } from '../saves/slots.ts'
import type { SettingsStorage } from './settings.ts'

/** Notifications kept for the log, newest first. */
export const LOG_LIMIT = 50

export interface LoggedNotification extends Notification {
  /** In-game date of the tick that produced it. */
  date: string
}

export interface GameState extends RunnerStatus {
  mode: 'starting' | BridgeMode
  day: number | null
  date: string | null
  autoPause: AutoPauseSettings
  log: LoggedNotification[]
  /** The simulation crashed; shown until a new game or load. */
  fatal: string | null
  /** Last failed action (save, load, storage), for a dismissible message. */
  lastError: string | null
  slots: SlotMeta[]

  /** Wait for the runner, apply settings, list saves and start a new game. */
  boot(seed: string): Promise<void>
  newGame(seed: string): Promise<void>
  setSpeed(speed: Speed): void
  togglePause(): void
  step(days: number): void
  send(cmd: Command): void
  setAutoPause(reason: PauseReason, on: boolean): void
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
    const loaded = (): void => set({ log: [], fatal: null, lastError: null })

    return {
      mode: 'starting',
      day: null,
      date: null,
      speed: 0,
      resumeSpeed: 1,
      pausedBy: null,
      autoPause: settings.loadAutoPause(),
      log: [],
      fatal: null,
      lastError: null,
      slots: [],

      async boot(seed) {
        const mode = await bridge.ready
        set({ mode })
        bridge.send({ type: 'autoPause', settings: get().autoPause })
        await Promise.all([get().refreshSlots(), get().newGame(seed)])
      },
      async newGame(seed) {
        if (await attempt(() => bridge.request({ type: 'newGame', options: { seed } }))) loaded()
      },
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
      async loadFrom(id) {
        const ok = await attempt(async () => {
          await bridge.request({ type: 'load', bytes: await slots.read(id) })
          return true
        })
        if (ok) loaded()
      },
      async deleteSlot(id) {
        if (await attempt(() => slots.remove(id).then(() => true))) await get().refreshSlots()
      },
      saveBytes: () => attempt(() => bridge.request({ type: 'save', savedAt: now() })),
      async loadBytes(bytes) {
        if (await attempt(() => bridge.request({ type: 'load', bytes }))) loaded()
      },
      dismissError: () => set({ lastError: null }),
    }
  })

  bridge.subscribe((msg) => {
    switch (msg.type) {
      case 'tick': {
        const { day, date, notifications } = msg.summary
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
