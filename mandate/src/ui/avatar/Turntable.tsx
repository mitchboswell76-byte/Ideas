import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { cx } from '../kit/index.ts'
import { useView } from '../store/view.ts'
import { AvatarSvg } from './AvatarSvg.tsx'
import type { Rig } from './rig.ts'
import type { Turntable as TurntableEngine } from './turntable.ts'

const PIXEL_RATIO = { low: 1, medium: 1.5, high: 2 } as const
/** Radians per pixel dragged. */
const DRAG_TURN = 0.012
/** Radians per arrow-key press. */
const KEY_TURN = Math.PI / 12

interface TurntableProps {
  rig: Rig
  /** 0 = whole body, 1 = face. */
  zoom: 0 | 1
  /** Wheel or pinch asks for the other zoom. */
  onZoom: (zoom: 0 | 1) => void
  label: string
  className?: string
}

/**
 * The avatar on a turntable (DESIGN §4): drag or use the arrow keys to turn, the wheel to zoom to
 * the face. In 2D view, without WebGL or if it fails, the 2D illustration stands in.
 */
export function Turntable({ rig, zoom, onZoom, label, className }: TurntableProps) {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const preset = useView((s) => s.preset)
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const [engine, setEngine] = useState<TurntableEngine | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; angle: number } | null>(null)
  const live = view === '3d' && webgl && !failed

  useEffect(() => {
    const canvas = canvasRef.current
    if (!live || !canvas) return
    let made: TurntableEngine | null = null
    let cancelled = false
    import('./turntable.ts').then(
      ({ Turntable }) => {
        if (cancelled) return
        try {
          made = new Turntable(canvas, {
            pixelRatio: Math.min(window.devicePixelRatio || 1, PIXEL_RATIO[preset]),
            antialias: preset !== 'low',
            onFail: () => setFailed(true),
          })
          setEngine(made)
        } catch (error) {
          console.warn('Turntable falls back to 2D:', error)
          setFailed(true)
        }
      },
      () => setFailed(true),
    )
    return () => {
      cancelled = true
      made?.dispose()
      setEngine(null)
    }
  }, [live, preset])

  useEffect(() => engine?.setRig(rig), [engine, rig])
  useEffect(() => engine?.zoomTo(zoom, !reduced), [engine, zoom, reduced])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!engine || !canvas) return
    const fit = () => engine.resize(canvas.clientWidth, canvas.clientHeight)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    // React's wheel listener is passive, so the page would scroll too.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (Math.abs(e.deltaY) > 2) onZoom(e.deltaY < 0 ? 1 : 0)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [engine, onZoom])

  if (!live) {
    return (
      <div className={cx('turntable turntable--flat', className)} role="img" aria-label={label}>
        <AvatarSvg rig={rig} className="turntable__flat" />
      </div>
    )
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, angle: engine.currentAngle }
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current && engine)
      engine.setAngle(drag.current.angle + (e.clientX - drag.current.x) * DRAG_TURN)
  }
  const onPointerUp = () => {
    drag.current = null
  }
  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (!engine) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      engine.setAngle(engine.currentAngle + (e.key === 'ArrowLeft' ? -KEY_TURN : KEY_TURN))
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      onZoom(e.key === '-' ? 0 : 1)
    }
  }

  return (
    <div className={cx('turntable', className)}>
      <canvas
        ref={canvasRef}
        className="turntable__canvas"
        tabIndex={0}
        role="img"
        aria-label={`${label}. Drag or use the arrow keys to turn; + and − zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => onZoom(zoom === 1 ? 0 : 1)}
      />
    </div>
  )
}
