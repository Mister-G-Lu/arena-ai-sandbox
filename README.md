# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `docs/` on `main`)*
- **Tech stack:** React 19 + Vite + vanilla CSS (migrated from static HTML)
- **Design docs:** [`design/`](design/) — core design bible and drafts (⚠ full spoilers)
- **Narration system:** [`NARRATION_SETS.md`](NARRATION_SETS.md) — all story text with critical lines marked for polish
- **Latest review:** [`design/adversarial-review-01.md`](design/adversarial-review-01.md) — integration pass on the opening narrative, and what the current PR fixes
- **Developer handoff:** [`DEVELOPMENT.md`](DEVELOPMENT.md) — canonical save, Supabase config, content safety, tests, and deployment

## Architecture

The game is now a React + Vite application with modular components:

```
src/
├── components/
│   ├── NavBar.jsx              # Progress-aware sidebar navigation
│   ├── ResourceBar.jsx         # Top resource tracking bar
│   ├── Hero.jsx                # Home + interactive Meridian dispatch feed
│   ├── Console.jsx             # Main gameplay console
│   ├── FirstShift.jsx          # Skippable/reviewable tutorial sequence
│   ├── Notices.jsx             # Storylet runner: zones, cards, outcomes
│   ├── ProfilePage.jsx         # Player profile/stats
│   ├── OrientTerminal*.jsx     # 6 tutorial terminal stages
│   └── [other page components]
├── content/                    # Storylet JSON, validated at load time
│   ├── routine/                # The notice pool
│   └── floor12/                # First expedition — awards the NULL KEY
├── game/                       # Pure, tested rules (no React)
│   ├── ledger.ts               # Uncapped credits + the 32-bit overflow glitch
│   ├── qualities.ts            # The one effects pipeline
│   ├── progression.ts          # Promotions + zones, as data
│   ├── payouts.ts              # What a filed result is worth
│   ├── glitches.ts             # Anomalies the operator gets to keep
│   └── storylets.ts            # Storylet schema + validation
├── context/
│   └── GameStateContext.jsx    # Global state management
├── hooks/
│   └── useRouter.js            # Hash-based routing
├── App.jsx
└── main.jsx
```

### Rules of the codebase

- **Consequences are data.** Every outcome — an orientation answer, a console
  filing, a storylet choice — is an `effects` object (`{ Doubt: 1, Attention: 1 }`)
  filed through one pipeline. No component increments a quality by hand.
- **Requirements are data.** Promotions and zones declare `requires` maps; one
  evaluator answers "can I?" and one formatter renders the label. No per-tier
  strings in JSX.
- **Content is data.** Storylets live in `src/content/**/*.json` and are schema
  validated at load. Adding a card or a zone is not a code change.
- **There are no caps that the fiction doesn't justify.** Credits are limited
  only by a 32-bit word, and reaching it is a reward (see P2a in the design bible).
- **There is one operator file.** Local persistence, file import/export, and
  Supabase all use the versioned schema in `src/lib/gameSave.ts`. New persisted
  fields extend that schema; they do not create a second storage key or partial
  cloud payload.
- **Content is text, not HTML.** JSON, saves, Supabase rows, URL data, and future
  translations render through React interpolation. Rich local copy is JSX or a
  structured allowlist. Never pass content strings to `dangerouslySetInnerHTML`,
  `innerHTML`, or `eval`. See [`DEVELOPMENT.md`](DEVELOPMENT.md#content-safety).

## Local dev

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Build for production (outputs to `docs/` for GitHub Pages):
```bash
npm run build
```

Run the test suite (208 tests — unit rules + a full integration click-through of
the opening narrative):
```bash
npm test
```

## Current State

### ✅ Completed

**Infrastructure:**
- React + Vite setup with hot reload
- Hash-based routing system
- Component architecture (modular, maintainable)
- Global state management (GameStateContext)
- Responsive layout with mobile support

**UI Components:**
- Progress-aware sidebar navigation (Console stays locked until orientation is complete)
- Interactive homepage dispatch deck combining Directive, Grid, and Bulletins
- Top resource bar (Credits — uncapped, Components, Day, Tasks, Rank, Profile)
- Profile page with full player stats
- Console with two-step task execution and First Shift review access
- 6-stage tutorial (FirstShift) with skip and non-destructive replay modes
- Promotion ceremony modals
- Resource change notifications

**Gameplay Systems:**
- Task execution with logging
- Uncapped credit ledger with a 32-bit word and the Overflow glitch
- Corrupted results as decisions: file as clean, or log the discrepancy
- Resource tracking (Credits, Components, Doubt, Perception, Routine, Attention)
- 6-tier promotion system, evaluated automatically from declarative requirements
- Notices: storylet zones driven by validated JSON content
- Floor 12 expedition — the first Component (NULL KEY)
- Two-step task confirmation (execute → confirm)
- State persistence across sessions, with migration for legacy capped saves

**Narration System:**
- All narration text written (2,650+ words)
- 24 narration sets covering all major moments
- Critical lines marked with `//UPDATE [CRITICAL]` for polish
- Trigger timing documented in NARRATION_TIMELINE.md
- Implementation guide in NARRATION_IMPLEMENTATION.md

### 🚧 In Progress

**Narration Integration:**
- Create NarrationDisplay component (design complete, not yet built)
- Connect narration triggers to game events
- Implement typing animation effect
- Add visual effects (screen shake, glitch overlays)
- Test all 24 narration sequences

**Polish & Testing:**
- Playtest full game flow (Days 1-52)
- Balance resource gain rates
- Verify all promotion triggers
- Check mobile responsiveness
- Test edge cases (rapid clicking, state corruption)

### 📋 Remaining Tasks

**High Priority:**

1. **NarrationDisplay Component** (est. 2-3 hours)
   - Build reusable overlay component
   - Implement typing animation
   - Add choice/branching support for interactive narrations
   - Test with all 24 narration sets

2. **Connect Narration Triggers** (est. 3-4 hours)
   - Hook up first death → "The First Death" narration
   - Hook up promotion milestones → promotion ceremony modals
   - Hook up zone discoveries → zone intro narrations
   - Hook up resource thresholds → milestone notifications

3. **Critical Line Polish** (human intervention required)
   - Review all `//UPDATE [CRITICAL]` lines (currently ~15 lines)
   - Ensure emotional beats hit correctly
   - Test tone consistency across all narrations
   - Verify lore keywords ([Credits], [Hovercar], etc.)

**Medium Priority:**

4. **Visual Effects** (est. 2-3 hours)
   - Screen shake on death
   - Glitch overlays during anomalies
   - Fade transitions between scenes
   - Particle effects for resource gains

5. **Audio System** (est. 3-4 hours)
   - Background ambient audio (terminal hum, city sounds)
   - UI interaction sounds (button clicks, task completion)
   - Narration voiceover (optional, text-to-speech or recorded)
   - Death transition sound effects

6. **Save/Load System** (est. 2-3 hours)
   - ~~Persist game state to localStorage~~ (done)
   - Add save/load UI
   - ~~Handle state migration for future updates~~ (done for the retired credit cap)

**Low Priority:**

7. **Accessibility** (est. 2-3 hours)
   - Keyboard navigation for all interactive elements
   - Screen reader support for narrations
   - Colorblind-friendly resource indicators
   - Reduce motion preferences

8. **Performance Optimization** (est. 1-2 hours)
   - Lazy load narration assets
   - Optimize component re-renders
   - Add error boundaries

9. **Documentation** (est. 1-2 hours)
   - Add inline code comments for complex logic
   - Create component usage guide
   - Document state management patterns

10. **Deployment & CI/CD** (est. 1-2 hours)
    - Set up GitHub Actions for automated builds
    - Configure deployment to GitHub Pages
    - Add build validation checks

## Estimated Remaining Work

**Total:** ~20-30 hours of development time

**Breakdown:**
- High priority: 5-7 hours (narration integration)
- Medium priority: 7-10 hours (effects, audio, save system)
- Low priority: 4-7 hours (accessibility, optimization, docs, deployment)

## Design Principles

- **Mundane horror:** The terror comes from routine, not jump scares
- **Choice matters:** Every decision has consequences (even if subtle)
- **Lore through keywords:** World-building through terms like [Credits], [Hovercar], [Seam Ripper]
- **Critical lines need polish:** Human intervention required for emotional beats
- **Progression over grind:** Promotions are earned through story milestones, not repetition

## Contributing

This is a personal project, but feedback is welcome. If you want to contribute:

1. Check the remaining tasks list above
2. Pick something that interests you
3. Create a branch from `main`
4. Submit a PR with your changes

For critical narrative work (marked with `//UPDATE [CRITICAL]`), please discuss the changes first to ensure tone consistency.

## License

Private project — not for distribution without permission.

## Contact

Questions? Open an issue on GitHub or reach out directly.
