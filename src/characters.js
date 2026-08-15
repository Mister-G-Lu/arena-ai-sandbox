// Characters own a set of Styles and a unique Base (plus Finishers).
//
// In BattleCON almost every fighter has the same starting life; only a single
// outlier differs. We model that as a shared constant rather than a per-
// character field, so a new character cannot silently drift off-spec.
// Everyone shares the Universal Bases.
//
// Stat notation follows the spec sheet:
//   Styles:  (range / power / priority) as DELTAS, e.g. Clockwork (+0/+3/-3)
//   Bases:   (range / power / priority) as ABSOLUTES, e.g. Press (1~2/1/0)
//
// Timing bands:
//   BA  "Before Activating"  -> before
//   OH  "On Hit"             -> hit
//   EoB "End of Beat"        -> after

// ------------------------------------------------------------- universal bases

export const STARTING_LIFE = 20;

export const UNIVERSAL_BASES = [
  {
    id: 'strike', name: 'Strike', range: [1, 1], power: 4, priority: 3,
    stunGuard: 2,
    text: 'Stun Guard 2',
  },
  {
    id: 'shot', name: 'Shot', range: [1, 4], power: 3, priority: 3,
    text: 'Reaches most of the arena.',
  },
  {
    id: 'drive', name: 'Drive', range: [1, 1], power: 3, priority: 4,
    before: [{ k: 'advance', min: 1, max: 2 }],
    text: 'BA: Advance 1~2',
  },
  {
    id: 'burst', name: 'Burst', range: [2, 3], power: 3, priority: 1,
    before: [{ k: 'retreat', min: 1, max: 2 }],
    text: 'BA: Retreat 1~2',
  },
  {
    id: 'grasp', name: 'Grasp', range: [1, 1], power: 2, priority: 5,
    hit: [{ k: 'push', min: 1, max: 2 }],
    text: 'OH: Push 1~2',
  },
  {
    id: 'dodge', name: 'Dodge', range: [0, 0], power: null, priority: 3,
    noDamage: true,
    start: [{ k: 'dodgeMove', min: 1, max: 3 }],
    text: 'Start: Move 1~3. You dodge all attacks from enemies you move past.',
  },
];

// ------------------------------------------------------------------ Cadenza

export const CADENZA = {
  id: 'cadenza',
  name: 'Cadenza',
  epithet: 'Clockwork Knight',
  life: STARTING_LIFE,
  blurb:
    'An armoured automaton that shrugs off hits and answers with crushing ' +
    'blows. Forgiving: Soak keeps chip damage from stunning you, and three ' +
    'Shield tokens can simply delete an incoming attack.',
  primer: [
    'Soak reduces damage. Reduce it to 0 and you are not stunned.',
    'Ante a Shield for Stun Immunity — you will land your attack no matter what.',
    'Or hold Shields and spend them reactively: Guard 9001 negates any single hit.',
    'You want to be at range 1. Grapnel is your answer to being pushed away.',
  ],
  difficulty: 'Easy',

  tokens: {
    id: 'shield', name: 'Shield', max: 3, start: 3,
    text: 'Guard 9001. Ante for Stun Immunity, or spend reactively when hit.',
  },

  styles: [
    {
      id: 'hydraulic', name: 'Hydraulic', dRange: [0, 0], dPower: 2, dPriority: -1,
      soak: 1,
      before: [{ k: 'advance', min: 1, max: 1 }],
      text: 'Soak 1. BA: Advance 1',
    },
    {
      id: 'mechanical', name: 'Mechanical', dRange: [0, 0], dPower: 2, dPriority: -2,
      after: [{ k: 'advance', min: 0, max: 3 }],
      text: 'EoB: Advance up to 3',
    },
    {
      id: 'battery', name: 'Battery', dRange: [0, 0], dPower: 1, dPriority: -1,
      after: [{ k: 'priorityBonus', amount: 4 }],
      text: 'EoB: You have +4 Priority next beat',
    },
    {
      id: 'clockwork', name: 'Clockwork', dRange: [0, 0], dPower: 3, dPriority: -3,
      soak: 3,
      text: 'Soak 3',
    },
    {
      id: 'grapnel', name: 'Grapnel', dRange: [2, 4], dPower: 0, dPriority: 0,
      hit: [{ k: 'pull', min: 0, max: 3 }],
      text: 'OH: Pull target up to 3',
    },
  ],

  bases: [
    {
      id: 'press', name: 'Press', range: [1, 2], power: 1, priority: 0,
      stunGuard: 6,
      before: [{ k: 'powerPerDamageTaken', amount: 1 }],
      text: 'Stun Guard 6. BA: +1 Power for each point of damage you took this beat.',
    },
  ],

  finishers: [
    {
      id: 'rocketPress', name: 'Rocket Press', range: [1, 1], power: 8, priority: 0,
      soak: 3, stunImmune: true,
      before: [{ k: 'advance', min: 2, max: 6 }],
      text: 'Soak 3, Stun Immunity. BA: Advance at least 2.',
    },
    {
      id: 'feedbackField', name: 'Feedback Field', range: [1, 2], power: 1, priority: 0,
      soak: 5,
      hit: [{ k: 'powerPerDamageSoaked', amount: 2 }],
      text: 'Soak 5. OH: +2 Power for each point of damage you soaked this beat.',
    },
  ],
};

// -------------------------------------------------------------- The Drifter
// The original generic pool, kept as a second, harder pick: no tokens, no
// soak, everything paid for with positioning.

export const DRIFTER = {
  id: 'drifter',
  name: 'Drifter',
  epithet: 'Nameless Duelist',
  life: STARTING_LIFE,
  blurb:
    'Same 20 life as anyone, but no Soak, no tokens and no safety net. ' +
    'Every point of damage lands in full, and almost any hit will stun. ' +
    'Wins by never being where the attack lands.',
  primer: [
    'You have no Soak — almost any hit will stun you.',
    'Priority is your defence: strike first and they never act.',
    'Sudden and Twisting turn slow bases into pre-emptive strikes.',
  ],
  difficulty: 'Hard',
  tokens: null,

  styles: [
    { id: 'powerful', name: 'Powerful', dRange: [0, 0], dPower: 2, dPriority: -1, text: '+0/+2/-1' },
    { id: 'reaching', name: 'Reaching', dRange: [0, 2], dPower: -1, dPriority: 0, text: '+0~2/-1/+0' },
    { id: 'sudden', name: 'Sudden', dRange: [0, 0], dPower: -1, dPriority: 4, text: '+0/-1/+4' },
    {
      id: 'sliding', name: 'Sliding', dRange: [0, 1], dPower: 0, dPriority: 1,
      before: [{ k: 'retreat', min: 0, max: 2 }],
      text: '+0~1/+0/+1. BA: Retreat 0~2',
    },
    {
      id: 'twisting', name: 'Twisting', dRange: [1, 1], dPower: 0, dPriority: 2,
      after: [{ k: 'advance', min: 0, max: 1 }],
      text: '+1/+0/+2. EoB: Advance 0~1',
    },
  ],

  bases: [
    {
      id: 'parry', name: 'Parry', range: [1, 2], power: 1, priority: 7,
      stunGuard: 3,
      text: 'Stun Guard 3. No Soak — you still take the damage.',
    },
  ],

  finishers: [
    {
      id: 'lastLight', name: 'Last Light', range: [1, 3], power: 7, priority: 6,
      stunImmune: true,
      text: 'Stun Immunity. Everything, all at once.',
    },
    {
      id: 'ghostStep', name: 'Ghost Step', range: [1, 2], power: 5, priority: 8,
      before: [{ k: 'jumpPast' }],
      hit: [{ k: 'stun' }],
      text: 'BA: Vault past the target. OH: Stun regardless of Stun Guard.',
      pierceStunGuard: true,
    },
  ],
};

export const CHARACTERS = [CADENZA, DRIFTER];
export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// --------------------------------------------------------------- combination

/** All bases a character can play (universal + unique), by id. */
export function baseLibrary(char) {
  const all = [...UNIVERSAL_BASES, ...char.bases, ...char.finishers];
  return Object.fromEntries(all.map((b) => [b.id, b]));
}

export function styleLibrary(char) {
  return Object.fromEntries(char.styles.map((s) => [s.id, s]));
}

/**
 * Combine a Style onto a Base to produce the attack that actually resolves.
 * Soak, Stun Guard and immunities stack from both cards.
 */
export function combine(base, style) {
  const s = style || {
    name: '', dRange: [0, 0], dPower: 0, dPriority: 0, text: '',
  };
  const rangeLo = Math.max(0, base.range[0] + s.dRange[0]);
  const rangeHi = Math.max(0, base.range[1] + s.dRange[1]);
  return {
    name: `${s.name ? s.name + ' ' : ''}${base.name}`,
    baseId: base.id,
    styleId: s.id || null,
    range: [rangeLo, rangeHi],
    // A "no damage" base (Dodge) can never deal damage, whatever the Style says.
    power: base.noDamage ? null : Math.max(0, base.power + s.dPower),
    noDamage: !!base.noDamage,
    priority: base.priority + s.dPriority,
    soak: (base.soak || 0) + (s.soak || 0),
    stunGuard: (base.stunGuard || 0) + (s.stunGuard || 0),
    stunImmune: !!base.stunImmune || !!s.stunImmune,
    pierceStunGuard: !!base.pierceStunGuard || !!s.pierceStunGuard,

    isFinisher: !!base.isFinisher,
    start: [...(s.start || []), ...(base.start || [])],
    before: [...(s.before || []), ...(base.before || [])],
    hit: [...(base.hit || []), ...(s.hit || [])],
    after: [...(base.after || []), ...(s.after || [])],
    text: [s.text, base.text].filter(Boolean).join(' | '),
  };
}

// mark finishers so combat can gate them
for (const c of CHARACTERS) for (const f of c.finishers) f.isFinisher = true;
