// Headless balance harness.
//
// Because every enemy intent is telegraphed, a solver can evaluate a play by
// simulating the turn exactly — no guessing. That makes this harness a real
// measure of "can a competent player clear this?", which is the number that
// matters for a roguelite.
//
//   node tools/balance.mjs [runs]

import { startEncounter, resolveTurn } from '../src/combat.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
  rewardOptions, takeReward, advance, loseRun, ENCOUNTERS,
} from '../src/run.js';
import { playerAttack } from '../src/combat.js';

const RUNS = Number(process.argv[2] || 300);

function cloneState(s) {
  return {
    ...s,
    log: [],
    player: { ...s.player },
    enemies: s.enemies.map((e) => ({ ...e, intent: e.intent })),
  };
}

/** Greedy one-ply solver: try every hand combination, keep the best outcome. */
function solve(s, hand) {
  let best = null;
  const targets = [undefined, ...s.enemies.filter((e) => e.life > 0).map((e) => e.uid)];
  for (const b of hand.bases) {
    for (const st of hand.styles) {
      const atk = playerAttack(b, st);
      const pickSets = [{}];
      // try the extremes of each variable movement range
      for (const eff of [...atk.before, ...atk.after]) {
        if (eff.min === eff.max) continue;
        const extra = [];
        for (const base of pickSets) {
          for (let v = eff.min; v <= eff.max; v++) extra.push({ ...base, [eff.k]: v });
        }
        pickSets.length = 0;
        pickSets.push(...extra.slice(0, 12));
      }
      for (const picks of pickSets) {
        for (const targetUid of targets) {
          const sim = cloneState(s);
          resolveTurn(sim, { baseId: b, styleId: st, picks, targetUid });
          const dealt = s.enemies.reduce((a, e, i) => a + (e.life - sim.enemies[i].life), 0);
          const taken = s.player.life - sim.player.life;
          const kills = sim.enemies.filter((e, i) => e.life <= 0 && s.enemies[i].life > 0).length;
          const score = dealt * 1.0 - taken * 1.6 + kills * 4 + (sim.victory ? 25 : 0);
          if (!best || score > best.score) best = { baseId: b, styleId: st, picks, targetUid, score };
        }
      }
    }
  }
  return best;
}

function playRun(seed) {
  const run = newRun(seed);
  const perEncounter = [];
  while (!run.over) {
    const enc = currentEncounter(run);
    resetPiles(run);
    const s = startEncounter(run, enc);
    let turns = 0;
    while (!s.over && turns < 40) {
      const hand = currentHand(run);
      const play = solve(s, hand);
      resolveTurn(s, play);
      cyclePlay(run, play.baseId, play.styleId);
      turns++;
    }
    perEncounter.push({ name: enc.name, won: s.victory, turns, lifeLeft: Math.max(0, s.player.life) });
    if (!s.victory) { loseRun(run); break; }
    advance(run, s.player.life);
    if (!run.over) {
      const opts = rewardOptions(run);
      // prefer healing when hurt, else take a card
      const hurt = run.life <= run.maxLife * 0.5;
      const choice = hurt ? opts.find((o) => o.kind === 'heal') : opts[0];
      takeReward(run, choice);
    }
  }
  return { won: run.won, cleared: run.cleared, life: run.life, perEncounter };
}

const results = [];
for (let i = 1; i <= RUNS; i++) results.push(playRun(i * 7919));

const wins = results.filter((r) => r.won).length;
console.log(`\n=== ${RUNS} solver runs ===`);
console.log(`clear rate: ${((wins / RUNS) * 100).toFixed(1)}%   avg encounters cleared: ${(results.reduce((a, r) => a + r.cleared, 0) / RUNS).toFixed(2)} / ${ENCOUNTERS.length}`);

console.log('\nper-encounter (of runs that reached it):');
ENCOUNTERS.forEach((enc, i) => {
  const reached = results.filter((r) => r.perEncounter.length > i).map((r) => r.perEncounter[i]);
  if (!reached.length) return console.log(`  ${enc.name.padEnd(16)} never reached`);
  const won = reached.filter((r) => r.won).length;
  const turns = (reached.reduce((a, r) => a + r.turns, 0) / reached.length).toFixed(1);
  const life = (reached.reduce((a, r) => a + r.lifeLeft, 0) / reached.length).toFixed(1);
  const bar = '#'.repeat(Math.round((won / reached.length) * 20)).padEnd(20, '.');
  console.log(
    `  ${enc.name.padEnd(16)} ${bar} win ${((won / reached.length) * 100).toFixed(0).padStart(3)}%  ` +
    `avg ${turns} turns  ${life} life left  (n=${reached.length})`
  );
});

const deaths = {};
for (const r of results) {
  if (r.won) continue;
  const last = r.perEncounter[r.perEncounter.length - 1];
  if (last) deaths[last.name] = (deaths[last.name] || 0) + 1;
}
console.log('\nrun-ending encounters:');
for (const [k, v] of Object.entries(deaths).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${v}`);
}
console.log();
