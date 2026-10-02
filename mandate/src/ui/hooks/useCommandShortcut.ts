import { useEffect } from 'react'
import { isCommandShortcut } from '../commands.ts'

/** Calls `open` on Ctrl+K / ⌘K from anywhere while mounted. */
export function useCommandShortcut(open: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isCommandShortcut(e)) return
      e.preventDefault()
      open()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
}
