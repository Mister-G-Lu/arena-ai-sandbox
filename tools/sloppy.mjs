// Forgiveness test: how does a character hold up under BAD play?
// Picks a uniformly random legal play each beat (no solver), and never antes
// unless it randomly decides to. This measures the design goal directly:
// "easy and forgiving with mistakes".
import { startEncounter, resolveBeat } from '../src/combat.js';
import { newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
         rewardOptions, takeReward, advance, loseRun, ENCOUNTERS } from '../src/run.js';
import { mulberry32 } from '../src/rng.js';

const RUNS = Number(process.argv[2] || 400);
const CHAR = process.argv[3] || 'cadenza';
const rng = mulberry32(12345);
const pick = (a) => a[Math.floor(rng() * a.length)];

let wins = 0, cleared = 0, stunnedBeats = 0, beats = 0;
for (let i = 1; i <= RUNS; i++) {
  const run = newRun(CHAR, i * 104729);
  while (!run.over) {
    resetPiles(run);
    const s = startEncounter(run, currentEncounter(run));
    let n = 0;
    while (!s.over && n < 40) {
      const h = currentHand(run);
      const spec = s.tokenSpec;
      let ante = null;
      if (spec && spec.kind === 'fungible') ante = rng() < 0.4 ? true : null;
      else if (spec && s.player.tokenPool.length) {
        // a careless player fires without checking, 30% of the time
        ante = rng() < 0.7 ? [pick(s.player.tokenPool)] : null;
      }
      const play = { baseId: pick(h.bases), styleId: pick(h.styles),
                     ante, autoShield: 'lethal' };
      resolveBeat(s, play);
      if (s.player.stunned) stunnedBeats++;
      beats++; n++;
      cyclePlay(run, play.baseId, play.styleId);
    }
    if (!s.victory) { loseRun(run); break; }
    advance(run, s);
    if (!run.over) takeReward(run, pick(rewardOptions(run)));
  }
  if (run.won) wins++;
  cleared += run.cleared;
}
console.log(`${CHAR.padEnd(8)} random play: clear ${(wins/RUNS*100).toFixed(1)}%  ` +
  `avg ${(cleared/RUNS).toFixed(2)}/${ENCOUNTERS.length} encounters  ` +
  `stunned ${(stunnedBeats/beats*100).toFixed(1)}% of beats`);
