import { lazy, Suspense } from 'react'
import { useNarrow } from '../hooks/useMediaQuery.ts'

// The map and its data load after the menu's first paint.
const UkBackdrop = lazy(() => import('../map/uk/Backdrop.tsx'))

/** The political map of Britain behind the main menu; none on narrow screens (the menu fills them). */
export function Backdrop() {
  const narrow = useNarrow()
  if (narrow) return null
  return (
    <div className="menu__backdrop" aria-hidden="true">
      <Suspense fallback={null}>
        <UkBackdrop />
      </Suspense>
    </div>
  )
}
