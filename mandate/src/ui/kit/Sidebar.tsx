import type { ReactNode } from 'react'
import { useNarrow } from '../hooks/useMediaQuery.ts'
import { Badge } from './Chip.tsx'
import { cx } from './cx.ts'
import type { Icon } from './icons.ts'
import { Tooltip } from './Tooltip.tsx'
import './nav.css'

export interface NavItem<K extends string> {
  key: K
  label: string
  icon: Icon
  /** Unread count. */
  badge?: number
  /** Why it can't be opened yet; shown in its tooltip. */
  disabled?: string
}

interface SidebarProps<K extends string> {
  items: readonly NavItem<K>[]
  /** Pinned to the bottom (Saves, Settings). */
  footer?: readonly NavItem<K>[]
  active: K | null
  onSelect: (key: K) => void
  /** Wordmark at the top; `brandShort` in the icon rail. */
  brand: ReactNode
  brandShort: ReactNode
  /** Always the icon rail (it also becomes one below 900 px). */
  rail?: boolean
  className?: string
}

/** FM-style left navigation with unread badges; an icon rail on narrow screens. */
export function Sidebar<K extends string>({
  items,
  footer = [],
  active,
  onSelect,
  brand,
  brandShort,
  rail,
  className,
}: SidebarProps<K>) {
  const compact = useNarrow() || Boolean(rail)
  const item = (it: NavItem<K>) => {
    const current = it.key === active
    const IconGlyph = it.icon
    const button = (
      <button
        type="button"
        className="nav__item"
        aria-current={current ? 'page' : undefined}
        aria-disabled={it.disabled ? true : undefined}
        aria-label={compact ? it.label : undefined}
        onClick={() => !it.disabled && onSelect(it.key)}
      >
        <IconGlyph className="nav__icon" weight={current ? 'fill' : 'regular'} aria-hidden />
        <span className="nav__label">{it.label}</span>
        <Badge count={it.badge ?? 0} className="nav__badge" label={`${it.badge ?? 0} unread`} />
      </button>
    )
    return (
      <li key={it.key}>
        {compact || it.disabled ? (
          <Tooltip
            lockable={false}
            className="nav__tip"
            tip={
              <>
                <span className="tip__label">{it.label}</span>
                {it.disabled && <span className="muted">{it.disabled}</span>}
              </>
            }
          >
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </li>
    )
  }
  return (
    <nav className={cx('sidebar', compact && 'sidebar--rail', className)} aria-label="Main">
      <div className="sidebar__brand">{compact ? brandShort : brand}</div>
      <ul className="nav">{items.map(item)}</ul>
      {footer.length > 0 && <ul className="nav nav--foot">{footer.map(item)}</ul>}
    </nav>
  )
}
