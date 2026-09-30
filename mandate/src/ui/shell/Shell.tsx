import { useSpeedKeys } from '../hooks/useSpeedKeys.ts'
import { Calendar } from '../screens/Calendar.tsx'
import { Home } from '../screens/Home.tsx'
import { Inbox } from '../screens/Inbox.tsx'
import { Saves } from '../screens/Saves.tsx'
import { Settings } from '../screens/Settings.tsx'
import { useNav, type ScreenName } from '../store/nav.ts'
import { GameSidebar } from './GameSidebar.tsx'
import { Problems } from './Problems.tsx'
import './shell.css'
import { StatusBar } from './StatusBar.tsx'
import { TopBar } from './TopBar.tsx'

const SCREENS: Record<ScreenName, () => React.JSX.Element> = {
  home: Home,
  inbox: Inbox,
  calendar: Calendar,
  saves: Saves,
  settings: Settings,
}

/**
 * The game screen (DESIGN §17): FM sidebar, party-tinted header with Paradox time controls, the
 * current screen, and the ticker along the bottom.
 */
export function Shell() {
  useSpeedKeys()
  const screen = useNav((s) => s.screen)
  const Screen = SCREENS[screen]
  return (
    <div className="shell">
      <GameSidebar />
      <div className="shell__main">
        <TopBar />
        <div className="shell__stage">
          <Problems />
          <main className="shell__screen" key={screen}>
            <Screen />
          </main>
        </div>
        <StatusBar />
      </div>
    </div>
  )
}
