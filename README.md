# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition. You are the
night operator at Meridian Central Dispatch. Fifty tasks a shift. The city
forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `docs/` on `main`)*
- **Stack:** React 19 + Vite, TypeScript game rules, vanilla CSS

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
