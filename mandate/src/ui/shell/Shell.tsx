import { useState } from 'react'
import { useSpeedKeys } from '../hooks/useSpeedKeys.ts'
import { SavesMenu } from './SavesMenu.tsx'
import { SettingsMenu } from './SettingsMenu.tsx'
import { Sheet } from './Sheet.tsx'
import './shell.css'
import { Stage } from './Stage.tsx'
import { StatusBar } from './StatusBar.tsx'
import { TopBar, type MenuName } from './TopBar.tsx'

/** The game screen: top bar (brand, clock, speed, view, menus), stage, ticker, menu sheets. */
export function Shell() {
  useSpeedKeys()
  const [menu, setMenu] = useState<MenuName | null>(null)
  const close = () => setMenu(null)
  return (
    <div className="shell">
      <TopBar onOpen={setMenu} />
      <Stage />
      <StatusBar />
      {menu === 'saves' && (
        <Sheet title="Saves" onClose={close}>
          <SavesMenu />
        </Sheet>
      )}
      {menu === 'settings' && (
        <Sheet title="Settings" onClose={close}>
          <SettingsMenu />
        </Sheet>
      )}
    </div>
  )
}
