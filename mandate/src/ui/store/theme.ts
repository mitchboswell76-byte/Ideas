/** Colour theme (DESIGN §17): dark graphite by default, or light. Per browser. */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { readLocal, writeLocal } from './settings.ts'

export type Theme = 'dark' | 'light'

export const THEMES: readonly Theme[] = ['dark', 'light']
export const DEFAULT_THEME: Theme = 'dark'

const THEME_KEY = 'mandate.theme'

/** Names used before T4c. */
const RENAMED: Readonly<Record<string, Theme>> = { night: 'dark', paper: 'light' }

export function parseTheme(value: string | null): Theme {
  const renamed = value === null ? undefined : RENAMED[value]
  return THEMES.find((t) => t === value) ?? renamed ?? DEFAULT_THEME
}

/** Tokens switch on `<html data-theme>`. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

interface ThemeState {
  theme: Theme
  setTheme(theme: Theme): void
}

export const themeStore = createStore<ThemeState>()((set) => ({
  theme: parseTheme(readLocal(THEME_KEY)),
  setTheme(theme) {
    set({ theme })
    writeLocal(THEME_KEY, theme)
    applyTheme(theme)
  },
}))

export function useTheme(): ThemeState {
  return useStore(themeStore)
}
