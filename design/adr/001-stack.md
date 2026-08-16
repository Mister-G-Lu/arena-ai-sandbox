# ADR-01 — Application stack

**Status:** Accepted
**Date:** 2026-08-15
**Deciders:** project owner + implementer

## Context

FALSE REALITY is a Fallen London-style storylet game that will ship as a static
site on GitHub Pages. The current pre-alpha is a hand-written HTML/CSS/JS
one-pager. We need a stack that can carry:

- a growing storylet content pipeline (hundreds of cards, zone files)
- an action-regen economy with offline accrual
- a hidden quality system and save sync
- magic-link auth and a later server-authoritative action ledger
- a test suite we actually keep green (coverage gates, not vibes)
- a visual language that is a neon holo-HUD, not a CSS toy we are afraid to touch

Three options were on the table.

## Options

### A — Stay vanilla (HTML + CSS + JS)

- **For:** zero build, already shipping, Pages-native, no toolchain to babysit.
- **Against:** no module graph, no types, no component boundary, no test runner
  that understands the UI. Storylet content would become a pile of template
  strings. Coverage is a wish. The glitch engine is already an IIFE with
  globals. This dies at ~30 cards.

### B — Angular

- **For:** batteries included, DI, a real router, mature forms, first-class
  TypeScript.
- **Against:** the CLI, NgModules/standalone ceremony, Zone.js, and a bundle
  that is large for a static storylet site. We do not need a framework that
  wants to be an application platform. GitHub Pages + Angular is friction
  (base href, `ng build` output, no `base: './'` one-liner). Overkill for a
  one-route game with a content pipeline.

### C — React + Vite + TypeScript

- **For:**
  - Vite is the right static-site compiler: `base: './'`, `build.outDir: 'docs'`,
    `import.meta.glob` for the storylet pipeline, instant HMR.
  - TypeScript pays for itself the moment storylets have a schema (the
    transition-flags-on-choice bug is a type error, not a Tuesday).
  - Vitest + Testing Library + v8 coverage is one config file. We can enforce
    80/80/80/80 and mean it.
  - Component boundaries match the HUD: Header, Console, Memos, Personnel.
  - `@supabase/supabase-js` is a first-class citizen; magic-link + RLS later
    does not require a rewrite.
  - The ecosystem is the one we can hire / hand off into.
- **Against:** a build step (acceptable — Pages still serves `docs/`). React
  is not the smallest runtime. We will be disciplined about not dragging in
  a state-library-of-the-week.

## Decision

**React + Vite + TypeScript.** Vanilla is the prototype; Angular is a platform
we do not need; React + Vite is the smallest stack that still has types, a
content pipeline, and a test runner with teeth.

## Consequences

- Source lives in `src/`. GitHub Pages continues to serve `docs/` (Vite
  build output). `.nojekyll` stays in `public/` so it is copied into the
  build.
- Coverage thresholds are 80 lines / 80 functions / 80 branches / 80
  statements, enforced in CI-equivalent local `vitest --coverage`.
- Vitest runs **without globals**; `cleanup()` lives in the test setup file.
- No Redux, no router-for-its-own-sake, no CSS-in-JS. CSS is still CSS.
- The playable runtime has one state owner, `GameStateContext`, and one
  versioned persisted schema, `src/lib/gameSave.ts`. Local storage,
  import/export, and Supabase transport all consume that complete schema;
  feature-specific hooks must not invent partial save files.
- `src/lib/config.ts` is the only runtime configuration reader. Supabase uses
  `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY`; deployed defaults
  live in `.env.production` and must never contain a secret/service-role key.
- JSON narrative is plain text and renders through React interpolation. Rich
  local terminal copy is JSX/structured data, never executable HTML strings.
- GitHub Pages is built from source by `.github/workflows/pages.yml`; `docs/`
  remains the checked build artifact for simple branch-based fallback hosting.
