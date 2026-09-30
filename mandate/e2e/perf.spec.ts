/**
 * Frame-rate budgets (DESIGN §17 Performance) under a 4× CPU throttle, a rough stand-in for the
 * Dell Latitude target on a fast machine. Frames are counted with requestAnimationFrame, so this
 * measures main-thread headroom (React, sim, input), not GPU raster.
 *
 * Every screen is 2D until one has a 3D view (`HAS_3D_VIEW`): 2D screens must hold the Medium
 * target. When a 3D view lands (T9 portraits, T18 seat columns), add it here once per preset with
 * `LOW` (≥ 30 fps) and `MEDIUM` (60 fps) budgets.
 */
import { gzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { ARTIFACT_URL, routeArtifact } from './artifact.ts'
import { expect, gameDate, go, newCareer, test } from './fixtures.ts'

const CPU_THROTTLE = 4
const SAMPLE_MS = 3000
/** Initial JS budget (DESIGN §17): everything fetched until the main menu has settled. */
const INITIAL_JS_GZIP = 1.5 * 1024 * 1024

interface Budget {
  /** Lowest average frame rate. */
  fps: number
  /** Slowest 5% of frames may take no longer than this (ms). */
  p95Ms: number
}

/** 60 fps target: the odd dropped frame allowed, never below the Low floor for long. */
const MEDIUM: Budget = { fps: 55, p95Ms: 1000 / 30 }

interface FrameStats {
  fps: number
  p95Ms: number
  frames: number
}

async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
}

/** Frame timings while `action` runs (at least {@link SAMPLE_MS}). */
async function framesDuring(page: Page, action: () => Promise<void>): Promise<FrameStats> {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean }
    w.__frames = []
    w.__recording = true
    const tick = (t: number): void => {
      w.__frames.push(t)
      if (w.__recording) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  const started = Date.now()
  await action()
  const left = SAMPLE_MS - (Date.now() - started)
  if (left > 0) await page.waitForTimeout(left)
  const times = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __recording: boolean }
    w.__recording = false
    return w.__frames
  })
  const gaps = times.slice(1).map((t, i) => t - times[i])
  const sorted = [...gaps].sort((a, b) => a - b)
  const span = times[times.length - 1] - times[0]
  return {
    fps: (gaps.length / span) * 1000,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    frames: gaps.length,
  }
}

function expectWithin(stats: FrameStats, budget: Budget, label: string): void {
  const description = `${label}: ${stats.fps.toFixed(1)} fps, p95 ${stats.p95Ms.toFixed(1)} ms`
  test.info().annotations.push({ type: 'perf', description })
  console.log(description)
  expect(stats.fps, `${label} fps`).toBeGreaterThanOrEqual(budget.fps)
  expect(stats.p95Ms, `${label} p95 frame time`).toBeLessThanOrEqual(budget.p95Ms)
}

/** Drag the map in circles, zooming in with the wheel between drags, for {@link SAMPLE_MS}. */
async function panMap(page: Page): Promise<void> {
  const box = await page.getByRole('application').boundingBox()
  if (!box) throw new Error('map not visible')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const started = Date.now()
  for (let drag = 0; Date.now() - started < SAMPLE_MS; drag++) {
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(x + Math.cos(i / 6) * 120, y + Math.sin(i / 6) * 80)
    }
    await page.mouse.up()
    if (drag < 3) await page.mouse.wheel(0, -240)
  }
}

/** Open a map screen and let its first render finish before the throttle goes on. */
async function openMap(page: Page, screen: 'Map' | 'World'): Promise<void> {
  await go(page, screen)
  await expect(page.getByRole('application')).toBeVisible()
  await page.waitForTimeout(500)
}

/** Start the clock at a speed key ('1'–'5'). */
async function runAt(page: Page, speed: string): Promise<void> {
  await page.keyboard.press('Space')
  await page.keyboard.press(speed)
}

/** The sim really ran during the sample (new careers start on 1 Oct 2026). */
async function expectTimePassed(page: Page): Promise<void> {
  expect(await gameDate(page)).not.toBe('2026-10-01')
}

test.describe.configure({ mode: 'serial' })

test('initial JS under 1.5 MB gzip', async ({ page }) => {
  const scripts: Promise<number>[] = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script' || r.url().endsWith('.js')) {
      scripts.push(r.body().then((b) => gzipSync(b).length))
    }
  })
  await page.goto('/')
  await expect(page.getByTestId('menu-backdrop')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const total = (await Promise.all(scripts)).reduce((a, b) => a + b, 0)
  test
    .info()
    .annotations.push({ type: 'perf', description: `${(total / 1024).toFixed(0)} KB gzip` })
  expect(total).toBeLessThan(INITIAL_JS_GZIP)
})

test('main menu backdrop drift (2D)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('menu-backdrop')).toBeVisible()
  await throttle(page)
  expectWithin(await framesDuring(page, async () => {}), MEDIUM, 'menu')
})

test('Home at speed 5, sim in a worker (2D)', async ({ page }) => {
  await page.goto('/')
  await newCareer(page)
  await throttle(page)
  await runAt(page, '5')
  expectWithin(await framesDuring(page, async () => {}), MEDIUM, 'home speed 5')
  await expectTimePassed(page)
})

test('UK map pan and zoom (2D)', async ({ page }) => {
  await page.goto('/')
  await newCareer(page)
  await openMap(page, 'Map')
  await throttle(page)
  expectWithin(await framesDuring(page, () => panMap(page)), MEDIUM, 'uk map')
})

test('world map pan and zoom (2D)', async ({ page }) => {
  await page.goto('/')
  await newCareer(page)
  await openMap(page, 'World')
  await throttle(page)
  expectWithin(await framesDuring(page, () => panMap(page)), MEDIUM, 'world map')
})

test('Artifact build: UK map pan with the sim on the main thread at speed 3 (2D)', async ({
  page,
}) => {
  await routeArtifact(page)
  await page.goto(ARTIFACT_URL)
  await newCareer(page)
  await openMap(page, 'Map')
  await throttle(page)
  await runAt(page, '3')
  expectWithin(await framesDuring(page, () => panMap(page)), MEDIUM, 'artifact uk map')
  await expectTimePassed(page)
})

test('Artifact build: Home at speed 5 with the sim on the main thread (2D)', async ({ page }) => {
  await routeArtifact(page)
  await page.goto(ARTIFACT_URL)
  await newCareer(page)
  await throttle(page)
  await runAt(page, '5')
  expectWithin(await framesDuring(page, async () => {}), MEDIUM, 'artifact home speed 5')
  await expectTimePassed(page)
})
