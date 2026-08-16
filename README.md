# FALSE REALITY — night dispatch storylet game (pre-alpha)

A slow-burn action/storylet game in the Fallen London tradition, built in small PRs from this repo.

You are the night operator at Meridian Central Dispatch. Fifty tasks a shift. Attendance is mandatory. The coffee is always warm. And the city forgets, sometimes. You don't.

- **Live site:** https://mister-g-lu.github.io/arena-ai-sandbox/ *(GitHub Pages, built from `dist/` on `main`)*
- **Tech stack:** React 18 + Vite + vanilla CSS (migrated from static HTML)
- **Design docs:** [`design/`](design/) — core design bible and drafts (⚠ full spoilers)
- **Narration system:** [`NARRATION_SETS.md`](NARRATION_SETS.md) — all story text with critical lines marked for polish

## Architecture

The game is now a React + Vite application with modular components:

```
src/
├── components/
│   ├── NavBar.jsx              # Left sidebar navigation
│   ├── ResourceBar.jsx         # Top resource tracking bar
│   ├── Console.jsx             # Main gameplay console
│   ├── FirstShift.jsx          # Tutorial sequence
│   ├── ProfilePage.jsx         # Player profile/stats
│   ├── OrientTerminal*.jsx     # 6 tutorial terminal stages
│   └── [other page components]
├── context/
│   └── GameStateContext.jsx    # Global state management
├── hooks/
│   └── useRouter.js            # Hash-based routing
├── App.jsx
└── main.jsx
```

## Local dev

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Build for production:
```bash
npm run build
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
- Left sidebar navigation
- Top resource bar (Credits, Components, Day, Tasks, Rank, Profile)
- Profile page with full player stats
- Console with two-step task execution
- 6-stage tutorial (FirstShift) with separate terminal instances
- Promotion ceremony modals
- Resource change notifications

**Gameplay Systems:**
- Task execution with logging
- Resource tracking (Credits, Components, Doubt, Perception)
- 6-tier promotion system
- Two-step task confirmation (execute → confirm)
- State persistence across sessions

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
   - Persist game state to localStorage
   - Add save/load UI
   - Handle state migration for future updates

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
3. Create a branch from `arena/01a0078e-arena-ai-sandbox`
4. Submit a PR with your changes

For critical narrative work (marked with `//UPDATE [CRITICAL]`), please discuss the changes first to ensure tone consistency.

## License

Private project — not for distribution without permission.

## Contact

Questions? Open an issue on GitHub or reach out directly.
