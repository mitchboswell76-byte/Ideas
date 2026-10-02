import type { CSSProperties, ReactNode } from 'react'
import { Chip } from './Chip.tsx'
import { cx } from './cx.ts'
import { voteLayout, type VoteCount, type VoteOutcome } from './vote.ts'
import './vote.css'

const OUTCOME: Record<VoteOutcome, { text: string; tone: 'good' | 'bad' | 'neutral' }> = {
  passes: { text: 'Passes', tone: 'good' },
  fails: { text: 'Falls', tone: 'bad' },
  open: { text: 'Undecided', tone: 'neutral' },
}

interface VoteBarProps {
  title?: ReactNode
  count: VoteCount
  /** All seats (default: the three counts added up). */
  total?: number
  className?: string
}

/** Frostpunk 2 council bar: For from the left, Against from the right, the majority line. */
export function VoteBar({ title, count, total, className }: VoteBarProps) {
  const v = voteLayout(count, total)
  const pct = (share: number) => `${(share * 100).toFixed(3)}%`
  const outcome = OUTCOME[v.outcome]
  return (
    <figure className={cx('vote', className)}>
      <figcaption className="vote__head">
        {title && <span className="vote__title">{title}</span>}
        <Chip tone={outcome.tone}>{outcome.text}</Chip>
      </figcaption>
      <div className="vote__counts num">
        <span className="vote__count vote__count--for">
          For <strong>{count.for}</strong>
        </span>
        <span className="vote__count">
          Undecided <strong>{count.undecided}</strong>
        </span>
        <span className="vote__count vote__count--against">
          Against <strong>{count.against}</strong>
        </span>
      </div>
      <div
        className="vote__bar"
        role="img"
        aria-label={`For ${count.for}, against ${count.against}, undecided ${count.undecided}; ${v.majority} needed`}
        style={{ '--majority-at': pct(v.majorityAt) } as CSSProperties}
      >
        <span className="vote__seg vote__seg--for" style={{ width: pct(v.shares.for) }} />
        <span
          className="vote__seg vote__seg--undecided"
          style={{ width: pct(v.shares.undecided) }}
        />
        <span className="vote__seg vote__seg--against" style={{ width: pct(v.shares.against) }} />
        <span className="vote__line" aria-hidden />
      </div>
      <p
        className="vote__majority num"
        style={{ '--majority-at': pct(v.majorityAt) } as CSSProperties}
      >
        {v.majority} to pass
      </p>
    </figure>
  )
}
