/**
 * Map screen state (UI only; not saved): mode, each mode's option (a bloc on the world map; a census
 * field or a Since 2019 measure on the UK map), the selected place, the view and "frame this place"
 * requests; and whether the maps show the map alone (no key or list).
 */
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { UkMode } from '../map/uk/modes.ts'
import type { Box, View } from '../map/viewport.ts'
import type { WorldMode } from '../map/world/modes.ts'
import { readLocal, writeLocal } from './settings.ts'

export interface MapState<M extends string> {
  mode: M
  /** The current mode's option ('' when it has none). */
  option: string
  /** Every mode's last option, so switching modes and back keeps the choice. */
  options: Partial<Record<M, string>>
  /** Selected place id: its card is open. */
  selected: string | null
  /** Null until the player pans or zooms: the whole map. */
  view: View | null
  /**
   * A request to frame a place (or a box, e.g. a city); `n` changes each time, so asking twice
   * moves twice.
   */
  focus: { id: string | null; box?: Box; n: number } | null
  setMode(mode: M): void
  setOption(option: string): void
  select(id: string | null): void
  setView(view: View | null): void
  /** Select a place and frame it on the map. */
  focusOn(id: string): void
  /** Frame a box without changing the selection. */
  frame(box: Box): void
}

export type MapStore<M extends string = string> = StoreApi<MapState<M>>

export function createMapStore<M extends string>(
  mode: M,
  options: Partial<Record<M, string>>,
): MapStore<M> {
  return createStore<MapState<M>>()((set) => ({
    mode,
    option: options[mode] ?? '',
    options,
    selected: null,
    view: null,
    focus: null,
    setMode: (next) => set((s) => ({ mode: next, option: s.options[next] ?? '' })),
    setOption: (next) => set((s) => ({ option: next, options: { ...s.options, [s.mode]: next } })),
    select: (id) => set({ selected: id }),
    setView: (view) => set({ view }),
    focusOn: (id) => set((s) => ({ selected: id, focus: { id, n: (s.focus?.n ?? 0) + 1 } })),
    frame: (box) => set((s) => ({ focus: { id: null, box, n: (s.focus?.n ?? 0) + 1 } })),
  }))
}

/** World map: Blocs mode's option is the bloc shown. */
export const worldMapStore = createMapStore<WorldMode>('political', { blocs: 'nato' })
/** UK map: Demographics' option is a census field; Since 2019's is what it measures. */
export const ukMapStore = createMapStore<UkMode>('party', {
  demographics: 'age65plus',
  change: 'gains',
})

interface MapOnlyState {
  /** Both maps hide their key and place list (a picked place's card still opens). */
  mapOnly: boolean
  setMapOnly(next: boolean): void
}

export const mapOnlyStore = createStore<MapOnlyState>()((set) => ({
  mapOnly: false,
  setMapOnly: (mapOnly) => set({ mapOnly }),
}))

export const useMapOnly = (): MapOnlyState => useStore(mapOnlyStore)

export function useMapState<M extends string, T>(
  store: MapStore<M>,
  selector: (state: MapState<M>) => T,
): T {
  return useStore(store, selector)
}

/** The UK map's layout: real boundaries, or one equal hex per seat (better for counting seats). */
export type UkLayout = 'map' | 'hex'

const LAYOUT_KEY = 'mandate.ukLayout'

export const parseUkLayout = (value: string | null): UkLayout => (value === 'hex' ? 'hex' : 'map')

interface UkLayoutState {
  layout: UkLayout
  setLayout(layout: UkLayout): void
}

/** Remembered per browser. Switching shows the whole map (the two layouts' units differ). */
export const ukLayoutStore = createStore<UkLayoutState>()((set, get) => ({
  layout: parseUkLayout(readLocal(LAYOUT_KEY)),
  setLayout(layout) {
    if (layout === get().layout) return
    set({ layout })
    writeLocal(LAYOUT_KEY, layout)
    ukMapStore.getState().setView(null)
  },
}))

export function useUkLayout(): UkLayoutState {
  return useStore(ukLayoutStore)
}
