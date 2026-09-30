import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMapState, type MapStore } from '../store/map.ts'
import { MapView, type MapScale } from './MapView.tsx'
import { fitBox, type Box, type Frame, type Point } from './viewport.ts'

/** The place id under a map element (`data-id`), if any. */
const idOf = (el: Element | null) => el?.closest('[data-id]')?.getAttribute('data-id') ?? null

interface StoreMapViewProps {
  store: MapStore
  mapWidth: number
  mapHeight: number
  label: string
  /** The box to frame when a place is focused (list, card, links). Keep it stable. */
  boxOf: (id: string) => Box | undefined
  /** Closest zoom when framing a place. */
  maxZoom?: number
  /** The place under a mouse pointer and the pointer's viewport position. */
  onHover?: (id: string | null, at: Point | null) => void
  overlay?: ReactNode
  className?: string
  children: (scale: MapScale) => ReactNode
}

/**
 * `MapView` wired to a map store: the view persists between visits, clicking a place selects it
 * (the sea clears the selection) and focus requests frame the place.
 */
export function StoreMapView({ store, boxOf, maxZoom, onHover, ...rest }: StoreMapViewProps) {
  const view = useMapState(store, (s) => s.view)
  const focus = useMapState(store, (s) => s.focus)
  const [frame, setFrame] = useState<Frame | null>(null)
  // Requests made before this mount were handled then; don't re-frame on returning to the screen.
  const handled = useRef(store.getState().focus?.n ?? 0)
  useEffect(() => {
    if (!focus || !frame || focus.n === handled.current) return
    handled.current = focus.n
    const box = boxOf(focus.id)
    if (box) store.getState().setView(fitBox(box, frame, 48, maxZoom))
  }, [focus, frame, boxOf, maxZoom, store])

  return (
    <MapView
      {...rest}
      view={view}
      onViewChange={(v) => store.getState().setView(v)}
      onFrame={setFrame}
      onPick={(el) => store.getState().select(idOf(el))}
      onHover={(el, at) => {
        const id = idOf(el)
        onHover?.(id && at ? id : null, id && at ? at : null)
      }}
    />
  )
}
