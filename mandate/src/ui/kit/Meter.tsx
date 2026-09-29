import type { CSSProperties } from 'react'
import { cx } from './cx.ts'

interface MeterProps {
  label: string
  value: number
  min?: number
  max?: number
  /** Number of pixel cells in the bar. */
  cells?: number
  /** `danger` uses stamp red; `you` the player's colour; `colour` overrides with an allegiance colour. */
  tone?: 'ink' | 'danger' | 'you'
  colour?: string
  /** Shown instead of the raw number. */
  valueText?: string
  className?: string
}

/** A pixel bar: a row of square cells, filled in proportion to the value. */
export function Meter({
  label,
  value,
  min = 0,
  max = 100,
  cells = 10,
  tone = 'ink',
  colour,
  valueText,
  className,
}: MeterProps) {
  const clamped = Math.min(max, Math.max(min, value))
  const filled = max > min ? Math.round(((clamped - min) / (max - min)) * cells) : 0
  const text = valueText ?? String(Math.round(clamped))
  const style = colour ? ({ '--meter-fill': colour } as CSSProperties) : undefined
  return (
    <div
      className={cx('meter', `meter--${tone}`, className)}
      style={style}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
    >
      <span className="meter__label">{label}</span>
      <span className="meter__bar" aria-hidden>
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className={cx('meter__cell', i < filled && 'is-filled')} />
        ))}
      </span>
      <span className="meter__value" aria-hidden>
        {text}
      </span>
    </div>
  )
}
