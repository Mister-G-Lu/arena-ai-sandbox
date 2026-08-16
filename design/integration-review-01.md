# Integration Review 01 — Casual Speedplay (12 simulated nights)

### Method

Played the shipped build the way a casual operator would: orientation →
queue → notices when curious → one supply purchase per night → file most
corruptions clean, log the first one of each shift. Driven through the real
App UI (jsdom click-through, seeded RNG), 12 nights in one sitting — a
"speedplay" of the habit model. Findings below are from that diary; the
invariants the fixes guarantee now live in `src/__tests__/pacing.test.tsx`.

### The diary, before fixes (abridged)

| Night | New cards read | Notes |
|---|---|---|
| 1 | 1 (routine pool) | 4 anomalies; hook at task 10 ✓ |
| 2 | **15** | **Floor 12 breached and completed — NULL KEY in pocket.** Annex lead, restricted files, pool, two supply zones all in one sitting. |
| 3 | 6 | Handwriting case, day-crew notes. Doubt/Perception both capped at 5. |
| 4–6 | 1 each | Last supply zones. |
| 7–12 | **0** | Byte-identical nights: same init line, same vistas, M. silent since Day 3. Anomaly lines recycle hard ("ERROR: the coffee was warm" ×7 in 12 nights; personal pool of 5 repeats by Day 4). |

### Findings and dispositions

1. **The Month-1 climax fired on Day 2.** The designed "Day 30+ for tryhards"
   breach (arcs §2.5) opened the moment the annex lead was traced, because the
   zone gate was the §2.2 promotion gate, not the §2.5 breach gate. *Fixed:
   expedition now sealed until Day 4 + Doubt ≥ 3 + Perception ≥ 2; the true
   Day-30 floor waits on the remaining Month-1 content (noted in arcs.md).*
2. **One-evening content dump, then dead air.** 15 cards on Day 2, then 1, 1,
   1, then nothing. *Fixed: the drawer and each supply zone declare the night
   they open (3–7), so the first week pays out one fresh beat per night.*
3. **A shift could pay a single anomaly.** The "second anomaly by task 50"
   guarantee assumed all 50 actions go to the queue; notice-heavy shifts file
   fewer tasks and skipped the debt (Day 5: one anomaly). *Fixed: the second
   anomaly is owed by the last task the remaining budget can file.*
4. **Anomaly decks too small for the arc.** 7 generic + 5 personal lines
   versus ~3 anomalies/night meant near-weekly repeats, and two personal
   lines were written as first-time reveals that kept replaying after their
   case closed. *Fixed: decks widened (11 generic, 8 personal), resolved-case
   reveals retire, and the personal line rotates by night so consecutive
   shifts never repeat.*
5. **Wording.** The Day-3 order promised "the key in your pocket" before the
   NULL KEY exists; the Floor 12 retreat spoke in designer voice ("the zone's
   prize"); the radio permit muddled the license clock; the utility closet
   had a fuse box "labelled with the current one". *All four fixed.*
6. **Foreshadowing.** The Auditor ("a face that is a blur of badges") walked
   in with no prior seed. *Fixed: audit stamp in the Week-41 patch notes plus
   a window vista of a watcher whose badge keeps changing names.*
7. **Glitch text effect — verdict.** Yes, generic corruption should glitch,
   briefly, on arrival: the `.fx-flicker` animation shipped in the stylesheet
   but was never applied. Personal lines deliberately do **not** flicker —
   they are precision, not noise, and the horror is that they hold steady.
   *Fixed: generic log lines and review cards flicker once (150 ms, ×2);
   personal lines keep their steady amber; both die under reduced motion.*

### Still out of scope (content volume, not tuning)

- Nights 8–30 have ambient texture now (M.'s nightly check-in, wider decks,
  rotating shift-open lines) but no authored beats. The six Month-1 tracks
  (arcs §2.3) — VANTABLACK's weekly callsign mutations, the radio thread,
  more day-crew notes, the Ledger overflow on-ramp — are the content that
  earns the Day-30 floor. No gate tuning substitutes for them.
- Doubt/Perception cap at 5 on Night 2; fine for now, but Arc II needs
  headroom or the numbers stop meaning anything.
- Attention pegs at 10 with no consequence yet — its first real consumer is
  still unbuilt.
- The routine pool promises a refill "on a schedule nobody has ever seen";
  the schedule does not exist yet.
