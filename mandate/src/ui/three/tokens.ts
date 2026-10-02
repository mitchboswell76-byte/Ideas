/**
 * Colours for 3D scenes come from the same CSS tokens as the UI (DESIGN §17), so both themes work
 * and nothing is hard-coded. Re-read whenever `<html data-theme>` changes.
 */
import { useEffect, useState } from 'react'

export interface SceneTokens {
  background: string
  surface: string
  line: string
  textMuted: string
}

function readTokens(): SceneTokens {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    background: token('--bg', '#131518'),
    surface: token('--surface-2', '#212529'),
    line: token('--line', '#31373e'),
    textMuted: token('--text-muted', '#a4abb3'),
  }
}

export function useSceneTokens(): SceneTokens {
  const [tokens, setTokens] = useState(readTokens)
  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(readTokens()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])
  return tokens
}
