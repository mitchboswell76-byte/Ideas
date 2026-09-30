/**
 * Map screen state (UI only; not saved): mode, the mode's option (a bloc on the world map, a census
 * field on the UK map), the selected place, the view and "frame this place" requests.
 */
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { UkMode } from '../map/uk/modes.ts'
import type { View } from '../map/viewport.ts'
import type { WorldMode } from '../map/world/modes.ts'

export interface MapState<M extends string> {
  mode: M
  option: string
  /** Selected place id: its card is open. */
  selected: string | null
  /** Null until the player pans or zooms: the whole map. */
  view: View | null
  /** A request to frame a place; `n` changes each time, so asking twice moves twice. */
  focus: { id: string; n: number } | null
  setMode(mode: M): void
  setOption(option: string): void
  select(id: string | null): void
  setView(view: View | null): void
  /** Select a place and frame it on the map. */
  focusOn(id: string): void
}

export type MapStore<M extends string = string> = StoreApi<MapState<M>>

export function createMapStore<M extends string>(mode: M, option: string): MapStore<M> {
  return createStore<MapState<M>>()((set) => ({
    mode,
    option,
    selected: null,
    view: null,
    focus: null,
    setMode: (next) => set({ mode: next }),
    setOption: (next) => set({ option: next }),
    select: (id) => set({ selected: id }),
    setView: (view) => set({ view }),
    focusOn: (id) => set((s) => ({ selected: id, focus: { id, n: (s.focus?.n ?? 0) + 1 } })),
  }))
}

/** World map: option = the bloc shown in Blocs mode. */
export const worldMapStore = createMapStore<WorldMode>('political', 'nato')
/** UK map: option = the census field shown in Demographics mode. */
export const ukMapStore = createMapStore<UkMode>('party', 'age65plus')

export function useMapState<M extends string, T>(
  store: MapStore<M>,
  selector: (state: MapState<M>) => T,
): T {
  return useStore(store, selector)
}
