/**
 * Loads the single-file build (`dist-preview/`) the way claude.ai serves a published Artifact: the
 * page content wrapped in the host's document skeleton, optionally with a fake viewer
 * (`window.claude.use`) that answers the `downloads` capability.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const BUILD = fileURLToPath(new URL('../dist-preview/mandate-preview.html', import.meta.url))

/** Same origin as `vite preview`, so it is a secure context like the real host. */
export const ARTIFACT_URL = '/artifact.html'

function wrapped(): string {
  const content = readFileSync(BUILD, 'utf8')
  return (
    '<!doctype html><html><head><meta charset=utf8>' +
    '<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    `</head><body>${content}</body></html>`
  )
}

/** What the fake viewer does with a save: accept it, or reject with a downloads error code. */
export type ViewerAnswer = 'saved' | 'declined' | 'rejected_extension'

export interface ViewerSave {
  filename: string
  data: string
}

/** Serve the Artifact build at {@link ARTIFACT_URL}; `viewer` adds a fake claude.ai viewer. */
export async function routeArtifact(page: Page, viewer?: { answer: ViewerAnswer }): Promise<void> {
  const html = wrapped()
  await page.route(`**${ARTIFACT_URL}`, (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  )
  if (!viewer) return
  await page.addInitScript((answer: ViewerAnswer) => {
    const saves: ViewerSave[] = []
    const downloads = Object.freeze({
      save: async (req: ViewerSave) => {
        if (answer !== 'saved') throw { code: answer, message: answer }
        saves.push({ filename: req.filename, data: String(req.data) })
        return { status: 'saved' }
      },
    })
    Object.assign(window, {
      __viewerSaves: saves,
      // The real viewer answers after the page's first run, never synchronously.
      claude: Object.freeze({
        use: (name: string) =>
          new Promise((resolve) =>
            setTimeout(() => resolve(name === 'downloads' ? downloads : null), 50),
          ),
      }),
    })
  }, viewer.answer)
}

/** Files the fake viewer accepted. */
export function viewerSaves(page: Page): Promise<ViewerSave[]> {
  return page.evaluate(() => (window as unknown as { __viewerSaves: ViewerSave[] }).__viewerSaves)
}
