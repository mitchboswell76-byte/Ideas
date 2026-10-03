import type { CSSProperties, ReactNode } from 'react'
import { cx, formatCount } from '../kit/index.ts'
import { stepLabel, type KeyItem, type MapKeyData } from './legend.ts'

/** The highlighted key entry: hovered or focused (`preview`) wins over clicked (`pinned`). */
export interface KeyHighlight {
  preview: string | null
  pinned: string | null
}

interface MapKeyProps {
  data: MapKeyData
  /** Replaces the title, e.g. with the measure picker (the key names what the map shows). */
  heading?: ReactNode
  /** Makes entries buttons: hover or focus previews their places, a click pins them. */
  highlight?: KeyHighlight
  onHighlight?: (next: KeyHighlight) => void
}

/**
 * The map key, docked above the map so it never covers it (election maps in the FT, Guardian and
 * BBC put theirs there too). Categorical entries read as a line of swatches; value modes get a
 * stepped scale with the breaks between the cells.
 */
export function MapKey({ data, heading, highlight, onHighlight }: MapKeyProps) {
  const interactive = Boolean(highlight && onHighlight)
  const entry = (id: string, className: string, content: ReactNode, label: string) => {
    if (!interactive) {
      return (
        <span key={id} className={className}>
          {content}
        </span>
      )
    }
    const pinned = highlight!.pinned === id
    const set = (preview: string | null) => onHighlight!({ ...highlight!, preview })
    return (
      <button
        key={id}
        type="button"
        className={cx(className, 'map-key__button')}
        aria-pressed={pinned}
        title={pinned ? 'Show all again' : `Pick out: ${label}`}
        onPointerEnter={() => set(id)}
        onPointerLeave={() => set(null)}
        onFocus={() => set(id)}
        onBlur={() => set(null)}
        onClick={() => onHighlight!({ preview: null, pinned: pinned ? null : id })}
      >
        {content}
      </button>
    )
  }
  const lit = highlight ? (highlight.preview ?? highlight.pinned) : null

  return (
    <section className="map-key" aria-label="Map key" data-lit={lit ?? undefined}>
      {heading ?? <h2 className="map-key__title">{data.title}</h2>}
      {data.scale && (
        <div className="map-key__scale">
          <span className="map-key__end">{data.scale.low}</span>
          <div
            className="map-key__bar"
            style={{ '--steps': data.scale.steps.length } as CSSProperties}
          >
            <div className="map-key__cells">
              {data.scale.steps.map((step, i) =>
                entry(
                  step.id,
                  cx('map-key__cell', lit === step.id && 'is-lit'),
                  <span className="map-key__fill" style={{ background: step.swatch }} />,
                  stepLabel(data.scale!.ticks, i),
                ),
              )}
            </div>
            <div className="map-key__ticks" aria-hidden>
              {data.scale.ticks.map((t, i) => (
                <span
                  key={t}
                  className="map-key__tick"
                  style={{ left: `${(100 * (i + 1)) / data.scale!.steps.length}%` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className="map-key__end">{data.scale.high}</span>
        </div>
      )}
      {data.items.length > 0 && (
        <div className="map-key__items">
          {data.items.map((item) =>
            entry(
              item.id,
              cx('map-key__item', lit === item.id && 'is-lit'),
              <ItemContent item={item} />,
              item.label,
            ),
          )}
        </div>
      )}
      {data.note && <p className="map-key__note">{data.note}</p>}
    </section>
  )
}

function ItemContent({ item }: { item: KeyItem }) {
  return (
    <>
      <span
        className={cx(
          'map-key__swatch',
          item.outline && 'map-key__swatch--outline',
          item.hatch && 'map-key__swatch--hatch',
        )}
        style={{ '--swatch': item.swatch } as CSSProperties}
        aria-hidden
      />
      {item.label}
      {item.count !== undefined && (
        <span className="map-key__count">{formatCount(item.count)}</span>
      )}
    </>
  )
}
