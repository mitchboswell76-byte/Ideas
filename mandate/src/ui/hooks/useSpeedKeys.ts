import { useEffect } from 'react'
import { speedKeyAction } from '../keys.ts'
import { gameStore } from '../store/index.ts'

/** Global Space / 1–5 speed shortcuts while the component is mounted. */
export function useSpeedKeys(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const action = speedKeyAction(event)
      if (!action) return
      // Also stops Space scrolling the page or clicking a focused button.
      event.preventDefault()
      const game = gameStore.getState()
      if (action.type === 'toggle') game.togglePause()
      else game.setSpeed(action.speed)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
