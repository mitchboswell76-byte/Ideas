import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Badge } from './Chip.tsx'
import { cx } from './cx.ts'
import { Tooltip } from './Tooltip.tsx'
import './controls.css'

export interface TabItem<K extends string> {
  key: K
  label: ReactNode
  count?: number
  /** Shown but not selectable; the reason appears as its tooltip (e.g. "Arrives in M4"). */
  disabled?: string
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
    const open = tabs.filter((t) => !t.disabled)
    const i = open.findIndex((t) => t.key === value)
    const next = open[(i + step + open.length) % open.length]
    if (!next) return
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
      {tabs.map((t) => {
        const tab = (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-key={t.key}
            aria-selected={t.key === value}
            aria-disabled={t.disabled ? true : undefined}
            tabIndex={t.key === value ? 0 : -1}
            className="tabs__tab"
            onClick={() => !t.disabled && onChange(t.key)}
          >
            {t.label}
            {t.count !== undefined && <Badge count={t.count} quiet />}
          </button>
        )
        return t.disabled ? (
          <Tooltip key={t.key} tip={t.disabled} lockable={false}>
            {tab}
          </Tooltip>
        ) : (
          tab
        )
      })}
    </div>
  )
}
