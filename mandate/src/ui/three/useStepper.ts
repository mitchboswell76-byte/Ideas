import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { STEP_FPS } from '../graphics/presets.ts'

/**
 * Redraw an on-demand scene in frame-by-frame steps (`STEP_FPS`) while `active`, instead of a
 * continuous loop: idle 3D costs a few frames a second, and stops entirely in a hidden tab.
 */
export function useStepper(active: boolean, fps = STEP_FPS): void {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!active) return
    let timer: number | undefined
    const start = () => {
      timer ??= window.setInterval(() => invalidate(), 1000 / fps)
    }
    const stop = () => {
      window.clearInterval(timer)
      timer = undefined
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, fps, invalidate])
}

/** Time in seconds, quantised to animation steps so motion reads as hand-animated frames. */
export function steppedSeconds(fps = STEP_FPS): number {
  return Math.floor((performance.now() / 1000) * fps) / fps
}
