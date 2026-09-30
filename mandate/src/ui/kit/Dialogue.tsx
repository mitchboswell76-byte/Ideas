import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from './cx.ts'
import { Tooltip } from './Tooltip.tsx'
import './character.css'

export interface DialogueLine {
  speaker: string
  text: ReactNode
  /** Said by the player. */
  you?: boolean
}

export interface DialogueChoice {
  key: string
  label: ReactNode
  /** What it will do, shown on hover. */
  tip?: ReactNode
  disabled?: string
}

interface DialogueProps {
  /** Portrait of who you're talking to (a `PortraitFrame`). */
  portrait: ReactNode
  name: string
  role?: string
  log: readonly DialogueLine[]
  choices: readonly DialogueChoice[]
  onChoose: (key: string) => void
  className?: string
}

/** Suzerain-style conversation: portrait left, serif log, numbered choices (DESIGN §17). */
export function Dialogue({
  portrait,
  name,
  role,
  log,
  choices,
  onChoose,
  className,
}: DialogueProps) {
  const logRef = useRef<HTMLOListElement>(null)
  // Keep the newest line in view.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length])

  return (
    <section className={cx('dialogue', className)} aria-label={`Conversation with ${name}`}>
      <aside className="dialogue__who">
        {portrait}
        <p className="dialogue__name">{name}</p>
        {role && <p className="dialogue__role">{role}</p>}
      </aside>
      <div className="dialogue__main">
        <ol ref={logRef} className="dialogue__log" aria-live="polite">
          {log.map((line, i) => (
            <li
              key={i}
              className={cx(
                'dialogue__line',
                line.you && 'dialogue__line--you',
                i === log.length - 1 && 'dialogue__line--latest',
              )}
            >
              <span className="dialogue__speaker">{line.speaker}</span>
              <span className="serif">{line.text}</span>
            </li>
          ))}
        </ol>
        <ol className="dialogue__choices">
          {choices.map((c, i) => {
            const button = (
              <button
                type="button"
                className="dialogue__choice"
                disabled={Boolean(c.disabled)}
                onClick={() => onChoose(c.key)}
              >
                <span className="dialogue__number num">{i + 1}.</span>
                <span className="serif">{c.label}</span>
              </button>
            )
            return (
              <li key={c.key}>
                {c.tip || c.disabled ? (
                  <Tooltip
                    className="dialogue__tip"
                    tip={
                      <>
                        {c.disabled && <span className="mods__value--bad">{c.disabled}</span>}
                        {c.tip}
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
      </div>
    </section>
  )
}
