import type { ReactNode } from 'react'
import { formatLongDate } from '../format.ts'
import { cx } from './cx.ts'

interface FrontPageProps {
  /** Newspaper title (fictional outlets only). */
  masthead: string
  /** In-game ISO date. */
  date: string | null
  price?: string
  edition?: string
  /** Small label above the headline, e.g. EXCLUSIVE. */
  kicker?: string
  headline: string
  standfirst?: string
  /** Body copy, set in columns. */
  children?: ReactNode
  /** Laid over the page corner, usually a `Stamp`. */
  stamp?: ReactNode
  className?: string
}

/** News as a newspaper front page: masthead, dateline, headline, standfirst, columns. */
export function FrontPage({
  masthead,
  date,
  price,
  edition,
  kicker,
  headline,
  standfirst,
  children,
  stamp,
  className,
}: FrontPageProps) {
  return (
    <article className={cx('front-page', className)}>
      <header className="front-page__masthead">
        <span className="front-page__meta">{edition}</span>
        <p className="front-page__title">{masthead}</p>
        <span className="front-page__meta">{price}</span>
      </header>
      <p className="front-page__dateline">{formatLongDate(date)}</p>
      {kicker && <p className="front-page__kicker">{kicker}</p>}
      <h2 className="front-page__headline">{headline}</h2>
      {standfirst && <p className="front-page__standfirst">{standfirst}</p>}
      {children && <div className="front-page__body">{children}</div>}
      {stamp && <div className="front-page__stamp">{stamp}</div>}
    </article>
  )
}
