import { useCallback, useSyncExternalStore } from 'react'

function matches(query: string): boolean {
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

/** Whether a CSS media query matches, live. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      try {
        const media = window.matchMedia(query)
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
      } catch {
        return () => {}
      }
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => matches(query),
    () => false,
  )
}

/** Below this width the sidebar is an icon rail and two-pane screens show one pane (DESIGN §17). */
export const NARROW_QUERY = '(max-width: 899px)'

export function useNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY)
}
