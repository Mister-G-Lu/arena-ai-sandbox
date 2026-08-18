# Component Audit — Prefer Native JSX Elements

**Status:** Implemented (this pass)
**Date:** 2026-08-17

## The rule

When a UI primitive has a built-in React JSX element (which is just the native
HTML element surfacing through JSX), use it instead of re-implementing its
behavior by hand with `useState` + `div`s. This is *not* about importing a
component library — React ships these primitives natively:

| Hand-rolled smell                       | Use the native JSX element |
| --------------------------------------- | -------------------------- |
| Custom dropdown built from `<div>`s     | `<select>` + `<option>`    |
| Custom checkbox / radio via styled divs | `<input type="checkbox">` / `<input type="radio">` |
| Disclosure toggled by a button + `useState` | `<details>` + `<summary>` |
| Loading bar drawn with inner `<div>` fills | `<progress>` (or `<progress max value>`) |
| Gauge / measurement bar                 | `<meter>`                  |
| Modal built from absolutely-positioned divs | `<dialog>` + `showModal()` |

`<progress>` vs `<meter>`: use `<progress>` for task/budget progress, `<meter>`
for gauges/measurements within a known range. Either is a native element; the
only requirement is *not* to hand-roll the bar.

A hand-rolled replacement is only justified when the native element genuinely
cannot express the interaction — a spatial map, a segmented gauge, or a
tablist with custom presentational chrome, for example. Those are called out
below as intentional exceptions rather than silently shipped.

> Nuance on "import the react existing `<select>`": in React there is nothing to
> import — `<select>`, `<details>`, `<progress>`, etc. are built-in JSX elements
> that render to native HTML. So the rule is "use the built-in JSX/native
> element," not "install a component library." The repo's ADR-01 explicitly says
> it will stay disciplined about not dragging in extra UI libraries, which makes
> the native elements the right (and only) "existing" option.

---

## Violation found this pass

The repo contained **four hand-rolled widget patterns** that re-implemented
behavior a native element already provides:

1. **Disclosure** — `DevPanel.tsx` toggled its body with a `<button>` +
   `useState(open)` + `aria-expanded`. Replaced with native `<details>` +
   `<summary>`, which gives open/close behavior, keyboard support, and an
   accessible name for free.

2. **Progress bars** — three hand-rolled bars drawn as `<div className="...fill">`
   with an inline `width: %`:
   - `ResourceBar.tsx` (credits word-usage meter + action tank fill)
   - `ProfilePage.tsx` (credits ledger word-usage bar)
   - `ConsoleWorkflow.tsx` + `OrientTerminalTask.tsx` (task "PROCESSING" bars)
   All replaced with native `<progress>`; the neon track/fill is preserved by
   styling the browser pseudo-elements (`::-webkit-progress-bar/value`,
   `::-moz-progress-bar`). The two "PROCESSING" bars are indeterminate.

The old classnames (`resource-meter-fill`, `resource-bar-fill`,
`processing-fill`) and their keyframes were removed. No tests referenced any of
them (verified), and the full suite still passes.

---

## Component-by-component audit

| Component | Native-elements used | Findings / actions |
| --------- | -------------------- | ------------------ |
| `Console` | `button`, `a` | No custom widgets. Secondary-order asides are decorative panels. OK. |
| `ConsoleWorkflow` | `button` | Processing bar → **native `<progress>` (fixed)**. Decision options are presentational panels. OK. |
| `DevPanel` | `button` | Disclosure → **native `<details>`/`<summary>` (fixed)**. |
| `FirstShift` | `button` | Stage router only; delegates to terminal components. OK. |
| `Footer` | — | Static. OK. |
| `Hero` | `button`, `img`, `a` | Sector picker + bulletin tablist are intentional spatial/tab widgets (see exceptions). OK. |
| `HorizonPanel` | — | Presentational forecast. OK. |
| `NavBar` | `a`, `button` | Mobile menu toggle button + `aria-expanded` drives an overlay sidebar — a menu, not a disclosure; native `<details>` cannot produce the overlay. Intentional. |
| `Notices` | `button`, `a` | Storylet runner; `HorizonPanel` already extracted. No custom widgets. OK. |
| `OrientTerminal*` (8) | `button` | Narrative button-driven terminals. `OrientTerminalTask` processing bar → **native `<progress>` (fixed)**. |
| `ProfilePage` | `button`, `a` | Credits bar → **native `<progress>` (fixed)**. Quality **segmented** gauge is intentional (see exceptions). |
| `ResourceBar` | `button`, `a` | Two meters → **native `<progress>` (fixed)**. Component dots are decorative markers, not bars. OK. |
| `SaveManagement` | `input[type=email]`, `input[type=file]`, `button` | Already uses native `input`/`form`. OK. |
| `Shop` | `button` | Cards + buy buttons. OK. |

### Intentional exceptions (kept custom — documented, not a bug)

- **`Hero` sector map** — a spatial, 2D node grid (`SECTORS` laid out as map
  nodes). A native `<select>` or radio list would be a UX regression, not an
  improvement; there is no native "map picker" element. The tablist for
  bulletins is a real tab pattern and `role="tablist"`/`tabpanel` is used
  correctly.
- **`ProfilePage` quality segments** — the quality bar is a *segmented* gauge
  (a Fallen London-style HUD). Converting it to a continuous `<progress>` would
  erase an intentional visual. If segmentation must be preserved it stays a
  custom bar; the continuous credit/action bars were the ones converted.
- **`NavBar` mobile menu** — a button + overlay, not a disclosure. Native
  `<details>` cannot produce the sliding overlay, so the `aria-expanded`
  button is correct.
- **`OrientTerminalBreakRoom` / storylet choices** — these are narrative choice
  *buttons*, not option lists; a radio group would read as a form, not a
  story. Kept as buttons.

---

## Top-5 longest component files — separability review

Asked: can the 5 longest components be separated, following the same logic
(decompose UI so each piece is small, single-purpose, and uses native pieces
where possible)? All five are *separable*; ranked by how cleanly:

1. **`ProfilePage.tsx` (397 → ~90 after split)** — the clearest win. It is a
   page that already maps almost 1:1 to sections: Basic Info, Resources,
   Qualities, Glitches, Promotion, Logbook, Discoveries, Contacts, plus
   `<SaveManagement/>`. Extract each `profile-section` into a presentational
   sub-component (`ProfileBasicInfo`, `ProfileResources`, `QualityCard`,
   `PromotionStatus`, `LogbookList`, `ContactList`). Data/type definitions
   (`QUALITY_UNLOCKS`, `JournalEntry`, `ContactRecord`) can move to a module.
   Verdict: **highly separable.**

2. **`Console.tsx` (413)** — one large container that already hands the work
   workflow to `ConsoleWorkflow`. The remaining inline JSX splits naturally into
   `ConsoleReadouts`, `SecondaryOrder`, `ConsoleLog`, and `ConsoleActions` (the
   button cluster is the biggest chunk). The event handlers (`executeTask`,
   `fileResult`, `nextShift`) stay with the container since they touch shared
   state. Verdict: **separable**, already partly done.

3. **`SaveManagement.tsx` (333)** — already split off `FileSummary`. The rest is
   one panel of stacked conditionals; extract `SaveStatusCards`, `ConflictPanel`
   (used 3× for tab/cloud/import conflicts with nearly identical layout), and
   `AuthForm`. Verdict: **separable**, already started.

4. **`Notices.tsx` (347)** — a storylet runner; the JSX is mostly three
   separable panels: `BoardErrors`, `ZoneCard` (already an `<article>` per
   zone), and `StoryletCard` / `OutcomePanel`. The card-choosing logic could
   move to a hook. Verdict: **separable.**

5. **`Hero.tsx` (227)** — below the file-length ceiling and mostly static. The
   two interactive pieces (`SectorMap`, `BulletinTabs`) and the data constants
   (`SECTORS`, `BULLETINS`, `DIRECTIVES`) could each be extracted, but this is
   the lowest priority. Verdict: **modestly separable, optional.**

**Recommendation:** extract `ProfilePage` sections and `Console`'s action
cluster/readouts first — they give the largest size reduction per change and
make the sections easier to test in isolation. `SaveManagement`'s `ConflictPanel`
is the single best reuse win (one component, three call sites).

---

## How to check going forward

- New UI: ask "is there a native JSX element for this?" → `<select>`,
  `<input>`, `<details>`, `<progress>`, `<meter>`, `<dialog>`.
- PR review: grep for the hand-rolled smells:
  `grep -rn 'aria-expanded\|width:.*%\|processing-fill\|meter-fill\|bar-fill' src/components`
- When a native element is used, keep its track/fill styled via the browser
  pseudo-elements so the neon HUD is preserved (see `ResourceBar.css`,
  `08-console-polish.css`).
### Pass 2 — long-file separation (this PR)

The longest component and test files were separated into themed folders:

**Components** (each split into a sub-folder with self-contained presentational units):
- `ProfilePage.tsx` 397 → 46 — now composes sections from `components/profile/` (`ProfileInfo`, `ProfileResources`, `ProfileQualities`, `ProfilePromotion`, `ProfileJournal`, plus shared `profileData.ts`).
- `Console.tsx` 413 → 335 — extracted `components/console/ConsoleReadouts`, `ConsoleActions`, and a shared `SecondaryOrder` (the two order asides were near-duplicates).
- `Notices.tsx` 347 → 255 — extracted `components/notices/ZoneCard`, `StoryletConsole`, `OutcomePanel`.
- `SaveManagement.tsx` — extracted `components/save/FileSummary` and a shared `SaveConflictPanel` (used by all five "which file wins?" prompts).
- Orientation/task "PROCESSING" bars were already native `<progress>` (Pass 1).

**Tests** — split by theme, each group now focused:
- `hooks/useCloudSave.test.ts` 444 → `bootstrap`/`race`/`recovery` files + shared `useCloudSave.testUtils.ts`.
- `context/GameStateContext.effects.test.jsx` 424 → `effects`/`persistence`/`residue` files.
- `__tests__/opening-narrative-later.test.tsx` 409 → later-beats + `opening-narrative-floor12.test.tsx`.
- `game/dispatch.test.ts` 294 → anomaly-schedule + `dispatch.personal.test.ts`.
- `lib/gameSave.test.ts` 295 → `roundtrip` + `validation` files.
- `__tests__/pacing.test.tsx` 278 → 197 by reusing the shared `opening-narrative.helpers`.

**Left as-is (cohesive by design):** `useGameActions.js` (406), `gameSave.ts` (366), `dispatch.ts` (352), `useCloudSave.ts` (319) are single-concern hooks/logic modules whose functions share one closure/state owner; force-splitting would hurt cohesion more than line count helps. The `opening-narrative.test.tsx` (347) integration suite is one scenario group.
