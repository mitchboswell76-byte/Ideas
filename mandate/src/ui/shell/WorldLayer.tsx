import { Component, lazy, Suspense, type ReactNode } from 'react'
import { viewStore } from '../store/view.ts'

// three.js and the scenes load on demand, so they never hold up the first paint.
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
  /** The scene; three.js elements. */
  children?: ReactNode
  onReady?: () => void
}

/**
 * The 3D layer behind the UI in 3D view (DESIGN §17). Not mounted until a screen has a 3D view
 * (`HAS_3D_VIEW`).
 */
export function WorldLayer({ children, onReady }: WorldLayerProps) {
  return (
    <WorldBoundary>
      <Suspense fallback={null}>
        <WorldCanvas onReady={onReady}>{children}</WorldCanvas>
      </Suspense>
    </WorldBoundary>
  )
}
