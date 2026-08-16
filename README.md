# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition. You are the
night operator at Meridian Central Dispatch. Fifty actions a shift. The city
forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `docs/` on `main`)*
- **Stack:** React 19 + Vite, TypeScript game rules, vanilla CSS

## Release status — how far from the full project?

**Verdict (2026-08-16): the opening vertical slice is deployed and ready to
play as a pre-alpha; the full 3–4 month campaign is not deployment-ready.** The
historical review files under `design/` are point-in-time records. This section
is the current queue and supersedes their old “still open” lists.

### Playable now

- Orientation, the shared 50-action budget, routine dispatch, guaranteed anomaly
  choices, promotions, Notices, Investigations, supplies, and a staged 06:00
  shift close.
- Authored beats through the first week, including the Shift 2 Annex lead, the
  Shift 3 handwriting case, and the current early Floor 12 vertical-slice climax.
- The Floor 12 vertical slice plus five Arc II expedition decks (Records
  Basement, Vent Network, Rooftop Array, Off-Map Sectors, and Interim Deep),
  awarding all six Components through the existing one-shot zone pipeline.
  Death still has an action cost and abbreviated Interim aftermath.
- Versioned local saves, recovery/backup, confirmed import, export, safe reset,
  cross-tab protection, optional Supabase sync, and cross-device conflict
  resolution.
- Route-split production assets with a 250 KiB per-JavaScript-chunk budget;
  `npm run check` is the source of truth for types, lint, coverage, tests, and build.

### Full-campaign coverage

| Contract from the design bible | Implemented now | Remaining before full release |
|---|---:|---|
| 85–110 shifts across 3 arcs | Distinct authored beats through Shift 7; ambient rotation after that | Most of Month 1, all of Arcs II–III |
| 6 secret zones / Components | Floor 12 plus five Arc II expedition decks / all six Components | Arc II integration pacing, full Reinstatements/Patch Scars, and rebuild Floor 12 as the true Day-30 climax |
| 2–4 rare deaths with Reinstatements | 1 opt-in death; action dock and short aftermath | Full discrepancy sequence, Patch Scars, later escalating Reinstatements |
| 4 endings + joke resignation | 0 endings | Seam Ripped, Keep Logging, Cleaner, Patched, and finale tooling |
| ~1,100 unique content pieces / ~128k words | 26 schema-validated story JSON files plus dispatch/orientation copy | The large majority of authored campaign content |

That means **roughly 6–8% of the planned shift calendar currently carries
scheduled bespoke beats** (7 of 85–110 shifts), while the reusable
runtime/save/content foundations are substantially further along. A single
overall percentage would hide that split.

### Deployment gates

- [x] Playable opening deployed from committed `docs/` assets.
- [x] Production build, save validation, content-graph validation, and automated
  test/coverage gates pass locally.
- [x] Import/reset require confirmation and re-check Records before cloud writes resume.
- [ ] Author and integration-playtest the Month-1 tracks (Shifts 8–30), Attention
  pressure/cooling, routine-pool refill, and the complete first Reinstatement.
- [ ] Build and playtest Arcs II–III, the remaining zones, Seam Ripper, and endings.
- [ ] Complete the three unchecked human playtest questions in
  [`design/tutorial-first-shift.md`](design/tutorial-first-shift.md#7-testing-checklist),
  plus keyboard, reduced-motion, mobile, and restore/conflict checks on real browsers.
- [ ] Have a repository owner install the CI/Pages workflow templates from
  `ops/github-workflows/`; Pages currently deploys the committed `docs/` tree from
  `main`, but pull requests do not have an active repository CI gate.
- [ ] Verify production Supabase migrations, RLS, auth redirect URLs, and a real
  magic-link save/restore round trip.
- [ ] Before any trust-sensitive release, exclude the Maintenance panel from
  production, isolate `devTouched` cloud files, and activate server-authoritative
  actions if progression becomes competitive or paid.

**Next “ready” milestone:** a complete Arc I (at least 30 shifts), ending in the
full first Reinstatement, with the owner-side CI and deployment checks active.

## Documentation

- [`design/`](design/) — the design bible: [`core-design.md`](design/core-design.md) (pillars), [`arcs.md`](design/arcs.md) (story), [`NARRATION_SETS.md`](design/NARRATION_SETS.md) (all narration text), plus ADRs and reviews (⚠ full spoilers)
- [`design/DEVELOPMENT.md`](design/DEVELOPMENT.md) — the operational handoff: commands, save schema, Supabase config, content safety, deployment

## Architecture

Consequences, requirements, and content are all data:

- Outcomes are `effects` objects (`{ Doubt: 1 }`) filed through one pipeline (`src/game/qualities.ts` → `src/context/GameStateContext.jsx`).
- Promotions and zones declare `requires` maps evaluated by one checker (`src/game/progression.ts`); no per-tier strings in JSX.
- Storylets live in schema-validated JSON under `src/content/` and run through `src/components/Notices.jsx`.
- The municipal supply terminal (`src/components/Shop.jsx`, goods in `src/game/shop.ts`) spends Salary on small useful things, each opening a Notices storylet; a clearance forecast under both boards hints at what promotion buys.
- One versioned operator file (`src/lib/gameSave.ts`) backs local storage, import/export, and Supabase sync.
- Credits are uncapped except by the machine's own 32-bit word — reaching it is the Overflow glitch (`src/game/ledger.ts`).
- Content is text, not HTML: JSON, saves, and Supabase rows render through React interpolation, never `dangerouslySetInnerHTML`.

## Commands

```bash
npm install
npm run dev      # local dev at http://localhost:3000
npm run check    # TypeScript + ESLint + tests (coverage enforced) + production build
npm run build    # writes the GitHub Pages site to docs/
```

## License

Private project — not for distribution without permission.
