/** Player settings kept in localStorage (per browser). Storage may be missing or blocked. */
import {
  DEFAULT_AUTO_PAUSE,
  PAUSE_REASONS,
  type AutoPauseSettings,
} from '../../runtime/protocol.ts'

export interface SettingsStorage {
  loadAutoPause(): AutoPauseSettings
  saveAutoPause(settings: AutoPauseSettings): void
}

const AUTO_PAUSE_KEY = 'mandate.autoPause'

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

export const localSettings: SettingsStorage = {
  loadAutoPause() {
    try {
      return parseAutoPause(localStorage.getItem(AUTO_PAUSE_KEY))
    } catch {
      return { ...DEFAULT_AUTO_PAUSE }
    }
  },
  saveAutoPause(settings) {
    try {
      localStorage.setItem(AUTO_PAUSE_KEY, JSON.stringify(settings))
    } catch {
      // Not persisted this time (private mode, storage full); the setting still applies.
    }
  },
}
