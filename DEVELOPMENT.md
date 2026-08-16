# FALSE REALITY — developer handoff

This is the short operational guide. Read this before changing state, saves, content,
or deployment. It is intentionally explicit enough for a human or coding agent to
follow without reconstructing the repository history.

## Commands that must pass

```bash
npm ci
npm run check
```

`npm run check` runs TypeScript, ESLint, tests with enforced coverage, and the
production build. The ready-to-install GitHub workflow template lives at `ops/github-workflows/ci.yml`.

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
React state directly.

## Content and effects

- Story content: `src/content/**/*.json`
- Story schema/graph: `src/game/storylets.ts` and `src/content/load.ts`
- Qualities/effect names: `src/game/qualities.ts`
- Promotions, zones, and component inventory: `src/game/progression.ts`

Prefer data-table additions over component branches. A new component belongs in
`COMPONENT_DEFS`; save defaults and counters derive from that table.

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

## Deployment

`npm run build` writes GitHub Pages output to `docs/`. In repository Settings →
Pages, install the two files from `ops/github-workflows/` under
`.github/workflows/`, then set **Build and deployment / Source** to **GitHub
Actions**. They are templates because this coding connection cannot push active
workflow files without GitHub workflow permission. Until installed, run
`npm run check` locally and rebuild `docs/` in the final pull-request commit.

`npm run verify:pages` is the local stand-in for the CI step that checks the
committed build: it rebuilds and fails loudly if `docs/` has drifted from the
source. Run it right before the final commit of a PR that touches `src/` or
`index.html`.
