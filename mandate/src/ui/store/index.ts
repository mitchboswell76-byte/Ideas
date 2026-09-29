/** The app's single game store, wired to the real simulation worker and IndexedDB. */
import { useStore } from 'zustand'
import { createSimBridge } from '../../runtime/bridge.ts'
import { indexedDbSlots } from '../saves/slots.ts'
import { createGameStore, type GameState } from './game.ts'
import { localSettings } from './settings.ts'

export const gameStore = createGameStore({
  bridge: createSimBridge(),
  slots: indexedDbSlots(),
  settings: localSettings,
})

/** Select from the game store; select primitives or stable references to avoid extra renders. */
export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector)
}
