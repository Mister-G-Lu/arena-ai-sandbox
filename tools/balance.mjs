// Headless balance harness.
//
// Because intents are public, the solver evaluates a beat exactly rather than
// guessing — so these numbers answer a real question: how forgiving is this
// character?
//
//   node tools/balance.mjs [runs] [charId]

import { startEncounter, resolveBeat, playerAttack, canUseFinisher } from '../src/combat.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
  rewardOptions, takeReward, advance, loseRun, ENCOUNTERS,
} from '../src/run.js';

const RUNS = Number(process.argv[2] || 200);

/** Ante options: fungible -> on/off; unique -> each available shell, or none. */
/**
 * What one token is worth. Cadenza's 3 Shields are irreplaceable within a
 * run, so hoarding is correct. Rukyuk's 6 shells are refundable with a single
 * Reload, and a shell he never fires is worth nothing at all — a flat penalty
 * made the solver hoard ammo and whiff on purpose.
 */
function tokenValue(s) {
  const spec = s.tokenSpec;
  if (!spec) return 0;
  if (!spec.requiredOrMiss) return 2.0;          // Shields: precious
  return s.player.tokenPool.length <= 1 ? 1.2 : 0.15;   // Ammo: use it
}

/** The distance band a character wants to fight at. */
function preferredBand(char) {
  return char.id === 'rukyuk' ? [3, 5] : [1, 2];
}

function anteOptions(s) {
  const spec = s.tokenSpec;
  if (!spec) return [null];
  if (spec.kind === 'fungible') return s.player.tokens > 0 ? [null, true] : [null];
  const pool = s.player.tokenPool;
  return pool.length ? [null, ...pool.map((id) => [id])] : [null];
}
const CHAR = process.argv[3] || 'cadenza';

import { cloneState as clone } from '../src/combat.js';

/** Greedy one-ply solver over the full option space including the ante. */
export function solve(s, hand) {
  let best = null;
  const targets = [undefined, ...s.enemies.filter((e) => e.life > 0).map((e) => e.uid)];
  const bases = [...hand.bases];
  if (canUseFinisher(s)) bases.push(...hand.finishers);

  for (const b of bases) {
    const isFin = hand.finishers.includes(b);
    const styles = isFin ? [null] : hand.styles;
    for (const st of styles) {
      const atk = playerAttack(s.char, b, st);
      // enumerate a few movement choices
      let pickSets = [{}];
      if (atk.noDamage) pickSets = [{ dodgeDir: 1 }, { dodgeDir: -1 }];
      // movement direction is a real choice: toward or away from the target
      const hasMove = [...(atk.start||[]), ...(atk.after||[]), ...(atk.end||[])]
        .some((e) => e.k === 'move');
      if (hasMove) pickSets = pickSets.flatMap((b) => [
        { ...b, moveDir: -1 }, { ...b, moveDir: 1 },
      ]);
      // teleport destination: try every space
      const hasTeleport = [...(atk.after||[]), ...(atk.start||[])].some((e) => e.k === 'teleport');
      if (hasTeleport) pickSets = pickSets.flatMap((b) =>
        [1, 2, 3, 4, 5, 6, 7].map((t) => ({ ...b, teleport: t })));
      for (const eff of [...(atk.start || []), ...atk.before, ...atk.after, ...(atk.end || []), ...atk.hit]) {
        if ((eff.min ?? 0) === (eff.max ?? 0)) continue;
        const next = [];
        for (const base of pickSets)
          for (let v = eff.min; v <= eff.max; v++) next.push({ ...base, [eff.k]: v });
        pickSets = next.slice(0, 40);
      }
      for (const picks of pickSets) {
        for (const targetUid of targets) {
          for (const ante of anteOptions(s)) {
            const sim = clone(s);
            resolveBeat(sim, { baseId: b, styleId: st, picks, targetUid, ante, autoShield: 'lethal' });
            const dealt = s.enemies.reduce((a, e, i) => a + (e.life - sim.enemies[i].life), 0);
            const taken = s.player.life - sim.player.life;
            const kills = sim.enemies.filter((e, i) => e.life <= 0 && s.enemies[i].life > 0).length;
            const tokensSpent = s.player.tokens - sim.player.tokens;
            // Positional term: reward ending the beat inside your own
            // effective band. Without this a sniper never learns to kite,
            // because backing off scores zero damage this beat.
            let posScore = 0;
            const foes = sim.enemies.filter((e) => e.life > 0);
            if (foes.length) {
              const d = Math.min(...foes.map((e) => Math.abs(e.space - sim.player.space)));
              const band = preferredBand(s.char);
              if (d < band[0]) posScore = -(band[0] - d) * 1.4;
              else if (d > band[1]) posScore = -(d - band[1]) * 0.5;
              else posScore = 1.2;
            }
            const score =
              dealt * 1.0 - taken * 1.7 + kills * 5 +
              (sim.victory ? 30 : 0) - (sim.over && !sim.victory ? 60 : 0) -
              tokensSpent * tokenValue(s) + posScore;
            if (!best || score > best.score)
              best = { baseId: b, styleId: st, picks, targetUid, ante, autoShield: 'lethal', score };
          }
        }
      }
    }
  }
  return best;
}

function playRun(seed) {
  const run = newRun(CHAR, seed);
  const per = [];
  let shieldsSpent = 0, finishersUsed = 0, stunsLanded = 0, beatsStunned = 0;
  while (!run.over) {
    const enc = currentEncounter(run);
    resetPiles(run);
    const s = startEncounter(run, enc);
    let beats = 0;
    while (!s.over && beats < 40) {
      const before = s.player.tokens;
      const mark = s.log.length;
      const play = solve(s, currentHand(run));
      resolveBeat(s, play);
      shieldsSpent += before - s.player.tokens;
      if (run.char.finishers.some((f) => f.id === play.baseId)) finishersUsed++;
      stunsLanded += (s.log.slice(mark).join('\n').match(/is STUNNED/g) || []).length;
      if (s.player.stunned) beatsStunned++;
      cyclePlay(run, play.baseId, play.styleId);
      beats++;
    }
    per.push({ name: enc.name, won: s.victory, beats, life: Math.max(0, s.player.life) });
    if (!s.victory) { loseRun(run); break; }
    advance(run, s);
    if (!run.over) {
      const opts = rewardOptions(run);
      const hurt = run.life <= run.char.life * 0.5;
      takeReward(run, (hurt && opts.find((o) => o.id === 'oil')) || opts[0]);
    }
  }
  return { won: run.won, cleared: run.cleared, per, shieldsSpent, finishersUsed, stunsLanded, beatsStunned };
}

const IS_CLI = import.meta.url === `file://${process.argv[1]}`;
if (!IS_CLI) { /* imported as a library */ } 
const res = IS_CLI ? [] : null;
if (IS_CLI) {
for (let i = 1; i <= RUNS; i++) res.push(playRun(i * 7919));

const wins = res.filter((r) => r.won).length;
console.log(`\n=== ${CHAR} · ${RUNS} solver runs ===`);
console.log(`clear rate: ${((wins / RUNS) * 100).toFixed(1)}%   avg cleared: ${(res.reduce((a, r) => a + r.cleared, 0) / RUNS).toFixed(2)} / ${ENCOUNTERS.length}`);

console.log('\nper-encounter (of runs that reached it):');
ENCOUNTERS.forEach((enc, i) => {
  const reached = res.filter((r) => r.per.length > i).map((r) => r.per[i]);
  if (!reached.length) return console.log(`  ${enc.name.padEnd(15)} never reached`);
  const won = reached.filter((r) => r.won).length;
  const rate = won / reached.length;
  const bar = '#'.repeat(Math.round(rate * 20)).padEnd(20, '.');
  console.log(
    `  ${enc.name.padEnd(15)} ${bar} ${(rate * 100).toFixed(0).padStart(3)}%  ` +
    `${(reached.reduce((a, r) => a + r.beats, 0) / reached.length).toFixed(1)} beats  ` +
    `${(reached.reduce((a, r) => a + r.life, 0) / reached.length).toFixed(1)} life  (n=${reached.length})`
  );
});

const avg = (f) => (res.reduce((a, r) => a + f(r), 0) / RUNS).toFixed(2);
console.log(`\nfeel metrics (per run):`);
console.log(`  tokens spent    ${avg((r) => r.shieldsSpent)}`);
console.log(`  finishers used  ${avg((r) => r.finishersUsed)}`);
console.log(`  stuns landed    ${avg((r) => r.stunsLanded)}   <- 'badass' index`);
console.log(`  beats stunned   ${avg((r) => r.beatsStunned)}   <- punishment index`);

const deaths = {};
for (const r of res) {
  if (r.won) continue;
  const last = r.per[r.per.length - 1];
  if (last) deaths[last.name] = (deaths[last.name] || 0) + 1;
}
console.log('\nrun-ending encounters:');
for (const [k, v] of Object.entries(deaths).sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(15)} ${v}`);
console.log();
}
