// Enemies telegraph their next attack. Every intent is fully visible before
// you commit your own play — the fight is a puzzle, not a guessing game.
//
// An intent is the same shape as a combined player attack, so combat.js
// resolves both sides through one code path.

export function intent({
  name, range, att, spd, before = [], hit = [], after = [],
  guard = 0, hitAll = false, text = '', tag = '',
}) {
  return { name, range, att, spd, before, hit, after, guard, hitAll, text, tag };
}

// -------------------------------------------------------------- enemy types

export const ENEMY_TYPES = {
  husk: {
    id: 'husk', name: 'Husk', glyph: 'H', life: 9, tier: 'minion',
    blurb: 'Shambles forward and swings. Slow, but it will reach you.',
    // Cycles predictably: shamble -> swing -> shamble ...
    pattern: (self, i) => [
      intent({
        name: 'Shamble', range: [1, 1], att: 2, spd: 2,
        before: [{ k: 'advance', min: 1, max: 2 }],
        text: 'Before: Advance 1~2',
      }),
      intent({
        name: 'Heavy Swing', range: [1, 1], att: 5, spd: 1,
        text: 'A wide, slow blow.',
      }),
    ][i % 2],
  },

  stalker: {
    id: 'stalker', name: 'Stalker', glyph: 'S', life: 7, tier: 'minion',
    blurb: 'Fast, fragile, and always trying to stay at knife range.',
    pattern: (self, i) => [
      intent({
        name: 'Dart In', range: [1, 2], att: 3, spd: 6,
        before: [{ k: 'close', min: 0, max: 3 }],
        text: 'Before: Close up to 3',
      }),
      intent({
        name: 'Slash', range: [1, 1], att: 4, spd: 5,
        text: 'Quick and clean.',
      }),
      intent({
        name: 'Fade', range: [1, 3], att: 2, spd: 7,
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
        name: 'Loose Arrow', range: [3, 6], att: 4, spd: 3,
        text: 'Only reaches distant targets.',
      }),
      intent({
        name: 'Backstep Shot', range: [2, 5], att: 3, spd: 4,
        before: [{ k: 'retreat', min: 1, max: 1 }],
        text: 'Before: Retreat 1',
      }),
      intent({
        name: 'Point Blank', range: [1, 2], att: 3, spd: 2,
        text: 'Cornered — it shoots from the hip.',
      }),
    ][i % 3],
  },

  brute: {
    id: 'brute', name: 'Brute', glyph: 'B', life: 14, tier: 'elite',
    blurb: 'Armoured and patient. Guards, then punishes.',
    pattern: (self, i) => [
      intent({
        name: 'Brace', range: [1, 1], att: 2, spd: 2, guard: 4,
        text: 'Gains 4 Guard this turn.',
      }),
      intent({
        name: 'Hammerfall', range: [1, 2], att: 7, spd: 1,
        hit: [{ k: 'push', min: 1, max: 2 }],
        text: 'Hit: Push 1~2',
      }),
      intent({
        name: 'Stomp', range: [1, 2], att: 4, spd: 3,
        hit: [{ k: 'stagger' }],
        text: 'Hit: Stagger (cancels your attack)',
      }),
    ][i % 3],
  },

  warden: {
    id: 'warden', name: 'Warden', glyph: 'W', life: 26, tier: 'boss',
    blurb: 'The Warden of the Seven Spaces. It answers everything you try.',
    // Reactive boss: reads your position and picks the intent that hurts most.
    pattern: (self, i, ctx) => {
      const d = ctx ? Math.abs(self.space - ctx.playerSpace) : 3;
      const phase2 = self.life <= 13;
      if (i % 4 === 3) {
        return intent({
          name: 'Sunder', range: [1, 3], att: phase2 ? 8 : 6, spd: 2,
          hit: [{ k: 'stagger' }],
          tag: 'danger',
          text: 'Hit: Stagger. The big one — do not be standing there.',
        });
      }
      if (d <= 2) {
        return intent({
          name: 'Backhand', range: [1, 2], att: phase2 ? 6 : 4, spd: 5,
          hit: [{ k: 'push', min: 2, max: 2 }],
          text: 'Hit: Push 2',
        });
      }
      if (d >= 5) {
        return intent({
          name: 'Chain Pull', range: [3, 6], att: 3, spd: 4,
          hit: [{ k: 'pull', min: 2, max: 3 }],
          text: 'Hit: Pull 2~3',
        });
      }
      return intent({
        name: 'Advancing Cut', range: [2, 3], att: phase2 ? 6 : 5, spd: 3,
        before: [{ k: 'advance', min: 0, max: 1 }],
        text: 'Before: Advance 0~1',
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
    guard: 0,
    staggered: false,
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
