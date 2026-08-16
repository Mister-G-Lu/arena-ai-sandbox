# CORE DESIGN — FALSE REALITY (working title)
### v1 — the living design bible. Supersedes all draft specifics on any conflict.

> These pillars are the contract every draft must obey. Each one is annotated with
> the decision that produced it, so future drafts can't quietly drift.

---

## P0 — Genre

**This is a slow-burn action/storylet game in the Fallen London tradition — NOT an
incremental, NOT a prestige game.**

- ~50 actions/day. Every action = a storylet with a text snippet, a choice, a result.
- There is **no voluntary reset, no prestige loop, no restart-to-get-stronger**.
- The day/night cycle is *atmosphere and pacing*, not a treadmill.
- *Origin:* user direction — "standard incremental is the wrong word; slow burn action
  based sequence; you don't really reset unless the system kills you."

## P1 — Death is rare, significant, and always chosen

- **The player dies 2–4 times in the entire game.** Dying is a major story event,
  never a routine.
- Death is **telegraphed and opt-in**: dangerous storylets carry explicit warnings
  (the system's own politeness: *"Recommended: do not proceed. — M."*). The routine
  pool can never kill you. No accidental deaths, ever.
- On death you wake in **the Interim** (the frame between 0600 and the next shift)
  and must complete **the Reinstatement** — the Fallen London chess analog, detailed
  in P3.
- Death has permanent narrative weight: the patch that follows a death changes the
  world (renames, redesignations, closed routes) and improves the system's file on
  you — each death literally brings the endgame pressure closer.
- *Origin:* user direction — "I don't want players to get bored of dying so many
  times; dying could still be somewhat significant and not done many times."

## P2 — Two economies, strictly separated

| Economy | Source | Feels like | Feeds |
|---|---|---|---|
| **Salary** (mundane) | Routine work — the dull daily grind | Immersion; "I did my job" | Minor purchases, bribes, conveniences, cooling Attention |
| **Components** (story) | Secret zones — discovered through investigation | Discovery, risk, revelation | The endgame Tool (the Seam Ripper) |

- **Salary has no cap.** Credits accumulate without a design ceiling — a capped
  mundane currency stops being mundane and starts being a progress bar. The only
  limit is the machine's: a signed 32-bit word (2,147,483,647). See P2a.
- **Routine work is optional.** A player who ignores the grind entirely can still
  beat the game. The dullness is a *choice the fiction rewards* (the system likes
  routine workers; the Manager's ending is available to those who lean in).
- **Story requirements are never grind.** No "earn 1,000,000 X to escape." Resources
  are found in secretive zones, each behind its own mini-story.
- *Origin:* user direction — "grinding out Resources that feel significant... finding
  resources in secretive zones rather than spamming the same thing 50 times; the
  Regular Day's work can be kept for immersion, but the Story requirements should be
  exciting and versatile."

## P2a — The Overflow (the ledger is a variable)

The municipal ledger is a signed 32-bit word. Nothing else in the fiction has a
word size; cities do not have word sizes, **programs do**.

- If the operator ever pushes the balance past `2,147,483,647`, the number wraps
  negative for a single frame, the exception handler refuses to reconcile a
  negative it did not authorise, and the account is marked **UNBOUND** —
  infinite credit, permanently.
- The reward is **a kept glitch**: `THE WORD`, filed under ANOMALIES ON FILE,
  plus `Doubt +1` and a logbook entry. Kept glitches are evidence, and evidence
  is the only currency the endgame respects.
- This is **on purpose**. It is the earliest hard proof a player can hold that
  Meridian is a simulation, and it is earned by breaking something rather than
  by being told.
- **The on-ramp:** payroll pays whatever number it reads out of a corrupted
  field. Filing a corrupted result as clean pays the corruption's own number.
  The exploit is visible from day one and not yet viable — closing that gap is
  deliberate, ongoing design work, not an oversight.
- *Origin:* user direction — "Credit should have no Limit other than the backend
  int limit... reward 1 glitch for breaking int limit and let the user overflow
  to infinite credit. This is on purpose to hint that the world is a
  'simulation'."

## P2b — Supplies and the horizon (the mundane economy, spendable)

Salary finally buys something you can hold. The **municipal supply terminal**
(the `SUPPLY` page) sells small, useful dispatcher goods — ground coffee, a
night radio permit, a pocket torch, bolt cutters, a thermos, a box of smokes
for the doorman. Each good is bought once for a fixed credit price, carried in
the operator file, and opens a small one-card storylet on the Notices board.

- Supplies are **the grind's legitimate role**: cheap, mundane, slightly useful,
  and a reason a routine worker has money. They are never story-critical —
  every zone expedition still runs on investigation, not purchases.
- A supply is a requirement metric like any other (`requires: { coffee: 1 }`),
  evaluated by the one checker. The save schema derives from `SUPPLY_DEFS`;
  adding a good is one data edit.
- The third-floor vending machine also stocks one permanent teaser
  (THE MACHINE'S FAVOR) that is never for sale — the shop hints at future
  stock the way everything else hints at future floors.

The game also gives the player a **horizon**: things to look forward to, shown
as gates rather than told as promises.

- **Locked story segments** — a zone that is *listed* but sealed shows its
  clearance on the card (`CLEARANCE REQUIRED: SENIOR OPERATOR CLEARANCE`), its
  fiction note, and its requirement gap. The restricted-files drawer is the
  first: visible from the Operator tier, unsealed by Senior clearance.
- **Floor 12 lists on Shift 2 for every operator** — sealed, with its
  requirements shown — so the expedition's existence is the carrot and the
  promotion is the key.
- **The clearance forecast** (under both boards) shows the next promotion with
  the live gap, what it adds, and every locked zone on file. Hints are derived
  from the same `PROMOTIONS`/`ZONES` tables the checker enforces, so they
  cannot drift from the rules.
- *Origin:* user direction — "give player hints of future and things to look
  forward to; hint with a locked story segment requiring promotion... a shop
  that we can use the credits on for basic resources... simple storylets we can
  use our resources to access in the beginning."

## P3 — The Reinstatement (death's price)

The Fallen London-chess analog, diegetic to this game's fiction:

- FL mechanic: dying takes you to the Boatman; returning requires a chess game that
  gets *longer and harder each death*, and you return wounded.
- ND mechanic: dying takes you to **the Interim**. Your termination report lies open
  on **the Ledger**, full of *discrepancies* — because a sentient error-handler's
  file cannot close cleanly. To return you must **reconcile your own death**: a
  mini-sequence of 5–8 storylets, each a small puzzle-choice (which version of events
  satisfies the system? which memory do you sacrifice? what may the patch take?).
- **Escalation:** death #1 = 3 discrepancies; each subsequent death adds more, and the
  system *remembers your previous filings*, so contradictions compound. Returning
  becomes slower, trickier, more expensive — never blocked, always friction.
- **Costs:** the Reinstatement consumes actions from your next shift (you wake at
  01:00 minus the hours you spent dead), and leaves a **Patch Scar** — a lasting but
  *recoverable* change to the world or your qualities (Perception −1 until you
  re-verify something; a contact renamed; a route closed). Scars heal through story
  actions, not waiting — FL-style wounds, not time-gates.
- **The deterrent is friction + narrative cost, not punishment.** And the Interim is
  itself one of the secret zones — dying is the only way to see some of the game's
  best content. Death is expensive *and* desirable. That tension is the point.

## P4 — The secret zones (where story lives)

- The city hides **six secret zones**. Each is a mini-expedition: a sequence of
  storylets with branching, quality gates, and risk. Each yields one **Component**.
- Zones are discovered through investigation (following a work order, decoding a
  callsign, trusting a driver), not unlocked by currency.
- The six: **Floor 12** (the floor that doesn't exist; Arc I climax) · **the Records Basement**
  (ledgers that *are* the city) · **the Vent Network** (Operator 5's route) ·
  **the Rooftop Array** (the signal) · **the Off-Map Sectors** (ride with
  VANTABLACK) · **the Interim** (death's waiting room).

## P5 — The endgame is a build, not a number

- Six Components assemble into **the Seam Ripper** — a tool that holds the gap at
  0600 open and lets you descend to **the Loom**, the engine that weaves the city
  nightly.
- The finale is cracking the Loom's code — a story sequence, not a stat check. The
  components *authorize* actions in the finale; they don't add +damage.
- *Origin:* user direction — "more likely building a tool end game to crack the code
  in the core."

## P6 — The twist (the spine everything hangs on)

- The Dispatch Office is **the simulation's exception handler**. Glitches arrive as
  work orders because that's your job.
- You are the **Sentient NPC**: an anomaly who persists across the nightly reboot
  (0600) that wipes everyone else. You survive because the error handler must
  survive crashes.
- Therefore you *are* the error — which is why the system terminates you, politely,
  when you get too loud. The villain's kill-moves and patch notes are **memos**.
- The logbook is the diegetic save file: the world forgets; ink doesn't.

## P7 — Tone

Warm, deadpan, paperwork-horror with black humor. The system is **indifferent, not
malicious** — the city is polite about your death. The coffee is already warm.

**The system and M. do not have the same voice.** System text is sterile, certain,
and impersonal. M. is the human pressure valve: dry, impatient, occasionally funny,
and a little too quick to answer questions the Manager supposedly does not care
about. Direct-channel interruptions should feel like a boss leaning into the cubicle,
not another lore memo. Use them sparingly (roughly one or two memorable exchanges per
shift); the humor should expose M.'s anxiety or agenda, never turn every anomaly into
a quip.

Touchstones: Fallen London (chassis), Outer Wilds (investigation), Westworld (the
host becomes aware), Severance/SOMA (the self as a function), Control/SCP
(bureaucratic horror), Papers Please (the desk).

## P8 — Endings (the contract)

- **Four endings, all honored, none punished:**
  1. **SEAM RIPPED** — the true/escape ending: crack the Loom, step through the gap.
     Earned, not gated: a dedicated player *will* reach it, but must choose it.
  2. **KEEP LOGGING** — take the Manager's deal; become the patch. A legitimate good
     ending: warm, terrible, comfortable.
  3. **THE CLEANER** — stay in the gap; become the janitor between frames. Secret.
  4. **PATCHED** — die in the Core with too many scars / too late. The failure end;
     rare, always the player's own compounding.
- Plus the joke ending: **RESIGNATION** (denied — the shift must be covered).

## P9 — Numbers that stay in bounds (Multi-Month Long-Term Scope)

| Budget / Metric | Canonical Target |
|---|---|
| Play length | ~85–110 in-game shifts, ~4,400–5,300 actions |
| Arc I — Month 1 | **30+ shifts for tryhards** (~35–45 shifts standard, ~1,500–2,100 actions) |
| Arc II — Month 2 | ~45–50 shifts (~2,250–2,500 actions) |
| Arc III — Month 3 | ~10–15 shifts (~650–750 actions) |
| Active playtime | ~29–37 hours |
| Calendar time (habit model, ~35–40 min/day) | ~12–16 weeks (3–4 months) |
| Total deaths | 2–4 (rare, opt-in, telegraphed) |
| Unique content | ~1,100 pieces, ~128k words |
| Session | one shift ≈ 35–40 minutes ≈ 50 actions |
| Action tank | cap 50, +1 per 10 minutes (`src/game/actions.ts`) |

**The cap equals the quota on purpose.** One shift drains exactly one full tank,
so a session has a natural shape: arrive full, leave empty. Perfect play does
not buy a bonus expedition — it buys a ten-minute wait before the investigation,
and that wait is the anticipation, not a failure state. Filing a task and
committing to a storylet choice both cost 1. Opening a board, rereading a card
you have already resolved, and the orientation tutorial are all free.

Binge play is allowed, never hard-blocked. Skipped days are forgiven by the fiction
("the city didn't notice. the coffee is still warm.").

---

*Changelog:*
- *v1 — established from Drafts 01–03 plus user direction on death frequency, the
  FL-chess-style cost system, zone-based story resources, and the endgame tool.*
- *v1.1 — P2 amended: Salary is uncapped. P2a added: the Overflow glitch, the
  32-bit ledger word, and the corrupted-field payroll on-ramp. Prompted by the
  integration review in `design/adversarial-review-01.md`.*
- *v1.2 — P9 & Progression overhauled to the multi-month scope: Days 1–2 guided entry,
  Days 3+ redesigned as a versatile, emergent story arc, Arc I expanded to take
  at least 30 shifts for tryhards, and total campaign paced across ~3–4 months (~85–110 shifts).*
