/**
 * The main menu's backdrop (DESIGN §17): the 650 seats coloured by their 2024 winners, drifting
 * slowly (a CSS transform on one cached layer, so the GPU does the work). Loads seats and results
 * only, not the census.
 */
import { useEffect, useState } from 'react'
import { GE2024 } from '../../../data/ge2024.ts'
import { UK_SEATS } from '../../../data/ukSeats.ts'
import { cx } from '../../kit/index.ts'
import { buildHexMap } from './hex.ts'

const HEX = buildHexMap(UK_SEATS.seats, UK_SEATS.regions)
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
        viewBox={`0 0 ${HEX.width} ${HEX.height}`}
        preserveAspectRatio="xMidYMin meet"
      >
        {HEX.cells.map((c) => (
          <path key={c.id} d={c.d} fill={GE2024.colours[WINNER.get(c.id)!]} />
        ))}
        <path className="backdrop__nations" d={HEX.nations} />
      </svg>
    </div>
  )
}
