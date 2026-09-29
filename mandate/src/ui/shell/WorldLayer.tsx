import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react'
import { viewStore } from '../store/view.ts'
import type { Shot } from '../three/camera.ts'

// three.js and the scenes load on demand, so they never hold up the title screen.
const WorldCanvas = lazy(() => import('../three/WorldCanvas.tsx'))

/** If the 3D view fails to start (lost or refused WebGL context), fall back to 2D for good. */
class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    console.warn('The 3D view could not start; switching to 2D.', error)
    viewStore.getState().setView('2d')
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}

interface WorldLayerProps {
  shot: Shot
  onFlyDone: () => void
  /** True once the first 3D frame is on screen; false again when the layer goes away. */
  onReadyChange: (ready: boolean) => void
}

/** The diorama behind the UI in 3D view (DESIGN §17). */
export function WorldLayer({ shot, onFlyDone, onReadyChange }: WorldLayerProps) {
  useEffect(() => () => onReadyChange(false), [onReadyChange])
  return (
    <WorldBoundary>
      <Suspense fallback={null}>
        <WorldCanvas shot={shot} onFlyDone={onFlyDone} onReady={() => onReadyChange(true)} />
      </Suspense>
    </WorldBoundary>
  )
}
