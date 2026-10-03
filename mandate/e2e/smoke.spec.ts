/** Smoke test of the production build (worker mode): what a player does in the first minutes. */
import { SAVE_VERSION } from '../src/sim/version.ts'
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
  // Portraits render offscreen; no screen mounts the live 3D layer yet.
  await expect(page.getByTestId('world-canvas')).toHaveCount(0)

  const landmarks: Record<Screen, () => Promise<void>> = {
    Home: () => expect(page.getByRole('heading', { name: 'You', exact: true })).toBeVisible(),
    Inbox: () =>
      expect(page.getByRole('heading', { name: 'Welcome to your career' })).toBeVisible(),
    Calendar: () => expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible(),
    Profile: () => expect(page.getByTestId('profile')).toBeVisible(),
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

test('character creator: choices carry into the game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('title-new').click()
  await expect(page.getByTestId('creator')).toBeVisible()
  expect(await scrollsSideways(page)).toBe(false)
  await page.setViewportSize({ width: 1280, height: 800 })

  await page.getByTestId('creator-given-name').fill('Ada')
  await page.getByRole('textbox', { name: 'Surname' }).fill('Lovelace')
  await page.getByRole('radio', { name: 'Teal' }).click()
  await expect(page.locator('.stage__name')).toHaveText('Ada Lovelace')

  await page.getByTestId('creator-tab-origins').click()
  await page.getByRole('combobox', { name: 'Find a constituency to live in' }).fill('Ynys')
  await page.keyboard.press('Enter')
  await expect(page.locator('.place-line__name').first()).toHaveText('Ynys Môn')
  await expect(page.locator('.origins__home')).toHaveCount(1)

  // Too few traits: the category is flagged and Start career points at the problem.
  await page.getByTestId('creator-tab-abilities').click()
  const held = page.locator('.trait-pick[aria-pressed="true"]')
  while ((await held.count()) > 0) await held.first().click()
  await expect(
    page.getByTestId('creator-tab-abilities').getByLabel('Needs attention'),
  ).toBeVisible()
  await page.getByTestId('creator-start').click()
  await expect(page.getByRole('alert')).toContainText('Choose 3–5 traits')
  await page.getByTestId('creator-tab-abilities').click()
  for (const trait of ['Ambitious', 'Calm', 'Bookish'])
    await page.getByRole('button', { name: trait, exact: true }).click()
  await expect(held).toHaveCount(3)

  await page.getByTestId('creator-tab-beliefs').click()
  await page
    .getByRole('radiogroup', { name: /^Taxes are too high/ })
    .getByRole('radio', { name: 'Strongly agree' })
    .click()

  await page.getByTestId('creator-start').click()
  await expect(page.getByTestId('game-date')).toBeVisible()
  await go(page, 'Profile')
  await expect(page.locator('.profile__name')).toHaveText('Ada Lovelace')
  await expect(page.locator('.profile__traits')).toContainText('Bookish')
  const you = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--you').trim(),
  )
  expect(you).toBe('#4fc6bc')
})

test('profile: the player and their people, 3D portraits and 2D illustrations', async ({
  page,
}) => {
  await newCareer(page)
  const name = (await page.locator('.you__name').textContent()) ?? ''
  expect(name).not.toBe('Nobody yet')
  await go(page, 'Profile')
  const profile = page.getByTestId('profile')
  await expect(profile.getByRole('heading', { name })).toBeVisible()
  await expect(profile.getByText('Attributes')).toBeVisible()
  const people = profile.locator('.relation')
  expect(await people.count()).toBeGreaterThanOrEqual(4)
  const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))
  if (webgl) {
    // Cached renders arrive as images, one per face on screen.
    await expect(profile.locator('.portrait img')).toHaveCount(1, { timeout: 20_000 })
    await expect(profile.locator('.relation img')).toHaveCount(await people.count(), {
      timeout: 20_000,
    })
  }
  // Someone else's profile, then back to your own.
  const first = (await people.first().locator('.list__title').textContent()) ?? ''
  await people.first().click()
  await expect(profile.getByRole('heading', { name: first })).toBeVisible()
  await page.getByRole('button', { name: 'Your profile' }).click()
  await expect(profile.getByRole('heading', { name })).toBeVisible()
  // 2D view: illustrations, no 3D renders.
  await page.getByTestId('view-2d').click()
  await expect(profile.locator('.portrait svg')).toHaveCount(1)
  await expect(profile.locator('img')).toHaveCount(0)
})

test('command menu: Ctrl+K, filter, Enter runs, Esc closes, typing leaves the clock alone', async ({
  page,
}) => {
  await newCareer(page)
  const menu = page.getByRole('dialog', { name: 'Command menu' })
  await page.keyboard.press('Control+k')
  await expect(menu).toBeVisible()
  // Digits and spaces typed into the search must not change the speed or unpause.
  await page.keyboard.type('go 1 map')
  await expect(page.getByRole('button', { name: /^Paused/ })).toBeVisible()
  await expect(menu.getByRole('option')).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Search commands' }).fill('map')
  await expect(menu.getByRole('option').first()).toHaveText(/Map/)
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()
  await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toHaveText('Map')

  await page.getByRole('button', { name: 'Command menu' }).click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
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
  expect(JSON.parse(json)).toMatchObject({ version: SAVE_VERSION, world: { clock: {} } })
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
  // Real boundaries by default; a city zoom moves in; Hexes swaps the layout (and remembers it).
  await expect(page.locator('.ukmap__fills--map path')).toHaveCount(650)
  const wholeMap = page.getByRole('button', { name: 'Whole map' })
  await expect(wholeMap).toBeDisabled()
  await page.getByRole('combobox', { name: 'Zoom to' }).selectOption('London')
  await expect(wholeMap).toBeEnabled()
  const layout = page.getByRole('group', { name: 'Map layout' })
  await layout.getByRole('button', { name: 'Hexes' }).click()
  await expect(page.locator('.ukmap__fills--hex path')).toHaveCount(650)
  await expect(page.getByRole('combobox', { name: 'Zoom to' })).toHaveCount(0)
  await page.reload()
  await newCareer(page)
  await go(page, 'Map')
  await expect(page.locator('.ukmap__fills--hex path')).toHaveCount(650)
  await layout.getByRole('button', { name: 'Map' }).click()
  await expect(page.locator('.ukmap__fills--map path')).toHaveCount(650)
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
