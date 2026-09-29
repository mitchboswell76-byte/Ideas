import { useState } from 'react'
import { useSpeedKeys } from './hooks/useSpeedKeys.ts'
import { SavesMenu } from './shell/SavesMenu.tsx'
import { SettingsMenu } from './shell/SettingsMenu.tsx'
import { Sheet } from './shell/Sheet.tsx'
import './shell/shell.css'
import { Stage } from './shell/Stage.tsx'
import { StatusBar } from './shell/StatusBar.tsx'
import { TopBar, type MenuName } from './shell/TopBar.tsx'

/** App shell: top bar (brand, clock, speed, menus), stage, ticker, and the menu sheets. */
export function App() {
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
