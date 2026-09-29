import { PAUSE_REASONS } from '../../runtime/protocol.ts'
import { Ballot, BallotOption } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'
import { AUTOSAVE_CADENCES } from '../store/settings.ts'
import { PRESETS } from '../graphics/presets.ts'
import { useTheme, type Theme } from '../store/theme.ts'
import { QUALITY_SETTINGS, useView, viewStore, type QualitySetting } from '../store/view.ts'
import { AUTOSAVE_LABELS, PAUSE_LABELS } from './labels.ts'

const THEME_OPTIONS: { theme: Theme; label: string; detail: string }[] = [
  { theme: 'night', label: 'Night', detail: 'Light ink on a dark ground' },
  { theme: 'paper', label: 'Paper', detail: 'Black ink on ballot cream' },
]

const QUALITY_DETAIL: Record<Exclude<QualitySetting, 'auto'>, string> = {
  low: 'Half resolution, chunkiest pixels. Kindest to older laptops',
  medium: 'Three-quarter resolution',
  high: 'Full resolution, finest pixels',
}

function ViewSettings() {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const quality = useView((s) => s.quality)
  const autoPreset = useView((s) => s.autoPreset)
  const renderer = useView((s) => s.renderer)
  const software = useView((s) => s.software)
  const { setView, setQuality } = viewStore.getState()
  return (
    <>
      <Ballot legend="View" instruction="Vote for one only">
        <BallotOption
          name="view"
          value="3d"
          label="3D diorama"
          detail={
            webgl ? 'The voxel world behind the papers' : 'Needs WebGL 2, which this browser lacks'
          }
          checked={view === '3d'}
          disabled={!webgl}
          onChange={() => setView('3d')}
        />
        <BallotOption
          name="view"
          value="2d"
          label="2D document"
          detail="No animation, lightest on battery"
          checked={view === '2d'}
          onChange={() => setView('2d')}
        />
      </Ballot>
      <Ballot legend="Graphics" instruction="Vote for one only">
        {QUALITY_SETTINGS.map((q) => (
          <BallotOption
            key={q}
            name="quality"
            value={q}
            label={q === 'auto' ? 'Auto' : PRESETS[q].label}
            detail={
              q === 'auto'
                ? `Now ${PRESETS[autoPreset].label} for ${renderer ?? 'an unnamed graphics chip'}${software ? ' (software rendering)' : ''}`
                : QUALITY_DETAIL[q]
            }
            checked={quality === q}
            onChange={() => setQuality(q)}
          />
        ))}
      </Ballot>
    </>
  )
}

export function SettingsMenu() {
  const { theme, setTheme } = useTheme()
  const autosave = useGame((s) => s.autosave)
  const autoPause = useGame((s) => s.autoPause)
  const game = gameStore.getState()
  return (
    <div className="settings">
      <ViewSettings />
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
