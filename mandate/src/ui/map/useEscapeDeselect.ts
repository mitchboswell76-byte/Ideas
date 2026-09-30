import { useEffect } from 'react'
import { useMapState, type MapStore } from '../store/map.ts'

/** Esc closes the open card (clears the map selection). */
export function useEscapeDeselect(store: MapStore): void {
  const selected = useMapState(store, (s) => s.selected)
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && store.getState().select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, store])
}
