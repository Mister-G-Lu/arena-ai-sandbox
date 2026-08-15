# Should enemies swarm from both sides, or arrive on one?

A design note, with the measurements behind it. Everything here comes from
`/tmp/geo.mjs`-style probes over the live engine; the reproducible versions
live in `tools/`.

## The short answer

**Neither, exclusively.** Use one-side arrival as the default, pincers as a
deliberate, telegraphed *event* — and never pincer with three or more enemies
on a seven-space board.

The reasoning is below, including the part where my intuition was wrong.

---

## 1. The geometry is unforgiving

Seven spaces is small. With three enemies placed on both sides, the board
stops having usable positions at all:

```
layout            melee 1~2   mid 2~4   sniper 3~6   tiles >=3 from all
pincer  (1,4,7)      4/4        0/4        0/4              0
pincer  (1,5,7)      4/4        1/4        0/4              0
oneside (4,6,7)      3/4        2/4        1/4              1
oneside (5,6,7)      2/4        3/4        2/4              2
pair    (1,7)        4/5        3/5        1/5              1
pair    (5,7)        3/5        3/5        2/5              2
```

Max distance you can achieve from the nearest enemy:

```
pincer  (1,4,7): 1      oneside (4,6,7): 3
pincer  (1,5,7): 2      oneside (5,6,7): 4
```

A three-enemy pincer caps your maximum achievable distance at **1–2**. Every
tile on the board serves melee and only melee. That is not a hard fight for a
ranged character — it is a fight where a ranged character's rules text has
been deleted. Rukyuk's Sniper pair (4~6 on Strike) literally cannot connect
from anywhere.

**This is the one firm rule: three-enemy pincers are illegal.** Not because
they are difficult, but because they remove a legal option rather than
pressuring it.

## 2. The surprise: pincers are *safer*, not deadlier

Intuition says surrounded = dangerous. Measured over 30 solver runs per cell,
same three enemies, only the arrangement changed:

```
layout            char      win   beats   life left   avg engagement distance
pincer  (1,5,7)   cadenza   100%   7.6      16.8            1.94
pincer  (1,5,7)   rukyuk    100%   9.6      16.4            2.63
oneside (4,6,7)   cadenza   100%   6.9      13.5            2.33
oneside (4,6,7)   rukyuk    100%   9.0      13.6            3.12
oneside (5,6,7)   cadenza   100%   6.7      13.6            1.96
oneside (5,6,7)   rukyuk    100%   9.8      12.9            3.00
```

The pincer leaves you with **3.2 more life**. Why?

```
beats threatened by 0 / 1 / 2 / 3+ enemies
  pincer  (1,5,7):   54%   38%    8%   0%
  oneside (5,6,7):   30%   39%   30%   2%
```

Stacked enemies threaten you **simultaneously 32% of the time**; a pincer
manages it 8% of the time. The static overlap numbers say the same thing —
average enemies within reach 2 of a random tile:

```
pincer  (1,5,7): 1.50     oneside (5,6,7): 0.75
pincer  (1,4,7): 2.00     oneside (4,6,7): 1.25
```

Note the static figure favours the pincer while the *played* figure favours
one-side. That gap is the whole insight: **enemies converging from opposite
directions arrive one at a time.** They spend their approach beats walking
toward you from different distances, so their threat windows stagger. Enemies
stacked together are already mutually close, so any tile within reach of one
is within reach of several, and they land together.

A pincer looks scarier and plays softer. Stacking looks softer and plays
harder.

## 3. But one-side has its own failure: the corner

The counterweight is that stacking pushes the fight toward a board edge, and a
seven-space line has very little room behind you. In the runs above the player
sat on tile 1 or 7 for 6% of beats — low, but the solver is good at footwork.
A human retreating from three enemies will corner themselves far more often,
and a cornered fighter has lost the ability to use Retreat, Burst, Dodge and
Sniper's AA move all at once.

So the two layouts fail in opposite directions:

| | Pincer | One side |
| --- | --- | --- |
| Threat pattern | staggered, one at a time | simultaneous, 32% multi-threat |
| Positioning | no safe tile exists | safe tiles exist but shrink |
| Failure mode | ranged kits become unplayable | player corners themselves |
| Feels | frantic but survivable | pressured and compressed |

## 4. Does each character still get to play its identity?

The test that mattered most — what fraction of your damage lands from your
preferred band:

```
layout            char      damage from preferred band   first kill   avg kill
pincer  (1,5,7)   cadenza             87%                  beat 1.7    beat 4.4
pincer  (1,5,7)   rukyuk              48%                  beat 3.4    beat 6.4
oneside (5,6,7)   cadenza             87%                  beat 1.4    beat 4.4
oneside (5,6,7)   rukyuk              61%                  beat 2.1    beat 6.3
```

Cadenza is indifferent — 87% either way. He wants range 1–2 and something is
always at range 1–2.

Rukyuk is not: **48% in a pincer versus 61% on one side**, and his first kill
slips from beat 2.1 to beat 3.4. In a pincer he spends the opening beats
scrambling for a firing line that does not exist, and over half his damage
comes from outside the band his whole kit is built around.

That asymmetry is the deciding argument. A layout that is merely *harder* for
one character is fine — that is what character difficulty means. A layout that
makes one character stop being themselves is a design bug.

## 5. The decision

**Default: one side.** It produces the higher real difficulty (3.2 less life
remaining), the more interesting threat pattern (simultaneous windows you must
answer with Guard, Armor, or a stun), and it preserves every character's
identity. It also reads clearly on a seven-space board: a visible advancing
line you are giving ground to.

**Pincers: allowed, but as an event.** Specifically:

- **Two enemies maximum.** A 2-enemy pincer still leaves a tile at distance 3
  (see `pair (1,7)` above), so ranged kits keep a line.
- **Mixed roles, not two brawlers.** The interesting version is one melee
  pressure enemy and one ranged enemy, so you cannot solve it by facing one
  way.
- **Announce it.** A pincer should be the encounter's stated gimmick, not an
  accident of placement.

**Never: three-or-more pincers.** They cap achievable distance at 1–2 and
delete ranged play entirely.

## 6. What this means for the current gauntlet

Current placements after this analysis:

| Encounter | Layout | Rationale |
| --- | --- | --- |
| The Threshold | one enemy | teaching |
| Two Blades | one side (5, 7) | first multi-threat, gentle |
| The Long Hall | one side (5, 7) | archer holds the back line |
| Ironclad | one enemy | teaching Guard/Armor |
| The Foundry | one side (5, 6, 7) | three bodies, compression |
| Crossfire | one side (5, 6, 7) | the name is now wrong — see below |
| The Warden | one side (5, 7) | boss plus escort |

Two follow-ups this analysis argues for, which I have **not** made yet because
they are design changes rather than fixes:

1. **"Crossfire" should earn its name.** It is the natural home for the
   sanctioned 2-enemy pincer: an archer at 1 and a stalker at 7, with the
   third body cut. That is a real crossfire, it stays legal for Rukyuk, and it
   makes the encounter mechanically distinct instead of being a second
   Foundry.
2. **A corner-pressure counter.** If one-side stacking is the default, the
   board edge becomes the recurring danger, and characters vary a lot in how
   well they escape it. Cadenza has Grapnel (pull) and Mechanical (advance);
   Rukyuk has Reload's teleport. That is probably enough, but it is worth
   watching whether "get cornered, die" becomes the dominant loss pattern.

## 7. The corner risk, measured

The section above was written as a caveat: the solver plays footwork well, so
its 6% corner rate understates what a human will do. Re-running the same
layouts under *random* play (200 runs each) confirms the worry, and shows it
is strongly character-dependent:

```
layout            char      win   beats in a corner   died while cornered
pincer  (1,7)     cadenza   60%          15%                  25%
pincer  (1,7)     rukyuk     5%          37%                  51%
oneside (5,6,7)   cadenza    4%          19%                  23%
oneside (5,6,7)   rukyuk     1%          53%                  41%
pincer  (1,5,7)   cadenza   12%           6%                  11%
pincer  (1,5,7)   rukyuk     1%           2%                   2%
```

Three things fall out of this:

**The corner is a genuine failure mode, and it is Rukyuk's.** He spends 53% of
beats against a board edge in one-side layouts and dies there 41% of the time.
Cadenza sits around 19% / 23%. This is not unfair — a sniper backing away from
an advancing line *should* run out of room — but it means "one side" is
implicitly a Rukyuk tax, and the difficulty gap between the two characters is
larger than the win rates alone suggest.

**A 2-enemy pincer is the gentlest layout for a careless player** (Cadenza 60%
vs 4% one-side). Being able to move *through* the middle of the board means a
panicking player always has somewhere to go. This strengthens the case for
sanctioning the 2-enemy pincer rather than banning pincers outright.

**The 3-enemy pincer inverts under bad play.** It shows the *lowest* corner
rate (2–6%) because you are never pushed anywhere — but the win rates are
dismal (12% / 1%) because there is nowhere safe to stand either. It is not
"safe", it is airless. That is a second, independent argument against it.

## 8. Revised recommendation

The corner data does not overturn the decision, but it sharpens it:

- **One side stays the default** — it is the harder, more interesting fight
  and it preserves both identities.
- **Vary which side.** If the pack always arrives from the high tiles, the
  player always retreats toward tile 1 and the corner becomes rote. Alternating
  the approach direction between encounters costs nothing and keeps footwork a
  live decision.
- **Do not stack three enemies at 5/6/7 more than once in a run.** It is the
  single most corner-inducing shape measured (53% for Rukyuk). The Foundry can
  keep it as its signature; Crossfire should not duplicate it.
- **The sanctioned 2-enemy pincer is now doubly justified**: it keeps a
  distance-3 tile for ranged kits *and* it is the most forgiving shape for a
  flailing player, which makes it a good mid-run breather.

## 9. What changed, and one thing that did not

Applied from this analysis:

- **Crossfire is now the sanctioned two-enemy pincer** (archer at 1, stalker
  at 7, player at 4). It earns its name, it is mechanically distinct from the
  Foundry's three-stack, and it keeps a distance-3 tile.
- **The Long Hall is mirrored** — the pack approaches from the low side, so a
  run does not train you to always retreat the same way.
- **Three invariants are now tested**, not just intended: standard encounters
  open 3-vs-5, at most one pincer per run and never with three enemies, and
  *every* encounter must leave a tile at distance 3 from all enemies. That
  last one is the hard floor that makes ranged kits viable.

One thing this analysis surfaced but did **not** solve: the Warden fight is
still soft for Rukyuk (finishes at ~18 life versus Cadenza's ~6). The escort
dies on beat 1, and the boss then cycles intents while a sniper plinks it from
range 3. Widening Chain Pull's trigger from "distance 5+" to "distance 4+"
helped — a sniper parks at 3.19 and was never giving it 5 — but the deeper
issue is that a single reactive boss cannot pressure a ranged character the way
three converging bodies can. That is a boss-design problem, not a placement
one, and it deserves its own pass rather than being papered over by moving
tiles around.

## 10. Caveat on the method

Every number here comes from either the one-ply solver or uniformly random
play. Neither is a human. The solver understates corner risk; random play
overstates it, and also overstates Rukyuk's weakness because it fires without
checking ammo. The truth sits between them, which is why the argument above
leans on the *direction* of each effect and on the static geometry — those do
not depend on how well the harness plays.
