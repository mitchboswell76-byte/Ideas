import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { CornersOutIcon, MinusIcon, PlusIcon } from '../kit/icons.ts'
import { IconButton, cx } from '../kit/index.ts'
import {
  clampView,
  homeView,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  transformOf,
  zoomAt,
  type Frame,
  type Point,
  type View,
} from './viewport.ts'
import './map.css'

/** Pointer travel before a press becomes a drag rather than a click. */
const DRAG_PX = 4
/** Zoom step for the buttons and + / − keys. */
const ZOOM_STEP = 1.6
/** Arrow-key pan distance in pixels. */
const KEY_PAN_PX = 80

export interface MapScale {
  k: number
  /** Pixels per map unit. */
  s: number
}

interface MapViewProps {
  /** Map size in map units. */
  mapWidth: number
  mapHeight: number
  /** Null shows the whole map. */
  view: View | null
  onViewChange: (view: View) => void
  /** Accessible name; keyboard help is added. */
  label: string
  /** A press and release without dragging, with the element pressed. */
  onPick?: (target: Element) => void
  /** The element under a mouse pointer and its viewport position; null when it leaves or drags. */
  onHover?: (target: Element | null, client: Point | null) => void
  /** The frame, whenever it is measured (for fitting boxes). */
  onFrame?: (frame: Frame) => void
  /** Map content in map units; called again as the view changes. */
  children: (scale: MapScale) => ReactNode
  /** HTML over the map (legend, tooltip), positioned against the map area. */
  overlay?: ReactNode
  className?: string
}

/**
 * A flat SVG map with Paradox-style pan and zoom: wheel zooms at the pointer, drag pans, two
 * fingers pinch, and with focus the arrow keys pan and + / − zoom. Content is drawn in map units
 * under one transform, so only that transform changes while moving (keep the heavy layers
 * memoised). No animation: moves are instant, which also suits reduced motion.
 */
export function MapView({
  mapWidth,
  mapHeight,
  view,
  onViewChange,
  label,
  onPick,
  onHover,
  onFrame,
  children,
  overlay,
  className,
}: MapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((old) =>
        old && old.width === r.width && old.height === r.height
          ? old
          : { width: r.width, height: r.height },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const frame: Frame | null =
    size && size.width > 0 && size.height > 0 ? { ...size, mapWidth, mapHeight } : null
  const current = frame ? clampView(view ?? homeView(frame), frame) : null

  // Gestures read the latest view from refs; `change` updates the ref at once so several events
  // between renders (fast wheels) build on each other.
  const frameRef = useRef(frame)
  const viewRef = useRef(current)
  const handlers = useRef({ onViewChange, onPick, onHover })
  useLayoutEffect(() => {
    frameRef.current = frame
    viewRef.current = current
    handlers.current = { onViewChange, onPick, onHover }
  })

  const frameKey = frame ? `${frame.width}x${frame.height}` : ''
  // Only when the size changes (`frame` is a new object every render); the ref is set by now.
  useEffect(() => {
    if (frameRef.current) onFrame?.(frameRef.current)
  }, [frameKey, onFrame])

  const change = (next: View) => {
    viewRef.current = next
    handlers.current.onViewChange(next)
  }

  const local = (client: { clientX: number; clientY: number }): Point => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: client.clientX - r.left, y: client.clientY - r.top }
  }

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const f = frameRef.current
      const v = viewRef.current
      if (!f || !v) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      change(zoomAt(v, f, local(e), Math.exp(-e.deltaY * unit * 0.002)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // Once: `change` and `local` only read refs.
  }, [])

  const pointers = useRef(new Map<number, Point>())
  const press = useRef<{ start: Point; moved: boolean; target: Element | null } | null>(null)

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size === 1) {
      press.current = { start: p, moved: false, target: e.target as Element }
    } else if (press.current) {
      press.current.moved = true
    }
    handlers.current.onHover?.(null, null)
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const f = frameRef.current
    const v = viewRef.current
    const prev = pointers.current.get(e.pointerId)
    if (!prev) {
      if (e.pointerType === 'mouse') {
        handlers.current.onHover?.(e.target as Element, { x: e.clientX, y: e.clientY })
      }
      return
    }
    if (!f || !v) return
    const p = local(e)
    const g = press.current
    if (pointers.current.size === 1) {
      if (g && !g.moved) {
        if (Math.hypot(p.x - g.start.x, p.y - g.start.y) < DRAG_PX) return
        g.moved = true
      }
      pointers.current.set(e.pointerId, p)
      change(panBy(v, f, p.x - prev.x, p.y - prev.y))
      return
    }
    // Pinch: zoom about the midpoint by the change in finger spread, and follow the midpoint.
    const other = [...pointers.current].find(([id]) => id !== e.pointerId)?.[1]
    pointers.current.set(e.pointerId, p)
    if (!other) return
    const before = Math.hypot(prev.x - other.x, prev.y - other.y)
    const after = Math.hypot(p.x - other.x, p.y - other.y)
    if (before < 1) return
    const midBefore = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 }
    const midAfter = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 }
    const zoomed = zoomAt(v, f, midBefore, after / before)
    change(panBy(zoomed, f, midAfter.x - midBefore.x, midAfter.y - midBefore.y))
  }

  const endPointer = (e: PointerEvent<SVGSVGElement>, cancelled: boolean) => {
    if (!pointers.current.delete(e.pointerId)) return
    if (pointers.current.size > 0) return
    const g = press.current
    press.current = null
    if (!cancelled && g && !g.moved && g.target) handlers.current.onPick?.(g.target)
  }

  const zoomCentre = (factor: number) => {
    const f = frameRef.current
    const v = viewRef.current
    if (f && v) change(zoomAt(v, f, { x: f.width / 2, y: f.height / 2 }, factor))
  }

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const f = frameRef.current
    const v = viewRef.current
    if (!f || !v || e.ctrlKey || e.metaKey || e.altKey) return
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [KEY_PAN_PX, 0],
      ArrowRight: [-KEY_PAN_PX, 0],
      ArrowUp: [0, KEY_PAN_PX],
      ArrowDown: [0, -KEY_PAN_PX],
    }
    const step = pan[e.key]
    if (step) change(panBy(v, f, step[0], step[1]))
    else if (e.key === '+' || e.key === '=') zoomCentre(ZOOM_STEP)
    else if (e.key === '-' || e.key === '_') zoomCentre(1 / ZOOM_STEP)
    else if (e.key === 'Home') change(homeView(f))
    else return
    e.preventDefault()
  }

  const t = frame && current ? transformOf(current, frame) : null
  return (
    <div className={cx('mapview', className)}>
      <svg
        ref={svgRef}
        className="mapview__svg"
        role="application"
        aria-roledescription="map"
        aria-label={`${label}. Arrow keys pan, plus and minus zoom, Home shows the whole map.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
        onPointerLeave={() => pointers.current.size === 0 && handlers.current.onHover?.(null, null)}
        onKeyDown={onKeyDown}
      >
        {t && current && (
          <g transform={`translate(${t.tx} ${t.ty}) scale(${t.s})`}>
            {children({ k: current.k, s: t.s })}
          </g>
        )}
      </svg>
      {overlay}
      <div className="mapview__controls">
        <IconButton
          icon={PlusIcon}
          label="Zoom in"
          shortcut="+"
          size="s"
          variant="secondary"
          disabled={!current || current.k >= MAX_ZOOM}
          onClick={() => zoomCentre(ZOOM_STEP)}
        />
        <IconButton
          icon={MinusIcon}
          label="Zoom out"
          shortcut="−"
          size="s"
          variant="secondary"
          disabled={!current || current.k <= MIN_ZOOM}
          onClick={() => zoomCentre(1 / ZOOM_STEP)}
        />
        <IconButton
          icon={CornersOutIcon}
          label="Whole map"
          shortcut="Home"
          size="s"
          variant="secondary"
          disabled={!current || current.k <= MIN_ZOOM}
          onClick={() => frameRef.current && change(homeView(frameRef.current))}
        />
      </div>
    </div>
  )
}
