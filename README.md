# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, `docs/` on `main`)*
- **Site source:** [`docs/`](docs/) — static HTML/CSS/JS today; Vite build output after the React rewrite
- **Design docs:** [`design/`](design/) — core design bible + arcs (⚠ full spoilers)
- **ADRs:** [`design/adr/`](design/adr/) — accepted: [ADR-01 stack](design/adr/001-stack.md) (React + Vite + TS)

## Local dev

The site is static. From the repo root:

```bash
python3 -m http.server 8080 -d docs
```

Then open http://localhost:8080.

After the React rewrite (see ADR-01) the loop becomes:

```bash
npm install
npm run dev          # Vite, HMR
npm test             # Vitest, no globals
npm run test:coverage
npm run build        # writes docs/ for Pages
```

## Hosting — GitHub Pages

Pages is already pointed at `main` / `/docs`. After a merge to `main`:

1. **Settings → Pages** on the repo
2. Source: **Deploy from a branch**
3. Branch: `main` · folder: `/docs`
4. Save. The site is at https://mister-g-lu.github.io/arena-ai-sandbox/

`docs/.nojekyll` (later copied from `public/.nojekyll`) stops Jekyll from eating Vite's underscored chunks.

No custom domain. No Actions workflow — the committed `docs/` tree *is* the deploy artifact.

## Working method

Small PRs into `main`, in commit order. Design first when the design is the change; site PRs stay reviewable.
