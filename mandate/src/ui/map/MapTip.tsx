import { useLayoutEffect, useRef, useState } from 'react'
import { placeFloating } from '../kit/place.ts'
import type { Point } from './viewport.ts'

interface MapTipProps {
  /** Pointer position in the viewport. */
  at: Point
  title: string
  line?: string
}

/** The hover label: the kit's tooltip look, beside the pointer and kept on screen. */
export function MapTip({ at, title, line }: MapTipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const p = placeFloating(
      { left: at.x + 14, top: at.y - 10, width: 0, height: 30 },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      4,
    )
    setPlace({ left: p.left, top: p.top })
  }, [at.x, at.y, title, line])
  return (
    <div
      ref={ref}
      className="tip map-tip"
      role="tooltip"
      style={{
        left: place?.left ?? at.x + 14,
        top: place?.top ?? at.y + 20,
        visibility: place ? 'visible' : 'hidden',
      }}
    >
      <div className="tip__title">{title}</div>
      {line && <div className="map-tip__line">{line}</div>}
    </div>
  )
}
