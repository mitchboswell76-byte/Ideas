import { Button } from '../kit/index.ts'
import { useView, viewStore } from '../store/view.ts'

/** `View: [3D] [2D]` — the diorama or the plain document (DESIGN §17). */
export function ViewToggle() {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const { setView } = viewStore.getState()
  return (
    <div className="view-toggle" role="group" aria-label="View">
      <span className="view-toggle__label" aria-hidden>
        View
      </span>
      <Button
        icon="cube"
        aria-pressed={view === '3d'}
        aria-label="3D diorama"
        title={webgl ? '3D diorama' : '3D needs WebGL 2, which this browser does not offer'}
        disabled={!webgl}
        data-testid="view-3d"
        onClick={() => setView('3d')}
      />
      <Button
        icon="document"
        aria-pressed={view === '2d'}
        aria-label="2D document"
        title="2D document: no animation, lightest on battery"
        data-testid="view-2d"
        onClick={() => setView('2d')}
      />
    </div>
  )
}
