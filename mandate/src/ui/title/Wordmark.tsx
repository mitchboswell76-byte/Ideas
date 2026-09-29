import { useEffect, useMemo, useRef } from 'react'
import { textBitmap } from '../pixel/font.ts'
import { mulberry32 } from '../random.ts'
import { useSceneTokens } from '../three/tokens.ts'
import {
  ACCENT_SHARE,
  FLICKER_PER_STEP,
  FLICKER_STEPS_PER_SECOND,
  TITLE_ACCENTS,
} from './accents.ts'

/**
 * The flat pixel wordmark (DESIGN §17): one canvas pixel per bitmap pixel, scaled up by CSS with
 * hard edges. Shown instantly, and all the time in 2D; in 3D the voxel wordmark takes its place.
 */
export function WordmarkCanvas({ animate, hidden }: { animate: boolean; hidden?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bitmap = useMemo(() => textBitmap('MANDATE'), [])
  const { voxel } = useSceneTokens()

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const ink: [number, number][] = []
    bitmap.rows.forEach((row, y) => row.forEach((on, x) => on && ink.push([x, y])))
    const random = mulberry32(10)
    const lit = new Map<number, string>()
    while (lit.size < Math.round(ink.length * ACCENT_SHARE)) {
      lit.set(
        Math.floor(random() * ink.length),
        TITLE_ACCENTS[Math.floor(random() * TITLE_ACCENTS.length)]!,
      )
    }
    const draw = () => {
      ctx.clearRect(0, 0, bitmap.width, bitmap.height)
      ink.forEach(([x, y], i) => {
        ctx.fillStyle = lit.get(i) ?? voxel
        ctx.fillRect(x, y, 1, 1)
      })
    }
    draw()
    if (!animate) return
    const timer = window.setInterval(() => {
      const keys = [...lit.keys()]
      for (let k = 0; k < FLICKER_PER_STEP; k++) {
        lit.delete(keys[Math.floor(Math.random() * keys.length)]!)
        lit.set(
          Math.floor(Math.random() * ink.length),
          TITLE_ACCENTS[Math.floor(Math.random() * TITLE_ACCENTS.length)]!,
        )
      }
      draw()
    }, 1000 / FLICKER_STEPS_PER_SECOND)
    return () => window.clearInterval(timer)
  }, [bitmap, animate, voxel])

  return (
    <canvas
      ref={ref}
      className="wordmark"
      width={bitmap.width}
      height={bitmap.height}
      role="img"
      aria-label="Mandate"
      style={hidden ? { visibility: 'hidden' } : undefined}
    />
  )
}
