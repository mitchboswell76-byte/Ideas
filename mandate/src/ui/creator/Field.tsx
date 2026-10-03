import type { ReactNode } from 'react'
import { cx } from '../kit/index.ts'

/** A labelled control in a creator panel: label above, an optional hint below. */
export function Field({
  label,
  hint,
  children,
  className,
  as: Tag = 'label',
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
  /** `div` when the control labels itself (segmented buttons, swatches). */
  as?: 'label' | 'div'
}) {
  return (
    <Tag className={cx('field', className)}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </Tag>
  )
}

/** A titled group of fields in a panel. */
export function Section({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="creator-section">
      <header className="creator-section__head">
        <h3 className="creator-section__title">{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  )
}

export interface SelectOption<V extends string> {
  value: V
  label: string
  disabled?: boolean
}

export function Select<V extends string>({
  value,
  options,
  onChange,
  groups,
}: {
  value: V
  options?: readonly SelectOption<V>[]
  /** Option groups instead of a flat list. */
  groups?: readonly { label: string; options: readonly SelectOption<V>[] }[]
  onChange: (value: V) => void
}) {
  const render = (o: SelectOption<V>) => (
    <option key={o.value} value={o.value} disabled={o.disabled}>
      {o.label}
    </option>
  )
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value as V)}>
      {options?.map(render)}
      {groups?.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map(render)}
        </optgroup>
      ))}
    </select>
  )
}
