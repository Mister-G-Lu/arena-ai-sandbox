# Glitches — the secret resource

> This document defines glitches as a deliberate design system, not an oversight.
> Every "flaw" in Meridian is intentional — both in-fiction (the simulation has
> cracks) and out-of-fiction (the designer put them there for the player to find).

## What glitches are

Glitches are **kept evidence of simulation flaws**. Most errors the operator
encounters self-correct: the system patches the record, the anomaly disappears,
and the queue moves on. But some errors can be *preserved* — filed as-is,
without correction — and those preserved errors become **glitches**: permanent
entries in the operator's ANOMALIES ON FILE section.

Glitches are the game's **secret resource**. They are:

- **Not farmable.** Each glitch has exactly one trigger condition. There is no
  repeatable action that generates them.
- **Missable.** A perfectly compliant operator who files everything clean will
  finish the game with zero glitches.
- **A choice.** Every glitch trigger gives the operator a chance to file clean
  (erase the evidence, gain Routine/credits) or keep it (preserve the evidence,
  gain Doubt, unlock endgame progress).
- **Permanent.** Once kept, a glitch cannot be removed from the operator file.

## How glitches relate to the endgame

The endgame has two prerequisites:

1. **Components** (6 physical pieces from secret zones) — these are the *body*
   of the Seam Ripper.
2. **Glitches** (evidence across 5 categories) — these are the *knowledge* the
   Seam Ripper needs to function.

A player with all 6 Components but no Glitches has built a tool but does not
know what reality it cuts. A player with Glitches but no Components has the
knowledge but not the means. The true ending requires both.

### The five evidence categories

| Category | What it proves | Example glitch |
|---|---|---|
| `simulation` | Meridian is a program, not a city | THE WORD (ledger overflow) |
| `architecture` | The simulation has physical structure that lies | THE FLOOR THAT IS NOT (Floor 12) |
| `identity` | The operator is not what the system says they are | YOUR HANDWRITING (self-authored order) |
| `history` | The system has erased people who existed | OPERATOR 5 (the missing operator) |
| `agency` | The operator can act outside the simulation's frame | THE GAP AT 06:00 (the reboot seam) |

The Seam Ripper requires evidence from **all five** categories. Each category
must be proven at least once. This means the true ending is gated by
*knowledge breadth*, not grind — the player must have noticed, questioned, and
preserved evidence across multiple kinds of flaw.

## How glitches are discovered

Each glitch has one trigger. Triggers are spread across the game:

| Glitch | Trigger | Missable? |
|---|---|---|
| THE WORD | Push the ledger past 2^31 | Yes — requires deliberate overflow |
| THE FLOOR THAT IS NOT | Complete Floor 12 expedition | No — part of Arc I |
| YOUR HANDWRITING | Encounter the self-authored order (Shift 3+) | Somewhat — requires investigation |
| OPERATOR 5 | Find clues in Vent Network + break room | Yes — requires exploration |
| THE GAP AT 06:00 | Witness the 06:00 reboot after accumulating Doubt | Yes — requires attention |

A "perfectly compliant" player (all Routine, no Doubt, never investigate) will
reach the KEEP LOGGING ending with zero glitches. This is **by design**: the
system rewards compliance with comfort, not freedom.

## Design rules for adding new glitches

1. **One trigger, one glitch.** No repeatable generation.
2. **Requires noticing.** The operator must choose to see something the system
   would prefer they did not.
3. **Has a clean alternative.** Every trigger offers a way to file clean and
   erase the evidence. The choice is the game.
4. **Fills a category gap.** Do not add a second `simulation` glitch unless
   the first one is missable and you want a fallback. Prefer covering
   uncovered categories.
5. **The `reveals` field is a contract.** It must match one of the five
   canonical categories. The endgame gates on these.
6. **Deserves its title.** A glitch is a discovery the player earned. The
   title and description should feel like evidence, not a tooltip.

## In-fiction framing

The operator's job is to **handle exceptions**. The Dispatch Office is the
simulation's error handler. When something breaks — a floor that shouldn't
exist, a signature that isn't yours, a number that wraps — the system sends
it to you as a work order.

Most errors are designed to be corrected: you file them clean, the system
patches the record, and the anomaly disappears. But some errors are too true
to patch. The system *offers* to correct them, because that is its job. The
operator can refuse, because that is *their* job.

A glitch is an error the operator chose to keep. The system does not
understand why anyone would do this. That is because the system is the
simulation, and the operator is the one who noticed.
