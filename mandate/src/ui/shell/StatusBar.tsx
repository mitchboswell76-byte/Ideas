import { GAME_VERSION } from '../../sim/version.ts'
import { Ticker } from '../kit/index.ts'
import { useGame } from '../store/index.ts'
import { MODE_LABELS } from './labels.ts'

/** Shown until the game produces its own news. */
const QUIET_DAY = [
  'No news yet: the country has not heard of you',
  'Space pauses the clock; keys 1 to 5 set the speed',
  'Saves live in this browser; export a .mandate file to keep a copy',
]

const TICKER_ITEMS = 6

export function StatusBar() {
  const log = useGame((s) => s.log)
  const mode = useGame((s) => s.mode)
  const items = log.length ? log.slice(0, TICKER_ITEMS).map((n) => n.text) : QUIET_DAY
  return (
    <footer className="statusbar">
      <Ticker items={items} />
      <p className="statusbar__meta">
        <span>v{GAME_VERSION}</span>
        <span data-testid="sim-mode">{MODE_LABELS[mode]}</span>
      </p>
    </footer>
  )
}
