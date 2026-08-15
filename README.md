# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, `docs/` on `main`)*
- **App source:** [`src/`](src/) — React + Vite + TypeScript
- **Pages artifact:** [`docs/`](docs/) — `npm run build` output
- **Design docs:** [`design/`](design/) — core design bible + arcs (⚠ full spoilers)
- **ADRs:** [`design/adr/`](design/adr/) — accepted: [ADR-01 stack](design/adr/001-stack.md)

## Local dev

```bash
npm install
npm run dev          # Vite, HMR — http://localhost:5173
npm test             # Vitest, no globals
npm run test:coverage
npm run build        # writes docs/ for Pages
```

To preview the Pages artifact:

```bash
python3 -m http.server 8080 -d docs
```

## Hosting — GitHub Pages

Pages is already pointed at `main` / `/docs`. After a merge to `main`:

1. **Settings → Pages** on the repo
2. Source: **Deploy from a branch**
3. Branch: `main` · folder: `/docs`
4. Save. The site is at https://mister-g-lu.github.io/arena-ai-sandbox/

`docs/.nojekyll` (later copied from `public/.nojekyll`) stops Jekyll from eating Vite's underscored chunks.

No custom domain. No Actions workflow — the committed `docs/` tree *is* the deploy artifact.

## Supabase (one-time)

Project: `ltawgurvhffikilulyfj` · URL: `https://ltawgurvhffikilulyfj.supabase.co`

1. **SQL editor** — paste and run [`supabase/0001_init.sql`](supabase/0001_init.sql). This creates `profiles` + `saves`, RLS, the signup trigger, and the unique index (one save per operator).
2. **Authentication → URL configuration** — add to Redirect URLs:
   - `http://localhost:5173/**`
   - `https://mister-g-lu.github.io/arena-ai-sandbox/**`
3. Enable **Email** auth (magic link). Disable confirmations if you want the first token to just work.
4. The publishable key is already in `src/lib/config.ts`. Optional: set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to override.

Personnel on the site is the operator-facing surface: request a reinstatement token, merge a conflicting file, read the File (Attention omitted), export / import the logbook, terminate.

## Working method

Small PRs into `main`, in commit order. Design first when the design is the change; site PRs stay reviewable.
