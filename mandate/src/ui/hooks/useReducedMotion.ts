import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  try {
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  } catch {
    return () => {}
  }
}

function read(): boolean {
  try {
    return window.matchMedia(QUERY).matches
  } catch {
    return false
  }
}

/** The player's "reduce motion" system setting, live: no flicker, bobbing or camera flights. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
