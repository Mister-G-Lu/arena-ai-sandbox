# AGENTS.md — AI coding agent guidelines for FALSE REALITY

This file is a structured handoff for AI coding agents (Claude Code, Copilot,
Cursor, etc.) working in this repository. Read it **first** before making any
changes. It complements the human-oriented [README.md](README.md) and
[design/DEVELOPMENT.md](design/DEVELOPMENT.md).

---

## Role

You are an AI coding agent contributing to **FALSE REALITY**, a React 19 + Vite +
TypeScript storylet game in the Fallen London tradition. Your job is to make
correct, reviewable, test-covered changes that respect the existing architecture.

Priorities (highest first):
1. **Correctness** — types pass, tests pass, build passes, the game still works
2. **Testing** — every change includes or updates tests (Vitest for unit,
   Playwright for integration/E2E)
3. **Architecture fit** — prefer data-table changes over component branches,
   prefer data over code
4. **Performance** — 250 KiB JS chunk budget, 500-line file limit, route-split
   large pages
5. **Reviewability** — small focused commits, clear messages, no dead code

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | React 19 | JSX (`.jsx`/`.tsx`), hooks, context |
| Build | Vite 8 | `base: './'`, output to `docs/` |
| Language | TypeScript 6 | Strict mode, `noUnusedLocals` |
| State | React Context | `GameStateContext.jsx` owns all runtime state |
| Persistence | `src/lib/gameSave.ts` | One canonical schema, one `localStorage` key |
| Content | JSON storylets | `src/content/**/*.json`, validated on load |
| DB | Supabase (optional) | Magic-link auth, cloud save sync |
| Unit tests | Vitest + Testing Library + jsdom | 80% coverage thresholds |
| E2E tests | Playwright | `src/e2e/`, real Chromium browser |
| Lint | ESLint 9 flat config | SonarJS, 500 max lines, `no-explicit-any` |
| CI | GitHub Actions | `.github/workflows/ci.yml`, `.github/workflows/pages.yml` |

---

## Key commands

```bash
npm ci                   # Clean install (always use this, never npm install)
npm run dev              # Local dev server at http://localhost:3000
npm run quality          # TypeScript + ESLint + 500-line budget + coverage
npm run check            # quality gates + production build
npm run typecheck        # tsc --noEmit (strict mode)
npm run lint             # ESLint flat config + file-length check
npm run test             # Vitest unit tests
npm run test:coverage    # Vitest with coverage enforcement
npm run test:e2e         # Playwright E2E/integration tests
npm run test:e2e:ui      # Playwright UI mode (debug interactively)
npm run build            # Production build to docs/
npm run verify:pages     # Rebuild + verify docs/ is up to date
```

---

## Boundaries

### ✅ Always

- Run `npm run check` before committing any changes
- Write or update tests for new functionality
- Use the existing patterns in `src/game/progression.ts` for data-table additions
- Extend the canonical save schema (`src/lib/gameSave.ts`) for new persisted state
- Validate all JSON content through `validateStorylet` / `validateStoryGraph`
- Handle errors explicitly — no silent catches
- Use React interpolation for all rendered text (never `innerHTML` or `dangerouslySetInnerHTML`)
- Keep source files under 500 lines
- Update `AGENTS.md` when you introduce a new convention or change a command

### ⚠️ Ask first / flag for review

- Adding new npm dependencies (especially large ones)
- Database schema changes (Supabase migrations)
- Changes to authentication or authorization logic
- Removing or skipping existing tests
- Changing the save schema shape without a migration
- Modifying CI/CD configuration
- Adding new zones, qualities, or components that require a new engine path

### 🚫 Never

- Put Supabase secret/service-role keys in `VITE_*` env vars or any client code
- Use `dangerouslySetInnerHTML`, `eval`, or string-built event handlers
- Create a second `localStorage` key or partial save envelope
- Bypass the content-safety pipeline (all text through React interpolation)
- Force push to `main`
- Merge a PR that fails CI
- List AI agents as commit authors or co-authors

---

## Architecture principles

### Data over code

When adding a new zone, quality, component, or supply, add it to the relevant
data table (`ZONES`, `COMPONENT_DEFS`, `SUPPLY_DEFS`, `QUALITY_DEFS`) rather
than creating a new React component or branching in JSX.

### One engine

- **One storylet runner** — `Notices.jsx` serves both Notices and Investigations
  boards. The distinction is data (`board: 'notices' | 'investigations'`).
- **One checker** — `progression.ts` evaluates all `requires` maps for zones,
  promotions, and supplies.
- **One save schema** — `src/lib/gameSave.ts` is the canonical shape.
  `localGameSave.ts` reads/writes it; `sync.ts` transports it. No partial saves.

### Content safety

Every string from JSON, saves, Supabase, and future localization is untrusted.
Render through normal React interpolation only. Rich text is JSX or structured
data with an audited allowlist sanitizer.

### Testing strategy

| Layer | Tool | Location | Coverage |
|---|---|---|---|
| Unit (game logic, utils) | Vitest | `src/**/*.test.ts` | 80% lines/fns/branches/stmts |
| Component (React) | Vitest + Testing Library | `src/**/*.test.jsx` | 80% |
| Integration (full flows) | Playwright | `src/e2e/*.spec.ts` | Critical user paths |
| Content validation | Vitest | `src/content/load.test.ts` | All story JSON |

---

## Common patterns

### Adding a new zone
1. Add a `ZoneDef` entry in `src/game/progressionZones.ts`
2. Place content JSON files under `src/content/<zone-id>/`
3. Add the zone id to `ZONE_IDS` in `src/game/storylets.ts`
4. If the zone has requirements the player hasn't met, set `requires` and
   optionally `visibleRequires`/`hintUnlock`/`lockedNote`
5. Add E2E test coverage in `src/e2e/app.spec.ts` for the new flow

### Adding a new quality
1. Add a `QualityDef` entry in `src/game/qualities.ts`
2. The save schema derives from `QUALITY_DEFS` — if it needs a custom default,
   add it in `StoredGameStateSchema`
3. Use the quality key in JSON storylet `effects` objects

### Adding a new supply (shop good)
1. Add a `SupplyDef` entry in `src/game/shop.ts`
2. Add a storylet in `src/content/` that triggers when the supply is owned
3. Set `requires: { <supply-id>: 1 }` on any zone that needs it

---

## Definition of Done

Before declaring a task complete, verify:

- [ ] `npm run check` passes (types, lint, file length, coverage, build)
- [ ] New code has corresponding tests (unit, integration, or both)
- [ ] `npm run test:e2e` passes (Playwright integration tests)
- [ ] No `console.log` or debugging artifacts left in source files
- [ ] No new ESLint warnings or TypeScript errors introduced
- [ ] Commit message follows the project's conventions
- [ ] If new patterns were introduced, `AGENTS.md` is updated