import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.ts'
import type { Icon } from './icons.ts'
import './controls.css'

interface ChipProps {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
  icon?: Icon
  /** A party colour dot (data colour; only ever for parties). */
  party?: string
  className?: string
}

/** A small rounded label: traits, statuses, parties. */
export function Chip({ children, tone = 'neutral', icon: ChipIcon, party, className }: ChipProps) {
  return (
    <span
      className={cx('chip', tone !== 'neutral' && `chip--${tone}`, className)}
      style={party ? ({ '--chip-colour': party } as CSSProperties) : undefined}
    >
      {party && <span className="chip__dot" aria-hidden />}
      {ChipIcon && <ChipIcon className="chip__icon" aria-hidden />}
      {children}
    </span>
  )
}

interface BadgeProps {
  count: number
  /** Grey instead of red (counts that aren't urgent). */
  quiet?: boolean
  /** Spoken label, e.g. "3 unread". */
  label?: string
  className?: string
}

/** A count bubble; renders nothing at zero. Shows 99+ past 99. */
export function Badge({ count, quiet, label, className }: BadgeProps) {
  if (count <= 0) return null
  return (
    <span className={cx('badge', quiet && 'badge--quiet', className)} aria-label={label}>
      {count > 99 ? '99+' : count}
    </span>
  )
}
