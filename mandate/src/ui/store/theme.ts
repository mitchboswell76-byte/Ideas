/** Colour theme (DESIGN §17): Night by default, Paper as the light alternative. Per browser. */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { readLocal, writeLocal } from './settings.ts'

export type Theme = 'night' | 'paper'

export const THEMES: readonly Theme[] = ['night', 'paper']
export const DEFAULT_THEME: Theme = 'night'

const THEME_KEY = 'mandate.theme'

export function parseTheme(value: string | null): Theme {
  return THEMES.find((t) => t === value) ?? DEFAULT_THEME
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
