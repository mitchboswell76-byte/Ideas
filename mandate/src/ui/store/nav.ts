/** Which screen and inbox item are open (UI only; not saved). */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

export type ScreenName = 'home' | 'inbox' | 'calendar' | 'map' | 'world' | 'saves' | 'settings'

interface NavState {
  screen: ScreenName
  /** Selected inbox item. */
  mail: number | null
  go(screen: ScreenName): void
  openMail(id: number | null): void
}

export const navStore = createStore<NavState>()((set) => ({
  screen: 'home',
  mail: null,
  go: (screen) => set({ screen }),
  openMail: (mail) => set({ mail }),
}))

export function useNav<T>(selector: (state: NavState) => T): T {
  return useStore(navStore, selector)
}
