import { useMediaQuery } from './useMediaQuery.ts'

/** The player's "reduce motion" system setting, live: no scrolling ticker or animated scenes. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
