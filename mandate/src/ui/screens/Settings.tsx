import { PAUSE_REASONS } from '../../runtime/protocol.ts'
import { PRESETS } from '../graphics/presets.ts'
import { Choice, ChoiceGroup } from '../kit/index.ts'
import { AUTOSAVE_LABELS, PAUSE_LABELS } from '../shell/labels.ts'
import { gameStore, useGame } from '../store/index.ts'
import { AUTOSAVE_CADENCES } from '../store/settings.ts'
import { THEMES, useTheme, type Theme } from '../store/theme.ts'
import {
  HAS_3D_VIEW,
  QUALITY_SETTINGS,
  useView,
  viewStore,
  type QualitySetting,
} from '../store/view.ts'
import './screens.css'

const THEME_TEXT: Record<Theme, { label: string; detail: string }> = {
  dark: { label: 'Dark', detail: 'Graphite panels; easiest on the eyes for long sessions' },
  light: { label: 'Light', detail: 'Dark text on light grey' },
}

const QUALITY_DETAIL: Record<Exclude<QualitySetting, 'auto'>, string> = {
  low: 'Half resolution. Kindest to older laptops',
  medium: 'Three-quarter resolution',
  high: 'Full resolution',
}

/** View and graphics quality: only once a screen has a 3D view (`HAS_3D_VIEW`). */
function GraphicsSettings() {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const quality = useView((s) => s.quality)
  const autoPreset = useView((s) => s.autoPreset)
  const renderer = useView((s) => s.renderer)
  const software = useView((s) => s.software)
  const { setView, setQuality } = viewStore.getState()
  return (
    <>
      <ChoiceGroup legend="View">
        <Choice
          name="view"
          value="3d"
          label="3D"
          detail={webgl ? 'Maps and characters in 3D' : 'Needs WebGL 2, which this browser lacks'}
          checked={view === '3d'}
          disabled={!webgl}
          onChange={() => setView('3d')}
        />
        <Choice
          name="view"
          value="2d"
          label="2D"
          detail="Flat maps and portraits; lightest on battery"
          checked={view === '2d'}
          onChange={() => setView('2d')}
        />
      </ChoiceGroup>
      <ChoiceGroup legend="Graphics">
        {QUALITY_SETTINGS.map((q) => (
          <Choice
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
      </ChoiceGroup>
    </>
  )
}

/** Per-browser settings: theme, autosave, auto-pause (and graphics once there is 3D). */
export function Settings() {
  const { theme, setTheme } = useTheme()
  const autosave = useGame((s) => s.autosave)
  const autoPause = useGame((s) => s.autoPause)
  const game = gameStore.getState()
  return (
    <div className="settings">
      <ChoiceGroup legend="Theme">
        {THEMES.map((t) => (
          <Choice
            key={t}
            name="theme"
            value={t}
            label={THEME_TEXT[t].label}
            detail={THEME_TEXT[t].detail}
            checked={theme === t}
            onChange={() => setTheme(t)}
          />
        ))}
      </ChoiceGroup>
      <ChoiceGroup legend="Autosave">
        {AUTOSAVE_CADENCES.map((cadence) => (
          <Choice
            key={cadence}
            name="autosave"
            value={cadence}
            label={AUTOSAVE_LABELS[cadence]}
            detail={cadence === 'off' ? 'Save by hand' : 'At most once a minute of real time'}
            checked={autosave === cadence}
            onChange={() => game.setAutosave(cadence)}
          />
        ))}
      </ChoiceGroup>
      <ChoiceGroup legend="Pause automatically on">
        {PAUSE_REASONS.map((reason) => (
          <Choice
            key={reason}
            type="checkbox"
            label={PAUSE_LABELS[reason]}
            checked={autoPause[reason]}
            onChange={(on) => game.setAutoPause(reason, on)}
          />
        ))}
      </ChoiceGroup>
      {HAS_3D_VIEW && <GraphicsSettings />}
    </div>
  )
}
