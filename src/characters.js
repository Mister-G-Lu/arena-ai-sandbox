// Characters own a set of Styles and a unique Base (plus Finishers).
//
// In BattleCON almost every fighter has the same starting life; only a single
// outlier differs. We model that as a shared constant rather than a per-
// character field, so a new character cannot silently drift off-spec.
// Everyone shares the Universal Bases.
//
// Stat notation follows the spec sheet:
//   Styles:  (range / power / priority) as MODIFIERS, e.g. Clockwork (+0/+3/-3)
//            or Sniper (+3~5/+1/+2). A style's range ADDS to its base:
//            Sniper (+3~5) on Strike (1) gives 4~6.
//   Bases:   (range / power / priority) as printed, e.g. Press (1~2/1/0)
//
//   *3~5     An asterisked range is FIXED: it hard-overrides the pair's range
//            and ignores every range modifier, from styles and tokens alike.
//            Modelled as `fixedRange: [3, 5]`.
//
// Timing bands, in resolution order:
//   Rev   "On Reveal"          -> reveal  (before anything else resolves)
//   Start "Start of Beat"      -> start   (all fighters, Priority order)
//   BA    "Before Activating"  -> before  (in that fighter's own slot)
//         the attack itself
//   OH    "On Hit"             -> hit     (resolves BEFORE damage is dealt)
//   OD    "On Damage"          -> damage  (only if damage actually got through)
//   AA    "After Activating"   -> after   (cancelled if that fighter is stunned)
//   EoB   "End of Beat"        -> end     (ALWAYS fires, even when stunned)
//
// The AA/EoB split matters: a stun cancels a fighter's activation and
// everything welded to it, but End of Beat is unconditional.
//
// DEFENSIVE KEYWORDS (V4 naming)
//   Armor N  — subtract N from incoming damage.
//   Guard N  — you are not stunned unless damage taken exceeds N.
// These are the same two mechanics older printings called Soak and Stun
// Guard; we use the V4 names throughout.

// ------------------------------------------------------------- universal bases

import { SHIELD_TOKENS, AMMO_TOKENS } from './tokens.js';

export const STARTING_LIFE = 20;

export const UNIVERSAL_BASES = [
  {
    id: 'strike', name: 'Strike', range: [1, 1], power: 4, priority: 3,
    guard: 2,
    text: 'Guard 2',
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
    start: [{ k: 'retreat', min: 1, max: 2 }],
    text: 'Start: Retreat 1~2',
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

  tokens: SHIELD_TOKENS,

  styles: [
    {
      id: 'hydraulic', name: 'Hydraulic', dRange: [0, 0], dPower: 2, dPriority: -1,
      armor: 1,
      before: [{ k: 'advance', min: 1, max: 1 }],
      text: 'Armor 1. BA: Advance 1',
    },
    {
      id: 'mechanical', name: 'Mechanical', dRange: [0, 0], dPower: 2, dPriority: -2,
      end: [{ k: 'advance', min: 0, max: 3 }],
      text: 'EoB: Advance up to 3',
    },
    {
      id: 'battery', name: 'Battery', dRange: [0, 0], dPower: 1, dPriority: -1,
      end: [{ k: 'priorityBonus', amount: 4 }],
      text: 'EoB: You have +4 Priority next beat',
    },
    {
      id: 'clockwork', name: 'Clockwork', dRange: [0, 0], dPower: 3, dPriority: -3,
      armor: 3,
      text: 'Armor 3',
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
      guard: 6,
      before: [{ k: 'powerPerDamageTaken', amount: 1 }],
      text: 'Guard 6. BA: +1 Power for each point of damage you took this beat.',
    },
  ],

  finishers: [
    {
      id: 'rocketPress', name: 'Rocket Press', fixedRange: [1, 1], power: 8, priority: 0,
      armor: 3, stunImmune: true,
      before: [{ k: 'advance', min: 2, max: 6 }],
      text: 'Armor 3, Stun Immunity. BA: Advance at least 2.',
    },
    {
      id: 'feedbackField', name: 'Feedback Field', fixedRange: [1, 2], power: 1, priority: 0,
      armor: 5,
      hit: [{ k: 'powerPerDamageArmored', amount: 2 }],
      text: 'Armor 5. OH: +2 Power for each point of damage your Armor absorbed this beat.',
    },
  ],
};

// ---------------------------------------------------------------- Rukyuk
// The sniper. Every shot needs a shell: ante an Ammo token or your Range
// becomes N/A and you simply miss. Six shells, each unique, and the only way
// to get them back is to spend a whole beat on Reload.

export const RUKYUK = {
  id: 'rukyuk',
  name: 'Rukyuk',
  epithet: 'Amberdeen, the Gunslinger',
  life: STARTING_LIFE,
  blurb:
    'A sniper who lives at range 3 to 5 and pays for every shot. Ante an ' +
    'Ammo token each beat or you cannot hit at all — and when the last shell ' +
    'is gone, you must spend a beat on Reload to get them back.',
  primer: [
    'Ante an Ammo every beat. With no shell loaded your Range becomes N/A and you miss.',
    'Six shells, each different: pick the one that solves this beat.',
    'Reload teleports you anywhere and refills all six — but it cannot hit.',
    'Stay at range 3~5. Point Blank exists for when that goes wrong.',
  ],
  difficulty: 'Hard',

  tokens: AMMO_TOKENS,

  styles: [
    {
      id: 'sniper', name: 'Sniper', dRange: [3, 5], dPower: 1, dPriority: 2,
      after: [{ k: 'move', min: 1, max: 3 }],
      text: 'AA: Move 1, 2 or 3.',
    },
    {
      id: 'crossfire', name: 'Crossfire', dRange: [2, 3], dPower: 1, dPriority: -2,
      armor: 2, guard: 1,
      hit: [{ k: 'spendAmmoForPower', amount: 2, optional: true }],
      text: 'Armor 2, Guard 1. OH, optional: spend 1 Ammo for +2 Power.',
    },
    {
      id: 'gunner', name: 'Gunner', dRange: [2, 4], dPower: 0, dPriority: 0,
      before: [{ k: 'spendAmmoForRange', optional: true }],
      after: [{ k: 'move', min: 1, max: 2 }],
      text: 'BA, optional: spend 1 Ammo for -1 to +1 Range. AA: Move 1 or 2.',
    },
    {
      id: 'pointblank', name: 'Point Blank', dRange: [0, 1], dPower: 0, dPriority: 0,
      guard: 2,
      damage: [{ k: 'push', min: 0, max: 2 }],
      text: 'Guard 2. OD: Push the target up to 2.',
    },
    {
      id: 'trick', name: 'Trick', dRange: [1, 2], dPower: 0, dPriority: -3,
      stunImmune: true,
      end: [{ k: 'retreatAtRange1', min: 0, max: 1 }],
      text: 'Stun Immunity. EoB at range 1: retreat up to 1.',
    },
  ],

  bases: [
    {
      id: 'reload', name: 'Reload', range: null, power: null, priority: 4,
      noHit: true, teleport: true,
      after: [{ k: 'teleport' }],
      end: [{ k: 'regainAllAmmo' }],
      text: 'Does not hit opponents. AA: Teleport to any space. EoB: regain all Ammo.',
    },
  ],

  finishers: [
    {
      id: 'fullyAutomatic', name: 'Fully Automatic', fixedRange: [3, 6], power: 2, priority: 6,
      negateAmmo: true,
      hit: [{ k: 'spendAllAmmoForPower', amount: 2 }],
      text: '*3~6 (fixed). Rev: negate the effects of any used Ammo. OH: spend all remaining Ammo for +2 Power each.',
    },
    {
      id: 'forceGrenade', name: 'Force Grenade', fixedRange: [1, 2], power: 4, priority: 4,
      negateAmmo: true, ignoreStyleBA: true, alwaysHits: true,
      hit: [{ k: 'push', min: 0, max: 6 }],
      after: [{ k: 'retreat', min: 0, max: 5 }],
      text: '*1~2 (fixed). Rev: negate used Ammo, ignore your Style BA. OH: push up to 6. AA: retreat up to 5.',
    },
  ],
};

export const CHARACTERS = [CADENZA, RUKYUK];
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
  // Range resolution.
  //
  //   * A base with no range (Reload) never gains one.
  //   * A FIXED range (written *3~5 on a card) hard-overrides everything and
  //     ignores every range modifier, from styles and from tokens alike.
  //   * Otherwise styles are MODIFIERS: +3~5 on a Range 1 base gives 4~6.
  //
  // Fixed ranges are the exception, so they are opt-in via `fixedRange`.
  let range = null;
  let rangeFixed = false;
  if (base.fixedRange) {
    range = [...base.fixedRange];
    rangeFixed = true;
  } else if (s.fixedRange) {
    range = [...s.fixedRange];
    rangeFixed = true;
  } else if (!base.noHit && base.range) {
    const d = s.dRange || [0, 0];
    range = [
      Math.max(0, base.range[0] + d[0]),
      Math.max(0, base.range[1] + d[1]),
    ];
  }
  return {
    name: `${s.name ? s.name + ' ' : ''}${base.name}`,
    baseId: base.id,
    styleId: s.id || null,
    range,
    rangeFixed,
    // A "no damage" base (Dodge) can never deal damage, whatever the Style says.
    power: (base.noDamage || base.power === null)
      ? null
      : Math.max(0, base.power + s.dPower),
    noDamage: !!base.noDamage || base.power === null,
    priority: base.priority + (s.dPriority || 0),
    armor: (base.armor || 0) + (s.armor || 0),
    guard: (base.guard || 0) + (s.dGuard || s.guard || 0),
    stunImmune: !!base.stunImmune || !!s.stunImmune,
    pierceGuard: !!base.pierceGuard || !!s.pierceGuard,
    ignoreArmor: !!base.ignoreArmor || !!s.ignoreArmor,
    ignoreGuard: !!base.ignoreGuard || !!s.ignoreGuard,
    noHit: !!base.noHit,
    alwaysHits: !!base.alwaysHits,
    teleport: !!base.teleport,
    negateAmmo: !!base.negateAmmo,
    ignoreStyleBA: !!base.ignoreStyleBA,

    isFinisher: !!base.isFinisher,
    reveal: [...(base.reveal || []), ...(s.reveal || [])],
    start: [...(s.start || []), ...(base.start || [])],
    before: [...(s.before || []), ...(base.before || [])],
    hit: [...(base.hit || []), ...(s.hit || [])],
    damage: [...(base.damage || []), ...(s.damage || [])],
    after: [...(base.after || []), ...(s.after || [])],
    end: [...(base.end || []), ...(s.end || [])],
    text: [s.text, base.text].filter(Boolean).join(' | '),
  };
}

// mark finishers so combat can gate them
for (const c of CHARACTERS) for (const f of c.finishers) f.isFinisher = true;
