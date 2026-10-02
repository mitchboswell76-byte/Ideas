/**
 * The main menu's backdrop (DESIGN §17): the 650 seats on their real boundaries, coloured by their
 * 2024 winners, drifting slowly (a CSS transform on one cached layer, so the GPU does the work).
 * Loads seats' shapes and results only, not the census.
 */
import { useEffect, useState } from 'react'
import { GE2024 } from '../../../data/ge2024.ts'
import { UK_MAP } from '../../../data/ukMap.ts'
import { cx } from '../../kit/index.ts'

const WINNER = new Map(GE2024.results.map((r) => [r.id, r.winner]))

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
          <path key={s.id} d={s.d} fill={GE2024.colours[WINNER.get(s.id)!]} />
        ))}
        <path className="backdrop__seats" d={UK_MAP.seatBorders} />
        <path className="backdrop__nations" d={UK_MAP.nationBorders} />
      </svg>
    </div>
  )
}
