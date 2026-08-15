// The roguelite layer: pick a character, run a gauntlet, earn cards.

import { CHARACTER_BY_ID, UNIVERSAL_BASES, STARTING_LIFE } from './characters.js';
import { mulberry32, shuffle } from './rng.js';

// Standard opening: the two fighters face off on the 3rd and 5th tiles,
// two spaces apart, symmetric about the centre of the seven-space arena.
export const PLAYER_START = 3;
export const ENEMY_START = 5;

export const HAND_BASES = 4;
export const HAND_STYLES = 3;
export const COOLDOWN = 1;   // a played card sits out this many beats

export const ENCOUNTERS = [
  {
    name: 'The Threshold',
    blurb: 'A single husk, two spaces away. Learn to read a telegraph.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'husk', space: ENEMY_START }],
  },
  {
    name: 'Two Blades',
    blurb: 'A second blade circles behind you. Do not get sandwiched.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'stalker', space: ENEMY_START }, { type: 'husk', space: 7 }],
  },
  {
    name: 'The Long Hall',
    blurb: 'An archer holds the far end and punishes standing still.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'archer', space: 7 }, { type: 'husk', space: ENEMY_START }],
  },
  {
    name: 'Ironclad',
    blurb: 'A brute that braces, then punishes.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'brute', space: ENEMY_START }],
  },
  {
    name: 'The Foundry',
    blurb: 'Stun Immune. Locking it down is not an option.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'automaton', space: ENEMY_START }, { type: 'husk', space: 7 }],
  },
  {
    name: 'Crossfire',
    blurb: 'Three enemies, two directions.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'archer', space: 1 }, { type: 'stalker', space: ENEMY_START }, { type: 'husk', space: 7 }],
  },
  {
    name: 'The Warden',
    blurb: 'It has been waiting at the end of the hall.',
    playerSpace: PLAYER_START,
    enemies: [{ type: 'warden', space: ENEMY_START }],
  },
];

export function newRun(charId = 'cadenza', seed = (Math.random() * 1e9) | 0) {
  const char = CHARACTER_BY_ID[charId];
  return {
    seed,
    rng: mulberry32(seed),
    charId,
    char,
    node: 0,
    life: char.life,
    tokens: char.tokens ? char.tokens.start : 0,
    force: 0,
    // deck = ids the character may draw. Universal bases + unique base(s).
    deck: {
      bases: [...UNIVERSAL_BASES.map((b) => b.id), ...char.bases.map((b) => b.id)],
      styles: char.styles.map((s) => s.id),
    },
    piles: null,
    cleared: 0,
    over: false,
    won: false,
  };
}

export const currentEncounter = (run) => ENCOUNTERS[run.node];

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
    bases: run.piles.bases.slice(0, HAND_BASES),
    styles: run.piles.styles.slice(0, run.handStyles || HAND_STYLES),
    finishers: run.char.finishers.map((f) => f.id),
  };
}

export function cyclePlay(run, baseId, styleId) {
  const p = run.piles;
  // finishers are not part of the draw piles
  if (p.bases.includes(baseId)) {
    p.bases = p.bases.filter((b) => b !== baseId);
    p.coolBases.push(baseId);
    while (p.coolBases.length > COOLDOWN) p.bases.push(p.coolBases.shift());
  }
  if (styleId && p.styles.includes(styleId)) {
    p.styles = p.styles.filter((s) => s !== styleId);
    p.coolStyles.push(styleId);
    while (p.coolStyles.length > COOLDOWN) p.styles.push(p.coolStyles.shift());
  }
}

// --------------------------------------------------------------- rewards
// Rewards are run upgrades rather than new cards: a character's card set is
// its identity, so we boost the chassis instead of diluting it.

export const UPGRADES = [
  { id: 'plating', name: 'Reinforced Plating', text: '+4 max Life, and heal 4.', apply: (r) => { r.char = { ...r.char, life: r.char.life + 4 }; r.life += 4; } },
  { id: 'spring', name: 'Spare Spring', text: 'Gain 1 Shield token now (up to max).', apply: (r) => { r.tokens = Math.min(r.char.tokens?.max ?? 0, r.tokens + 1); }, needsTokens: true },
  { id: 'flywheel', name: 'Flywheel', text: 'Start each encounter with +2 Force.', apply: (r) => { r.forceBonus = (r.forceBonus || 0) + 2; } },
  { id: 'oil', name: 'Pressure Oil', text: 'Heal 8.', apply: (r) => { r.life = Math.min(r.char.life, r.life + 8); } },
  { id: 'counterweight', name: 'Counterweight', text: 'Refill Shield tokens to full.', apply: (r) => { r.tokens = r.char.tokens?.max ?? 0; }, needsTokens: true },
  { id: 'governor', name: 'Governor', text: 'Draw one extra Style each beat.', apply: (r) => { r.extraStyle = true; }, once: true },
];

export function rewardOptions(run) {
  const pool = UPGRADES.filter((u) => {
    if (u.needsTokens && !run.char.tokens) return false;
    if (u.once && run.takenUpgrades?.includes(u.id)) return false;
    return true;
  });
  return shuffle(pool, run.rng).slice(0, 3);
}

export function takeReward(run, opt) {
  opt.apply(run);
  run.takenUpgrades = [...(run.takenUpgrades || []), opt.id];
  if (run.extraStyle) run.handStyles = HAND_STYLES + 1;
}

export function advance(run, endState) {
  run.life = endState.player.life;
  run.tokens = endState.player.tokens;
  run.cleared++;
  run.node++;
  run.force = run.forceBonus || 0;
  if (run.node >= ENCOUNTERS.length) { run.over = true; run.won = true; }
  return run;
}

export function loseRun(run) {
  run.over = true;
  run.won = false;
  return run;
}
