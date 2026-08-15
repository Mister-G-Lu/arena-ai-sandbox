// Forgiveness curve: play the solver, but with an error rate — on each beat,
// with probability p, throw away the best play and pick a random legal one.
// This is the direct measure of "easy and forgiving with mistakes".
//
//   node tools/forgiveness.mjs [runsPerPoint]
import { startEncounter, resolveBeat, playerAttack, canUseFinisher } from '../src/combat.js';
import { newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
         rewardOptions, takeReward, advance, loseRun, ENCOUNTERS } from '../src/run.js';
import { mulberry32 } from '../src/rng.js';

const RUNS = Number(process.argv[2] || 60);
const clone = (s) => ({ ...s, log: [], player: { ...s.player }, enemies: s.enemies.map((e) => ({ ...e })) });

function bestPlay(s, hand) {
  let best = null;
  const targets = [undefined, ...s.enemies.filter((e) => e.life > 0).map((e) => e.uid)];
  const bases = [...hand.bases, ...(canUseFinisher(s) ? hand.finishers : [])];
  for (const b of bases) {
    const isFin = hand.finishers.includes(b);
    for (const st of isFin ? [null] : hand.styles) {
      for (const targetUid of targets) {
        for (const ante of s.player.tokens > 0 ? [false, true] : [false]) {
          const sim = clone(s);
          resolveBeat(sim, { baseId: b, styleId: st, targetUid, ante, autoShield: 'lethal' });
          const dealt = s.enemies.reduce((a, e, i) => a + (e.life - sim.enemies[i].life), 0);
          const taken = s.player.life - sim.player.life;
          const kills = sim.enemies.filter((e, i) => e.life <= 0 && s.enemies[i].life > 0).length;
          const score = dealt - taken * 1.7 + kills * 5 + (sim.victory ? 30 : 0)
                      - (sim.over && !sim.victory ? 60 : 0) - (s.player.tokens - sim.player.tokens) * 2.5;
          if (!best || score > best.score) best = { baseId: b, styleId: st, targetUid, ante, autoShield: 'lethal', score };
        }
      }
    }
  }
  return best;
}

function run1(charId, errRate, seed, rng) {
  const run = newRun(charId, seed);
  while (!run.over) {
    resetPiles(run);
    const s = startEncounter(run, currentEncounter(run));
    let n = 0;
    while (!s.over && n < 40) {
      const h = currentHand(run);
      let play;
      if (rng() < errRate) {
        const pk = (a) => a[Math.floor(rng() * a.length)];
        play = { baseId: pk(h.bases), styleId: pk(h.styles), ante: rng() < 0.5, autoShield: 'lethal' };
      } else play = bestPlay(s, h);
      resolveBeat(s, play);
      cyclePlay(run, play.baseId, play.styleId);
      n++;
    }
    if (!s.victory) { loseRun(run); break; }
    advance(run, s);
    if (!run.over) takeReward(run, rewardOptions(run)[0]);
  }
  return run;
}

console.log(`\nforgiveness curve — clear rate vs. mistake rate (${RUNS} runs/point)\n`);
console.log('  err%   cadenza              drifter');
for (const err of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
  const out = {};
  for (const c of ['cadenza', 'drifter']) {
    const rng = mulberry32(999);
    let w = 0, cl = 0;
    for (let i = 1; i <= RUNS; i++) { const r = run1(c, err, i * 7919, rng); if (r.won) w++; cl += r.cleared; }
    out[c] = { rate: w / RUNS, cleared: cl / RUNS };
  }
  const fmt = (o) => `${(o.rate * 100).toFixed(0).padStart(3)}% (${o.cleared.toFixed(1)}/${ENCOUNTERS.length})`;
  const bar = (o) => '#'.repeat(Math.round(o.rate * 12)).padEnd(12, '.');
  console.log(`  ${(err * 100).toFixed(0).padStart(3)}%   ${bar(out.cadenza)} ${fmt(out.cadenza)}   ${bar(out.drifter)} ${fmt(out.drifter)}`);
}
console.log();
