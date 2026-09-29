import type { CSSProperties } from 'react'
import { cx } from './cx.ts'

interface TickerProps {
  items: readonly string[]
  label?: string
  className?: string
}

/** Seconds per character of scrolling text, so long and short tickers read at one pace. */
const SECONDS_PER_CHAR = 0.18

/** Newspaper strapline: a label block and a scrolling line of stories. */
export function Ticker({ items, label = 'Latest', className }: TickerProps) {
  const chars = items.reduce((n, item) => n + item.length + 4, 0)
  const style = {
    '--ticker-duration': `${Math.max(12, chars * SECONDS_PER_CHAR)}s`,
  } as CSSProperties
  const line = (hidden: boolean) => (
    <ul className="ticker__items" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className="ticker__item">
          {item}
        </li>
      ))}
    </ul>
  )
  return (
    <div className={cx('ticker', className)} role="region" aria-label={label}>
      <span className="ticker__label">{label}</span>
      <div className="ticker__window">
        {/* Two copies scroll as one strip so the loop has no gap. */}
        <div className="ticker__track" style={style}>
          {line(false)}
          {line(true)}
        </div>
      </div>
    </div>
  )
}
