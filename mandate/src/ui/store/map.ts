/** World map state: mode, bloc, selected country and view (UI only; not saved). */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { WorldMode } from '../map/world/modes.ts'
import type { View } from '../map/viewport.ts'

interface MapState {
  mode: WorldMode
  /** The bloc shown in Blocs mode. */
  bloc: string
  /** Selected country id: its card is open. */
  country: string | null
  /** Null until the player pans or zooms: the whole map. */
  view: View | null
  /** A request to frame a country; `n` changes each time, so asking twice moves twice. */
  focus: { id: string; n: number } | null
  setMode(mode: WorldMode): void
  setBloc(bloc: string): void
  select(country: string | null): void
  setView(view: View | null): void
  /** Select a country and frame it on the map. */
  focusOn(country: string): void
}

export const mapStore = createStore<MapState>()((set) => ({
  mode: 'political',
  bloc: 'nato',
  country: null,
  view: null,
  focus: null,
  setMode: (mode) => set({ mode }),
  setBloc: (bloc) => set({ bloc }),
  select: (country) => set({ country }),
  setView: (view) => set({ view }),
  focusOn: (country) => set((s) => ({ country, focus: { id: country, n: (s.focus?.n ?? 0) + 1 } })),
}))

export function useMap<T>(selector: (state: MapState) => T): T {
  return useStore(mapStore, selector)
}
