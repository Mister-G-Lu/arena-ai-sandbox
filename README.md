# Seven-Space Gauntlet

A single-player roguelite duel on a 7-space line. Each turn you combine a
**Base** and a **Style** into one attack — and every enemy has already told you
exactly what it is about to do.

```
Drive       Range 1,   Att 3, Spd 4, Before: Advance 1~2
Powerful   +0 Range,  +1 Att, +1 Spd
-----------------------------------------------------------
Powerful Drive   Range 1, Att 4, Spd 5, Before: Advance 1~2

Husk telegraphs:  Shamble  R 1~1 / ATT 2 / SPD 2 / Before: Advance 1~2
```

Nothing is hidden. Range, damage, speed, movement and rider effects are all on
screen before you commit, so a loss is always a puzzle you misread — never a
coin flip.

## Play

```bash
npm run serve      # http://localhost:3000
npm test           # 21 rules tests
npm run balance    # headless solver, 300 runs of difficulty telemetry
```

## The loop

Six encounters, escalating. Life carries between fights; after each win you pick
a new Base, a new Style, or a heal. Death ends the run.

| # | Encounter | Shape |
| --- | --- | --- |
| 1 | The Threshold | One husk. Learn to read a telegraph. |
| 2 | Two Blades | Enemies on both sides — don't get sandwiched. |
| 3 | The Long Hall | An archer that punishes standing still. |
| 4 | Ironclad | A brute that guards, then punishes. |
| 5 | Crossfire | Three enemies, two directions. |
| 6 | The Warden | A boss that *reads your position* and answers it. |

## Reading a turn

1. Every living enemy shows its intent: name, `R min~max`, `ATT`, `SPD`, and any
   Before/Hit/After riders.
2. The board paints **green** where your selected attack reaches and **red**
   where enemies will reach — including the movement in their telegraph.
   Overlap is amber: you trade.
3. Your preview says plainly whether the attack connects and how many enemy
   attacks resolve before yours.
4. Everything resolves in **Spd** order. Kill something before it acts and it
   never acts.

Tools available: **Guard** (subtracts from incoming damage), **Stagger**
(cancels an attack outright — only if you're faster), and movement riders
(Advance / Retreat / Close / Push / Pull / Vault) that let you step out of a
telegraphed range band entirely.

## Layout

| Path | What |
| --- | --- |
| `src/cards.js` | Bases, styles, reward cards, and `combine()`. |
| `src/enemies.js` | Enemy types and their telegraph patterns. |
| `src/combat.js` | Encounter resolution: initiative, movement, damage, board integrity. |
| `src/run.js` | Roguelite layer: encounters, deck, cooldowns, rewards. |
| `src/rng.js` | Seeded RNG — a run replays exactly from its seed. |
| `test/combat.test.mjs` | 21 tests, including "the telegraph is what actually resolves". |
| `tools/balance.mjs` | Headless solver + difficulty telemetry. |
| `public/` | Browser client. No build step, no dependencies. |

## Balance

Because intents are public, a solver can evaluate a turn *exactly* rather than
guess — so the harness measures something real: can a competent player clear
this? Current tuning over 150 solver runs:

```
clear rate: 60.0%   avg encounters cleared: 5.57 / 6

The Threshold    #################### win 100%  avg 3.1 turns  20.0 life left
Two Blades       #################### win 100%  avg 4.5 turns  17.3 life left
The Long Hall    #################### win 100%  avg 8.0 turns  14.4 life left
Ironclad         #################### win  99%  avg 7.5 turns  15.0 life left
Crossfire        #################### win  99%  avg 6.6 turns  12.4 life left
The Warden       ############........ win  61%  avg 8.3 turns   3.3 life left
```

The boss is the wall and runs end at ~3 life — the curve you want. An earlier
pass had The Long Hall as a 10-turn slog at 95%; giving the Archer a
`Point Blank` intent so it can't kite forever fixed the pacing.

## Design notes

- **Intents are the same data shape as player attacks**, so one `applyEffect`
  switch and one resolution pipeline handle both sides. Adding a keyword is a
  few lines, not a new code path.
- **The boss cheats legibly.** The Warden picks its intent from your current
  distance and its own life, so it answers turtling and kiting — but it still
  shows you the answer before you commit.
- **Cooldowns, not resources.** A played card is unavailable for two turns, so
  you rotate through your deck instead of spamming the best combo. Rewards
  widen the rotation rather than raising raw numbers.
- Seeded RNG throughout: the end screen prints the seed, so any run is
  reproducible for debugging or sharing.

## Extending

Add to the arrays in `src/cards.js` or a pattern to `src/enemies.js` — the UI,
the solver and the balance harness pick it up with no other changes. Natural
next steps: relics/passives, elite variants with modified patterns, a branching
map instead of a fixed gauntlet, and multi-turn "charging" intents that
telegraph two turns ahead.
