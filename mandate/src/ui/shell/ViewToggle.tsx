import { CubeIcon, FileTextIcon } from '../kit/icons.ts'
import { IconButton } from '../kit/index.ts'
import { useView, viewStore } from '../store/view.ts'

/** 3D or 2D (DESIGN §17). Shown once a screen has a 3D view (`HAS_3D_VIEW`). */
export function ViewToggle() {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const { setView } = viewStore.getState()
  return (
    <div className="view-toggle" role="group" aria-label="View">
      <IconButton
        icon={CubeIcon}
        label="3D view"
        detail={webgl ? undefined : 'Needs WebGL 2, which this browser does not offer'}
        pressed={view === '3d'}
        disabled={!webgl}
        data-testid="view-3d"
        onClick={() => setView('3d')}
      />
      <IconButton
        icon={FileTextIcon}
        label="2D view"
        detail="Flat and lightest on battery"
        pressed={view === '2d'}
        data-testid="view-2d"
        onClick={() => setView('2d')}
      />
    </div>
  )
}
