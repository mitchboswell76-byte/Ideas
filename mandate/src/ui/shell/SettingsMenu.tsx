import { PAUSE_REASONS } from '../../runtime/protocol.ts'
import { Ballot, BallotOption } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'
import { AUTOSAVE_CADENCES } from '../store/settings.ts'
import { useTheme, type Theme } from '../store/theme.ts'
import { AUTOSAVE_LABELS, PAUSE_LABELS } from './labels.ts'

const THEME_OPTIONS: { theme: Theme; label: string; detail: string }[] = [
  { theme: 'night', label: 'Night', detail: 'Light ink on a dark ground' },
  { theme: 'paper', label: 'Paper', detail: 'Black ink on ballot cream' },
]

export function SettingsMenu() {
  const { theme, setTheme } = useTheme()
  const autosave = useGame((s) => s.autosave)
  const autoPause = useGame((s) => s.autoPause)
  const game = gameStore.getState()
  return (
    <div className="settings">
      <Ballot legend="Theme" instruction="Vote for one only">
        {THEME_OPTIONS.map((o) => (
          <BallotOption
            key={o.theme}
            name="theme"
            value={o.theme}
            label={o.label}
            detail={o.detail}
            checked={theme === o.theme}
            onChange={() => setTheme(o.theme)}
          />
        ))}
      </Ballot>
      <Ballot legend="Autosave" instruction="Vote for one only">
        {AUTOSAVE_CADENCES.map((cadence) => (
          <BallotOption
            key={cadence}
            name="autosave"
            value={cadence}
            label={AUTOSAVE_LABELS[cadence]}
            detail={cadence === 'off' ? 'Save by hand' : 'At most once a minute'}
            checked={autosave === cadence}
            onChange={() => game.setAutosave(cadence)}
          />
        ))}
      </Ballot>
      <Ballot legend="Auto-pause on" instruction="Mark as many as you like">
        {PAUSE_REASONS.map((reason) => (
          <BallotOption
            key={reason}
            type="checkbox"
            label={PAUSE_LABELS[reason]}
            checked={autoPause[reason]}
            onChange={(on) => game.setAutoPause(reason, on)}
          />
        ))}
      </Ballot>
    </div>
  )
}
