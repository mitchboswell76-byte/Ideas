import type { RunSpeed, Speed } from '../../runtime/protocol.ts'
import { Button, IconButton } from './Button.tsx'
import { cx } from './cx.ts'
import { PauseIcon, PlayIcon } from './icons.ts'
import { Tooltip } from './Tooltip.tsx'
import './nav.css'

const PIPS: readonly RunSpeed[] = [1, 2, 3, 4, 5]

interface DateSpeedProps {
  /** Formatted date, e.g. "Thu 1 Oct 2026". */
  label: string
  /** ISO date for tests and tools. */
  iso?: string
  speed: Speed
  /** The speed Space resumes at (lit dimly while paused). */
  resumeSpeed: RunSpeed
  onTogglePause: () => void
  onSpeed: (speed: RunSpeed) => void
  /** Advance while paused; omit to hide the step buttons. */
  onStep?: (days: number) => void
  className?: string
}

/** Paradox-style time controls: date, pause, five speed pips (DESIGN §2, §17). */
export function DateSpeed({
  label,
  iso,
  speed,
  resumeSpeed,
  onTogglePause,
  onSpeed,
  onStep,
  className,
}: DateSpeedProps) {
  const paused = speed === 0
  const level = paused ? resumeSpeed : speed
  return (
    <div className={cx('datespeed', paused && 'datespeed--paused', className)}>
      {onStep && paused && (
        <div className="datespeed__step" role="group" aria-label="Advance time">
          <Button size="s" variant="quiet" onClick={() => onStep(1)}>
            +1 day
          </Button>
          <Button size="s" variant="quiet" onClick={() => onStep(7)}>
            +1 week
          </Button>
        </div>
      )}
      <output className="datespeed__date num" data-testid="game-date" data-iso={iso ?? ''}>
        {label}
      </output>
      <IconButton
        icon={paused ? PlayIcon : PauseIcon}
        label={paused ? 'Resume' : 'Pause'}
        shortcut="Space"
        pressed={paused}
        className="datespeed__pause"
        onClick={onTogglePause}
      />
      <div className="datespeed__pips" role="group" aria-label="Speed">
        {PIPS.map((s) => (
          <Tooltip
            key={s}
            lockable={false}
            tip={
              <span className="tip__label">
                Speed {s}
                <kbd className="tip__key">{s}</kbd>
              </span>
            }
          >
            <button
              type="button"
              className="datespeed__pip"
              data-lit={s <= level || undefined}
              aria-label={`Speed ${s}`}
              aria-pressed={speed === s}
              onClick={() => onSpeed(s)}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

interface PauseBannerProps {
  /** Why the game paused itself, if it did. */
  reason?: string | null
  onResume: () => void
}

/** Paradox's paused banner: says why, and resumes on click. */
export function PauseBanner({ reason, onResume }: PauseBannerProps) {
  return (
    <button type="button" className="pause-banner" onClick={onResume}>
      <PauseIcon weight="fill" className="pause-banner__icon" aria-hidden />
      <span className="pause-banner__text">
        Paused{reason && <span className="pause-banner__reason"> · {reason}</span>}
      </span>
      <span className="pause-banner__hint">Space to resume</span>
    </button>
  )
}
