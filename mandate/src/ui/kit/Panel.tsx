import type { ReactNode } from 'react'
import { IconButton } from './Button.tsx'
import { Badge } from './Chip.tsx'
import { cx } from './cx.ts'
import { XIcon, type Icon } from './icons.ts'
import './cards.css'

interface PanelProps {
  title?: ReactNode
  icon?: Icon
  /** Buttons on the right of the header. */
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Remove the body padding (tables, lists). */
  flush?: boolean
}

/** A titled box: the basic surface of every screen. */
export function Panel({ title, icon: PanelIcon, actions, children, className, flush }: PanelProps) {
  return (
    <section className={cx('panel', className)}>
      {(title || actions) && (
        <header className="panel__head">
          {PanelIcon && <PanelIcon className="panel__icon" aria-hidden />}
          {title && <h2 className="panel__title">{title}</h2>}
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className={cx('panel__body', flush && 'panel__body--flush')}>{children}</div>
    </section>
  )
}

interface TileProps {
  title: string
  icon?: Icon
  badge?: number
  children: ReactNode
  /** Its card is the one open. */
  open?: boolean
  onOpen: () => void
  className?: string
}

/** FM26 home tile: a summary that opens its card in place. */
export function Tile({
  title,
  icon: TileIcon,
  badge,
  children,
  open,
  onOpen,
  className,
}: TileProps) {
  return (
    <button type="button" className={cx('tile', className)} aria-expanded={open} onClick={onOpen}>
      <span className="tile__head">
        {TileIcon && <TileIcon className="tile__icon" aria-hidden />}
        <span className="tile__title">{title}</span>
        <Badge count={badge ?? 0} />
      </span>
      <span className="tile__body">{children}</span>
    </button>
  )
}

interface CardProps {
  title: ReactNode
  icon?: Icon
  onClose: () => void
  /** Footer buttons, e.g. "Go to Inbox". */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/** The detail card a tile opens: one at a time, in place, never stacked (DESIGN §17). */
export function Card({ title, icon, onClose, footer, children, className }: CardProps) {
  return (
    <Panel
      className={cx('card', className)}
      title={title}
      icon={icon}
      actions={<IconButton icon={XIcon} label="Close" shortcut="Esc" onClick={onClose} />}
    >
      <div className="card__content">{children}</div>
      {footer && <footer className="card__foot">{footer}</footer>}
    </Panel>
  )
}
