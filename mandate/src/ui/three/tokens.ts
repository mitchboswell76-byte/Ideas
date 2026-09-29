/**
 * Colours for 3D scenes come from the same CSS tokens as the UI (DESIGN §17), so Night and Paper
 * both work and nothing is hard-coded. Re-read whenever `<html data-theme>` changes.
 */
import { useEffect, useState } from 'react'

export interface SceneTokens {
  ground: string
  gridDot: string
  voxel: string
  inkMuted: string
}

function readTokens(): SceneTokens {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    ground: token('--ground', '#0a0a0b'),
    gridDot: token('--grid-dot', '#26262b'),
    voxel: token('--voxel-neutral', '#8a8a8a'),
    inkMuted: token('--ink-muted', '#8d8980'),
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
