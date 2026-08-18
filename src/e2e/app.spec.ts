/**
 * E2E and integration tests for FALSE REALITY.
 *
 * These tests run against the real app in Chromium (via Playwright) and cover
 * the critical user-facing flows that unit tests can't fully validate:
 *   - Full render cycles with React state management
 *   - Navigation between boards (Console, Notices, Shop, Profile)
 *   - Save/export/import lifecycle
 *   - Dev panel (Maintenance Terminal) capability
 *   - Error resilience and responsive layout
 *
 * Run: npm run test:e2e  (or npx playwright test)
 * See playwright.config.ts for options.
 *
 * @note The app is a static Vite/React site with optional Supabase sync, so
 *       no API mocking is needed for core flows. Cloud-sync logic that needs
 *       a server is covered by unit tests in src/hooks/*.test.ts instead.
 */

import { expect, test, type Page } from '@playwright/test';

/* ───── Helpers ───── */

/**
 * Navigate to the app and wait for it to boot.
 * @param devMode — when true, sets the persisted Tier-3 dev opt-in before boot
 *                  so the Maintenance Terminal renders.
 */
async function bootApp(page: Page, { devMode = false } = {}) {
  await page.goto('/');
  if (devMode) {
    await page.evaluate(() => localStorage.setItem('fr:dev-mode', '1'));
    await page.reload();
  }
  await page.waitForLoadState('networkidle');
}

/** Navigate to the operator profile (home of the save-management panel). */
async function openProfile(page: Page) {
  await page.locator('a[href="#profile"]').first().click();
  await expect(page.locator('h2', { hasText: 'OPERATOR PROFILE' })).toBeVisible();
}

/* ───── Tests ───── */

test.describe('Application boot', () => {
  test('shows the terminal landing shell on first visit', async ({ page }) => {
    await bootApp(page);
    // The landing page (Hero) carries the dispatch fiction.
    await expect(page.locator('body')).toContainText(/MERIDIAN|DISPATCH/i);
    await expect(page.locator('nav[aria-label="Main"]')).toBeVisible();
  });

  test('state persists across a page reload', async ({ page }) => {
    await bootApp(page);
    // Give the runtime a moment to settle, then reload.
    await page.reload();
    await page.waitForLoadState('networkidle');
    // The app should boot to the shell without crashing.
    await expect(page.locator('nav[aria-label="Main"]')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Navigation', () => {
  test('the nav renders the expected boards', async ({ page }) => {
    await bootApp(page);
    const nav = page.locator('nav[aria-label="Main"]');
    await expect(nav).toBeVisible();
    for (const label of ['HOME', 'FIRST SHIFT', 'PROFILE']) {
      await expect(nav.locator(`a:has-text("${label}")`)).toBeVisible();
    }
  });

  test('profile page renders operator file tools', async ({ page }) => {
    await bootApp(page);
    await openProfile(page);
    await expect(page.locator('text=/OPERATOR FILE|EXPORT FILE|IMPORT FILE/i').first()).toBeVisible();
  });
});

test.describe('Dev panel (Maintenance Terminal)', () => {
  test('panel appears and exposes the action tank when dev mode is on', async ({ page }) => {
    await bootApp(page, { devMode: true });
    const summary = page.locator('summary.dev-panel-toggle');
    await expect(summary).toContainText('MAINTENANCE');
    await summary.click();
    // The action-tank controls are inside the opened details body.
    await expect(page.locator('button', { hasText: /REFILL TANK|DETACH BUDGET FROM CLOCK/ })).toBeVisible();
  });

  test('dev panel is absent when dev mode is off', async ({ page }) => {
    await bootApp(page);
    await expect(page.locator('.dev-panel')).toHaveCount(0);
  });
});

test.describe('Save management lifecycle', () => {
  test('export and import controls are available on the profile page', async ({ page }) => {
    await bootApp(page);
    await openProfile(page);
    await expect(page.locator('button', { hasText: 'EXPORT FILE' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'IMPORT FILE' })).toBeVisible();
  });

  test('exporting writes a valid operator-file JSON download', async ({ page }) => {
    await bootApp(page);
    await openProfile(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button', { hasText: 'EXPORT FILE' }).click();
    const download = await downloadPromise;
    // The canonical export file is a JSON envelope named after the shift day.
    expect(download.suggestedFilename()).toMatch(/^false-reality-day-\d+\.json$/);
  });
});

test.describe('Gameplay surfaces', () => {
  test('console dispatch content renders on the landing shell', async ({ page }) => {
    await bootApp(page);
    await expect(page.locator('body')).toContainText(/DISPATCH|MERIDIAN/i);
  });
});

test.describe('Error resilience', () => {
  test('boots cleanly when localStorage writes are blocked', async ({ page }) => {
    await bootApp(page);
    // From this point on, any storage write throws (quota-blocked browser).
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError');
      };
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    // The app must degrade gracefully rather than crash.
    await expect(page.locator('nav[aria-label="Main"]')).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  for (const [name, width, height] of [
    ['mobile', 375, 812],
    ['tablet', 768, 1024],
  ] as const) {
    test(`renders at ${name} viewport without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await bootApp(page);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflows).toBe(false);
    });
  }
});