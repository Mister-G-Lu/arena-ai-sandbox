# ADVERSARIAL REVIEW 01 — integration pass on the opening narrative
### Build reviewed: `main` @ 88d5a56 · reviewer: agent, adversarial mode · 2026-08-16

Method: the live React app (`src/main.jsx` → `src/App.jsx`) driven end to end in a
real DOM — orientation clicked through stage by stage, a full fifty-task shift
executed, day rollover, profile and save file inspected after every step. Not a
code read: every finding below was reproduced by clicking.

---

## A. Blockers — the story could not progress at all

**A1. `Doubt` and `Perception` were unreachable.** `increaseQuality` existed in
the context and was **never called by any component**. After a complete
orientation and a full fifty-task shift the save file still read
`qualities: { doubt: 0, perception: 0 }`.

**A2. Therefore no promotion was possible, ever.** Tier 1 required `Doubt ≥ 1`.
`checkPromotion` was also never called from anywhere. The operator was
permanently *Unknown Operator*, and every unlock behind rank — notices,
restricted areas, secret zones, the Summons — was dead content.

**A3. `Attention` never moved.** The hidden heat meter is the spine of P1
(rare, telegraphed death) and P3 (the Reinstatement). Nothing incremented it,
so the entire death system was unreachable.

**A4. No code path called `addComponent`.** Components read `0/6` forever; the
Seam Ripper endgame (P5) had no on-ramp.

**A5. The break room lied.** The first real choice in the game answers *"I didn't
make this"* with **"The system has noted your observation."** Nothing was noted.
Three distinct answers produced identical state.

**A6. The glitch engine erased its own evidence.** A corrupted result
self-corrected after 950 ms with no player input. The only visible hint in the
opening hours deleted itself before it could mean anything, and left no residue
in the logbook — which P6 calls the diegetic save file.

## B. The economy — the reported bug, confirmed and worse than reported

**B1. Credits capped at exactly 500.** 50 tasks × ¤10 = ¤500 = `maxCredits`.
Confirmed by play: end of day 1 read `500 / 500`. **Every task from day 2
onward paid nothing** — the mundane economy died at the end of the first shift
and never restarted.

**B2. Nothing to spend credits on.** P2 promises bribes, torches, bolt cutters.
A capped currency with no sink is a number that only exists to stop moving.

**B3. The cap was rank-gated, and rank was unreachable (A2).** So the ceiling
could never rise. Deadlock.

## C. Narrative and pacing

**C1. Day 2 was byte-identical to day 1.** Fifteen work orders cycled 3.3× per
shift, verbatim, and the fiction never acknowledged the repetition — a wasted
opportunity in a game whose subject *is* repetition.

**C2. Nothing happened at 06:00.** The shift ended with one log line. No
handover, no beat, no consequence, no reason to come back.

**C3. The profile promised what the game could not deliver.** "✓ Notice
storylets", "✓ VANTABLACK's nature", "The Summons" — all rendered as reachable
unlock captions behind qualities that could not increase.

## D. Engineering

**D1. Two implementations.** A complete parallel TypeScript app
(`src/App.tsx`, `src/components/*.tsx`, `src/game/*.ts`, `src/content/**.json`,
34 test files) sat beside the live JSX app, **unreferenced by it**.

**D2. The parallel app could not render.** `src/App.tsx` imported
`./components/Hero` and `./components/Footer`, which resolve to the live
`Hero.jsx` / `Footer.jsx` (default exports). React received `undefined`.
`src/App.test.tsx` had been "passing" against nothing for as long as the tests
were unrunnable.

**D3. Tests were unrunnable.** `npm test` was `echo "Error: no test specified"
&& exit 1`; `vitest`, `jsdom`, `@testing-library/*` and `@supabase/supabase-js`
were all missing from `package.json`. 34 test files, zero of them executed by CI
or by a developer.

**D4. Hardcoded requirement strings.** The profile rendered promotion
requirements as a per-tier chain of `state.promotion.tier === 2 && <span>Doubt ≥
3, Components ≥ 3</span>` — and they had already drifted from the actual
requirement functions.

**D5. Two sources of truth for unlocks.** `PROMOTIONS[0].unlocks` listed three
unlocks; `state.promotion.unlocks` was `[]`. The UI read one, the logic read
the other.

---

## What PR "Progression unblocked" changes

| Finding | Resolution |
|---|---|
| A1, A3, A5 | One effects pipeline (`src/game/qualities.ts` + `applyEffects`). Break-room answers, console filings and storylet outcomes all file through it. |
| A2, D4, D5 | `src/game/progression.ts`: promotions are data with declarative `requires` maps, evaluated automatically in an effect; `state.promotion.unlocks` is the only source of truth; the UI renders labels from the data. |
| A4 | Zones declare their Component; completing a zone awards it. Floor 12 → NULL KEY. |
| A6 | A corrupted result is now a **decision**, not an animation. It stays wrong until the operator files it. Logging the discrepancy keeps the corrupt line in the log *and* in the logbook. |
| B1, B2, B3 | The cap is gone (`src/game/ledger.ts`). The only ceiling is the machine's 32-bit word — and breaking it is a reward, not an error (below). |
| C1, C2, C3 | Partially: notices give the shift a second texture and the profile now only promises what the data can deliver. Shift-end beats remain open (see below). |
| D1, D2, D3 | Shadowed shells were retired. The later canonical-save pass removed the remaining parallel action/shift/save runtime entirely; Supabase, local persistence, and import/export now share `src/lib/gameSave.ts`. Test count is intentionally not frozen here; `npm run check` is the source of truth. |

## The Overflow glitch (new canon)

Credits have no design ceiling. The ledger's only limit is a signed 32-bit word,
`2,147,483,647`. If an operator ever pushes the balance past it, the balance
wraps negative for one frame, the exception handler refuses to reconcile a
negative it did not authorise, and the account is marked **UNBOUND** — infinite
credit, permanently, plus `Doubt +1` and a logbook entry.

This is deliberate. It is the first piece of hard evidence a player can *hold*
that Meridian is a program: cities do not have word sizes.

**The on-ramp is already planted.** Filing a *corrupted* result as clean pays
whatever number the corruption contained — payroll reads the damaged field
without checking it (`src/game/payouts.ts`). `population: 41,31▓` pays ¤4,131.
At that rate the word is ~520,000 anomalies away, which is exactly right for
now: the mechanism is visible, the exploit is not yet viable. A future PR gives
the player a way to *multiply* an anomalous field rather than merely collect it.

## Hints planted for later

- **The word.** `LEDGER WORD: 2,147,483,647` is printed on the profile from day
  one, next to a meter that never moves. It reads as flavour until it doesn't.
- **41,312.** The population, the inventory count and the build number
  (`v0.41.312`) are the same digits. Payroll paying `4131` out of a damaged
  population field quietly links the city's headcount to the city's arithmetic.
- **Unbilled work.** Logging a discrepancy pays nothing — the system only pays
  for records it can reconcile. First hint that reconciliation, not labour, is
  what the city actually buys (and the shape of the Reinstatement, P3).
- **Routine as camouflage.** Filing corruption as clean grants `Routine`, which
  the design says cools Attention. Complicity is mechanically comfortable.
- **"Ink does not forget."** Discrepancy logbook entries quote the corrupt text
  verbatim. When the world later forgets a night, the player's own log won't.

## Still open (next PRs)

1. **06:00.** The shift still ends with a log line. The nightly reboot is the
   game's central image and it is not staged yet.
2. **Attention has no teeth.** It accumulates and is never spent, cooled or
   feared. Needs the polite-warning ladder and the first telegraphed death.
3. **The Interim / Reinstatement** (P3) — unbuilt.
4. **Credit sinks** (P2) — bolt cutters, the annex doorman's bribe.
5. **Work-order repetition** — day 2 should not be byte-identical to day 1.
6. **The remaining four zones** — content only; the runner already supports them.
