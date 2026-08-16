# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `docs/` on `main`)*
- **Site source:** [`docs/`](docs/) — static HTML/CSS/JS, no build step
- **Design docs:** [`design/`](design/) — core design bible and drafts (⚠ full spoilers)
- **Working branch:** `arena/01a006db-arena-ai-sandbox` — merged into `main` in small PRs

## Local dev

```bash
python3 -m http.server 8080 -d docs
```

Then open http://localhost:8080.

## Dev tools — the Maintenance Terminal

Press **`` ` ``** (backtick) on localhost to open the dev menu: warp to any arc/beat,
edit every quality (including player-hidden **Attention**), flip components, zones and
toggles, and save/load/share named states as JSON.

- Auto-on for `localhost`, `*.local`, `file://` and sandbox previews.
- On a shared build, opt in with `?dev=1` (and out with `?dev=0`).
- **Never on for production** — `docs/devtools.*` isn't even fetched there, and a real
  deploy step should delete those files.
- Design rationale (and why dev access is *not* an admin account): [`design/dev-tools.md`](design/dev-tools.md)

```bash
npm install && npm test   # jsdom smoke tests for the terminal + state store
```
