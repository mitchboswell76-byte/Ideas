import { useEffect } from 'react'
import { personalColour } from '../../sim/character/colours.ts'
import { useTheme } from '../store/theme.ts'

/**
 * Point `--you` at the player's personal colour (DESIGN §4), in the current theme's shade, while
 * mounted. Without one, the stylesheet's default (violet) stays.
 */
export function useYouColour(id: string | null | undefined): void {
  const { theme } = useTheme()
  useEffect(() => {
    if (!id) return
    const style = document.documentElement.style
    style.setProperty('--you', personalColour(id)[theme])
    return () => {
      style.removeProperty('--you')
    }
  }, [id, theme])
}
