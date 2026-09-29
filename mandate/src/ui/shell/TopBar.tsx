import { PAUSE_LABELS } from './labels.ts'
import type { Speed } from '../../runtime/protocol.ts'
import { formatShortDate } from '../format.ts'
import { BrandBlock, Button, Stamp } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'

const RUN_SPEEDS: readonly Speed[] = [1, 2, 3, 4, 5]

export type MenuName = 'saves' | 'settings'

function Clock() {
  const date = useGame((s) => s.date)
  const pausedBy = useGame((s) => s.pausedBy)
  return (
    <div className="clock">
      <output className="clock__date" data-testid="game-date" data-iso={date ?? ''}>
        {formatShortDate(date)}
      </output>
      {pausedBy && (
        <Stamp className="stamp--small" key={pausedBy}>
          Paused · {PAUSE_LABELS[pausedBy]}
        </Stamp>
      )}
    </div>
  )
}

function SpeedControls() {
  const speed = useGame((s) => s.speed)
  const { setSpeed, step } = gameStore.getState()
  const paused = speed === 0
  return (
    <div className="speed" role="group" aria-label="Speed">
      <Button
        icon={paused ? 'play' : 'pause'}
        aria-label={paused ? 'Resume (Space)' : 'Pause (Space)'}
        title={paused ? 'Resume (Space)' : 'Pause (Space)'}
        onClick={() => gameStore.getState().togglePause()}
      />
      {RUN_SPEEDS.map((s) => (
        <Button
          key={s}
          className="speed__level"
          aria-pressed={speed === s}
          aria-label={`Speed ${s}`}
          title={`Speed ${s} (${s})`}
          onClick={() => setSpeed(s)}
        >
          {s}
        </Button>
      ))}
      <Button icon="step" disabled={!paused} onClick={() => step(1)} title="Advance one day">
        Day
      </Button>
      <Button icon="step" disabled={!paused} onClick={() => step(7)} title="Advance one week">
        Week
      </Button>
    </div>
  )
}

export function TopBar({ onOpen }: { onOpen: (menu: MenuName) => void }) {
  return (
    <header className="topbar">
      <BrandBlock />
      <div className="topbar__time">
        <Clock />
        <SpeedControls />
      </div>
      <nav className="topbar__menu" aria-label="Game menu">
        <Button icon="ballotBox" aria-haspopup="dialog" onClick={() => onOpen('saves')}>
          Saves
        </Button>
        <Button icon="settings" aria-haspopup="dialog" onClick={() => onOpen('settings')}>
          Settings
        </Button>
      </nav>
    </header>
  )
}
