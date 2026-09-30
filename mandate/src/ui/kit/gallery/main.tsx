/**
 * Living style guide for the UI kit (`/kit.html` in dev; bundled into one file by
 * `npm run build:kit` for the style-preview Artifact). Not part of the game build.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/base.css'
import type { Theme } from '../../store/theme.ts'
import { Gallery } from './Gallery.tsx'

/** Start in the host's theme: an Artifact viewer's `data-theme`, else the OS setting. */
function hostTheme(): Theme {
  const host = document.documentElement.dataset.theme
  if (host === 'dark' || host === 'light') return host
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
createRoot(root).render(
  <StrictMode>
    <Gallery initialTheme={hostTheme()} />
  </StrictMode>,
)
