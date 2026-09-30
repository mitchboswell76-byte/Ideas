import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Badge } from './Chip.tsx'
import { cx } from './cx.ts'
import './controls.css'

export interface TabItem<K extends string> {
  key: K
  label: ReactNode
  count?: number
}

interface TabsProps<K extends string> {
  tabs: readonly TabItem<K>[]
  value: K
  onChange: (key: K) => void
  label: string
  className?: string
}

/** A tab strip (ARIA tabs; arrow keys move between tabs). The caller renders the panel. */
export function Tabs<K extends string>({ tabs, value, onChange, label, className }: TabsProps<K>) {
  const list = useRef<HTMLDivElement>(null)
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const i = tabs.findIndex((t) => t.key === value)
    const next = tabs[(i + step + tabs.length) % tabs.length]!
    onChange(next.key)
    list.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus()
  }
  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={cx('tabs', className)}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          data-key={t.key}
          aria-selected={t.key === value}
          tabIndex={t.key === value ? 0 : -1}
          className="tabs__tab"
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count !== undefined && <Badge count={t.count} quiet />}
        </button>
      ))}
    </div>
  )
}
