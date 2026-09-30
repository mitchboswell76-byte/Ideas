/** Which screen, home card and inbox item are open (UI only; not saved). */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

export type ScreenName = 'home' | 'inbox' | 'calendar' | 'world' | 'saves' | 'settings'
export type CardName = 'inbox' | 'calendar' | 'you' | 'game' | 'start'

interface NavState {
  screen: ScreenName
  /** The Home tile whose card is open: one at a time (DESIGN §17). */
  card: CardName | null
  /** Selected inbox item. */
  mail: number | null
  go(screen: ScreenName): void
  openCard(card: CardName | null): void
  openMail(id: number | null): void
}

export const navStore = createStore<NavState>()((set) => ({
  screen: 'home',
  card: null,
  mail: null,
  go: (screen) => set({ screen }),
  openCard: (card) => set({ card }),
  openMail: (mail) => set({ mail }),
}))

export function useNav<T>(selector: (state: NavState) => T): T {
  return useStore(navStore, selector)
}
