# Opening retention review — Shift 2 and the Floor 12 promise
### Decision record · 2026-08-16

## Decision

**Introduce Floor 12 at the start of Shift 2, but as a secondary order rather than the full expedition.** The order is visible to every operator. Promotion controls depth:

| Clearance | What the player can learn |
|---|---|
| Unknown Operator | An elevator registered `FLOOR 12` outside its service range. The player may clear the fault. |
| Operator | Tracing the order shows the player's own terminal ID, timestamp format, and signature. |
| Senior Operator | Restricted-area clearance exposes the full Floor 12 field order and expedition. |
| Later ranks (production content) | The records, termination form, Auditor, and relationship to the Manager become progressively legible. |

This is **foreshadowing, not the twist reveal**. The immediate question is: *“What is on Floor 12, and why did I request it before my shift began?”* The game should not answer *“what is Meridian?”* in Shift 2.

The pre-alpha runtime implements the first three rungs. Senior clearance cannot be earned before Shift 2; a curious player can earn it during Shift 2 and continue directly into the current Floor 12 vertical slice. A compliant player sees the same lead but cannot investigate beyond the service discrepancy.

---

## How long will players wait for intrigue?

There is no defensible universal number for “story patience.” Platform, price, genre, prose density, and the strength of the core interaction change it too much. Public benchmarks measure session length and retention, not the minute at which curiosity expires.

Useful outer bounds do exist:

- GameAnalytics' 2026 PC benchmark reports a median session around **18 minutes**, with the top quartile above **30 minutes**. The designed 35–40 minute shift is therefore already asking for an above-median PC session; it cannot defer all proof of depth until several shifts later.[^ga]
- Steam's **two-hour** refund window is a purchase-evaluation boundary, not a hook target. A player may reserve judgment for two hours while still becoming bored in minute ten.[^steam]
- Frictional Games' narrative-design guidance is more applicable than a generic retention average: keep a short-term narrative goal visible so the player acts *because of the story*, rather than clearing gameplay to get back to the story.[^frictional]

For this game, use a promise ladder instead of one late “big hook”:

| Elapsed target | The promise the game should pay |
|---|---|
| 0–3 min | Tone and identity: the roster already knows you; the coffee is already warm. |
| By task 10 / first 5–10 min | An unmistakable anomaly and a consequential filing choice. |
| By the end of Shift 1 | The anomaly is a pattern, not a one-off; the player has changed a record or kept a discrepancy. |
| Start of Shift 2 | A named, personal mystery: Floor 12 and a request carrying the player's ID. |
| Within roughly 45–90 min | Evidence that the mystery has depth: promotion changes what the same document reveals; a curious player can reach restricted access. |
| Later Arc I | The dangerous answer: the form, the Auditor, the Interim, and the first chosen death. |

The crucial distinction is **intrigue versus payoff**. Players can wait hours for an answer if they receive new evidence and new agency every few minutes. They will not wait hours merely because the design document promises a good reveal on Day 9.

---

## Evaluation of the previous opening

### What already worked

1. Orientation establishes the voice in 2–3 minutes.
2. The first corrupt result is guaranteed by task 10.
3. Filing corruption creates an honest choice between Routine/pay and Doubt/Attention.
4. A second anomaly is guaranteed before shift end, turning a glitch into a pattern.

### Why Shift 2 was at risk

1. **Day 2 was byte-identical to Day 1.** The same 15 work orders cycled 3.3 times per shift.
2. **The central mystery had contradictory timing.** In the runtime, an inquisitive player could speed-run Notices and expose Floor 12 during Shift 1; in the arc bible, Floor 12 did not land until Day 9 (~4 hours).
3. **Promotion was only a lock, not a lens.** It exposed a menu item but did not first show the player a document whose meaning changed with rank.
4. **The first anomaly was atmospheric but not a durable goal.** “Something is wrong” creates mood. “I apparently ordered an elevator to a nonexistent floor” creates a question the player can pursue.
5. **Prototype pacing is much faster than the authored budget.** The design assumes 40–45 seconds per action; the current console has a 0.9-second processing beat and compact results. Repeating 50 tasks can feel repetitive well before it consumes 35 minutes.

Moving the full twist to Shift 2 would overcorrect. It would spend the game's best answer before the player has formed a theory. The right move is to give Shift 2 a **specific unresolved case** and let rank determine how far the player can push it.

---

## Implemented flow

1. Finishing Shift 1 and beginning Shift 2 posts `ANNEX ELEVATOR // OUT-OF-RANGE STOP: FLOOR 12` above the live queue.
2. The Notices destination becomes available on Shift 2 even to a Tier 0 operator and carries a `NEW` marker until the order is resolved.
3. The secondary order does not consume quota and can be handled immediately; the player is not asked to complete another block of routine work before seeing it.
4. Clearing the reading rewards Routine and salary. Tracing it files Doubt, Perception, and hidden Attention.
5. Tier 2 now requires Day 2 in addition to Doubt 2 and Perception 1. This prevents orientation/Notice optimization from revealing restricted areas during Shift 1.
6. Floor 12 still requires the `restricted-areas` promotion unlock. Thus the same Shift 2 lead is a dead end for a compliant low-rank player and a doorway for a promoted curious player.

---

## What this does not solve

The secondary order fixes the **return hook**, not the whole second shift. The queue still needs authored Shift 2 variation. The next content pass should:

- replace at least 30–40% of Shift 2's work-order text;
- make two or three normal tasks echo the Annex case without repeating `FLOOR 12` verbatim;
- guarantee one *personal* anomaly before task 10 (for example, the player's signature or a message from their next shift), not only a random corruption line;
- stage 06:00 as a scene rather than one log line;
- split the production Floor 12 expedition into clearance layers so the records/form/Auditor escalation can breathe instead of resolving in six clicks.

Do not add more locked cards as a substitute for content. A locked item creates anticipation only after the player has been allowed to touch it and obtain one useful clue.

---

## Playtest and telemetry questions

Instrument or manually record this funnel before moving the full expedition again:

1. Orientation started → completed/skipped.
2. Time and task number at first anomaly.
3. First anomaly filing choice.
4. Shift 1 completion rate and elapsed time.
5. Shift 2 start rate.
6. Annex order seen → opened → traced/cleared.
7. Promotion tier when the order is resolved.
8. Floor 12 expedition opened.

Ask playtesters immediately after Shift 1 and again after the Annex order:

- “What do you think your next goal is?”
- “What are you curious about?”
- “Which moment would you describe to someone else?”
- “Did promotion feel like more authority, or only a higher number?”
- “At what point did you start clicking without reading?”

Success is not merely that players notice Floor 12. Success is that they can state the personal question, understand that promotion may expose more, and choose to begin Shift 2 to pursue it.

[^ga]: [GameAnalytics, *2026 Mobile & PC Gaming Benchmarks*](https://investgame.net/wp-content/uploads/2026/01/2026-01-27-2026-mobile-pc-benchmarks_compressed.pdf), PC engagement section.
[^steam]: [Valve, *Steam Refunds*](https://store.steampowered.com/steam_refunds/).
[^frictional]: [Frictional Games, *4-Layers, A Narrative Design Approach*](https://frictionalgames.com/2014-04-4-layers-a-narrative-design-approach/).
