import { useEffect, useState } from 'react'
import { useView } from '../store/view.ts'
import {
  cachedPortrait,
  portraitKey,
  portraitsFailed,
  requestPortrait,
  type Framing,
} from './portraits.ts'
import type { Rig } from './rig.ts'

/**
 * The cached 3D render of `rig`, or `null` while it renders, in 2D view, without WebGL or after
 * a failed render (callers then show the 2D illustration).
 */
export function usePortraitImage(rig: Rig, framing: Framing = 'bust'): string | null {
  const view = useView((s) => s.view)
  const webgl = useView((s) => s.webgl)
  const preset = useView((s) => s.preset)
  const key =
    view === '3d' && webgl && !portraitsFailed() ? portraitKey(rig, framing, preset) : null
  const [done, setDone] = useState<{ key: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!key || cachedPortrait(key)) return
    let live = true
    requestPortrait(rig, framing, preset).then(
      (url) => live && setDone({ key, url }),
      () => live && setDone({ key, url: null }),
    )
    return () => {
      live = false
    }
    // The key covers everything the render depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return null
  return cachedPortrait(key) ?? (done?.key === key ? done.url : null)
}
