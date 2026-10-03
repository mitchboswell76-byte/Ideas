import { useEffect, useState } from 'react'
import type { CharacterView } from '../../runtime/queries.ts'
import { gameStore } from '../store/index.ts'
import { share } from './share.ts'

/** Fewest milliseconds between refreshes while the clock runs fast. */
const REFRESH_MS = 500

/**
 * A character's view from the runner (`null` id = the player), refreshed as game days pass (at
 * most every half-second). `undefined` while loading. The date is watched outside React and an
 * unchanged answer is dropped, so a running clock doesn't re-render the screen every tick.
 */
export function useCharacterView(id: string | null): CharacterView | null | undefined {
  const [view, setView] = useState<{
    id: string | null
    json: string
    data: CharacterView | null
  } | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let last = 0
    let timer: number | undefined
    const unsubscribe = gameStore.subscribe((s, prev) => {
      if ((s.day === prev.day && s.player === prev.player) || timer !== undefined) return
      timer = window.setTimeout(
        () => {
          timer = undefined
          last = performance.now()
          setTick((t) => t + 1)
        },
        Math.max(0, REFRESH_MS - (performance.now() - last)),
      )
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    let live = true
    const game = gameStore.getState()
    const request = id ? game.query('character', { id }) : game.query('player', undefined)
    const settle = (data: CharacterView | null) => {
      if (!live) return
      const json = JSON.stringify(data)
      setView((old) =>
        old && old.id === id
          ? old.json === json
            ? old
            : { id, json, data: share(old.data, data) }
          : { id, json, data },
      )
    }
    request.then(settle, () => settle(null))
    return () => {
      live = false
    }
  }, [id, tick])

  return view?.id === id ? view.data : undefined
}
