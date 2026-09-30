import { lazy, Suspense, type ComponentType } from 'react'
import { useSpeedKeys } from '../hooks/useSpeedKeys.ts'
import { cx } from '../kit/index.ts'
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

// The map screens load on demand with their data (the world map is ~170 KB of JSON).
const World = lazy(() => import('../screens/World.tsx').then((m) => ({ default: m.World })))

const SCREENS: Record<ScreenName, ComponentType> = {
  home: Home,
  inbox: Inbox,
  calendar: Calendar,
  world: World,
  saves: Saves,
  settings: Settings,
}

/** Screens that fill the stage edge to edge (maps). */
const FLUSH = new Set<ScreenName>(['world'])

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
          <main
            className={cx('shell__screen', FLUSH.has(screen) && 'shell__screen--flush')}
            key={screen}
          >
            <Suspense fallback={<p className="empty">Loading…</p>}>
              <Screen />
            </Suspense>
          </main>
        </div>
        <StatusBar />
      </div>
    </div>
  )
}
