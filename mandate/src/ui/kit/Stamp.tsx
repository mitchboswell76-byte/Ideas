import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.ts'

interface StampProps {
  children: ReactNode
  /** Ink red is reserved for danger (DESIGN §17). */
  tone?: 'ink' | 'danger'
  /** Degrees; rubber stamps never land straight. */
  rotate?: number
  /** Thump in when mounted (stepped, skipped with reduced motion). */
  animate?: boolean
  className?: string
}

/** Rubber-stamp mark for alerts and outcomes: APPROVED, REJECTED, URGENT. */
export function Stamp({
  children,
  tone = 'ink',
  rotate = -4,
  animate = true,
  className,
}: StampProps) {
  return (
    <span
      className={cx(
        'stamp',
        tone === 'danger' && 'stamp--danger',
        animate && 'stamp--in',
        className,
      )}
      style={{ '--stamp-rotate': `${rotate}deg` } as CSSProperties}
    >
      {children}
    </span>
  )
}
