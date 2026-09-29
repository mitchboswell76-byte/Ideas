import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './hooks/useReducedMotion.ts'
import { Shell } from './shell/Shell.tsx'
import { WorldLayer } from './shell/WorldLayer.tsx'
import { gameStore } from './store/index.ts'
import { useView } from './store/view.ts'
import type { Shot } from './three/camera.ts'
import { TitleScreen } from './title/TitleScreen.tsx'

/**
 * title → entering (camera flies in, 3D only) → game. A game appearing in the store — new, continued
 * or loaded — is what leaves the title.
 */
type Phase = 'title' | 'entering' | 'game'

const SHOTS: Record<Phase, Shot> = { title: 'title', entering: 'fly', game: 'iso' }

export function App() {
  const [phase, setPhase] = useState<Phase>(() =>
    gameStore.getState().date === null ? 'title' : 'game',
  )
  const [worldReady, setWorldReady] = useState(false)
  const in3d = useView((s) => s.view === '3d')
  const reducedMotion = useReducedMotion()

  // Only fly in if the 3D wordmark is already on screen to fly into.
  const canFly = useRef(false)
  useEffect(() => {
    canFly.current = in3d && worldReady && !reducedMotion
  }, [in3d, worldReady, reducedMotion])

  useEffect(
    () =>
      gameStore.subscribe((state, prev) => {
        if (state.date === null || prev.date !== null) return
        setPhase((p) => (p !== 'title' ? p : canFly.current ? 'entering' : 'game'))
      }),
    [],
  )

  // Switching to 2D mid-flight lands straight in the game.
  const shown: Phase = phase === 'entering' && !in3d ? 'game' : phase

  return (
    <>
      {in3d && (
        <WorldLayer
          shot={SHOTS[shown]}
          onFlyDone={() => setPhase('game')}
          onReadyChange={setWorldReady}
        />
      )}
      {shown === 'game' ? (
        <Shell />
      ) : (
        <TitleScreen worldReady={in3d && worldReady} leaving={shown === 'entering'} />
      )}
    </>
  )
}
