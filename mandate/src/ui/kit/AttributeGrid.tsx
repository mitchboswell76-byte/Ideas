import type { ReactNode } from 'react'
import { attributeBand, clampAttribute } from './attributes.ts'
import { cx } from './cx.ts'
import { Tooltip } from './Tooltip.tsx'
import './table.css'

export interface Attribute {
  name: string
  value: number
  /** Breakdown shown on hover (e.g. a `ModifierList`). */
  tip?: ReactNode
}

export interface AttributeGroup {
  title: string
  attributes: readonly Attribute[]
}

/** A 1–20 value in FM's colour scale. */
export function AttributeValue({ value }: { value: number }) {
  return (
    <span className={cx('attr__value', 'num', `attr--${attributeBand(value)}`)}>
      {clampAttribute(value)}
    </span>
  )
}

/** FM profile attribute columns: name left, coloured 1–20 value right. */
export function AttributeGrid({
  groups,
  className,
}: {
  groups: readonly AttributeGroup[]
  className?: string
}) {
  return (
    <div className={cx('attrs', className)}>
      {groups.map((g) => (
        <section key={g.title} className="attrs__group">
          <h3 className="attrs__title">{g.title}</h3>
          <ul className="attrs__list">
            {g.attributes.map((a) => {
              const row = (
                <span className="attr">
                  <span className="attr__name">{a.name}</span>
                  <AttributeValue value={a.value} />
                </span>
              )
              return (
                <li key={a.name} className="attr__item">
                  {a.tip ? (
                    <Tooltip tip={a.tip} title={a.name} className="attr__tip">
                      {row}
                    </Tooltip>
                  ) : (
                    row
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
