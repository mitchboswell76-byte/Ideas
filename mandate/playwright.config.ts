import { defineConfig } from '@playwright/test'

/**
 * Browser tests against the production builds (`npm run e2e` builds both first): `dist/` served by
 * `vite preview` (worker mode), and the single-file Artifact build `dist-preview/` routed into the
 * same origin by `e2e/artifact.ts`. Perf runs last, on its own, so nothing else competes for CPU.
 *
 * Uses the Playwright-managed Chromium (`npx playwright install chromium` once on a new machine).
 */
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'smoke', testIgnore: /perf\.spec\.ts/ },
    // No trace: it snapshots the DOM on every action, on the page's main thread, which skews frames.
    {
      name: 'perf',
      testMatch: /perf\.spec\.ts/,
      dependencies: ['smoke'],
      use: { trace: 'off' },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
