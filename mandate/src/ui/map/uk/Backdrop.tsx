/**
 * The main menu's backdrop (DESIGN §17): the 650 seats on their real boundaries, drifting slowly (a
 * CSS transform on one cached layer, so the GPU does the work). Tonal, not in party colours: dimmed
 * party colours turn yellow and orange into olive and brown on a dark ground, the least-liked hues
 * in colour-preference research (Palmer & Schloss 2010), so each seat is a grey whose lightness
 * follows its 2024 winner's colour. Loads shapes and results only, not the census.
 */
import { useEffect, useState } from 'react'
import { GE2024 } from '../../../data/ge2024.ts'
import { UK_MAP } from '../../../data/ukMap.ts'
import { cx } from '../../kit/index.ts'
import { tonalMix } from './tone.ts'

const WINNER = new Map(GE2024.results.map((r) => [r.id, r.winner]))
const FILL = new Map(
  UK_MAP.shapes.map((s) => {
    const mix = tonalMix(GE2024.colours[WINNER.get(s.id)!])
    return [s.id, `color-mix(in oklab, var(--text) ${mix}%, var(--bg))`]
  }),
)

export default function UkBackdrop() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div className={cx('backdrop', shown && 'backdrop--shown')} data-testid="menu-backdrop">
      <svg
        className="backdrop__map"
        viewBox={`0 0 ${UK_MAP.width} ${UK_MAP.height}`}
        preserveAspectRatio="xMidYMin meet"
      >
        {UK_MAP.shapes.map((s) => (
          <path key={s.id} d={s.d} style={{ fill: FILL.get(s.id) }} />
        ))}
        <path className="backdrop__seats" d={UK_MAP.seatBorders} />
        <path className="backdrop__nations" d={UK_MAP.nationBorders} />
      </svg>
    </div>
  )
}
