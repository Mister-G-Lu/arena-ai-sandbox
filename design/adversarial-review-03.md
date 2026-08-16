# REVIEW + ADVERSARIAL REVIEW 03 — state boundaries, concurrency, and the first death
### Baseline reviewed: `main` @ `728fe1a` · review date: 2026-08-16

## Scope and method

This pass reviewed the live runtime (`src/main.jsx` → `GameStateContext`), the
canonical save boundary, local and Supabase synchronization, storylet dispatch,
database constraints, deployment automation, and the Floor 12 death path.

The normal review traced ownership and invariants: which layer owns a pending
work order, when an action is charged, which representation is canonical, and
which checks must run before merge. The adversarial pass then tried to violate
those boundaries with rapid clicks, route changes, reloads, two tabs, two cloud
devices, auth changes while writes were queued, oversized files, contradictory
save fields, stale React closures, and the lethal Floor 12 branch. Every item in
the top ten was reproduced in a focused regression test before being fixed.

## Review summary

The repository already had unusually strong foundations for a pre-alpha:
schema-validated content, strict canonical saves, one effects pipeline, RLS,
content-sink lint rules, meaningful coverage thresholds, and end-to-end opening
narrative tests. The largest remaining risks were not ordinary rendering bugs.
They were **boundary bugs**:

- component state was treated as durable game state;
- local and cloud writes had no compare-before-write protocol;
- async work could cross an authentication boundary;
- related save invariants were validated independently rather than together;
- persistence boundaries did not all apply the same action-clock hydration rule.

Those are exactly the defects a happy-path test run misses and an adversarial
state-machine review finds.

## Top 10 findings and fixes

### 1. HIGH — a full action tank rewrote local and cloud saves every second

`accrue()` changed `lastTick` to the current time on every presentation tick
while the tank was full. `GameStateContext` interpreted each timestamp as new
game state, causing permanent local writes and debounced cloud traffic even
when the player did nothing.

**Fix:** full-tank reads now preserve their anchor; the first spend still starts
the clock explicitly. A regression test repeats full-tank reads at different
wall times and requires byte-stable state.

**Commit:** `da6aa00 fix(actions): stop full-tank autosave write storm`

### 2. HIGH — work orders could be abandoned, rerolled, or lost without paying

The current result lived only in `Console` component state and the action was
charged only on acknowledgement. Navigating away or reloading after execution
forgot the result, allowing free anomaly rerolls and losing the decision the
player had been shown. A last action could also disappear between execution and
filing.

**Fix:** Dispatch data is canonical game data. Executing a task now atomically
reserves the action and writes an immutable `pendingDispatch` into the save.
Navigation, reloads, exports, deploys, and cloud restores all resume the same
result; acknowledgement commits it without charging twice.

**Commit:** `353e9f2 fix(dispatch): persist and reserve pending work orders`

### 3. HIGH — stale storylet closures could resolve a card that was no longer open

`resolveStorylet` trusted the card and choice passed by the component. A queued
double click or stale closure could submit a previous card after the canonical
pointer had already advanced, replaying a transition outside the actual state
machine.

**Fix:** the reducer now requires the submitted zone/card to match
`currentStorylet` and the choice ID to exist on that card before spending or
mutating anything. The regression test advances Floor 12, submits the old card
again, and verifies that the pointer, qualities, and action balance do not move.

**Commit:** `981df45 fix(storylets): reject stale and forged choice submissions`

### 4. CRITICAL — a queued save for operator A could execute as operator B

The autosave promise queue read `authRef.current.session` only when its turn
arrived. If A signed out and B signed in while A had writes queued, A's captured
envelope could be sent using B's now-current identity, risking cross-account
data corruption or disclosure.

**Fix:** every queue entry captures one session and user ID, verifies that the
same user is current before and after the network operation, and aborts across
an auth transition. A deferred-network test queues two A saves, signs in B, and
proves the second write never executes.

**Commit:** `40eadbc fix(sync): bind queued saves to one operator session`

### 5. CRITICAL — concurrent devices silently overwrote in-session progress

Cloud conflict detection happened at boot, but every later write was a blind
`upsert`. Two devices that initially agreed could diverge and overwrite one
another; whichever request arrived last won without either player being told.

**Fix:** cloud saves now use optimistic concurrency against the server-owned
`updated_at` revision. Creation is insert-only, ordinary saves update only the
revision they observed, and a zero-row update becomes a visible conflict with
the newest Records copy. Only the existing explicit **KEEP THIS TERMINAL** path
uses a force upsert.

**Commit:** `5a396af fix(sync): prevent cross-device lost updates with revisions`

### 6. HIGH — two tabs silently clobbered the same localStorage save

Each tab held an independent React snapshot and wrote the same key. The next
interaction in an older tab could erase a newer tab's complete state, even
though cloud CAS was correct.

**Fix:** a `storage` listener validates incoming canonical saves, compares
fingerprints, and pauses local writes on disagreement. The Operator File shows
both summaries and requires an explicit **KEEP THIS TAB** or **USE OTHER TAB**
choice. In-memory play is retained while writes are blocked.

**Commit:** `4a2b898 fix(saves): stop cross-tab local overwrite races`

### 7. HIGH — file-size limits disagreed across import, local save, and database

The UI admitted 5 MiB imports while Postgres rejected payloads above 1 MiB, and
the canonical schema itself allowed far larger aggregate arrays. A file could
parse and appear valid locally, then fail cloud sync forever; hostile oversized
text also consumed avoidable parse and validation work.

**Fix:** `MAX_SAVE_BYTES` defines one 1 MiB UTF-8 contract for pre-parse import
checks, canonical creation, object parsing, local/export serialization, cloud
transport, and the existing database constraint. Exports use compact JSON so
formatting whitespace cannot make local and cloud limits disagree.

**Commit:** `9c141dc fix(saves): enforce one payload-size limit end to end`

### 8. HIGH — contradictory save fields granted invisible infinite capabilities

The schema validated `credits`, `ledgerUnbound`, `actionsUnbound`, and
`devTouched` independently. A valid-looking import could set finite credits
with an unbound ledger, or infinite actions without the permanent `ALTERED`
flag. Finite credits could also start beyond the fictional 32-bit word.

**Fix:** cross-field refinements require the infinite-credit sentinel and
ledger flag to agree, require every unbound action tank to carry `devTouched`,
and reject finite balances beyond `CREDIT_LIMIT`. Legacy Manager files migrate
to the canonical infinity representation rather than preserving a
contradictory pair.

**Commit:** `3746fe5 fix(saves): reject forged unbound capabilities`

### 9. HIGH — zero-timestamp imports regenerated a full tank from the Unix epoch

The additive save schema documents `actionsLastTick: 0` as “anchor on first
read.” Boot honored that sentinel, but file import, cloud replacement, cross-tab
replacement, and reset assigned parsed state directly. On the next interval an
empty imported tank accrued decades of elapsed time and jumped to full.

**Fix:** one `hydrateActionTank` boundary now anchors the sentinel before
accrual, and every whole-file entry path uses it. A regression test imports an
empty zero-timestamp tank and requires it to stay empty with a fresh anchor.

**Commit:** `94e9d3f fix(actions): anchor imported and restored action tanks`

### 10. HIGH — the game's first lethal choice did not record a death

Floor 12 visibly led into “Black” and the Interim, but no data declared the
choice lethal and `deaths` remained zero forever. The profile claimed a death
system that the only authored death path did not touch. Attention copy also
implied an accidental threshold death, contradicting the design pillar that
death is always telegraphed and chosen.

**Fix:** story choices can now declare `death: true`; graph validation requires
a lethal choice to transition into aftermath content. The Floor 12 choice is
styled and labelled **LETHAL // THIS CHOICE KILLS** before selection. Resolving
it once records the death, files permanent logbook and Interim discovery
residue, resets Attention at the patch boundary, and continues to the authored
aftermath. Replays cannot increment death again.

**Commit:** `fix(storylets): make lethal choices explicit and persistent`

## Adversarial retest matrix

| Attack / failure mode | Expected result after fixes |
|---|---|
| Leave or reload after executing a task | Same reserved result returns; action was already charged |
| Double-submit an old storylet button | Reducer rejects it with no spend or mutation |
| Sign in B while A has a queued autosave | A queue entry aborts; no B write occurs |
| Save from device B after device A advanced Records | B receives a conflict, never a blind overwrite |
| Continue in an older browser tab | Local writes pause until the player chooses a copy |
| Import more than 1 MiB | Rejected before JSON parsing |
| Import finite credits plus `ledgerUnbound: true` | Schema rejects the contradiction |
| Import `actionsUnbound: true` without `devTouched` | Schema rejects the unaudited capability |
| Reach Floor 12's lethal choice | Warning is visible before click; death is persisted once |
| Import an empty tank with `actionsLastTick: 0` | It stays empty and receives a current anchor |

## Residual risks and next work

These were not hidden or downgraded into the top ten:

1. **Actions remain client-authoritative.** `supabase/0002_actions.sql` is staged
   but not active. That is acceptable for a private single-player pre-alpha,
   not for competitive or paid progression.
2. **The Reinstatement is still abbreviated.** Floor 12 reaches authored
   aftermath and now records death correctly, but the full escalating
   discrepancy sequence and patch scars remain future content.
3. **Most progression fields are intentionally editable in exported saves.**
   The review closes contradictory/invisible capabilities, not all single-player
   save editing. A future trusted mode would need server-authoritative outcomes.
4. **Shift-end language and day variation remain uneven.** The 06:00 scene is
   better than the original one-line ending, but task copy and quota terminology
   still need a dedicated narrative consistency pass.
5. **The app remains a single eager bundle.** Correctness took priority over
   route-level code splitting; bundle budgets should be added before content
   volume grows substantially.
6. **Workflow activation still needs repository-owner permission.** The checked-in
   templates remain under `ops/github-workflows/` because the connected GitHub
   App is not permitted to create `.github/workflows/*`. This merge is manually
   gated by the same commands; an owner should install the templates afterward.

## Validation

The merge candidate must pass:

```bash
npm ci
npm audit --omit=dev
npm run check
npm run verify:pages
```

Final local results: **22 test files / 185 tests passed**; aggregate coverage
was **90.44% statements, 82.49% branches, 92.68% functions, and 93.88% lines**;
the production build completed; the production dependency audit reported zero
vulnerabilities. The final `docs/` output is rebuilt from the reviewed source
and committed with finding 10 so the Pages deployment and source tree describe
the same game.
