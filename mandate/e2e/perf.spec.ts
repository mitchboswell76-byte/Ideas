/**
 * Frame-rate budgets (DESIGN §17 Performance) under a 4× CPU throttle, a rough stand-in for the
 * Dell Latitude target on a fast machine. Frames are counted with requestAnimationFrame, so this
 * measures main-thread headroom (React, sim, input), not GPU raster.
 *
 * Screens are 2D DOM and must hold the Medium target. Portraits (T9) are 3D renders cached as
 * images, so a screen full of them is still 2D once they have arrived; their one-off render cost
 * is measured separately. Live 3D views: the creator's turntable (T10) is measured on the preset
 * the GPU detection picks here (Low: software WebGL); T18's seat columns go here too. Software
 * WebGL rasterises on the throttled CPU, so 3D numbers are pessimistic for a real GPU.
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
/**
 * A 3D view that rebuilds its model as you drag (the creator's sliders; rebuilds are paced, see
 * `turntable.ts`): DESIGN §17's Low floor of 30 fps, and a slow frame no longer than four 60 Hz
 * frames (frame times come in whole frames, so 66.7 ms must pass).
 */
const REBUILD: Budget = { fps: 30, p95Ms: 70 }

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

/** True when the browser can draw 3D portraits. */
function hasWebgl(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))
}

/**
 * Wait until every face on screen is its cached 3D render (not the 2D stand-in), so frame
 * sampling measures the steady state; the one-off render cost has its own test below.
 */
async function portraitsSettled(page: Page): Promise<void> {
  if (!(await hasWebgl(page))) return
  const faces = page.locator('main .portrait, main .relation__face')
  await expect(faces.first()).toBeVisible()
  await expect(page.locator('main .portrait img, main .relation__face img')).toHaveCount(
    await faces.count(),
    { timeout: 30_000 },
  )
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
  await portraitsSettled(page)
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
  await portraitsSettled(page)
  await throttle(page)
  await runAt(page, '5')
  expectWithin(await framesDuring(page, async () => {}), MEDIUM, 'artifact home speed 5')
  await expectTimePassed(page)
})

test('Profile at speed 5 with cached 3D portraits', async ({ page }) => {
  await page.goto('/')
  await newCareer(page)
  await go(page, 'Profile')
  test.skip(!(await hasWebgl(page)), 'No WebGL 2 in this browser')
  await portraitsSettled(page)
  await page.waitForTimeout(500)
  await throttle(page)
  await runAt(page, '5')
  expectWithin(await framesDuring(page, async () => {}), MEDIUM, 'profile speed 5')
  await expectTimePassed(page)
})

test('portrait renders: first face quickly, a full Profile page in time', async ({ page }) => {
  await page.goto('/')
  await newCareer(page)
  test.skip(!(await hasWebgl(page)), 'No WebGL 2 in this browser')
  await throttle(page)
  const started = Date.now()
  await go(page, 'Profile')
  const profile = page.getByTestId('profile')
  await expect(profile.locator('.portrait img')).toHaveCount(1, { timeout: 30_000 })
  const first = Date.now() - started
  const people = await profile.locator('.relation').count()
  await expect(profile.locator('.relation img')).toHaveCount(people, { timeout: 30_000 })
  const all = Date.now() - started
  const description = `portraits (4x throttle, software WebGL): first ${first} ms, all ${people + 1} in ${all} ms`
  test.info().annotations.push({ type: 'perf', description })
  console.log(description)
  // Generous (CPU-rendered WebGL under a 4x throttle) but catches a render that blocks for seconds.
  expect(first).toBeLessThan(8000)
  expect(all).toBeLessThan(20_000)
})

/** Drag the creator's turntable round and back, again and again. */
async function turnAvatar(page: Page): Promise<void> {
  const box = await page.locator('.turntable__canvas').boundingBox()
  if (!box) throw new Error('turntable not visible')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const started = Date.now()
  while (Date.now() - started < SAMPLE_MS) {
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 0; i < 30; i++) await page.mouse.move(x + Math.sin(i / 5) * 200, y)
    await page.mouse.up()
  }
}

/** Drag the Height slider back and forth: every step rebuilds the avatar. */
async function dragSlider(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Body', exact: true }).click()
  const box = await page.getByRole('slider', { name: 'Height' }).boundingBox()
  if (!box) throw new Error('slider not visible')
  const y = box.y + box.height / 2
  const started = Date.now()
  while (Date.now() - started < SAMPLE_MS) {
    await page.mouse.move(box.x + 4, y)
    await page.mouse.down()
    for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + (box.width * i) / 20, y)
    await page.mouse.up()
  }
}

test('creator turntable: turning and slider rebuilds (3D)', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('title-new').click()
  test.skip(!(await hasWebgl(page)), 'No WebGL 2 in this browser')
  await expect(page.locator('.turntable__canvas')).toBeVisible()
  await page.waitForTimeout(1500)
  await throttle(page)
  expectWithin(await framesDuring(page, () => turnAvatar(page)), MEDIUM, 'turntable turn')
  await page.getByTestId('creator-tab-look').click()
  await page.waitForTimeout(1500)
  expectWithin(await framesDuring(page, () => dragSlider(page)), REBUILD, 'turntable rebuild')
})
