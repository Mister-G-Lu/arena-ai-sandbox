# ADR-02 — Testing strategy: Vitest for unit, Playwright for E2E

**Status:** Accepted
**Date:** 2026-08-17
**Deciders:** project owner + implementer

## Context

FALSE REALITY ships with a strong unit-test culture: Vitest + Testing Library
in jsdom with 80/80/80/80 coverage thresholds, plus content-graph validation
for every storylet JSON file. What the repository did **not** have was any
browser-level test — no check that the React shell actually boots in a real
browser, that navigation between boards works, that save/export survives a
reload, or that the dev panel (Maintenance Terminal) renders when the dev-mode
gate passes.

Unit tests cannot catch those failures. jsdom is a simulated DOM: it has no
layout, no real event dispatch across frames, no download pipeline, no
viewport. The risks that matter to this project are exactly the ones jsdom
cannot see:

- the lazy-loaded route chunks (`Notices`, `Shop`, `ProfilePage`) failing to
  resolve at runtime;
- hash-based navigation (`useRouter`) breaking the nav contract;
- the export/import lifecycle (`SaveManagement`) failing in a real browser;
- the Tier-2/Tier-3 dev-mode gate (`devMode.ts`) mis-firing on real origins;
- mobile/tablet overflow that only exists in a real layout engine.

## Options considered

### A — Cypress

Cypress is a mature E2E runner with excellent time-travel debugging.

- **For:** familiar DSL, interactive debugging, large ecosystem.
- **Against:** Chromium-family browsers only (no WebKit/Firefox without a
  paid cloud), a separate runtime with its own assertion library and config,
  heavier CI footprint, awkward multi-tab and cross-origin handling.

### B — Playwright

Playwright is a browser-automation framework from the Microsoft team that
drives Chromium, Firefox, and WebKit through one API.

- **For:**
  - TypeScript-native — the same language and type-checking pipeline as the
    rest of this repository.
  - Cross-browser by default (we run Chromium in CI, can add Firefox/WebKit
    locally by uncommenting two projects in `playwright.config.ts`).
  - Built-in web server management (`webServer`), auto-waiting locators,
    traces and screenshots on failure, and a `--ui` debug mode.
  - Zero new runtime concepts: tests are plain `test()`/`expect()` functions
    with the same mental model as Vitest.
  - The current ecosystem consensus for new projects (see DEVELOPMENT.md
    testing strategy section).
- **Against:** one more dev dependency; browsers must be installed
  (`npx playwright install --with-deps chromium` in CI).

### C — Vitest browser mode

Run Vitest tests in a real browser instead of jsdom.

- **For:** same runner as the unit tests; no second test framework.
- **Against:** still maturing; the app's existing suite is jsdom-based and
  migrating wholesale would be disruptive; no download/upload pipeline
  automation; weaker debugging story than Playwright's trace viewer.

## Decision

**Vitest + Testing Library for unit/component/integration tests (unchanged),
Playwright for E2E tests in a real browser.**

Two runners with one job each beats one runner doing two jobs poorly:

| Layer | Runner | Environment |
|---|---|---|
| Unit / component / integration | Vitest + Testing Library | jsdom (fast, in-process) |
| E2E / critical user flows | Playwright | Real Chromium |

## Consequences

- `src/e2e/*.spec.ts` holds the E2E suite; `playwright.config.ts` manages the
  web server (`npm run dev` on port 3000) and defaults to Chromium with one
  retry in CI.
- `npm run test:e2e` runs the suite locally; CI (`.github/workflows/ci.yml`)
  runs it after `npm run check` and uploads `playwright-report/` and
  `test-results/` artifacts on failure.
- Browser binaries are installed in CI via
  `npx playwright install --with-deps chromium`; locally via
  `npx playwright install`.
- E2E tests must stay a **critical-path suite**, not a second copy of unit
  tests: boot, navigation, save lifecycle, dev-mode gating, error resilience,
  responsive overflow. Anything that can be covered cheaply in jsdom belongs
  in a Vitest test instead.
- The coverage gate (`sonar-project.properties`) excludes `src/e2e/**` so the
  E2E suite does not pollute the unit-coverage numbers.
- AGENTS.md documents the boundary so future AI contributions put tests in
  the right layer.
