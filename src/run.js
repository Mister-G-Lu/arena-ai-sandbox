// The roguelite layer: a run is a short gauntlet of encounters, with a card
// reward after each win. Deck grows, enemies escalate, life carries over.

import { BASES, STYLES, REWARD_BASES, REWARD_STYLES, BASE_BY_ID, STYLE_BY_ID } from './cards.js';
import { mulberry32, shuffle } from './rng.js';

export const MAX_LIFE = 20;
export const HAND_SIZE = 4;   // bases and styles drawn each turn
export const COOLDOWN = 2;    // turns a played card is unavailable

// Starting deck: a lean, readable subset. Rewards widen it.
const START_BASES = ['drive', 'strike', 'shot', 'sweep', 'grasp', 'parry'];
const START_STYLES = ['powerful', 'reaching', 'sudden', 'sliding', 'grinding'];

export const ENCOUNTERS = [
  {
    name: 'The Threshold',
    blurb: 'A single husk blocks the way.',
    playerSpace: 2,
    enemies: [{ type: 'husk', space: 6 }],
  },
  {
    name: 'Two Blades',
    blurb: 'A stalker and a husk. Do not get sandwiched.',
    playerSpace: 4,
    enemies: [{ type: 'stalker', space: 1 }, { type: 'husk', space: 7 }],
  },
  {
    name: 'The Long Hall',
    blurb: 'An archer holds the far end.',
    playerSpace: 3,
    enemies: [{ type: 'archer', space: 7 }, { type: 'husk', space: 5 }],
  },
  {
    name: 'Ironclad',
    blurb: 'A brute, braced and waiting.',
    playerSpace: 2,
    enemies: [{ type: 'brute', space: 6 }],
  },
  {
    name: 'Crossfire',
    blurb: 'Archer behind, stalker in front.',
    playerSpace: 4,
    enemies: [{ type: 'archer', space: 1 }, { type: 'stalker', space: 6 }, { type: 'husk', space: 7 }],
  },
  {
    name: 'The Warden',
    blurb: 'It has been waiting at the end of the hall.',
    playerSpace: 1,
    enemies: [{ type: 'warden', space: 5 }],
  },
];

export function newRun(seed = (Math.random() * 1e9) | 0) {
  return {
    seed,
    rng: mulberry32(seed),
    node: 0,
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    deck: { bases: [...START_BASES], styles: [...START_STYLES] },
    // draw piles + cooldown queues, rebuilt each encounter
    piles: null,
    cleared: 0,
    over: false,
    won: false,
  };
}

export const currentEncounter = (run) => ENCOUNTERS[run.node];

/** Fresh, shuffled draw piles for the start of an encounter. */
export function resetPiles(run) {
  run.piles = {
    bases: shuffle(run.deck.bases, run.rng),
    styles: shuffle(run.deck.styles, run.rng),
    coolBases: [],
    coolStyles: [],
  };
}

export function currentHand(run) {
  return {
    bases: run.piles.bases.slice(0, HAND_SIZE),
    styles: run.piles.styles.slice(0, HAND_SIZE),
  };
}

/** Put played cards on cooldown, then recycle expired ones to the bottom. */
export function cyclePlay(run, baseId, styleId) {
  const p = run.piles;
  p.bases = p.bases.filter((b) => b !== baseId);
  p.styles = p.styles.filter((s) => s !== styleId);
  p.coolBases.push(baseId);
  p.coolStyles.push(styleId);
  while (p.coolBases.length > COOLDOWN) p.bases.push(p.coolBases.shift());
  while (p.coolStyles.length > COOLDOWN) p.styles.push(p.coolStyles.shift());
}

/** Three reward options after a win: new cards, or heal. */
export function rewardOptions(run) {
  const ownedB = new Set(run.deck.bases);
  const ownedS = new Set(run.deck.styles);
  const poolB = [...REWARD_BASES, ...BASES].filter((c) => !ownedB.has(c.id));
  const poolS = [...REWARD_STYLES, ...STYLES].filter((c) => !ownedS.has(c.id));
  const opts = [];
  const b = shuffle(poolB, run.rng).slice(0, 2);
  const s = shuffle(poolS, run.rng).slice(0, 2);
  if (b[0]) opts.push({ kind: 'base', id: b[0].id, card: b[0] });
  if (s[0]) opts.push({ kind: 'style', id: s[0].id, card: s[0] });
  if (b[1] && opts.length < 3) opts.push({ kind: 'base', id: b[1].id, card: b[1] });
  if (s[1] && opts.length < 3) opts.push({ kind: 'style', id: s[1].id, card: s[1] });
  opts.length = Math.min(opts.length, 3);
  opts.push({ kind: 'heal', id: 'heal', amount: 6 });
  return opts;
}

export function takeReward(run, opt) {
  if (opt.kind === 'base') run.deck.bases.push(opt.id);
  else if (opt.kind === 'style') run.deck.styles.push(opt.id);
  else if (opt.kind === 'heal') run.life = Math.min(run.maxLife, run.life + opt.amount);
}

/** Advance past a cleared encounter. */
export function advance(run, lifeRemaining) {
  run.life = lifeRemaining;
  run.cleared++;
  run.node++;
  if (run.node >= ENCOUNTERS.length) {
    run.over = true;
    run.won = true;
  }
  return run;
}

export function loseRun(run) {
  run.over = true;
  run.won = false;
  return run;
}

export const cardById = (kind, id) => (kind === 'base' ? BASE_BY_ID[id] : STYLE_BY_ID[id]);
