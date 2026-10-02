import { GAME_VERSION } from '../../sim/version.ts'
import { Ticker } from '../kit/index.ts'
import { useGame } from '../store/index.ts'
import { MODE_LABELS } from './labels.ts'

/** Shown until the game produces its own news. */
const QUIET_DAY = [
  'No news yet: the country has not heard of you',
  'Space pauses the clock; keys 1 to 5 set the speed',
  'Saves stay in this browser; export a save file to keep a copy',
]

const TICKER_ITEMS = 6

/** Bottom strip: news ticker, version and where the simulation runs. */
export function StatusBar() {
  const log = useGame((s) => s.log)
  const mode = useGame((s) => s.mode)
  const news = log.filter((n) => n.kind === 'news').slice(0, TICKER_ITEMS)
  return (
    <footer className="statusbar">
      <Ticker items={news.length ? news.map((n) => n.text) : QUIET_DAY} />
      <p className="statusbar__meta">
        <span>v{GAME_VERSION}</span>
        <span data-testid="sim-mode">{MODE_LABELS[mode]}</span>
      </p>
    </footer>
  )
}
