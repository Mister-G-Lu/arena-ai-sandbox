# FALSE REALITY — developer handoff

This is the short operational guide. Read this before changing state, saves, content,
or deployment. It is intentionally explicit enough for a human or coding agent to
follow without reconstructing the repository history. All paths below are relative
to the repository root.

## Commands that must pass

```bash
npm ci
npm run check
npm run test:e2e        # if you made UI or integration-level changes
```

`npm run check` runs TypeScript, ESLint, the 500-line source budget, tests with
enforced coverage, and the production build. The build route-splits the larger
terminal pages and enforces a 250 KiB maximum for every minified JavaScript chunk
with `scripts/check-bundle-size.mjs`. ESLint's flat config covers JS/JSX and
TS/TSX with React, TypeScript, and focused SonarJS maintainability rules;
`scripts/check-file-length.mjs` extends the same 500-line budget to CSS and SQL.
The GitHub workflow at `.github/workflows/ci.yml` runs all gates on every PR
including Playwright E2E tests. For hosted duplication and maintainability trends,
configure `SONAR_HOST_URL` and `SONAR_TOKEN`; the same workflow then runs the
`sonar-project.properties` quality gate.

## Canonical runtime and save

There is one playable runtime:

- UI entry: `src/main.jsx` → `src/App.jsx`
- Runtime state: `src/context/GameStateContext.jsx`
- Persisted schema and migrations: `src/lib/gameSave.ts`
- Browser storage adapter: `src/lib/localGameSave.ts`
- Cloud transport: `src/lib/sync.ts`
- Cloud coordination: `src/hooks/useCloudSave.ts`

The canonical local key is `fr:game-save:v2`. The old
`fr:player-progress:v1` key is read only for migration and removed only after a
validated v2 write succeeds. Invalid bytes are copied to
`fr:game-save:recovery` before a clean file is used.

### Adding a saved field

1. Add the field with a safe default to `StoredGameStateSchema` in
   `src/lib/gameSave.ts`.
2. If the field is derived from game data, derive its schema/default from that
   data table instead of duplicating IDs. Components, qualities, zones, and
   promotions already follow this pattern.
3. Add round-trip, invalid-input, and migration tests in
   `src/lib/gameSave.test.ts`.
4. Bump `GAME_SAVE_VERSION` only for a breaking shape change. Add an explicit
   migration before doing so.
5. Run `npm run check`.

Do not create another localStorage key or another partial save envelope for a
feature. Extend the canonical schema.

## Supabase: one configuration path

All browser configuration goes through `src/lib/config.ts`. Only these variables
are supported:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

For local development, copy `.env.example` to `.env.local`. The deployed project
uses the browser-safe values in the tracked `.env.production`; update that file
when moving to another Supabase project. Vite environment variables provided by
the build environment can override the file. If either value is absent, cloud
saves are disabled cleanly; local saves and export/import still work.

The publishable key is designed for browser use. Never put a Supabase secret key
or `service_role` key in a `VITE_*` variable. Those values are embedded in public
JavaScript.

Database setup:

1. Apply `supabase/0001_init.sql` to the project.
2. Apply `supabase/0003_canonical_saves.sql` for authenticated-only policies,
   payload limits, and server-owned update timestamps.
3. Confirm Row Level Security is enabled on `profiles` and `saves`.
4. Add the app URL and local development URL to Supabase Auth redirect URLs.
5. `supabase/0002_actions.sql` is staged future work; it is not required by the
   canonical save system.

Cloud sync is conservative:

- no remote file → upload the validated local file;
- no local progress → restore the validated remote file;
- equal files → enable debounced autosave;
- two different valid files → stop and ask the player which copy wins;
- malformed/obsolete remote file → stop and allow an explicit local overwrite.

Every payload is validated again at the Supabase boundary. Do not upload raw
React state directly. `MAX_SAVE_BYTES` in `gameSave.ts` is the shared 1 MiB
limit for imports, local/export serialization, cloud transport, and the
`saves_payload_max_bytes` database constraint; change all of them together.

## Content and effects

- Story content: `src/content/**/*.json`
- Story schema/graph: `src/game/storylets.ts` and `src/content/load.ts`
- Qualities/effect names: `src/game/qualities.ts`
- Promotions, zones, component inventory, and board assignment: `src/game/progression.ts`
- Supplies (the shop's goods) and the purchase rules: `src/game/shop.ts`

Every zone declares `board: 'notices' | 'investigations'`. `Notices.jsx` is the shared
runner for both routes: Notices holds optional ambient observations; Investigations
holds active cases and expeditions. Keep that distinction in data rather than making
a second storylet engine.

Prefer data-table additions over component branches. A new component belongs in
`COMPONENT_DEFS`; a new shop good belongs in `SUPPLY_DEFS`; save defaults and
counters derive from those tables. A supply is a requirement metric like any other:
a zone declares `requires: { coffee: 1 }` and the one checker in `progression.ts`
reads it off the operator file, rendering the product name as the label.

Zones also use three hint fields, all data:

- `visibleRequires` — when the zone is *listed* at all (as locked teaser or open).
- `requiresUnlock` — promotion unlock flag required to *open* it.
- `hintUnlock` — when set, the zone is listed even before that clearance is held,
  so the lock itself advertises what promotion buys. `lockedNote` supplies the
  fiction on the sealed card.
- `requires` — quality/metric thresholds to open (supplies included).

`Notices.jsx` renders sealed cards with their clearance, fiction note, and an
`ORDER FROM SUPPLY` link when a good is the blocker. `HorizonPanel.jsx` renders
under both boards: the next promotion with its live gap, what it adds, and every
locked zone on file. Both are lenses on the same gates the checker enforces —
hints cannot drift from rules.

The shop is the `SUPPLY` page (`#shop`), gated behind orientation like the
console. Purchases flow through `actions.purchaseSupply`: one ledger
`withdraw()`, one `supplies[id] = true`, one logbook entry. The classified
`machine-favor` item is a permanent teaser — it is never purchaseable.

`loadAllStorylets()` validates the whole graph after validating each card. It
rejects duplicate card/choice IDs, missing or cross-zone `next` targets,
ambiguous terminal flags, bad zone entries, and unknown effect names. Keep new
rules in `validateStoryGraph` so every caller gets the same guarantees.

Shift pacing constants and the anomaly guarantee live in `src/game/dispatch.ts`.
Random anomalies remain possible, but when a shift has seen none, task 50 is
forced to be anomalous. Persist any future pity/guarantee counters in the
canonical game schema so reloads cannot reroll progression gates.

## Content safety

Treat every string from JSON, saves, Supabase, URLs, and future localization as
untrusted. Render it through normal React interpolation:

```jsx
<p>{story.body}</p>
```

Do not use `dangerouslySetInnerHTML`, `innerHTML`, HTML-bearing JSON, `eval`, or
string-built event handlers. Rich local copy should be JSX or a small structured
token format whose allowed tags are rendered by React. If remote rich text is ever
required, add an audited allowlist sanitizer at the ingestion boundary and tests
for scripts, event attributes, `javascript:` URLs, SVG, and malformed markup.

## Testing strategy

The repository uses a layered approach — different tools for different levels
of confidence. The rule is: write the least expensive test that covers the risk.

| Layer | Tool | Environment | What it covers | When to use |
|---|---|---|---|---|
| **Unit** | Vitest | jsdom (simulated browser) | Game logic, save schema, content validation, pure functions | Every new or changed function. Fast (~1 s). |
| **Component** | Vitest + Testing Library | jsdom | React component rendering, user interactions, state changes | Every new or changed component. Covers states and edge cases. |
| **Integration** | Vitest + Testing Library | jsdom | Multi-component flows, context wiring, hooks | Flows that cross component boundaries. Mocked Supabase. |
| **E2E** | Playwright | Real Chromium browser | Boot sequence, navigation, save/load lifecycle, responsive layout, full user journeys | Every new route or significant UI change. Tests run against the Vite dev server. |

### Running tests

```bash
npm run test              # Vitest unit + component + integration
npm run test:coverage     # same + 80% coverage enforcement
npm run test:e2e          # Playwright (requires `npx playwright install` first)
npm run test:e2e:ui       # Playwright UI debug mode
```

Playwright tests live in `src/e2e/` and follow the naming convention
`*.spec.ts`. See [`playwright.config.ts`](../playwright.config.ts) for browser
selection and the web server config.

### E2E test guidelines

- Keep E2E tests focused on **critical user paths** that unit tests can't cover:
  full render cycles, navigation between boards, save/load, and error resilience.
- Each test runs against an in-memory `localStorage` state, so tests are
  hermetic and don't interfere.
- The Playwright config starts a Vite dev server automatically; tests connect
  to it at `http://localhost:3000`.
- Screenshots and traces are captured on failure for CI debugging.
- Add a test for every new board, route, or significant interaction pattern.

### CI integration

The CI workflow at `.github/workflows/ci.yml` runs all three layers in sequence:

1. `npm run check` (typecheck → lint → coverage → build)
2. `npx playwright test` (E2E)
3. SonarQube (if configured)

Pull requests that fail any layer are blocked from merge.

## Deployment

`npm run build` writes GitHub Pages output to `docs/`. Pages currently uses the
legacy branch source and publishes `docs/` from `main`; that makes the live site
available but does not validate pull requests. A repository owner with workflow
permission should install the two files from `ops/github-workflows/` under
`.github/workflows/`, then set **Build and deployment / Source** to **GitHub
Actions**. Until those templates are active, run `npm run check` locally and
rebuild `docs/` in the final pull-request commit.

`npm run verify:pages` is the local stand-in for the CI step that checks the
committed build: it rebuilds (including the JavaScript chunk budget) and fails
loudly if `docs/` has drifted from the source. Run it right before the final
commit of a PR that touches `src/` or `index.html`.
