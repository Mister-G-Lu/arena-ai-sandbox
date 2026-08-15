# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `docs/` on `main`)*
- **Site source:** [`docs/`](docs/) — static HTML/CSS/JS, no build step
- **Design docs:** [`design/`](design/) — core design bible + arcs (⚠ full spoilers)
- **Working branch:** `arena/01a006db-arena-ai-sandbox` — merged into `main` in small PRs

## Local dev

```bash
python3 -m http.server 8080 -d docs
```

Then open http://localhost:8080.
