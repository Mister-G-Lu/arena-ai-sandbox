// Token systems.
//
// Two shapes are supported, because the two characters need different things:
//
//   fungible  — N interchangeable copies of one token (Cadenza's 3 Shields).
//   unique    — a named set, each with its own effect (Rukyuk's 6 Ammo).
//
// A token can modify the attack it is anted onto (power/range/priority,
// ignore flags) and/or bolt extra timed effects onto it.

export const SHIELD_TOKENS = {
  id: 'shield',
  name: 'Shield',
  kind: 'fungible',
  max: 3,
  start: 3,
  anteLabel: 'Ante a Shield',
  text: 'Guard 9001. Ante for Stun Immunity, or spend reactively when hit.',
  // Anteing a Shield grants Stun Immunity for the beat.
  ante: { stunImmune: true },
  list: [
    { id: 'shield', name: 'Shield', text: 'Stun Immunity when anted; Guard 9001 when spent reactively.' },
  ],
};

export const AMMO_TOKENS = {
  id: 'ammo',
  name: 'Ammo',
  kind: 'unique',
  max: 6,
  start: 6,
  anteLabel: 'Load a shell',
  text: 'Six shells, each with its own effect. Ante one per beat or your shots miss.',
  // Rukyuk must ante an Ammo each beat or his Range becomes N/A.
  requiredOrMiss: true,
  list: [
    { id: 'explosive', name: 'Explosive Shell', short: 'EXP', text: '+2 Power', mod: { dPower: 2 } },
    { id: 'longshot', name: 'Longshot', short: 'LNG', text: '-1 to +1 Range', mod: { dRange: [-1, 1] } },
    { id: 'ap', name: 'AP Shell', short: 'AP', text: 'Ignore Armor', mod: { ignoreArmor: true } },
    { id: 'swift', name: 'Swift Shell', short: 'SWF', text: '+2 Priority', mod: { dPriority: 2 } },
    { id: 'flash', name: 'Flash Shell', short: 'FLS', text: 'Ignore Guard', mod: { ignoreGuard: true } },
    {
      id: 'impact', name: 'Impact Shell', short: 'IMP', text: 'OH: Push 2',
      mod: { hit: [{ k: 'push', min: 2, max: 2 }] },
    },
  ],
};

export const TOKEN_BY_ID = Object.fromEntries(
  [...SHIELD_TOKENS.list, ...AMMO_TOKENS.list].map((t) => [t.id, t])
);

/** The starting pool for a token spec: an array of token ids. */
export function startingPool(spec) {
  if (!spec) return [];
  if (spec.kind === 'fungible') return Array(spec.start).fill(spec.list[0].id);
  return spec.list.map((t) => t.id);
}

/** Apply anted token mods onto an attack in place. */
export function applyTokenMods(atk, tokenIds, { negate = false } = {}) {
  atk.antedTokens = [...tokenIds];
  if (negate || !tokenIds.length) return atk;
  for (const id of tokenIds) {
    const t = TOKEN_BY_ID[id];
    const m = t && t.mod;
    if (!m) continue;
    if (m.dPower) atk.power = Math.max(0, (atk.power ?? 0) + m.dPower);
    if (m.dPriority) atk.priority += m.dPriority;
    if (m.dRange && atk.range) {
      atk.range = [
        Math.max(0, atk.range[0] + m.dRange[0]),
        Math.max(0, atk.range[1] + m.dRange[1]),
      ];
    }
    if (m.ignoreArmor) atk.ignoreArmor = true;
    if (m.ignoreGuard) atk.ignoreGuard = true;
    if (m.hit) atk.hit = [...atk.hit, ...m.hit];
    if (m.start) atk.start = [...atk.start, ...m.start];
    if (m.after) atk.after = [...atk.after, ...m.after];
  }
  return atk;
}
