/**
 * The single-file build as published to claude.ai: the sim on the main thread, and Export through
 * the viewer's `downloads` capability as `.json` (the viewer refuses `.mandate`).
 */
import { SAVE_VERSION } from '../src/sim/version.ts'
import { ARTIFACT_URL, routeArtifact, viewerSaves } from './artifact.ts'
import { expect, go, newCareer, test } from './fixtures.ts'

test('in the viewer: exports .json through downloads and imports it back', async ({ page }) => {
  await routeArtifact(page, { answer: 'saved' })
  await page.goto(ARTIFACT_URL)
  await newCareer(page)
  await expect(page.getByTestId('sim-mode')).toHaveText('Main thread')
  await page.getByRole('button', { name: '+1 week' }).click()
  await go(page, 'Saves')

  await page.getByRole('button', { name: 'Export .json' }).click()
  await expect.poll(async () => (await viewerSaves(page)).length).toBe(1)
  const [saved] = await viewerSaves(page)
  expect(saved.filename).toBe('mandate-2026-10-08.json')
  expect(JSON.parse(saved.data)).toMatchObject({ version: SAVE_VERSION, world: { clock: {} } })

  await page.getByRole('button', { name: '+1 week' }).click()
  await page.getByTestId('import-input').setInputFiles({
    name: saved.filename,
    mimeType: 'application/json',
    buffer: Buffer.from(saved.data),
  })
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-08')
})

test('in the viewer: a declined save is silent, a refused one explains', async ({ page }) => {
  await routeArtifact(page, { answer: 'declined' })
  await page.goto(ARTIFACT_URL)
  await newCareer(page)
  await go(page, 'Saves')
  await page.getByRole('button', { name: 'Export .json' }).click()
  await page.waitForTimeout(300)
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.unrouteAll()
  await routeArtifact(page, { answer: 'rejected_extension' })
  await page.reload()
  await newCareer(page)
  await go(page, 'Saves')
  await page.getByRole('button', { name: 'Export .json' }).click()
  await expect(page.getByRole('alert')).toContainText('Export is not available in this view')
})

test('single file without a viewer keeps .mandate downloads', async ({ page }) => {
  await routeArtifact(page)
  await page.goto(ARTIFACT_URL)
  await newCareer(page)
  await go(page, 'Saves')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export .mandate' }).click()
  expect((await download).suggestedFilename()).toBe('mandate-2026-10-01.mandate')
})
