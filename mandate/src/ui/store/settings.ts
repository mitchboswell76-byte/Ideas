/** Player settings kept in localStorage (per browser). Storage may be missing or blocked. */
import {
  DEFAULT_AUTO_PAUSE,
  PAUSE_REASONS,
  type AutoPauseSettings,
} from '../../runtime/protocol.ts'

/** How often the game writes the reserved autosave slot, in game time. */
export type AutosaveCadence = 'off' | 'monthly' | 'yearly'

export const AUTOSAVE_CADENCES: readonly AutosaveCadence[] = ['off', 'monthly', 'yearly']
export const DEFAULT_AUTOSAVE: AutosaveCadence = 'monthly'

export interface SettingsStorage {
  loadAutoPause(): AutoPauseSettings
  saveAutoPause(settings: AutoPauseSettings): void
  loadAutosave(): AutosaveCadence
  saveAutosave(cadence: AutosaveCadence): void
}

const AUTO_PAUSE_KEY = 'mandate.autoPause'
const AUTOSAVE_KEY = 'mandate.autosave'

/** Keeps known reasons with boolean values; anything else falls back to the default. */
export function parseAutoPause(json: string | null): AutoPauseSettings {
  const settings = { ...DEFAULT_AUTO_PAUSE }
  if (!json) return settings
  try {
    const raw: unknown = JSON.parse(json)
    if (typeof raw !== 'object' || raw === null) return settings
    for (const reason of PAUSE_REASONS) {
      const value = (raw as Record<string, unknown>)[reason]
      if (typeof value === 'boolean') settings[reason] = value
    }
  } catch {
    // Damaged value: use defaults.
  }
  return settings
}

export function parseAutosave(value: string | null): AutosaveCadence {
  return AUTOSAVE_CADENCES.find((c) => c === value) ?? DEFAULT_AUTOSAVE
}

/** localStorage read/write that never throws (private mode, blocked or full storage). */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not persisted this time; the setting still applies.
  }
}

export const localSettings: SettingsStorage = {
  loadAutoPause: () => parseAutoPause(readLocal(AUTO_PAUSE_KEY)),
  saveAutoPause: (settings) => writeLocal(AUTO_PAUSE_KEY, JSON.stringify(settings)),
  loadAutosave: () => parseAutosave(readLocal(AUTOSAVE_KEY)),
  saveAutosave: (cadence) => writeLocal(AUTOSAVE_KEY, cadence),
}
