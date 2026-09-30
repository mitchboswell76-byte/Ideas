import {
  CalendarBlankIcon,
  ChartLineIcon,
  CoinsIcon,
  FlagIcon,
  FloppyDiskIcon,
  GearSixIcon,
  GlobeHemisphereWestIcon,
  HouseIcon,
  MapTrifoldIcon,
  NewspaperIcon,
  TrayIcon,
  UserIcon,
} from '../kit/icons.ts'
import { Sidebar, type NavItem } from '../kit/index.ts'
import { useGame } from '../store/index.ts'
import { navStore, useNav, type ScreenName } from '../store/nav.ts'

const LATER = 'Not available yet'

/** Sidebar entries (DESIGN §17); the ones without a screen yet are shown disabled. */
type NavKey = ScreenName | 'profile' | 'party' | 'money' | 'media' | 'polls' | 'map' | 'world'

const SCREENS = new Set<string>(['home', 'inbox', 'calendar', 'saves', 'settings'])

export function GameSidebar() {
  const unread = useGame((s) => s.log.reduce((n, m) => n + (m.read ? 0 : 1), 0))
  const screen = useNav((s) => s.screen)
  const items: NavItem<NavKey>[] = [
    { key: 'home', label: 'Home', icon: HouseIcon },
    { key: 'inbox', label: 'Inbox', icon: TrayIcon, badge: unread },
    { key: 'calendar', label: 'Calendar', icon: CalendarBlankIcon },
    { key: 'profile', label: 'Profile', icon: UserIcon, disabled: LATER },
    { key: 'party', label: 'Party', icon: FlagIcon, disabled: LATER },
    { key: 'money', label: 'Money', icon: CoinsIcon, disabled: LATER },
    { key: 'media', label: 'Media', icon: NewspaperIcon, disabled: LATER },
    { key: 'polls', label: 'Polls', icon: ChartLineIcon, disabled: LATER },
    { key: 'map', label: 'Map', icon: MapTrifoldIcon, disabled: LATER },
    { key: 'world', label: 'World', icon: GlobeHemisphereWestIcon, disabled: LATER },
  ]
  const footer: NavItem<NavKey>[] = [
    { key: 'saves', label: 'Saves', icon: FloppyDiskIcon },
    { key: 'settings', label: 'Settings', icon: GearSixIcon },
  ]
  return (
    <Sidebar
      className="shell__sidebar"
      items={items}
      footer={footer}
      active={screen}
      brand="Mandate"
      brandShort="M"
      onSelect={(key) => SCREENS.has(key) && navStore.getState().go(key as ScreenName)}
    />
  )
}
