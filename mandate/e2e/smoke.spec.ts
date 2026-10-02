/** Smoke test of the production build (worker mode): what a player does in the first minutes. */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { expect, gameDate, go, newCareer, scrollsSideways, test, type Screen } from './fixtures.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('title-screen')).toBeVisible()
})

test('main menu → new career → every screen', async ({ page }) => {
  await expect(page.getByTestId('menu-backdrop')).toBeVisible()
  await expect(page.getByTestId('title-continue')).toBeDisabled()
  await newCareer(page)
  await expect(page.getByTestId('sim-mode')).toHaveText('Worker')
  // Everything is 2D until a screen has a 3D view (HAS_3D_VIEW).
  await expect(page.getByTestId('world-canvas')).toHaveCount(0)

  const landmarks: Record<Screen, () => Promise<void>> = {
    Home: () => expect(page.getByRole('main').getByText('Nobody yet')).toBeVisible(),
    Inbox: () =>
      expect(page.getByRole('heading', { name: 'Welcome to your career' })).toBeVisible(),
    Calendar: () => expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible(),
    Map: () => expect(page.getByRole('application', { name: /650 constituencies/ })).toBeVisible(),
    World: () => expect(page.getByText('176 countries and territories')).toBeVisible(),
    Saves: () => expect(page.getByTestId('slot-list')).toBeVisible(),
    Settings: () => expect(page.getByRole('group', { name: 'Theme' })).toBeVisible(),
  }
  for (const [screen, landmark] of Object.entries(landmarks)) {
    await go(page, screen as Screen)
    await landmark()
  }
})

test('clock: step, Space, speed keys', async ({ page }) => {
  await newCareer(page)
  expect(await gameDate(page)).toBe('2026-10-01')
  await page.getByRole('button', { name: '+1 day' }).click()
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-02')
  await page.getByRole('button', { name: '+1 week' }).click()
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-09')

  await page.keyboard.press('Space')
  await expect(page.getByTestId('game-date')).not.toHaveAttribute('data-iso', '2026-10-09')
  await page.keyboard.press('5')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: /^Paused/ })).toBeVisible()
  const paused = await gameDate(page)
  await page.waitForTimeout(300)
  expect(await gameDate(page)).toBe(paused)
})

test('save, reload, Continue', async ({ page }) => {
  await newCareer(page)
  await page.getByRole('button', { name: '+1 week' }).click()
  await go(page, 'Saves')
  await page.getByRole('button', { name: 'New save' }).click()
  await expect(page.getByTestId('slot-list').getByText('Save 1')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('title-continue')).toBeEnabled()
  await page.getByTestId('title-continue').click()
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-08')
})

test('export .mandate, import it and its JSON, reject a bad file', async ({ page }, info) => {
  await newCareer(page)
  await page.getByRole('button', { name: '+1 week' }).click()
  await go(page, 'Saves')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export .mandate' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('mandate-2026-10-08.mandate')
  const mandatePath = info.outputPath('save.mandate')
  await file.saveAs(mandatePath)

  const importInput = page.getByTestId('import-input')
  await page.getByRole('button', { name: '+1 week' }).click()
  await importInput.setInputFiles(mandatePath)
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-08')

  // The Artifact build exports this JSON; a normal tab must read it too.
  const json = gunzipSync(readFileSync(mandatePath)).toString('utf8')
  expect(JSON.parse(json)).toMatchObject({ version: 1, world: { clock: {} } })
  const jsonPath = info.outputPath('save.json')
  writeFileSync(jsonPath, json)
  await go(page, 'Saves')
  await page.getByRole('button', { name: '+1 week' }).click()
  await importInput.setInputFiles(jsonPath)
  await expect(page.getByTestId('game-date')).toHaveAttribute('data-iso', '2026-10-08')

  await go(page, 'Saves')
  await importInput.setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not a save'),
  })
  await expect(page.getByRole('alert')).toContainText('Not a valid save file')
  expect(await gameDate(page)).toBe('2026-10-08')
})

test('UK and world maps: modes, search, card, Esc', async ({ page }) => {
  await newCareer(page)
  await go(page, 'Map')
  for (const mode of ['Majority', 'Turnout', 'Demographics', 'Party']) {
    await page.getByRole('tab', { name: mode }).click()
    await expect(page.getByRole('tab', { name: mode })).toHaveAttribute('aria-selected', 'true')
  }
  await expect(page.getByRole('tab', { name: 'Swing' })).toBeDisabled()
  await page.getByRole('searchbox', { name: 'Find a constituency' }).fill('Ynys')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ynys Môn' })).toBeVisible()
  await expect(page.getByTestId('seat-facts')).toContainText('Plaid Cymru')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('seat-facts')).toHaveCount(0)

  await go(page, 'World')
  await page.getByRole('tab', { name: 'Blocs' }).click()
  await page.getByRole('searchbox', { name: 'Find a country' }).fill('Qatar')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Qatar' })).toBeVisible()
  await expect(page.getByTestId('country-facts')).toContainText('Doha')
})

test('light theme persists; phone width has no sideways scroll', async ({ page }) => {
  await newCareer(page)
  await go(page, 'Settings')
  await page.getByRole('radio', { name: /^Light/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.setViewportSize({ width: 390, height: 844 })
  // The menu drops its moving backdrop on narrow screens.
  await expect(page.getByTestId('menu-backdrop')).toHaveCount(0)
  expect(await scrollsSideways(page)).toBe(false)
  await newCareer(page)
  expect(await scrollsSideways(page)).toBe(false)
})
