import type { CSSProperties } from 'react'
import { formatShortDate } from '../format.ts'
import { readableInk } from '../kit/colour.ts'
import { DateSpeed, PauseBanner } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'
import { useNav } from '../store/nav.ts'
import { HAS_3D_VIEW } from '../store/view.ts'
import { PAUSE_LABELS, SCREEN_TITLES } from './labels.ts'
import { NO_PARTY } from './party.ts'
import { ViewToggle } from './ViewToggle.tsx'

/**
 * The header strip, tinted in the player's party colours (FM), with the time controls and, while
 * paused, the banner saying why (Paradox).
 */
export function TopBar() {
  const screen = useNav((s) => s.screen)
  const date = useGame((s) => s.date)
  const speed = useGame((s) => s.speed)
  const resumeSpeed = useGame((s) => s.resumeSpeed)
  const pausedBy = useGame((s) => s.pausedBy)
  const game = gameStore.getState()
  const party = NO_PARTY
  const style = {
    '--party': party.colour,
    '--party-ink': readableInk(party.colour),
  } as CSSProperties
  return (
    <header className="topbar" style={style}>
      <div className="topbar__title">
        <span className="topbar__party">{party.name}</span>
        <h1 className="topbar__screen">{SCREEN_TITLES[screen]}</h1>
      </div>
      <div className="topbar__controls">
        {HAS_3D_VIEW && <ViewToggle />}
        {speed === 0 && (
          <PauseBanner
            reason={pausedBy && PAUSE_LABELS[pausedBy]}
            onResume={() => game.togglePause()}
          />
        )}
        <DateSpeed
          label={formatShortDate(date)}
          iso={date ?? ''}
          speed={speed}
          resumeSpeed={resumeSpeed}
          onTogglePause={() => game.togglePause()}
          onSpeed={(s) => game.setSpeed(s)}
          onStep={(days) => game.step(days)}
        />
      </div>
    </header>
  )
}
