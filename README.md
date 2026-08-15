# Seven-Space Arena

A 1v1 tactical duel on a 7-space line. Each turn both fighters secretly pick a
**Base** attack and a **Style** modifier; the two combine into the attack that
actually resolves. Highest **Spd** strikes first — ties resolve simultaneously.

```
Drive      Range 1,    Att 3, Spd 4, Before: Advance 1~2
Powerful  +0 Range,   +1 Att, +1 Spd
--------------------------------------------------------
Powerful Drive  Range 1, Att 4, Spd 5, Before: Advance 1~2
```

## Play

```bash
npm run serve     # http://localhost:3000
npm test          # rules engine test suite
```

## Rules

- **Board** – 7 spaces. Two fighters can never share a space. Moving *toward*
  the opponent may pass through them; moving away cannot.
- **Life** – 18 each. Reduce the opponent to 0.
- **Turn** – both choose Base + Style → resolve `Before → Hit → After` in
  Spd order. A KO'd fighter never gets to swing back.
- **Range** – measured in spaces between fighters; `1~3` means distance 1, 2 or 3.
- **Guard** – subtracted from incoming damage that turn.
- **Stun** – cancels the target's attack entirely (only if you strike first).
- **Hand cycling** – a card you play is unavailable for the next two turns, so
  you can't spam your best combination.

## Layout

| Path | What |
| --- | --- |
| `src/engine.js` | Pure rules engine: cards, combination, movement, resolution, AI. No dependencies, runs in Node and the browser. |
| `test/engine.test.mjs` | Test suite covering combination math, initiative, stun, guard, board invariants and hand cycling. |
| `public/` | Browser client — board, threat-range highlighting, live combo preview, combat log. |
| `server.mjs` | Zero-dependency static file server. |

## Design notes

- Styles are *deltas* (`dRange`, `dAtt`, `dSpd`, plus their own timed effects),
  so 8 bases × 8 styles already yields 64 distinct attacks; adding one card
  adds eight more.
- Effects are plain data (`{k:'advance', min:1, max:2}`) interpreted by one
  `applyEffect` switch — new keywords are a few lines each, not new code paths.
- The AI enumerates its 25 legal combinations, optimises the ranged choices
  (Advance 1 vs 2) by simulation, and scores each against a random sample of
  opponent plays. Balance was tuned by running 200 headless AI-vs-AI duels
  (currently 91–97 with 12 stalls, averaging 5.6 turns).

## Extending

Add a base or a style to the arrays at the top of `src/engine.js` — the UI,
the AI and the balance harness pick it up with no other changes. Natural next
steps: unique-character card pools, simultaneous hidden selection over a socket,
and reactive effects (`On being hit:`).
