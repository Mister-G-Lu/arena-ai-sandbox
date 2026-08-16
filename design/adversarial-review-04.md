# REVIEW + ADVERSARIAL REVIEW 04 — drift, disagreement protocols, and files that outgrow their own schema
### Baseline reviewed: `main` @ `066d1dc` (PR #27 merge) · review date: 2026-08-16

## Scope and method

Round 03 hardened the state-machine boundaries (pending work orders, stale
closures, queued saves, CAS revisions, cross-tab writes, size contracts,
forged capabilities, clock hydration, the first death). This pass attacked
what remained inside those walls: **the comparison logic that decides when
two files "disagree", and the growth logic that decides whether a file can
still be written**.

The normal review traced the life of a disagreement — tab vs tab, device vs
Records, import vs live file — and the life of the append-only residue lists.
The adversarial pass then tried:

- closing the game mid-tank and reopening after a regen interval, with cloud
  enabled;
- importing an operator file while a cross-tab write block was standing;
- resetting in tab A while tab B kept playing;
- importing a save already at a schema ceiling, then playing one more
  ordinary action;
- feeding prototype-chain names (`__proto__`, `constructor`, `toString`)
  through content validation and effect normalization;
- tearing the optimistic console phase away from the canonical reservation.

Every finding below was reproduced as a failing regression test before the
fix, and the fixed test suite is part of each commit.

## Review summary

The boundary work from round 03 held: no path was found to double-spend,
double-file, cross an auth boundary with a queued write, or lose a pending
work order. The weaknesses left were one level up, in the *protocols that
compare* files and in *long-run growth*:

- two comparisons treated wall-clock arithmetic as disagreement;
- two whole-file gestures (import, reset) did not participate in the
  cross-tab protocol they had to dominate;
- a storage *removal* was the only cross-tab event nobody handled;
- residue lists were append-only against a schema with hard ceilings — a
  file could play itself into a state every writer rejects;
- the quality table answered questions from the prototype chain;
- one component kept an optimistic phase with no rollback path.

## Top findings and fixes

### 1. HIGH — offline regen alone raised a two-device conflict every cold open

The action tank regenerates on the wall clock. `hydrateActionTank` rightly
applies that at boot — but the boot Records check then fingerprinted the
clock-advanced local file against the pre-regen remote bytes. Any operator
who closed with a partially empty tank and reopened past a ten-minute
boundary got "Local terminal and Records contain different files" with no
second device involved. Worse, the offered **USE RECORDS COPY** would
discard honestly regenerated actions, and a player trained to click it
daily was one habit-forming prompt away from real losses on a busy day.

The clock fields cannot be evidence of play: every genuine action also
moves a non-clock field (a spend moves `actionsSpentThisShift`, a filing
the task counters, a choice the seen-record, a purchase the logbook). Two
files differing only in `actions`/`actionsLastTick` are the same file read
at different times.

**Fix:** `clockIndependentFingerprint()` alongside the canonical
fingerprint. Boot comparison and the in-session conflict-recovery path both
treat clock-only drift as agreement: local keeps its fresher clock, the
observed server revision is adopted, and the next ordinary CAS autosave
carries the regen forward. Genuine divergence still stops for an explicit
choice. Regression tests replay the 23:00-close/07:00-open morning, an
in-session revision race caused by another device's regen, and pin that a
real play difference still conflicts.

**Commit:** `a523305 fix(sync): treat clock-only tank drift as agreement, not a conflict`

### 2. HIGH — importing or resetting under a cross-tab block never persisted

The round-03 cross-tab guard paused local writes until the operator chose
KEEP THIS TAB or USE OTHER TAB. But the two strongest resolution gestures
did not clear the pause: importing an operator file and resetting the game.
An import taken with the block standing stayed memory-only — the
persistence effect refused to write and the stale conflict banner still
offered USE OTHER TAB, which would have clobbered the freshly imported
file with the foreign bytes it was chosen to replace. A reload evaporated
the import entirely.

**Fix:** import and reset are explicit "this copy wins" decisions. Both now
clear `localWritesBlocked` and the pending conflict, so the persistence
loop commits the chosen state immediately.

**Commit:** `5b5f025 fix(saves): importing or resetting resolves the outstanding tab-conflict block`

### 3. MEDIUM — a cross-tab reset was invisible until it resurrected

The storage listener ignored events with `newValue === null`. Tab A's
reset removed the canonical key; tab B noticed nothing, and B's next
ordinary state change rewrote the erased file — after which tab A read
the resurrection as a foreign edit and got a bogus conflict on the very
tab that asked for the wipe.

**Fix:** removal of the canonical key is now a first-class foreign event:
the tab pauses its writer, records `remoteReset`, and the Operator File
panel explains the wipe and offers the only sensible resolution — KEEP
THIS TAB'S COPY (`keepThisTabSave` no longer requires a pending foreign
file, because a reset leaves none to adopt). A subsequent foreign *write*
degrades back to an ordinary tab conflict.

**Commit:** `4f0525f fix(saves): stop other tabs silently resurrecting a cross-tab reset`

### 4. MEDIUM — residue lists grew until the save rejected itself

`logbook`, `discoveries` and `seenStorylets` were append-only at runtime,
while the canonical schema rejects anything above 5,000 / 5,000 / 10,000
entries on every write. A discrepancy-heavy career — or an import already
at the ceiling followed by one more ordinary entry — tipped the file over
the wall, and from that append onward every local write, cloud sync, and
export failed `SaveValidationError`. The game kept running on unbacked
memory while the status card sat at SAVE ERROR.

**Fix:** reducers append through one bounded helper with live caps safely
below the schema ceilings (1,000 / 500 / 9,500 — years of honest play).
In-game growth can no longer reach the wall; an at-ceiling import prunes
its oldest residue on the next entry instead of wedging. (Pruning
`seenStorylets` theoretically re-arms an evicted card's consequences; at
four dozen authored cards that requires a crafted import — the accepted
save-editing residual from round 03.)

**Commit:** `70cbd8a fix(state): cap residue growth below the schema wall so saves never become unwritable`

### 5. LOW — the quality table answered from the prototype chain

`qualityDef('__proto__')` / `'constructor'` / `'toString'` returned
inherited members of the plain-object table — truthy — so story-graph
validation accepted forged effect names that then silently no-op'd, and
`normalizeEffects` wrote them through `def.key` (`undefined`), minting a
junk `"undefined"` bucket (a forged `{__proto__: 5, constructor: 3}`
bucketed as `undefined: 8`).

**Fix:** `qualityDef` answers own keys only. Regression tests pin the three
names to `undefined`, require JSON-parsed prototype keys to drop cleanly,
and require graph validation to reject them as unknown effects.

**Commit:** `65b690b fix(qualities): close prototype-chain lookups in the effects gate`

### 6. LOW — optimistic console PROCESSING had no rollback

`executeTask()` set the phase and latch before the canonical reducer
answered, and the wait-for-result timer arms only when a pending dispatch
exists. A refused reservation — unreachable through today's gates, one
future coupling edit away — parked the console at PROCESSING with the
queue button disabled until navigation.

**Fix:** the processing effect treats "processing with no pending
reservation" as a refused transaction and rolls back to READY. A mocked
context test clicks EXECUTE against a refusing reducer and requires the
queue to offer work again.

**Commit:** `a0776c0 fix(console): roll back an optimistic PROCESSING phase when the reservation is refused`

## Adversarial retest matrix

| Attack / failure mode | Expected result after fixes |
|---|---|
| Close at 23:00 with 5 actions, reopen 07:00 with cloud on | Synced without a prompt; regen carried forward by the next CAS push |
| Two devices race with only clock drift between them | Revision adopted silently; no conflict modal |
| Two files diverge in any real field | Conflict is still raised and waits for a choice |
| Import a file while a tab-conflict block stands | Block cleared; imported bytes reach the canonical key |
| Reset while blocked by another tab's write | Fresh file persists; conflict banner cleared |
| Reset tab A while tab B plays | B pauses with the wipe notice; no silent resurrection; KEEP THIS TAB'S COPY rewrites B's in-memory state |
| Play past a 5,000-entry residue ceiling | Oldest residue pruned; every writer keeps accepting the file |
| Content or import forges `__proto__`/`constructor` effects | Rejected as unknown effects; no junk bucket |
| Reducer refuses a console reservation | Console rolls back to READY; EXECUTE offered again |

## Residual risks and next work

1. **Actions remain client-authoritative** (carried from round 03):
   `supabase/0002_actions.sql` stays staged, not active.
2. **Save editing is still possible by design**; this round closed the
   drift/protocol holes, not the honest-file assumption. A crafted import
   pinning `tasksCompleted` near `Number.MAX_SAFE_INTEGER` can still wedge
   writes by pushing a counter past its schema bound — noted, not exploited
   by any reachable path in normal play.
3. **The autosave reconciliation after clock-only agreement is lazy** — it
   waits for the next ordinary change rather than pushing immediately. The
   remote carries stale clock fields meanwhile; hydrate-on-load makes that
   invisible to every client.
4. **`pushSave`'s default options still mean `force`** for hypothetical
   callers that pass nothing. All real callers pass expectations explicitly;
   a future transport tightening should make CAS the default.
5. **The app remains one eager bundle** (>500 kB warning stands); content
   growth should come with route-level splitting and a bundle budget.

## Validation

```bash
npm ci
npm audit --omit=dev
npm run check
npm run verify:pages
```

Final results on the merge candidate: **23 test files / 199 tests passed**;
aggregate coverage **90.91% statements, 82.86% branches, 93.62% functions,
94.21% lines** (thresholds 80); typecheck and lint clean; production
dependency audit reported zero vulnerabilities; `docs/` rebuilt from the
reviewed source so the Pages deployment and the tree describe the same game.
