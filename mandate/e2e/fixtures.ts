/**
 * Shared Playwright fixtures: every test fails on a console error or uncaught page error, and
 * helpers drive the game the way a player does (menu → new career → sidebar).
 */
import { expect, test as base, type Page } from '@playwright/test'

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(e.message))
      await use(errors)
      expect(errors, 'console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export type Screen = 'Home' | 'Inbox' | 'Calendar' | 'Map' | 'World' | 'Saves' | 'Settings'

/** Start a new career from the main menu and wait for the shell. */
export async function newCareer(page: Page): Promise<void> {
  await page.getByTestId('title-new').click()
  await expect(page.getByTestId('game-date')).toBeVisible()
}

/** ISO date of the day on screen. */
export async function gameDate(page: Page): Promise<string> {
  return (await page.getByTestId('game-date').getAttribute('data-iso')) ?? ''
}

export async function go(page: Page, screen: Screen): Promise<void> {
  // The inbox button's name includes its unread count ("Inbox 1 unread").
  const name = screen === 'Inbox' ? /^Inbox/ : screen
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('button', { name, exact: screen !== 'Inbox' }).click()
  await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toHaveText(screen)
}

/** True when the page scrolls sideways (the layout must fit phone widths). */
export function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}
