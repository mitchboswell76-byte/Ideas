/** Which screen, inbox item and character are open (UI only; not saved). */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

export type ScreenName =
  'home' | 'inbox' | 'calendar' | 'profile' | 'map' | 'world' | 'saves' | 'settings'

interface NavState {
  screen: ScreenName
  /** Selected inbox item. */
  mail: number | null
  /** Character on the Profile screen; `null` = the player. */
  person: string | null
  go(screen: ScreenName): void
  openMail(id: number | null): void
  /** Open someone's profile (`null` for your own). */
  openProfile(id: string | null): void
}

export const navStore = createStore<NavState>()((set) => ({
  screen: 'home',
  mail: null,
  person: null,
  go: (screen) => set(screen === 'profile' ? { screen, person: null } : { screen }),
  openMail: (mail) => set({ mail }),
  openProfile: (person) => set({ screen: 'profile', person }),
}))

export function useNav<T>(selector: (state: NavState) => T): T {
  return useStore(navStore, selector)
}
