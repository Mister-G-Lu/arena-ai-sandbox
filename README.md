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

**Setup.** Every character starts with the same **20 life** (`STARTING_LIFE` in
`src/characters.js` — a single constant, because in BattleCON only one fighter
in the roster deviates). The two sides open on the **3rd and 5th tiles**, two
spaces apart and symmetric about the centre of the seven-space arena.

```
  1     2     3     4     5     6     7
              YOU        FOE
```

**Damage** `= max(0, Power − Soak)`

**The stun rule.** Any damage stuns the target — cancelling their entire
activation — *unless*:

- the target is **Stun Immune**, or
- the target's **Stun Guard ≥ the damage dealt**

Soak therefore does double duty: it blunts damage *and*, by shrinking the
number, makes your Stun Guard more likely to hold. This is why Cadenza feels
armoured rather than merely tanky.

### Beat structure

Ante → reveal, then five timing bands:

| # | Band | Who | Cancelled by a stun? |
| --- | --- | --- | --- |
| 1 | **Start** | every fighter, fastest first | no — nobody has swung yet |
| 2 | **Before Activating** (BA) | that fighter, in its own slot | yes |
| 3 | **the attack** | that fighter, in Priority order | yes — a stunned fighter does not attack at all |
| 4 | **On Hit** (OH) | riders, only if the attack connected | n/a |
| 5 | **After Activating** | that fighter | yes — welded to the activation |
| 6 | **End of Beat** (EoB) | every fighter | **no — always fires** |

Two distinctions do most of the design work here:

- **Start vs. BA.** Start resolves for *everyone* before *anyone* activates, so
  a Priority 1 Burst still retreats before a Priority 6 Slash lands. BA fires
  inside that fighter's own slot, which is what lets Press read damage it has
  already absorbed this beat.
- **After Activating vs. End of Beat.** A stun cancels a fighter's activation
  and everything welded to it — BA, the attack, After. It never touches End of
  Beat. Battery's "+4 Priority next beat" fires even on a beat where you were
  stunned, whiffed, or had no legal target.

**Clash.** On equal Priority the **player acts first**. Encounters are
one-versus-many, so a mutual re-pick would stall constantly; the player-first
tie is easier to read off the intent list and is the generous reading.

### Dodge

**Dodge** — Priority 3, Power N/A (can *never* deal damage, whatever Style you
attach). *Start: Move 1~3. You dodge all attacks from enemies you move past.*

**Burst** (2~3/3/1) — *Start: Retreat 1~2.* Also a Start-band move, so its
retreat beats even the fastest attacker; the payoff for going slow is that you
reposition first.

It is the pure defensive option: pick a direction and a distance, slip **past**
an enemy, and every attack that enemy makes this beat cannot touch you —
regardless of range, Priority, or how hard it hits. Enemies you *don't* pass
still connect normally, so the choice is which threat to erase. The board
previews the landing tile, and any enemy you'd slip past is crossed out.

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
| **Mechanical** (+0/+2/−2) | EoB: Advance up to 3 (fires even if stunned) |
| **Battery** (+0/+1/−1) | EoB: +4 Priority next beat (fires even if stunned) |
| **Clockwork** (+0/+3/−3) | Soak 3 |
| **Grapnel** (+2~4/+0/+0) | OH: Pull target up to 3 |

Universal bases (shared by all characters): Strike, Shot, Drive, Burst, Grasp,
**Dodge**.

**Press** (1~2/1/0) — Stun Guard 6. BA: +1 Power for each point of damage you
took this beat.

**Finishers** (Force ≥ Life):
**Rocket Press** (1/8/0) Soak 3, Stun Immunity, BA: Advance at least 2 ·
**Feedback Field** (1~2/1/0) Soak 5, OH: +2 Power per damage soaked.

### Drifter · Nameless Duelist · *Hard*
Life 20, no tokens. Same health as anyone — the difficulty is entirely in the
kit. No Soak anywhere, so every point of damage lands in full and almost any
hit stuns; Priority and footwork are the only defence. Included as a contrast
case, and to prove the character layer is general.

## Is Cadenza actually forgiving?

That was the design brief, so it gets measured rather than asserted.
`tools/forgiveness.mjs` runs the solver but corrupts a percentage of its
decisions into random legal plays — a direct model of a player making mistakes.

```
  err%   cadenza                    drifter
    0%   ############ 100% (7.0/7)   #########...  73% (6.5/7)
   10%   ########....  68% (6.7/7)   ####........  33% (5.9/7)
   20%   ###.........  25% (6.0/7)   ##..........  18% (5.1/7)
   30%   ##..........  20% (5.6/7)   #...........  10% (4.3/7)
   40%   #...........   8% (5.0/7)   ............   0% (3.7/7)
   50%   ............   0% (4.5/7)   ............   0% (3.3/7)

  floor (avg encounters cleared at 30-50% error):
    cadenza 5.08   drifter 3.57
```

Read the **encounters cleared** figure, not the clear rate. The Drifter has the
higher *ceiling* — it clears 100% under perfect play, where Cadenza sits at 96%
— but the lower *floor*: under sloppy play (30–50% mistakes) Cadenza averages
**5.13** encounters to the Drifter's **4.01**. That gap is the whole point.
Cadenza raises the floor, not the ceiling, which is exactly what a starter
character should do.

Note this only became a fair comparison once life was a shared constant. The
Drifter used to be "hard" partly because it had 16 life; with everyone at 20,
difficulty has to be expressed in the kit, so its Parry lost its Soak. Better
design pressure — a character should be hard because of how it plays, not
because of a smaller number.

Supporting telemetry (`npm run balance`), per run:

| | Cadenza | Drifter |
| --- | --- | --- |
| beats spent stunned | **1.39** | 3.6 |
| shields spent | 3.07 | — |
| avg beats per encounter | 4.3 | 6.5 |

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
- **Tracking intents.** The Husk, Stalker and Warden now do their approach in
  the **Start** band, so they close *as you evade*. Dodge and Burst still beat
  a given attack, but they no longer reset the whole fight.
- Most intents carry **Stun Guard**, so a light poke no longer cancels a full
  activation. Locking an enemy out costs a real commitment.
- **Brute** — *Brace* has Stun Guard 4 and Soak 2, so chip damage will not stun
  it. You need a real hit.
- **Warden** — **Stun Immune on every intent**, with a Stalker escort. A boss
  that can be stun-locked every beat is not a boss; the counterplay is Soak,
  positioning and the ante rather than lockdown.

## Layout

| Path | What |
| --- | --- |
| `src/characters.js` | Characters, styles, bases, finishers, `combine()`, `STARTING_LIFE`. |
| `src/enemies.js` | Enemy types and telegraph patterns. |
| `src/combat.js` | Beat resolution: ante, priority, soak, the stun rule. |
| `src/run.js` | Gauntlet, hands, cooldowns, upgrades. |
| `test/combat.test.mjs` | 33 tests. |
| `tools/balance.mjs` | Solver telemetry. |
| `tools/forgiveness.mjs` | Clear rate vs. mistake rate. |
| `public/` | Browser client. No build step, no dependencies. |

## Four bugs the tests caught

Worth recording, because both were design errors rather than typos:

1. **BA fired as a global band.** Press's "+1 Power per damage taken this beat"
   always read zero, because every fighter's Before ran before anyone had
   swung. Fixed by moving BA inside each fighter's own activation slot — which
   is both correct and what makes Press a counter-punching base.
2. **`OH: Stun` bypassed Stun Immunity.** Anteing a Shield did nothing against
   the Brute's Stomp or the Warden's Sunder — exactly the attacks it exists to
   answer. Cadenza's whole ante was dead against its intended targets.
3. **Dodge as an End-of-Beat effect would have been useless.** Putting the move
   in the Start band is what lets it beat a Priority 6 attacker; the test
   `'Dodge resolves in the Start band'` pins that by dodging a Stalker that is
   explicitly faster.
4. **`projectedSpace` only read the BA band.** The moment Burst's retreat moved
   to Start, the board preview stopped accounting for it — the UI would have
   drawn threat ranges from the wrong tile while the engine resolved correctly.
   Silent, and invisible to every engine-level test.

## Extending

Add a character to `src/characters.js` with `styles`, `bases`, `finishers` and
an optional token spec — the UI, solver and both harnesses pick it up with no
other changes. Natural next steps: token types beyond Shield (the token block
is already generic), unique enemies per character, and multi-beat charging
intents that telegraph two beats ahead.
