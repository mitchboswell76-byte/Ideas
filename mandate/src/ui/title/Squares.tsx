import { useMemo, type CSSProperties } from 'react'
import { STEP_FPS } from '../graphics/presets.ts'
import { mulberry32 } from '../random.ts'
import { TITLE_ACCENTS } from './accents.ts'

interface Square {
  /** Resting position, in % of the width (where it sits when motion is reduced). */
  left: number
  top: number
  size: number
  colour: string | null
  seconds: number
  delay: number
  front: boolean
}

/**
 * Small squares drifting across the title in frame-by-frame steps, some in front of the wordmark
 * and some behind. Decorative only; the 3D view has floating cubes instead.
 */
export function Squares({ layer }: { layer: 'front' | 'back' }) {
  const squares = useMemo<Square[]>(() => {
    const random = mulberry32(1832)
    return Array.from({ length: 18 }, () => ({
      left: random() * 96,
      top: random() * 96,
      size: 5 + Math.round(random() * 3) * 4,
      colour: random() < 0.55 ? TITLE_ACCENTS[Math.floor(random() * TITLE_ACCENTS.length)]! : null,
      seconds: 40 + random() * 50,
      delay: -random() * 90,
      front: random() < 0.35,
    }))
  }, [])
  return (
    <div className={`squares squares--${layer}`} aria-hidden>
      {squares
        .filter((s) => s.front === (layer === 'front'))
        .map((s, i) => (
          <span
            key={i}
            className="squares__square"
            style={
              {
                '--x': `${s.left}vw`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                backgroundColor: s.colour ?? undefined,
                animationDuration: `${s.seconds}s`,
                animationDelay: `${s.delay}s`,
                animationTimingFunction: `steps(${Math.round(s.seconds * STEP_FPS)})`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  )
}
