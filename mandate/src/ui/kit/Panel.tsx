import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx.ts'

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Label strip across the top. */
  title?: ReactNode
  /** Controls at the right of the label strip. */
  actions?: ReactNode
  /** Raised ephemera: a hard 2 px ink shadow. */
  raised?: boolean
}

/** A flat sheet with a 1 px rule — the base of every UI surface. */
export function Panel({ title, actions, raised, className, children, ...rest }: PanelProps) {
  return (
    <section className={cx('panel', raised && 'panel--raised', className)} {...rest}>
      {(title || actions) && (
        <header className="panel__head">
          {title && <h2 className="panel__title">{title}</h2>}
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  )
}
