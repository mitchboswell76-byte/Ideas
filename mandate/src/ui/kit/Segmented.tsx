import type { ReactNode } from 'react'
import { cx } from './cx.ts'
import './controls.css'

export interface SegmentItem<K extends string> {
  key: K
  label: ReactNode
}

interface SegmentedProps<K extends string> {
  items: readonly SegmentItem<K>[]
  value: K
  onChange: (key: K) => void
  /** Accessible name of the group. */
  label: string
  className?: string
}

/** Two or three mutually exclusive views of the same thing (e.g. Map / Hexes): pressed buttons. */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<K>) {
  return (
    <div className={cx('segmented', className)} role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="segmented__item"
          aria-pressed={item.key === value}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
