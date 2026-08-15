// Core rules engine for the 7-space arena duel.
// Pure, dependency-free, deterministic. Works in Node and the browser.

export const ARENA_SIZE = 7;
export const START_LIFE = 18;
export const HAND_SIZE = 5;

// ---------------------------------------------------------------- utilities

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clampSpace = (n) => Math.max(1, Math.min(ARENA_SIZE, n));

// ---------------------------------------------------------------- card data
// A "base" is the raw attack. A "style" modifies it. You play exactly one of
// each, and the combination is what actually resolves.
//
// range: [min, max] inclusive distance in spaces
// att:   damage dealt on hit
// spd:   initiative; higher acts first, ties resolve simultaneously
// timings: before / hit / after -> arrays of effect objects

export const BASES = [
  {
    id: 'drive',
    name: 'Drive',
    range: [1, 1],
    att: 3,
    spd: 4,
    before: [{ k: 'advance', min: 1, max: 2 }],
    text: 'Before: Advance 1~2',
  },
  {
    id: 'strike',
    name: 'Strike',
    range: [1, 1],
    att: 4,
    spd: 5,
    text: 'A clean, fast blow.',
  },
  {
    id: 'shot',
    name: 'Shot',
    range: [2, 4],
    att: 3,
    spd: 3,
    text: 'Reaches across the arena.',
  },
  {
    id: 'sweep',
    name: 'Sweep',
    range: [1, 2],
    att: 3,
    spd: 2,
    hit: [{ k: 'push', min: 1, max: 1 }],
    text: 'Hit: Push 1',
  },
  {
    id: 'grasp',
    name: 'Grasp',
    range: [1, 1],
    att: 2,
    spd: 3,
    before: [{ k: 'pull', min: 1, max: 1 }],
    hit: [{ k: 'stun' }],
    text: 'Before: Pull 1. Hit: Stun the opponent',
  },
  {
    id: 'spike',
    name: 'Spike',
    range: [2, 2],
    att: 5,
    spd: 1,
    text: 'Slow, but it lands hard.',
  },
  {
    id: 'assault',
    name: 'Assault',
    range: [1, 1],
    att: 3,
    spd: 6,
    before: [{ k: 'close', min: 0, max: 4 }],
    after: [{ k: 'retreat', min: 1, max: 1 }],
    text: 'Before: Close up to 4. After: Retreat 1',
  },
  {
    id: 'focus',
    name: 'Focus',
    range: [1, 3],
    att: 2,
    spd: 4,
    hit: [{ k: 'guardUp', amount: 2 }],
    text: 'Hit: Gain 2 Guard until your next turn',
  },
];

export const STYLES = [
  {
    id: 'powerful',
    name: 'Powerful',
    dRange: [0, 0],
    dAtt: 1,
    dSpd: 1,
    text: '+0 Range, +1 Att, +1 Spd',
  },
  {
    id: 'reaching',
    name: 'Reaching',
    dRange: [0, 2],
    dAtt: -1,
    dSpd: 0,
    text: '+0~2 Range, -1 Att',
  },
  {
    id: 'sudden',
    name: 'Sudden',
    dRange: [0, 0],
    dAtt: -1,
    dSpd: 4,
    text: '+0 Range, -1 Att, +4 Spd',
  },
  {
    id: 'burning',
    name: 'Burning',
    dRange: [0, 0],
    dAtt: 2,
    dSpd: -3,
    text: '+0 Range, +2 Att, -3 Spd',
  },
  {
    id: 'sliding',
    name: 'Sliding',
    dRange: [0, 1],
    dAtt: 0,
    dSpd: 1,
    before: [{ k: 'retreat', min: 0, max: 2 }],
    text: '+0~1 Range, +1 Spd. Before: Retreat 0~2',
  },
  {
    id: 'grinding',
    name: 'Grinding',
    dRange: [0, 0],
    dAtt: 0,
    dSpd: 0,
    dGuard: 3,
    text: '+3 Guard while attacking',
  },
  {
    id: 'twisting',
    name: 'Twisting',
    dRange: [1, 1],
    dAtt: 0,
    dSpd: 2,
    after: [{ k: 'advance', min: 0, max: 1 }],
    text: '+1 Range, +2 Spd. After: Advance 0~1',
  },
  {
    id: 'crushing',
    name: 'Crushing',
    dRange: [0, 0],
    dAtt: 2,
    dSpd: -1,
    hit: [{ k: 'push', min: 1, max: 2 }],
    text: '+2 Att, -1 Spd. Hit: Push 1~2',
  },
];

export const BASE_BY_ID = Object.fromEntries(BASES.map((b) => [b.id, b]));
export const STYLE_BY_ID = Object.fromEntries(STYLES.map((s) => [s.id, s]));

// Combine a style onto a base to produce the attack that actually resolves.
export function combine(base, style) {
  const range = [
    Math.max(0, base.range[0] + style.dRange[0]),
    Math.max(0, base.range[1] + style.dRange[1]),
  ];
  return {
    name: `${style.name} ${base.name}`,
    baseId: base.id,
    styleId: style.id,
    range,
    att: Math.max(0, base.att + style.dAtt),
    spd: base.spd + style.dSpd,
    guard: (base.guard || 0) + (style.dGuard || 0),
    before: [...(style.before || []), ...(base.before || [])],
    hit: [...(base.hit || []), ...(style.hit || [])],
    after: [...(base.after || []), ...(style.after || [])],
    text: [style.text, base.text].filter(Boolean).join(' | '),
  };
}

// ---------------------------------------------------------------- state

export function newGame({ seed = 1, names = ['Player', 'Rival'] } = {}) {
  const rng = mulberry32(seed);
  const mkPlayer = (i) => ({
    id: i,
    name: names[i],
    life: START_LIFE,
    space: i === 0 ? 2 : 6,
    guard: 0,
    stunned: false,
    bases: shuffle(BASES.map((b) => b.id), rng),
    styles: shuffle(STYLES.map((s) => s.id), rng),
    usedBases: [],
    usedStyles: [],
  });
  return {
    seed,
    rng,
    turn: 1,
    players: [mkPlayer(0), mkPlayer(1)],
    log: [],
    winner: null,
  };
}

export function hand(player) {
  return {
    bases: player.bases.slice(0, HAND_SIZE),
    styles: player.styles.slice(0, HAND_SIZE),
  };
}

export const distance = (g) => Math.abs(g.players[0].space - g.players[1].space);

// ---------------------------------------------------------------- movement

// Move `p` toward/away from `foe`. Returns spaces actually moved.
// Toward-movement may pass *through* the opponent but never stop on them.
function move(g, p, foe, amount, dirSign) {
  if (amount <= 0) return 0;
  const toward = foe.space > p.space ? 1 : -1;
  const dir = dirSign * toward;
  let dest = p.space + dir * amount;
  if (dest === foe.space) {
    // can't land on the opponent: slide one further if legal, else stop short
    const past = dest + dir;
    dest = past >= 1 && past <= ARENA_SIZE ? past : dest - dir;
  }
  dest = clampSpace(dest);
  if (dest === foe.space) dest = clampSpace(dest - dir);
  const moved = Math.abs(dest - p.space);
  p.space = dest;
  return moved;
}

function movesOther(g, p, foe, amount, dirSign) {
  // push (away from p) / pull (toward p): the opponent cannot pass through p
  if (amount <= 0) return 0;
  const away = foe.space > p.space ? 1 : -1;
  const dir = dirSign * away;
  let dest = foe.space;
  for (let i = 0; i < amount; i++) {
    const next = dest + dir;
    if (next < 1 || next > ARENA_SIZE || next === p.space) break;
    dest = next;
  }
  const moved = Math.abs(dest - foe.space);
  foe.space = dest;
  return moved;
}

// Resolve one effect. `pick` chooses a value in a min~max range.
function applyEffect(g, p, foe, eff, pick) {
  switch (eff.k) {
    case 'advance': {
      const n = pick(eff, 'advance');
      const m = move(g, p, foe, n, +1);
      if (m) g.log.push(`${p.name} advances ${m}.`);
      return;
    }
    case 'retreat': {
      const n = pick(eff, 'retreat');
      const m = move(g, p, foe, n, -1);
      if (m) g.log.push(`${p.name} retreats ${m}.`);
      return;
    }
    case 'close': {
      const gap = Math.abs(p.space - foe.space) - 1;
      const n = Math.min(pick(eff, 'close'), Math.max(0, gap));
      const m = move(g, p, foe, n, +1);
      if (m) g.log.push(`${p.name} closes ${m}.`);
      return;
    }
    case 'push': {
      const m = movesOther(g, p, foe, pick(eff, 'push'), +1);
      if (m) g.log.push(`${foe.name} is pushed ${m}.`);
      return;
    }
    case 'pull': {
      const m = movesOther(g, p, foe, pick(eff, 'pull'), -1);
      if (m) g.log.push(`${foe.name} is pulled ${m}.`);
      return;
    }
    case 'guardUp':
      p.guard += eff.amount;
      g.log.push(`${p.name} gains ${eff.amount} Guard.`);
      return;
    case 'stun':
      foe.stunned = true;
      g.log.push(`${foe.name} is stunned — their attack is cancelled.`);
      return;
    default:
      return;
  }
}

// ---------------------------------------------------------------- resolution

const defaultPick = (eff) => eff.max; // deterministic fallback

function inRange(atk, dist) {
  return dist >= atk.range[0] && dist <= atk.range[1];
}

/**
 * Resolve a full turn.
 * choices: [{baseId, styleId, picks}, {…}] — picks is an optional
 *   { advance: n, retreat: n, close: n, push: n, pull: n } of chosen amounts.
 */
export function resolveTurn(g, choices) {
  if (g.winner !== null) return g;
  const atks = choices.map((c) =>
    combine(BASE_BY_ID[c.baseId], STYLE_BY_ID[c.styleId])
  );
  const pickFor = (i) => (eff, key) => {
    const want = choices[i].picks?.[key];
    const n = want === undefined ? defaultPick(eff) : want;
    return Math.max(eff.min, Math.min(eff.max, n));
  };

  g.log.push(`— Turn ${g.turn} —`);
  g.players.forEach((p, i) => {
    p.guard = atks[i].guard;
    p.stunned = false;
    g.log.push(
      `${p.name}: ${atks[i].name} (Rng ${atks[i].range[0]}~${atks[i].range[1]}, Att ${atks[i].att}, Spd ${atks[i].spd})`
    );
  });

  // initiative
  let order;
  if (atks[0].spd > atks[1].spd) order = [0];
  else if (atks[1].spd > atks[0].spd) order = [1];
  else order = null; // simultaneous
  const sequence = order ? [order[0], 1 - order[0]] : [0, 1];
  g.log.push(
    order
      ? `${g.players[sequence[0]].name} is faster.`
      : `Speeds tie — attacks resolve simultaneously.`
  );

  const results = [null, null];

  const runBefore = (i) => {
    for (const eff of atks[i].before)
      applyEffect(g, g.players[i], g.players[1 - i], eff, pickFor(i));
  };
  const runStrike = (i) => {
    const p = g.players[i];
    const foe = g.players[1 - i];
    if (p.stunned) {
      results[i] = { hit: false, dmg: 0, reason: 'stunned' };
      return;
    }
    const d = Math.abs(p.space - foe.space);
    if (!inRange(atks[i], d)) {
      results[i] = { hit: false, dmg: 0, reason: 'out of range' };
      g.log.push(`${p.name} misses (distance ${d}).`);
      return;
    }
    const dmg = Math.max(0, atks[i].att - foe.guard);
    foe.life -= dmg;
    results[i] = { hit: true, dmg };
    g.log.push(
      `${p.name} hits for ${dmg}${foe.guard ? ` (${foe.guard} Guard absorbed)` : ''}. ${foe.name}: ${Math.max(0, foe.life)} life.`
    );
    for (const eff of atks[i].hit)
      applyEffect(g, p, foe, eff, pickFor(i));
  };
  const runAfter = (i) => {
    if (g.players[i].stunned) return;
    for (const eff of atks[i].after)
      applyEffect(g, g.players[i], g.players[1 - i], eff, pickFor(i));
  };

  if (order) {
    const [f, s] = sequence;
    runBefore(f);
    runStrike(f);
    runAfter(f);
    if (g.players[s].life > 0) {
      runBefore(s);
      runStrike(s);
      runAfter(s);
    }
  } else {
    runBefore(0);
    runBefore(1);
    runStrike(0);
    runStrike(1);
    runAfter(0);
    runAfter(1);
  }

  // cycle cards: played cards go to the bottom of their stack after a cooldown
  choices.forEach((c, i) => {
    const p = g.players[i];
    p.bases = p.bases.filter((b) => b !== c.baseId);
    p.styles = p.styles.filter((s) => s !== c.styleId);
    p.usedBases.push(c.baseId);
    p.usedStyles.push(c.styleId);
    while (p.usedBases.length > 2) p.bases.push(p.usedBases.shift());
    while (p.usedStyles.length > 2) p.styles.push(p.usedStyles.shift());
  });

  const dead = g.players.filter((p) => p.life <= 0);
  if (dead.length === 2) g.winner = 'draw';
  else if (dead.length === 1) g.winner = 1 - dead[0].id;
  if (g.winner !== null) {
    g.log.push(
      g.winner === 'draw'
        ? 'Double KO — the duel is a draw.'
        : `${g.players[g.winner].name} wins!`
    );
  }
  g.turn++;
  return g;
}

// ---------------------------------------------------------------- AI

// Score a candidate play by simulating it against a sample of foe plays.
export function chooseAI(g, me, { samples = 6 } = {}) {
  const foe = 1 - me;
  const myHand = hand(g.players[me]);
  const foeHand = hand(g.players[foe]);
  const foeOptions = [];
  for (const b of foeHand.bases)
    for (const s of foeHand.styles) foeOptions.push({ baseId: b, styleId: s });
  const sample = shuffle(foeOptions, g.rng).slice(0, samples);

  let best = null;
  for (const b of myHand.bases) {
    for (const s of myHand.styles) {
      const picks = bestPicks(g, me, b, s);
      let total = 0;
      for (const fo of sample) {
        const sim = cloneForSim(g);
        const choices = [];
        choices[me] = { baseId: b, styleId: s, picks };
        choices[foe] = { baseId: fo.baseId, styleId: fo.styleId };
        resolveTurn(sim, choices);
        total +=
          (g.players[foe].life - sim.players[foe].life) * 1.15 -
          (g.players[me].life - sim.players[me].life);
      }
      const score = total / sample.length + g.rng() * 0.35;
      if (!best || score > best.score)
        best = { baseId: b, styleId: s, picks, score };
    }
  }
  return best;
}

// Try each movement amount and keep whatever lands the hit.
function bestPicks(g, me, baseId, styleId) {
  const atk = combine(BASE_BY_ID[baseId], STYLE_BY_ID[styleId]);
  const keys = ['advance', 'retreat', 'close', 'push', 'pull'];
  const picks = {};
  for (const eff of [...atk.before, ...atk.hit, ...atk.after]) {
    if (!keys.includes(eff.k) || eff.min === eff.max) continue;
    let bestVal = eff.max;
    let bestScore = -Infinity;
    for (let v = eff.min; v <= eff.max; v++) {
      const sim = cloneForSim(g);
      const choices = [];
      choices[me] = { baseId, styleId, picks: { ...picks, [eff.k]: v } };
      choices[1 - me] = { baseId: 'strike', styleId: 'powerful' };
      resolveTurn(sim, choices);
      const sc =
        (g.players[1 - me].life - sim.players[1 - me].life) * 1.2 -
        (g.players[me].life - sim.players[me].life);
      if (sc > bestScore) {
        bestScore = sc;
        bestVal = v;
      }
    }
    picks[eff.k] = bestVal;
  }
  return picks;
}

function cloneForSim(g) {
  return {
    seed: g.seed,
    rng: mulberry32(1),
    turn: g.turn,
    players: g.players.map((p) => ({ ...p, bases: [...p.bases], styles: [...p.styles], usedBases: [...p.usedBases], usedStyles: [...p.usedStyles] })),
    log: [],
    winner: g.winner,
  };
}
