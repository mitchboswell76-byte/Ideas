import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles/base.css'
import { App } from './ui/App.tsx'
import { gameStore } from './ui/store/index.ts'
import { applyTheme, themeStore } from './ui/store/theme.ts'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

applyTheme(themeStore.getState().theme)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Connect the simulation and list saves; the main menu starts or loads a game.
void gameStore.getState().boot()
