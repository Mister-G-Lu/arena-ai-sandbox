# Seven-Space Gauntlet

A single-player roguelite duel on a 7-space line, in the BattleCON idiom.
Each beat you combine a **Style** and a **Base** into one attack — and every
enemy has already told you exactly what it is about to do.

```
Press       (1~2/1/0)   Stun Guard 6. BA: +1 Power per damage taken this beat.
Clockwork   (+0/+3/-3)  Soak 3
-----------------------------------------------------------------------------
Clockwork Press   R 1~2 / POW 4 / PRI -3 / Soak 3 / Stun Guard 6

Husk telegraphs:  Heavy Swing   R 1~1 / POW 5 / PRI 1
```

## Play

```bash
npm run serve         # http://localhost:3000
npm test              # 33 rules tests
npm run balance       # solver telemetry, per character
node tools/forgiveness.mjs   # clear rate vs. player mistake rate
```

## Core rules

**Damage** `= max(0, Power − Soak)`

**The stun rule.** Any damage stuns the target — cancelling their entire
activation — *unless*:

- the target is **Stun Immune**, or
- the target's **Stun Guard ≥ the damage dealt**

Soak therefore does double duty: it blunts damage *and*, by shrinking the
number, makes your Stun Guard more likely to hold. This is why Cadenza feels
armoured rather than merely tanky.

**Beat structure.** Ante → reveal → activate in **Priority** order. "Before
Activating" fires immediately before *that fighter's own* activation, not as a
global band — which is what lets Press read damage it has already absorbed.

## Characters

### Cadenza · Clockwork Knight · *Easy*
Life 20, 3 Shield tokens.

- **Setup:** gain 3 Shield.
- **Ante:** spend a Shield → **Stun Immunity** this beat.
- **Reactive:** whenever you are hit, you may spend a Shield → **Guard 9001**
  (the blow is negated entirely).

| Styles | |
| --- | --- |
| **Hydraulic** (+0/+2/−1) | Soak 1. BA: Advance 1 |
| **Mechanical** (+0/+2/−2) | EoB: Advance up to 3 |
| **Battery** (+0/+1/−1) | EoB: +4 Priority next beat |
| **Clockwork** (+0/+3/−3) | Soak 3 |
| **Grapnel** (+2~4/+0/+0) | OH: Pull target up to 3 |

**Press** (1~2/1/0) — Stun Guard 6. BA: +1 Power for each point of damage you
took this beat.

**Finishers** (Force ≥ Life):
**Rocket Press** (1/8/0) Soak 3, Stun Immunity, BA: Advance at least 2 ·
**Feedback Field** (1~2/1/0) Soak 5, OH: +2 Power per damage soaked.

### Drifter · Nameless Duelist · *Hard*
Life 16, no tokens. No Soak, no safety net — Priority is the only defence.
Included as a contrast case, and to prove the character layer is general.

## Is Cadenza actually forgiving?

That was the design brief, so it gets measured rather than asserted.
`tools/forgiveness.mjs` runs the solver but corrupts a percentage of its
decisions into random legal plays — a direct model of a player making mistakes.

```
  err%   cadenza              drifter
    0%   ###########.  90% (6.9/7)   ###########.  95% (6.8/7)
   10%   #######.....  60% (6.5/7)   #########...  73% (6.0/7)
   20%   #####.......  40% (6.2/7)   ####........  35% (4.3/7)
   30%   ##..........  13% (5.5/7)   #...........   5% (3.0/7)
   40%   #...........  10% (4.8/7)   ............   3% (2.5/7)
   50%   ............   0% (3.9/7)   ............   0% (1.9/7)
```

Read the **encounters cleared** column, not the clear rate: at a 30% mistake
rate Cadenza still reaches 5.5 of 7 while the Drifter collapses to 3.0. The
Drifter is marginally *better* at 0% error and much worse everywhere else —
which is the precise signature of an easy character. Cadenza raises the floor,
not the ceiling.

Supporting telemetry (`npm run balance`), per run:

| | Cadenza | Drifter |
| --- | --- | --- |
| beats spent stunned | **1.56** | 3.77 |
| shields spent | 3.26 | — |
| avg beats per encounter | 4.3 | 6.8 |

Cadenza is stunned less than half as often, and kills faster.

## Making the fantasy legible

"Feel badass with Clockwork" is a UI problem as much as a numbers problem:

- The preview states the consequence in words, not just stats: *"Incoming 5
  damage after Soak. Not enough to stun you."* Choosing Clockwork visibly turns
  that line from a red stun warning to a shrug.
- Anteing a Shield rings your token on the board and stamps **STUN IMMUNE**
  across the preview.
- The reactive Shield **only prompts when the beat would actually kill you** —
  so the question is always dramatic, never nagging.
- Soak / Stun Guard / Stun Immune render as coloured pills on both your preview
  and every enemy intent, because they are the vocabulary of the whole game.

## Counters, so the easy character still has to think

The brief called for "more tactical if enemies have Pushes or Ignore Stun
Guard", so those exist as answers to Cadenza specifically:

- **Automaton** (The Foundry) — **Stun Immune** on every intent. You cannot
  lock it down; you have to out-position it. Its *Shove* (Push 2~3) drags you
  out of melee, which is what **Grapnel** (Pull 3) is for.
- **Brute** — *Brace* has Stun Guard 4 and Soak 2, so chip damage will not stun
  it. You need a real hit.
- **Warden** — *Sunder* is Stun Immune and carries its own stun rider; the ante
  is the clean answer.

## Layout

| Path | What |
| --- | --- |
| `src/characters.js` | Characters, styles, bases, finishers, `combine()`. |
| `src/enemies.js` | Enemy types and telegraph patterns. |
| `src/combat.js` | Beat resolution: ante, priority, soak, the stun rule. |
| `src/run.js` | Gauntlet, hands, cooldowns, upgrades. |
| `test/combat.test.mjs` | 33 tests. |
| `tools/balance.mjs` | Solver telemetry. |
| `tools/forgiveness.mjs` | Clear rate vs. mistake rate. |
| `public/` | Browser client. No build step, no dependencies. |

## Two bugs the tests caught

Worth recording, because both were design errors rather than typos:

1. **BA fired as a global band.** Press's "+1 Power per damage taken this beat"
   always read zero, because every fighter's Before ran before anyone had
   swung. Fixed by moving BA inside each fighter's own activation slot — which
   is both correct and what makes Press a counter-punching base.
2. **`OH: Stun` bypassed Stun Immunity.** Anteing a Shield did nothing against
   the Brute's Stomp or the Warden's Sunder — exactly the attacks it exists to
   answer. Cadenza's whole ante was dead against its intended targets.

## Extending

Add a character to `src/characters.js` with `styles`, `bases`, `finishers` and
an optional token spec — the UI, solver and both harnesses pick it up with no
other changes. Natural next steps: token types beyond Shield (the token block
is already generic), unique enemies per character, and multi-beat charging
intents that telegraph two beats ahead.
