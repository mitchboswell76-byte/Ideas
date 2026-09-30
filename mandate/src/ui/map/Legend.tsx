import type { CSSProperties } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { cx } from '../kit/index.ts'
import type { LegendRow } from './legend.ts'

interface LegendProps {
  rows: readonly LegendRow[]
  title?: string
  note?: string | null
  /** One narrow column (a tall map like the UK's leaves room at the side, not the bottom). */
  column?: boolean
}

/** The map key, bottom-left over the map (Paradox map modes); folded away on phones. */
export function Legend({ rows, title, note, column }: LegendProps) {
  const phone = useMediaQuery('(max-width: 599px)')
  return (
    <details
      key={String(phone)}
      className={cx('map-legend', column && 'map-legend--column')}
      open={!phone}
      aria-label="Map key"
    >
      <summary className="map-legend__title">{title ?? 'Key'}</summary>
      <ul className="map-legend__rows">
        {rows.map((row) => (
          <li key={row.label} className="map-legend__row">
            <span
              className={cx('map-legend__swatch', row.outline && 'map-legend__swatch--outline')}
              style={{ '--swatch': row.swatch } as CSSProperties}
              aria-hidden
            />
            {row.label}
          </li>
        ))}
      </ul>
      {note && <p className="map-legend__note">{note}</p>}
    </details>
  )
}
