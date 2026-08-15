// Enemies telegraph their next attack. Every intent is fully visible before
// you commit your own play — the fight is a puzzle, not a guessing game.
//
// An intent is the same shape as a combined player attack, so combat.js
// resolves both sides through one code path.

export function intent({
  name, range, power, priority,
  start = [], before = [], hit = [], after = [], end = [],
  armor = 0, guard = 0, stunImmune = false, hitAll = false, text = '', tag = '',
}) {
  return {
    name, range, power, priority, start, before, hit, after, end,
    armor, guard, stunImmune, hitAll, text, tag,
  };
}

// -------------------------------------------------------------- enemy types

export const ENEMY_TYPES = {
  husk: {
    id: 'husk', name: 'Husk', glyph: 'H', life: 9, tier: 'minion',
    blurb: 'Shambles forward and swings. Slow, but it will reach you.',
    // Cycles predictably: shamble -> swing -> shamble ...
    pattern: (self, i) => [
      intent({
        name: 'Shamble', range: [1, 1], power: 2, priority: 2, guard: 2,
        start: [{ k: 'advance', min: 1, max: 2 }],
        text: 'Start: Advance 1~2 (tracks you). Guard 2',
      }),
      intent({
        name: 'Heavy Swing', range: [1, 1], power: 5, priority: 1, guard: 3,
        text: 'Guard 3. A wide, slow blow.',
      }),
    ][i % 2],
  },

  stalker: {
    id: 'stalker', name: 'Stalker', glyph: 'S', life: 7, tier: 'minion',
    blurb: 'Fast, fragile, and always trying to stay at knife range.',
    pattern: (self, i) => [
      intent({
        name: 'Dart In', range: [1, 2], power: 3, priority: 6,
        start: [{ k: 'close', min: 0, max: 3 }],
        text: 'Start: Close up to 3 (tracks you as you move)',
      }),
      intent({
        name: 'Slash', range: [1, 1], power: 4, priority: 5, guard: 2,
        text: 'Guard 2. Quick and clean.',
      }),
      intent({
        name: 'Fade', range: [1, 3], power: 2, priority: 7,
        after: [{ k: 'retreat', min: 1, max: 2 }],
        text: 'After: Retreat 1~2',
      }),
    ][i % 3],
  },

  archer: {
    id: 'archer', name: 'Archer', glyph: 'A', life: 8, tier: 'minion',
    blurb: 'Deadly at range, helpless up close. Punishes you for standing still.',
    pattern: (self, i) => [
      intent({
        name: 'Loose Arrow', range: [3, 6], power: 4, priority: 3, guard: 2,
        text: 'Guard 2. Only reaches distant targets.',
      }),
      intent({
        name: 'Backstep Shot', range: [2, 5], power: 3, priority: 4,
        before: [{ k: 'retreat', min: 1, max: 1 }],
        text: 'Before: Retreat 1',
      }),
      intent({
        name: 'Point Blank', range: [1, 2], power: 3, priority: 2,
        text: 'Cornered — it shoots from the hip.',
      }),
    ][i % 3],
  },

  brute: {
    id: 'brute', name: 'Brute', glyph: 'B', life: 14, tier: 'elite',
    blurb: 'Armoured and patient. Guards, then punishes.',
    pattern: (self, i) => [
      intent({
        name: 'Brace', range: [1, 1], power: 2, priority: 2, guard: 4, armor: 2,
        text: 'Gains 4 Guard this turn.',
      }),
      intent({
        name: 'Hammerfall', range: [1, 2], power: 7, priority: 1, guard: 5,
        hit: [{ k: 'push', min: 1, max: 2 }],
        text: 'Hit: Push 1~2',
      }),
      intent({
        name: 'Stomp', range: [1, 2], power: 4, priority: 3, guard: 3,
        hit: [{ k: 'stun' }],
        text: 'Guard 3. OH: Stun',
      }),
    ][i % 3],
  },

  automaton: {
    id: 'automaton', name: 'Automaton', glyph: 'X', life: 12, tier: 'elite',
    blurb: 'Stun Immune. You cannot lock it down — you have to out-position it.',
    pattern: (self, i) => [
      intent({
        name: 'Piston Jab', range: [1, 2], power: 4, priority: 4,
        stunImmune: true, armor: 1,
        text: 'Stun Immune, Armor 1',
      }),
      intent({
        name: 'Shove', range: [1, 1], power: 3, priority: 3,
        stunImmune: true,
        hit: [{ k: 'push', min: 2, max: 3 }],
        text: 'Stun Immune. OH: Push 2~3',
      }),
      intent({
        name: 'Overclock', range: [1, 2], power: 6, priority: 1,
        stunImmune: true,
        text: 'Stun Immune. Winds up and swings hard.',
      }),
    ][i % 3],
  },

  warden: {
    id: 'warden', name: 'Warden', glyph: 'W', life: 30, tier: 'boss',
    blurb: 'The Warden of the Seven Spaces. Stun Immune — it cannot be locked down, only outplayed.',
    // Reactive boss: reads your position and picks the intent that hurts most.
    pattern: (self, i, ctx) => {
      const d = ctx ? Math.abs(self.space - ctx.playerSpace) : 3;
      const phase2 = self.life <= 13;
      if (i % 4 === 3) {
        return intent({
          name: 'Sunder', range: [1, 3], power: phase2 ? 8 : 6, priority: 2,
          hit: [{ k: 'stun' }],
          stunImmune: true,
          tag: 'danger',
          text: 'OH: Stun. The big one — do not be standing there.',
        });
      }
      if (d <= 2) {
        return intent({
          name: 'Backhand', range: [1, 2], power: phase2 ? 6 : 4, priority: 5, guard: 4,
          hit: [{ k: 'push', min: 2, max: 2 }],
          text: 'Hit: Push 2',
        });
      }
      if (d >= 5) {
        return intent({
          name: 'Chain Pull', range: [3, 7], power: 4, priority: 4, guard: 3,
          hit: [{ k: 'pull', min: 2, max: 3 }],
          text: 'Hit: Pull 2~3',
        });
      }
      return intent({
        name: 'Advancing Cut', range: [2, 4], power: phase2 ? 6 : 5, priority: 3,
        stunImmune: true,
        start: [{ k: 'advance', min: 0, max: 2 }],
        text: 'Stun Immune. Start: Advance 0~2 (tracks you)',
      });
    },
  },
};

export function makeEnemy(typeId, space, uid) {
  const t = ENEMY_TYPES[typeId];
  return {
    uid,
    typeId,
    name: t.name,
    glyph: t.glyph,
    tier: t.tier,
    life: t.life,
    maxLife: t.life,
    space,
    armor: 0,
    guard: 0,
    stunImmune: false,
    stunned: false,
    damageTakenThisBeat: 0,
    damageArmoredThisBeat: 0,
    powerBonus: 0,
    dodging: new Set(),
    patternIndex: 0,
    intent: null,
  };
}

/** Refresh every living enemy's telegraphed intent. */
export function telegraph(state) {
  const ctx = { playerSpace: state.player.space };
  for (const e of state.enemies) {
    if (e.life <= 0) continue;
    e.intent = ENEMY_TYPES[e.typeId].pattern(e, e.patternIndex, ctx);
  }
}
