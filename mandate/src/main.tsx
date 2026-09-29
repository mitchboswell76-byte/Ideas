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

// A random seed per new game until character creation (T10) supplies one.
const seed = Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join('')
void gameStore.getState().boot(seed)
