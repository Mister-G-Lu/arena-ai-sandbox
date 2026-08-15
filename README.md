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
npm test              # 70 rules tests
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

**Damage** `= max(0, Power − Armor)`

**The stun rule.** Any damage stuns the target — cancelling their entire
activation — *unless*:

- the target is **Stun Immune**, or
- the target's **Guard ≥ the damage dealt**

Armor therefore does double duty: it blunts damage *and*, by shrinking the
number, makes your Guard more likely to hold. This is why Cadenza feels
armoured rather than merely tanky.

> **Naming.** This project uses the V4 keywords **Armor** (damage reduction)
> and **Guard** (stun prevention). Older printings called these Soak and Stun
> Guard; they are the same two mechanics, renamed.

### Range notation

A Style's range is a **modifier**, not an absolute. Sniper is written
`+3~5`, so on Strike (Range 1) it produces **4~6**, and on Shot (Range 1~4)
it produces **4~9**. Choosing the base is therefore a real decision, not just
a stat pickup.

The exception is an **asterisked range** like `*3~6`. That is *fixed*: it hard
-overrides the pair's range and ignores every range modifier — styles,
Longshot, Gunner's shell, all of it. Both of Rukyuk's finishers and both of
Cadenza's are fixed, since a finisher is a complete attack played without a
Style. Modelled as `fixedRange` in `src/characters.js`.

### Beat structure

Ante → reveal, then five timing bands:

| # | Band | Who | Cancelled by a stun? |
| --- | --- | --- | --- |
| 0 | **On Reveal** (Rev) | before anything resolves | no |
| 1 | **Start** | every fighter, fastest first | no — nobody has swung yet |
| 2 | **Before Activating** (BA) | that fighter, in its own slot | yes |
| 3 | **On Hit** (OH) | riders, *before damage is dealt* | n/a |
| 4 | **the attack** | that fighter, in Priority order | yes — a stunned fighter does not attack at all |
| 5 | **On Damage** (OD) | only if damage actually got through | n/a |
| 6 | **After Activating** (AA) | that fighter | yes — welded to the activation |
| 7 | **End of Beat** (EoB) | every fighter | **no — always fires** |

**On Hit resolves *before* damage.** This is the official ordering and it is
load-bearing: Crossfire's "OH: spend 1 Ammo for +2 Power" and Feedback Field's
"+2 Power per damage absorbed" both have to raise Power before that Power is
applied. **On Damage** is the separate, later band for riders that need the
damage to have landed — like Point Blank's push.

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

### Rukyuk Amberdeen · The Gunslinger · *Hard*
Life 20, **6 Ammo tokens**, each with its own effect.

- **Passive:** ante an Ammo every beat, or your **Range becomes N/A** and you
  simply cannot connect.
- **Setup:** gain all six shells. The *only* way to get them back is Reload.

| Shell | Effect |
| --- | --- |
| **Explosive** | +2 Power |
| **Longshot** | −1 to +1 Range |
| **AP** | Ignore Armor |
| **Swift** | +2 Priority |
| **Flash** | Ignore Guard |
| **Impact** | OH: Push 2 |

| Styles | |
| --- | --- |
| **Sniper** (+3\~5/+1/+2) | AA: Move 1, 2 or 3 |
| **Crossfire** (+2\~3/+1/−2) | Armor 2, Guard 1. OH optional: spend 1 Ammo for +2 Power |
| **Gunner** (+2\~4/+0/+0) | BA optional: spend 1 Ammo for −1 to +1 Range. AA: Move 1 or 2 |
| **Point Blank** (+0\~1/+0/+0) | Guard 2. OD: Push the target up to 2 |
| **Trick** (+1\~2/+0/−3) | Stun Immunity. EoB at range 1: retreat up to 1 |

**Reload** (—/—/4) — does not hit. AA: teleport to any space. EoB: regain all
Ammo. The EoB timing matters: you get your shells back *even if you were
stunned that beat*, which is what makes Reload a reliable panic button.

**Finishers:** **Fully Automatic** (\*3\~6/2/6) Rev: negate used Ammo; OH: spend
all remaining Ammo for +2 Power each · **Force Grenade** (\*1\~2/4/4) Rev: negate
used Ammo, ignore your Style's BA; OH: push up to 6; AA: retreat up to 5.
Force Grenade is the only attack that hits with an empty magazine.

Because his styles are modifiers, **which base you pair them with matters**:

| Sniper (+3\~5) on… | Result |
| --- | --- |
| Strike (1) | 4\~6 |
| Shot (1\~4) | 4\~9 |
| Burst (2\~3) | 5\~8 |

## Is Cadenza actually forgiving?

That was the design brief, so it gets measured rather than asserted.
`tools/forgiveness.mjs` runs the solver but corrupts a percentage of its
decisions into random legal plays — a direct model of a player making mistakes.

```
  err%   cadenza                    rukyuk
    0%   ############  97% (7.0/7)   ##########..  80% (6.8/7)
   10%   #########...  77% (6.7/7)   ########....  70% (6.6/7)
   20%   ######......  47% (6.3/7)   #####.......  43% (5.9/7)
   30%   ##..........  20% (5.4/7)   ##..........  13% (5.2/7)
   40%   #...........   7% (5.1/7)   #...........  10% (4.8/7)
   50%   ............   3% (4.6/7)   ............   3% (4.3/7)

  floor (avg encounters cleared at 30-50% error):
    cadenza 4.98   rukyuk 4.79

  fully random play (tools/sloppy.mjs, 300 runs):
    cadenza 2.27 / 7 encounters
    rukyuk  0.58 / 7 encounters
```

Rukyuk is harder than Cadenza at every level: lower ceiling (80% vs 97% under
perfect play), lower floor (4.79 vs 4.98 encounters), and a hard collapse under
genuinely careless play (**0.58** encounters to Cadenza's **2.27**). He punishes
inattention through his resource rather than through raw numbers — every beat
without a loaded shell is a wasted beat.

Two earlier passes got this backwards and the harness caught both. Ammo used to
refill between encounters, which made the sniper *more* forgiving than the tank
(6.06 vs 4.98); tokens now carry over exactly as the fight ended them. And while
his styles were briefly modelled as absolute ranges, he could not establish
distance at all and needed invented Start-band moves to function — with the
correct modifier maths his reach is real and those crutches are gone.

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
| `src/tokens.js` | Token systems: fungible (Shields) and unique (Ammo). |
| `src/enemies.js` | Enemy types and telegraph patterns. |
| `src/combat.js` | Beat resolution: ante, priority, soak, the stun rule. |
| `src/run.js` | Gauntlet, hands, cooldowns, upgrades. |
| `test/combat.test.mjs` | 33 tests. |
| `tools/balance.mjs` | Solver telemetry. |
| `tools/forgiveness.mjs` | Clear rate vs. mistake rate. |
| `tools/sloppy.mjs` | Fully random play — the harshest forgiveness bar. |
| `public/` | Browser client. No build step, no dependencies. |

## Five bugs the tests caught

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
5. **On Hit resolved *after* damage**, so Feedback Field dealt 1 instead of 11
   and Crossfire's ammo-burn did nothing. Adding Rukyuk forced a read of the
   official turn sequence, which put On Hit before damage and split On Damage
   out as its own band. The finisher had been quietly broken for three commits.

And one that was not a rules bug at all: the solver's state clone was a bare
object spread, which **dropped the `tokens` accessor**. Every score became
`NaN`, every option tied, and the AI just took the first legal play — Rukyuk
scored a 0% clear rate. `cloneState()` now rebuilds the accessor. Worth
remembering that a getter is invisible to `{...obj}`.

## Extending

Add a character to `src/characters.js` with `styles`, `bases`, `finishers` and
an optional token spec — the UI, solver and both harnesses pick it up with no
other changes. Natural next steps: token types beyond Shield (the token block
is already generic), unique enemies per character, and multi-beat charging
intents that telegraph two beats ahead.
