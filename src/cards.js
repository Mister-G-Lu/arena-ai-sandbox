// Player card pool. A play = one Base + one Style, combined into one attack.
//
// Bases carry the shape of the attack (range/att/spd + timed effects).
// Styles are deltas plus their own timed effects.
// Effects are plain data interpreted by applyEffect in combat.js.

export const BASES = [
  {
    id: 'drive', name: 'Drive', range: [1, 1], att: 3, spd: 4,
    before: [{ k: 'advance', min: 1, max: 2 }],
    text: 'Before: Advance 1~2',
  },
  {
    id: 'strike', name: 'Strike', range: [1, 1], att: 4, spd: 5,
    text: 'A clean, fast blow.',
  },
  {
    id: 'shot', name: 'Shot', range: [2, 4], att: 3, spd: 3,
    text: 'Reaches across the arena.',
  },
  {
    id: 'sweep', name: 'Sweep', range: [1, 2], att: 3, spd: 2,
    hitAll: true, hit: [{ k: 'push', min: 1, max: 1 }],
    text: 'Hits every enemy in range. Hit: Push 1',
  },
  {
    id: 'grasp', name: 'Grasp', range: [1, 1], att: 2, spd: 3,
    before: [{ k: 'pull', min: 1, max: 1 }],
    hit: [{ k: 'stagger' }],
    text: 'Before: Pull 1. Hit: Stagger (cancels their attack)',
  },
  {
    id: 'spike', name: 'Spike', range: [2, 2], att: 5, spd: 1,
    text: 'Slow, but it lands hard.',
  },
  {
    id: 'assault', name: 'Assault', range: [1, 1], att: 3, spd: 6,
    before: [{ k: 'close', min: 0, max: 4 }],
    after: [{ k: 'retreat', min: 1, max: 1 }],
    text: 'Before: Close up to 4. After: Retreat 1',
  },
  {
    id: 'focus', name: 'Focus', range: [1, 3], att: 2, spd: 4,
    hit: [{ k: 'guardUp', amount: 2 }],
    text: 'Hit: Gain 2 Guard',
  },
  {
    id: 'parry', name: 'Parry', range: [1, 2], att: 1, spd: 7,
    guard: 4,
    text: 'Gain 4 Guard. Very fast, barely hurts.',
  },
  {
    id: 'lance', name: 'Lance', range: [3, 5], att: 4, spd: 2,
    text: 'Punishes anything that keeps its distance.',
  },
];

export const STYLES = [
  { id: 'powerful', name: 'Powerful', dRange: [0, 0], dAtt: 1, dSpd: 1, text: '+0 Range, +1 Att, +1 Spd' },
  { id: 'reaching', name: 'Reaching', dRange: [0, 2], dAtt: -1, dSpd: 0, text: '+0~2 Range, -1 Att' },
  { id: 'sudden', name: 'Sudden', dRange: [0, 0], dAtt: -1, dSpd: 4, text: '+0 Range, -1 Att, +4 Spd' },
  { id: 'burning', name: 'Burning', dRange: [0, 0], dAtt: 2, dSpd: -3, text: '+0 Range, +2 Att, -3 Spd' },
  {
    id: 'sliding', name: 'Sliding', dRange: [0, 1], dAtt: 0, dSpd: 1,
    before: [{ k: 'retreat', min: 0, max: 2 }],
    text: '+0~1 Range, +1 Spd. Before: Retreat 0~2',
  },
  { id: 'grinding', name: 'Grinding', dRange: [0, 0], dAtt: 0, dSpd: 0, dGuard: 3, text: '+3 Guard while attacking' },
  {
    id: 'twisting', name: 'Twisting', dRange: [1, 1], dAtt: 0, dSpd: 2,
    after: [{ k: 'advance', min: 0, max: 1 }],
    text: '+1 Range, +2 Spd. After: Advance 0~1',
  },
  {
    id: 'crushing', name: 'Crushing', dRange: [0, 0], dAtt: 2, dSpd: -1,
    hit: [{ k: 'push', min: 1, max: 2 }],
    text: '+2 Att, -1 Spd. Hit: Push 1~2',
  },
];

// ------------------------------------------------------- rewards / unlocks
// Cards you can only get by winning fights. Rarer, sharper, more situational.

export const REWARD_BASES = [
  {
    id: 'vault', name: 'Vault', range: [1, 1], att: 3, spd: 8,
    before: [{ k: 'jumpPast' }],
    text: 'Before: Jump to the far side of the nearest enemy',
  },
  {
    id: 'cleave', name: 'Cleave', range: [1, 2], att: 5, spd: 2,
    hitAll: true,
    text: 'Hits every enemy in range.',
  },
  {
    id: 'siphon', name: 'Siphon', range: [1, 2], att: 3, spd: 3,
    hit: [{ k: 'heal', amount: 2 }],
    text: 'Hit: Heal 2',
  },
  {
    id: 'volley', name: 'Volley', range: [2, 5], att: 2, spd: 4,
    hitAll: true,
    text: 'Hits every enemy in range.',
  },
];

export const REWARD_STYLES = [
  {
    id: 'phasing', name: 'Phasing', dRange: [0, 0], dAtt: 0, dSpd: 3,
    ignoreGuard: true,
    text: '+3 Spd. Ignores enemy Guard.',
  },
  {
    id: 'brutal', name: 'Brutal', dRange: [0, 0], dAtt: 3, dSpd: -2, dGuard: -1,
    text: '+3 Att, -2 Spd, -1 Guard',
  },
  {
    id: 'darting', name: 'Darting', dRange: [0, 1], dAtt: -1, dSpd: 2,
    before: [{ k: 'advance', min: 0, max: 2 }],
    after: [{ k: 'retreat', min: 0, max: 2 }],
    text: '+0~1 Range, -1 Att, +2 Spd. Before: Advance 0~2. After: Retreat 0~2',
  },
  {
    id: 'echoing', name: 'Echoing', dRange: [0, 0], dAtt: -1, dSpd: 0,
    repeat: true,
    text: '-1 Att. Strikes twice.',
  },
];

export const ALL_BASES = [...BASES, ...REWARD_BASES];
export const ALL_STYLES = [...STYLES, ...REWARD_STYLES];
export const BASE_BY_ID = Object.fromEntries(ALL_BASES.map((b) => [b.id, b]));
export const STYLE_BY_ID = Object.fromEntries(ALL_STYLES.map((s) => [s.id, s]));

/** Combine a style onto a base to get the attack that actually resolves. */
export function combine(base, style) {
  return {
    name: `${style.name} ${base.name}`,
    baseId: base.id,
    styleId: style.id,
    range: [
      Math.max(0, base.range[0] + style.dRange[0]),
      Math.max(0, base.range[1] + style.dRange[1]),
    ],
    att: Math.max(0, base.att + style.dAtt),
    spd: base.spd + style.dSpd,
    guard: Math.max(0, (base.guard || 0) + (style.dGuard || 0)),
    hitAll: !!base.hitAll,
    ignoreGuard: !!style.ignoreGuard,
    repeat: !!style.repeat,
    before: [...(style.before || []), ...(base.before || [])],
    hit: [...(base.hit || []), ...(style.hit || [])],
    after: [...(base.after || []), ...(style.after || [])],
    text: [style.text, base.text].filter(Boolean).join(' | '),
  };
}
