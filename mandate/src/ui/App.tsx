import { MainMenu } from './menu/MainMenu.tsx'
import { Shell } from './shell/Shell.tsx'
import { useGame } from './store/index.ts'

/** Main menu until a game exists (new, continued or loaded), then the game shell. */
export function App() {
  const inGame = useGame((s) => s.date !== null)
  return inGame ? <Shell /> : <MainMenu />
}
