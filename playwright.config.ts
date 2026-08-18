import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FALSE REALITY E2E/integration tests.
 *
 * Strategy (design/DEVELOPMENT.md → Testing Strategy):
 *   - Vitest + Testing Library for unit/component tests
 *   - Playwright for browser-level integration and E2E flows
 *
 * Run locally:      npx playwright test
 * Run with UI:      npx playwright test --ui
 * Run one test:     npx playwright test --grep "save flow"
 * Debug:            npx playwright test --debug
 * View report:      npx playwright show-report
 */
export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    // On GitHub Actions, append failing test names to the job summary so
    // E2E regressions are visible without digging through the raw log.
    ...(process.env.GITHUB_ACTIONS
      ? [new URL('./scripts/ci-e2e-summary-reporter.mjs', import.meta.url).pathname]
      : []),
  ],
  use: {
    /* The app is served locally; Playwright talks to the Vite dev server. */
    baseURL: 'http://localhost:3000',
    /* Collect trace on first retry for CI debugging. */
    trace: 'on-first-retry',
    /* Capture screenshot on failure. */
    screenshot: 'only-on-failure',
  },

  /* Run the Vite dev server before tests. */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* CI runs chromium only; uncomment for local cross-browser testing:
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],
});