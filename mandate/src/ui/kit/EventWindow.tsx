import type { ReactNode } from 'react'
import { cx } from './cx.ts'
import type { Icon } from './icons.ts'
import { ModifierList, Tooltip, type Modifier } from './Tooltip.tsx'
import './character.css'

export interface EventOption {
  key: string
  label: ReactNode
  /** Effects listed in the option's tooltip. */
  effects?: readonly Modifier[]
  /** Extra tooltip text above the effects. */
  note?: ReactNode
  /** Why it can't be chosen. */
  disabled?: string
}

interface EventWindowProps {
  title: ReactNode
  /** Small line above the title (date, place). */
  kicker?: ReactNode
  /** The scene image (a 3D render from T9); a plain placeholder with an icon until then. */
  scene?: ReactNode
  sceneIcon?: Icon
  sceneCaption?: string
  children: ReactNode
  options: readonly EventOption[]
  onChoose: (key: string) => void
  className?: string
}

/** CK3 event window: title, scene, serif body, 2–4 options with effects on hover (DESIGN §17). */
export function EventWindow({
  title,
  kicker,
  scene,
  sceneIcon: SceneIcon,
  sceneCaption,
  children,
  options,
  onChoose,
  className,
}: EventWindowProps) {
  return (
    <article className={cx('event', className)}>
      <header className="event__head">
        {kicker && <p className="event__kicker">{kicker}</p>}
        <h2 className="event__title">{title}</h2>
      </header>
      <div className="event__scene">
        {scene ?? (
          <div className="event__placeholder">
            {SceneIcon && <SceneIcon className="event__scene-icon" aria-hidden />}
            {sceneCaption && <span>{sceneCaption}</span>}
          </div>
        )}
      </div>
      <div className="event__body serif">{children}</div>
      <ol className="event__options">
        {options.map((o) => {
          const hasTip = Boolean(o.effects?.length || o.note || o.disabled)
          const button = (
            <button
              type="button"
              className="event__option"
              disabled={Boolean(o.disabled)}
              onClick={() => onChoose(o.key)}
            >
              {o.label}
            </button>
          )
          return (
            <li key={o.key}>
              {hasTip ? (
                <Tooltip
                  className="event__tip"
                  tip={
                    <>
                      {o.disabled && <span className="mods__value--bad">{o.disabled}</span>}
                      {o.note && <span>{o.note}</span>}
                      {o.effects && o.effects.length > 0 && <ModifierList items={o.effects} />}
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
        })}
      </ol>
    </article>
  )
}
