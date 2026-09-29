/**
 * Living style guide for the UI kit (`/kit.html` in dev; bundled into one file by
 * `npm run build:kit` for the style-preview Artifact). Not part of the game build.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/base.css'
import type { Theme } from '../../store/theme.ts'
import { Gallery } from './Gallery.tsx'

/** The page chrome follows the host: an Artifact viewer's `data-theme`, else the OS setting. */
function hostTheme(): Theme {
  const host = document.documentElement.dataset.theme
  if (host === 'dark') return 'night'
  if (host === 'light') return 'paper'
  return matchMedia('(prefers-color-scheme: light)').matches ? 'paper' : 'night'
}

function syncTheme(): void {
  document.body.dataset.theme = hostTheme()
}

syncTheme()
matchMedia('(prefers-color-scheme: light)').addEventListener('change', syncTheme)
new MutationObserver(syncTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')
createRoot(root).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
