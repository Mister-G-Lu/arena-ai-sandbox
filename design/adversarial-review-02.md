# ADVERSARIAL REVIEW 02 — economy exploits, save integrity, and honest UI
### Build reviewed: `main` @ `6bc1cb0` · reviewer: agent, adversarial mode · 2026-08-16

Method: the live runtime read module by module with an adversarial brief — *"this
code is flawed, find the flaws"* — then every finding was confirmed by
reproduction: tests, save files, and the click path where applicable. Severities
follow the AI red-team convention (CRITICAL / HIGH / MEDIUM / LOW) [1]. A short
note on the method, and the failure modes of the method itself, closes the
document.

---

## Findings

### HIGH — the economy can be farmed, the cloud can be clobbered, the UI can lie

**H1. Floor 12 is a repeatable quality farm.**
The zone config gives the routine pool `onceEach: true` but the expedition no
flag at all. `resolveStorylet` re-filed every outcome on every visit, and
nothing forces the expedition to end: `floor12-01` has an `endZone` choice, so
one loop (press → 1207 → read → through → back at the door) pays
**Doubt +4, Perception +2, Attention +9** and leaves the zone open for the next
loop. Doubt maxes in two visits, and Attention — the hidden death meter, capped
at 10 with death scheduled for 10 — saturates without a single polite warning.
The design docs are explicit that cards may repeat but "only some fire per
day"; the fix makes consequences file once per card, and the runner now says so
out loud on re-read.

**H2. Importing a save file can silently destroy the cloud copy.**
Conflict detection runs exactly once, at sign-in. After that the autosave is
armed: import an old backup while signed in and `pushSave` overwrites Records
800 ms later — no prompt, no conflict dialog. A one-click data-loss path on a
screen whose entire job is protecting saves. Import now bumps a recheck token
that re-runs the Records check with autosave disarmed, so the import lands in
the same two-copies-disagree flow as boot.

**H3. The profile claims unlocks that the data never opened.**
`QUALITY_UNLOCKS` rendered `✓ Notice storylets`, `✓ Investigation actions`,
`✓ The Summons` from hardcoded per-quality captions. "Investigation actions"
is not an unlock in `PROMOTIONS` at all; "The Summons" is gated on six
components, not doubt. Review 01 closed this exact class of bug ("the profile
promises what the game cannot deliver") and the hardcoded copy grew back. The
captions are now dimmed `◇` teasers; earned state is reported only by the
promotion system, which is data.

### MEDIUM — two save-integrity holes and the dead-code shelf

**M1. `deposit(-n)` debits through the back door.**
`deposit` accepts any finite amount and folds it through `Math.max(0, trunc(raw))`,
so a negative deposit silently spends credits — bypassing `withdraw`'s explicit
`paid` contract. Storylet data permits negative effect deltas, so a future card
with `Salary: -5` would drain players by accident. Deposits are now
non-positive no-ops, pinned by a test.

**M2. A failed autosave is dropped forever.**
A failed push set `status: 'error'` and then nothing: the debounce effect only
re-fires on the next state change, so a night's progress stayed unpushed if the
operator closed the tab first. The autosave now retries on an interval while
the state has not moved on, clears the timer when superseded or signed out,
and can never double-push.

**M3. Dead action API contradicts the codebase's first rule.**
Ten actions had zero callers: `increaseQuality`, `increaseAttention`,
`decreaseAttention`, `completeTask`, `addComponent`, `hasComponent`,
`openStorylet`, `recordDeath`, `addDiscovery`, `addContact`. The
hand-increment trio is precisely the pattern the README forbids ("no component
increments a quality by hand") — leaving the door installed invites the drift.
All ten are gone; the death/contact systems can bring their own doors back
wired to the one pipeline.

**M4. Dead tutorial content could brick the live game.**
`src/content/tutorial/*.json` (six cards) duplicates the JSX orientation, is
unreachable by any runner (the live zone table is `routine` + `floor12`), yet
shipped in the bundle and — worse — any validation error in it failed
`loadAllStorylets()`, taking down all of Notices. Dead content must not be able
to stop the live game. Deck deleted.

**M5. A second, divergent storylet engine was still in the tree.**
`src/game/storylets.ts` kept a full parallel progress runtime (`createProgress`,
`parseProgress`, `applyChoice`, `enterZone`, capitalized quality keys) that
disagreed with the live context, the save schema, and the zone table. Nothing
imported it but its own tests — which is how disagreements like this survive.
The module is now exactly what DEVELOPMENT.md claims: schema and graph
validation, with a pin test keeping `ZONE_IDS` synced to the progression zone
table.

### LOW — hardening and honesty

**L1.** Import parsed any file size; a multi-hundred-MB junk file freezes the
tab mid-`JSON.parse`. Files over 5 MB are now refused up front.
**L2.** Component counters hardcoded `/ 6` in two components; both now read
`COMPONENT_DEFS.length`.
**L3.** No `aria-current` on the active nav link; no `aria-expanded`/`aria-controls`
on the mobile menu toggle. Both added.
**L4.** CI is dormant by design (the workflow templates cannot be installed
from this environment). `npm run verify:pages` now gives every contributor the
committed-docs guarantee locally.

---

## What this PR changes

| Finding | Fix |
|---|---|
| H1 | Consequences file once per card (`resolveStorylet`); Notices marks re-reads "RECORD UNCHANGED"; regression test pins the farm shut. |
| H2 | Import bumps a recheck token; `useCloudSave` re-runs the Records check with autosave disarmed; tests cover both disagree and agree paths. |
| H3 | Quality captions become dimmed `◇` teasers; component counts derive from `COMPONENT_DEFS`. |
| M1 | `deposit` no-ops non-positive amounts; contract pinned by test. |
| M2 | Autosave retries until the state moves on or the operator signs out; fake-timer regression test drives failure and recovery. |
| M3 | Dead action API deleted — consequences have one door. |
| M4 | Tutorial deck deleted. |
| M5 | Parallel runtime stripped to validation; zone-list pin test added. |
| L1–L4 | Import size guard; component counts; nav ARIA; `verify:pages`. |

## Still open (next PRs, in rough priority)

1. **06:00 is still one log line.** The nightly reboot — the game's central
   image — is unstaged.
2. **Attention has no teeth.** It now accumulates honestly (no farm) but never
   spends, cools, or warns. The polite-warning ladder and the first telegraphed
   death are next.
3. **Credit sinks** (P2): bolt cutters, the annex doorman's bribe. `spendCredits`
   exists and is tested; nothing calls it.
4. **Day 2 is byte-identical to day 1.** Fifteen work orders cycle 3.3× per
   shift, verbatim.
5. **Cross-device races.** Two signed-in devices autosaving concurrently is
   last-write-wins; the loser is protected by boot-time conflict detection, but
   the winner's *in-session* work can be lost. A per-save revision field
   (`updated_at` compare before upsert) would close it.
6. **Bundle size.** 571 kB minified (161 kB gzip) — one chunk, all content
   inlined. Code-splitting the routes is an easy win later.
7. **Import has no confirmation step.** The cloud re-check makes it safe, but a
   "replace this terminal's file?" confirm would match the gravity of the
   action.
8. **Reset is unexposed.** `resetGame` exists with no UI and no cloud story; if
   it ever surfaces, it needs the same recheck treatment as import.
9. **Two tabs, one browser.** localStorage is last-write-wins across tabs; a
   `storage` event listener or a simple "newer tab detected" prompt is the
   standard fix.
10. **Autosave chatters.** Every state change pushes after 800 ms; during a
    shift that is a push per task. Fine today; worth batching when shifts get
    richer.

---

## Method note: adversarial review for web game design

The pass used the five-phase adversarial-review pattern — challenge
assumptions, mine edge cases, hunt failure modes, map hidden dependencies, and
look for attack vectors [2] — on top of game-specific heuristics rather than
generic UI ones: goals must be legible and progress visible (Pinelle's
GameSpot-derived heuristics [3]; the PLAY heuristics [4]), the interface must
never claim a state the rules do not hold, and the *economy* is where idle-ish
games fail: degenerate repeatable strategies, save integrity, and exploitable
arithmetic are the genre's canonical defects, not colour choices [5][6][7].

Two lessons from the method's own failure modes were applied as constraints:

- **A reviewer told to find flaws will find flaws** [8] — so every finding
  above was reproduced (test, save file, or click) before being written down,
  and severities are bounded so the fix queue stays triageable. Cosmetic
  nitpicks were deliberately excluded unless they misinformed the player (H3,
  L2, L3 are honesty/a11y issues, not taste).
- **Reviews decay.** Round 01 caught dead ends in the story spine; this round
  caught the parallel engine, the farm, and the save-integrity holes. The
  remaining risk is not any single bug but drift — which is why three of the
  fixes here are *pins* (a regression test, a zone-list pin test, a docs-drift
  script) rather than one-off corrections.

[1] https://github.com/requie/AI-Red-Teaming-Guide (severity classification)
[2] https://skills.rest/skill/adversarial-review (5-phase red-team method)
[3] https://dl.acm.org/doi/10.1145/1357054.1357282 (Pinelle et al., heuristic evaluation for games)
[4] https://www.yumpu.com/en/document/view/6118950/ (Desurvire & Wiberg, PLAY heuristics)
[5] https://par.nsf.gov/servlets/purl/10174274 ("It Started as a Joke": On the Design of Idle Games)
[6] https://www.reddit.com/r/gamedev/comments/17xbkx3/ (idle-game design pitfalls thread)
[7] https://tvtropes.org/pmwiki/pmwiki.php/SoYouWantTo/WriteAnIdleGame (idle-game pitfalls)
[8] https://www.reddit.com/r/ClaudeAI/comments/1vc11nl/ (adversarial reviewer pattern and its failure modes)
