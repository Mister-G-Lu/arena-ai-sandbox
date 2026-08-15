// Beat resolution on a 7-space line: one player versus 1..3 enemies.
//
// BEAT STRUCTURE
//   1. Ante      — spend tokens (Cadenza: Shield -> Stun Immunity)
//   2. Reveal    — Style + Base combine; enemies' intents are already public
//   3. Start     — "Start of Beat" effects, before ANY activation.
//                  Dodge lives here: you reposition before anyone swings,
//                  which is what makes it pre-emptive rather than reactive.
//   4. Activate  — in Priority order; each fighter's BA fires in its own slot
//   5. End       — EoB effects, intents re-telegraph
//
// PRIORITY TIES ("clash")
//   The player acts first on a tie. Encounters are one-vs-many, so a
//   simultaneous-reveal clash rule would stall constantly; giving the player
//   the tie is both simpler to read and the generous reading.
//
// DAMAGE AND STUN (the core rule)
//   damage = max(0, power - soak)
//   Any damage stuns the target UNLESS
//     • the target is Stun Immune, or
//     • the target's Stun Guard >= damage dealt
//   A stunned fighter does not activate: no attack, no EoB.
//   Soak therefore does double duty — it blunts damage AND prevents stuns.

import { combine, baseLibrary, styleLibrary } from './characters.js';
import { makeEnemy, telegraph } from './enemies.js';
import { mulberry32 } from './rng.js';

export const ARENA_SIZE = 7;
export const MAX_FORCE = 10;

// ------------------------------------------------------------- board helpers

const inBoard = (n) => n >= 1 && n <= ARENA_SIZE;
const living = (s) => [s.player, ...s.enemies.filter((e) => e.life > 0)];
const occupiedBy = (s, space, except) =>
  living(s).find((a) => a !== except && a.space === space);

/** Step `amount` spaces in `dir`, blocked by other fighters. */
function step(s, actor, amount, dir) {
  let moved = 0;
  for (let i = 0; i < amount; i++) {
    const next = actor.space + dir;
    if (!inBoard(next) || occupiedBy(s, next, actor)) break;
    actor.space = next;
    moved++;
  }
  return moved;
}

/** Move ignoring occupancy en route; must land on an empty space. */
function phaseMove(s, actor, amount, dir) {
  const dest = actor.space + dir * amount;
  if (!inBoard(dest) || occupiedBy(s, dest, actor)) return 0;
  const moved = Math.abs(dest - actor.space);
  actor.space = dest;
  return moved;
}

const towardDir = (from, to) => (to > from ? 1 : -1);

export function nearestEnemy(s) {
  const alive = s.enemies.filter((e) => e.life > 0);
  if (!alive.length) return null;
  return alive.reduce((best, e) =>
    Math.abs(e.space - s.player.space) < Math.abs(best.space - s.player.space) ? e : best);
}

// ----------------------------------------------------------------- effects

function applyEffect(s, actor, target, eff, pick, log) {
  const name = actor.name;
  switch (eff.k) {
    case 'advance': {
      if (!target) return;
      const m = step(s, actor, pick(eff, 'advance'), towardDir(actor.space, target.space));
      if (m) log(`${name} advances ${m}.`);
      return;
    }
    case 'retreat': {
      if (!target) return;
      const m = step(s, actor, pick(eff, 'retreat'), -towardDir(actor.space, target.space));
      if (m) log(`${name} retreats ${m}.`);
      return;
    }
    case 'close': {
      if (!target) return;
      const gap = Math.abs(actor.space - target.space) - 1;
      const m = step(s, actor, Math.min(pick(eff, 'close'), Math.max(0, gap)),
        towardDir(actor.space, target.space));
      if (m) log(`${name} closes ${m}.`);
      return;
    }
    case 'dodgeMove': {
      // Move 1~3 in either direction, passing through fighters. Anyone we
      // move PAST (strictly between origin and destination) is dodged for the
      // whole beat: their attacks cannot touch us.
      const n = pick(eff, 'dodgeMove');
      const dir = (pick(eff, 'dodgeDir') ?? 1) >= 0 ? 1 : -1;
      const origin = actor.space;
      let moved = phaseMove(s, actor, n, dir);
      if (!moved) moved = phaseMove(s, actor, n, -dir);
      if (!moved) {
        log(`${name} tries to dodge but has nowhere to go.`);
        return;
      }
      const lo = Math.min(origin, actor.space);
      const hi = Math.max(origin, actor.space);
      const passed = living(s)
        .filter((a) => a !== actor && a.space > lo && a.space < hi);
      for (const foe of passed) {
        actor.dodging.add(foe.uid ?? 'player');
      }
      log(
        `${name} dodges ${moved} to space ${actor.space}` +
        (passed.length
          ? `, slipping past ${passed.map((f) => f.name).join(' and ')} — their attacks cannot connect.`
          : '.')
      );
      return;
    }
    case 'jumpPast': {
      if (!target) return;
      const dir = towardDir(actor.space, target.space);
      for (let d = 1; d <= ARENA_SIZE; d++) {
        const dest = target.space + dir * d;
        if (!inBoard(dest)) break;
        if (!occupiedBy(s, dest, actor)) {
          actor.space = dest;
          log(`${name} vaults past ${target.name} to space ${dest}.`);
          return;
        }
      }
      return;
    }
    case 'push': {
      if (!target) return;
      const m = step(s, target, pick(eff, 'push'), towardDir(actor.space, target.space));
      if (m) log(`${target.name} is pushed ${m}.`);
      return;
    }
    case 'pull': {
      if (!target) return;
      const m = step(s, target, pick(eff, 'pull'), -towardDir(actor.space, target.space));
      if (m) log(`${target.name} is pulled ${m}.`);
      return;
    }
    case 'soakUp':
      actor.soak += eff.amount;
      log(`${name} gains Soak ${eff.amount}.`);
      return;
    case 'heal': {
      const before = actor.life;
      actor.life = Math.min(actor.maxLife, actor.life + eff.amount);
      if (actor.life > before) log(`${name} heals ${actor.life - before}.`);
      return;
    }
    case 'stun':
      if (!target) return;
      // An explicit "OH: Stun" rider still respects Stun Immunity — that is
      // the whole point of anteing a Shield.
      if (target.stunImmune) {
        log(`${target.name} is Stun Immune and shrugs off the stun.`);
        return;
      }
      target.stunned = true;
      log(`${target.name} is stunned.`);
      return;
    case 'priorityBonus':
      actor.priorityBonusNext = (actor.priorityBonusNext || 0) + eff.amount;
      log(`${name} will have +${eff.amount} Priority next beat.`);
      return;
    // --- Cadenza's conditional power boosts -------------------------------
    case 'powerPerDamageTaken': {
      const bonus = (actor.damageTakenThisBeat || 0) * eff.amount;
      if (bonus) {
        actor.powerBonus = (actor.powerBonus || 0) + bonus;
        log(`${name} channels the blow: +${bonus} Power.`);
      }
      return;
    }
    case 'powerPerDamageSoaked': {
      const bonus = (actor.damageSoakedThisBeat || 0) * eff.amount;
      if (bonus) {
        actor.powerBonus = (actor.powerBonus || 0) + bonus;
        log(`${name} vents the impact: +${bonus} Power.`);
      }
      return;
    }
    default:
      return;
  }
}

// -------------------------------------------------------------- encounter

export function startEncounter(run, encounter) {
  const char = run.char;
  const s = {
    rng: mulberry32(run.seed + run.node * 977),
    beat: 1,
    over: false,
    victory: false,
    log: [],
    char,
    encounter,
    force: run.force ?? 0,
    // pending reactive prompt: { attackerName, damage, kills }
    pendingShield: null,
    player: {
      name: char.name,
      isPlayer: true,
      life: run.life,
      maxLife: char.life,
      space: encounter.playerSpace ?? 1,
      soak: 0,
      stunGuard: 0,
      stunImmune: false,
      stunned: false,
      tokens: char.tokens ? run.tokens ?? char.tokens.start : 0,
      antedStunImmunity: false,
      damageTakenThisBeat: 0,
      damageSoakedThisBeat: 0,
      powerBonus: 0,
      priorityBonusNext: 0,
      priorityBonus: 0,
      dodging: new Set(),
    },
    enemies: encounter.enemies.map((e, i) => makeEnemy(e.type, e.space, i)),
  };
  telegraph(s);
  s.log.push(`— ${encounter.name} —`);
  return s;
}

export function playerAttack(char, baseId, styleId) {
  const B = baseLibrary(char);
  const S = styleLibrary(char);
  return combine(B[baseId], styleId ? S[styleId] : null);
}

export const canUseFinisher = (s) => s.force >= s.player.life;

const clampPick = (eff, want) =>
  Math.max(eff.min ?? 0, Math.min(eff.max ?? 0, want === undefined ? (eff.max ?? 0) : want));

// ------------------------------------------------------------------ ante

/** Ante phase: spend a Shield for Stun Immunity this beat. */
export function anteShield(s, spend) {
  const p = s.player;
  p.antedStunImmunity = false;
  if (spend && p.tokens > 0) {
    p.tokens--;
    p.antedStunImmunity = true;
    s.log.push(`${p.name} antes a Shield — Stun Immunity this beat. (${p.tokens} left)`);
  }
  return s;
}

// ------------------------------------------------------------- the beat

/**
 * Resolve one beat.
 * play: { baseId, styleId, picks?, targetUid?, ante?, autoShield? }
 *   autoShield: 'always' | 'lethal' | 'never'  (reactive Shield policy)
 */
export function resolveBeat(s, play) {
  if (s.over) return s;
  const log = (m) => s.log.push(m);
  const p = s.player;
  const atk = playerAttack(s.char, play.baseId, play.styleId);

  log(`— Beat ${s.beat} —`);
  anteShield(s, !!play.ante);

  // reset per-beat state
  p.soak = atk.soak;
  p.stunGuard = atk.stunGuard;
  p.stunImmune = atk.stunImmune || p.antedStunImmunity;
  p.stunned = false;
  p.damageTakenThisBeat = 0;
  p.damageSoakedThisBeat = 0;
  p.powerBonus = 0;
  p.priorityBonus = p.priorityBonusNext || 0;
  p.priorityBonusNext = 0;
  p.shieldsUsedThisBeat = 0;
  p.dodging = new Set();

  for (const e of s.enemies) {
    if (e.life <= 0) continue;
    const i = e.intent;
    e.soak = i.soak || 0;
    e.stunGuard = i.stunGuard || 0;
    e.stunImmune = !!i.stunImmune;
    e.stunned = false;
    e.damageTakenThisBeat = 0;
    e.damageSoakedThisBeat = 0;
    e.powerBonus = 0;
    e.dodging = new Set();
  }

  const pPriority = atk.priority + p.priorityBonus;
  log(`${p.name}: ${atk.name} — ` +
    (atk.noDamage ? `no damage / Pri ${pPriority}`
      : `R ${atk.range[0]}~${atk.range[1]} / P ${atk.power} / Pri ${pPriority}`) +
    `${atk.soak ? ` / Soak ${atk.soak}` : ''}${atk.stunGuard ? ` / SG ${atk.stunGuard}` : ''}` +
    `${p.stunImmune ? ' / STUN IMMUNE' : ''}`);

  // ---- initiative: higher Priority first. On a tie (a "clash") the player
  // acts first — see the note at the top of this file.
  const order = [
    { kind: 'player', actor: p, atk, priority: pPriority },
    ...s.enemies.filter((e) => e.life > 0 && e.intent)
      .map((e) => ({ kind: 'enemy', actor: e, atk: e.intent, priority: e.intent.priority })),
  ].sort((a, b) => b.priority - a.priority || (a.kind === 'player' ? -1 : 1));

  const pickFor = (entry) => (eff, key) =>
    entry.kind === 'player' ? clampPick(eff, play.picks?.[key]) : clampPick(eff, undefined);

  const targetOf = (entry) => {
    if (entry.kind === 'enemy') return s.player;
    const chosen = s.enemies.find((e) => e.uid === play.targetUid && e.life > 0);
    return chosen || nearestEnemy(s);
  };

  // ---- START band: everyone's Start effects resolve before ANY activation,
  // in Priority order. Dodge repositions here.
  for (const entry of order) {
    if (entry.actor.life <= 0) continue;
    for (const eff of entry.atk.start || [])
      applyEffect(s, entry.actor, targetOf(entry), eff, pickFor(entry), log);
  }

  // ---- ACTIVATION, in Priority order.
  // "Before Activating" fires immediately before that fighter's own
  // activation — NOT as a global band. This matters: Press reads the damage
  // you took earlier in the beat, which only exists if faster fighters have
  // already swung.
  for (const entry of order) {
    if (s.over) break;
    const { actor, atk: a } = entry;
    if (actor.life <= 0) continue;
    if (actor.stunned) {
      if (!a.noDamage) log(`${actor.name} is stunned and cannot activate.`);
      continue;
    }

    // BA band for this fighter
    for (const eff of a.before)
      applyEffect(s, actor, targetOf(entry), eff, pickFor(entry), log);

    // being stunned during your own BA still cancels you
    if (actor.stunned) {
      log(`${actor.name} is stunned and cannot activate.`);
      continue;
    }
    if (a.noDamage) continue;   // Dodge and its kin can never deal damage

    const pool = entry.kind === 'enemy' ? [s.player] : s.enemies.filter((e) => e.life > 0);
    const myKey = actor.uid ?? 'player';
    const reachable = pool.filter((t) => {
      // A fighter that dodged past us this beat cannot be hit by us at all.
      if (t.dodging && t.dodging.has(myKey)) return false;
      const d = Math.abs(actor.space - t.space);
      return d >= a.range[0] && d <= a.range[1];
    });
    let victims;
    if (a.hitAll) victims = reachable;
    else {
      const primary = targetOf(entry);
      victims = primary && reachable.includes(primary) ? [primary] : reachable.slice(0, 1);
    }
    if (!victims.length) {
      const dodgedUs = pool.some((t) => t.dodging && t.dodging.has(myKey));
      if (dodgedUs) {
        log(`${actor.name} swings at empty air — dodged.`);
      } else {
        const d = pool.length ? Math.abs(actor.space - pool[0].space) : '-';
        log(`${actor.name} whiffs — nothing in range (nearest ${d}).`);
      }
      continue;
    }

    for (const v of victims) {
      const power = a.power + (actor.powerBonus || 0);
      dealDamage(s, actor, v, power, a, play, log);
      if (v.life > 0 && !s.over) {
        for (const eff of a.hit) applyEffect(s, actor, v, eff, pickFor(entry), log);
      }
    }
    checkEnd(s, log);
  }

  // ---- END OF BEAT band
  for (const entry of order) {
    if (s.over) break;
    if (entry.actor.life <= 0 || entry.actor.stunned) continue;
    for (const eff of entry.atk.after)
      applyEffect(s, entry.actor, targetOf(entry), eff, pickFor(entry), log);
  }

  // ---- cleanup
  for (const e of s.enemies) if (e.life > 0) e.patternIndex++;
  telegraph(s);
  s.force = Math.min(MAX_FORCE, s.force + 1);
  s.beat++;
  checkEnd(s, log);
  return s;
}

/**
 * Apply damage with Soak, reactive Shields, and the stun rule.
 */
function dealDamage(s, attacker, victim, power, a, play, log) {
  // Reactive Shield: "Whenever you are hit, you may use a Shield" -> Guard 9001.
  if (victim.isPlayer && victim.tokens > 0 && s.char.tokens) {
    const raw = Math.max(0, power - victim.soak);
    const policy = play.autoShield || 'lethal';
    const wants =
      policy === 'always' ? raw > 0 :
      policy === 'lethal' ? raw >= victim.life :
      false;
    if (wants) {
      victim.tokens--;
      victim.shieldsUsedThisBeat = (victim.shieldsUsedThisBeat || 0) + 1;
      log(`${victim.name} raises a Shield — Guard 9001 absorbs ${attacker.name}'s blow entirely. (${victim.tokens} left)`);
      victim.damageSoakedThisBeat += raw;
      return;
    }
  }

  const soak = victim.soak || 0;
  const dmg = Math.max(0, power - soak);
  const soaked = Math.min(soak, power);
  victim.damageSoakedThisBeat += soaked;

  if (dmg <= 0) {
    log(`${attacker.name} hits ${victim.name} but Soak ${soak} absorbs all ${power}.`);
    return;
  }

  victim.life -= dmg;
  victim.damageTakenThisBeat += dmg;
  log(`${attacker.name} hits ${victim.name} for ${dmg}` +
    `${soaked ? ` (Soak ${soaked} absorbed)` : ''}. ${victim.name}: ${Math.max(0, victim.life)} life.`);

  if (victim.life <= 0) {
    if (!victim.isPlayer) log(`${victim.name} is destroyed.`);
    return;
  }

  // ---- the stun rule
  if (a.pierceStunGuard) {
    if (!victim.stunImmune) {
      victim.stunned = true;
      log(`${victim.name} is stunned — Stun Guard pierced.`);
    } else log(`${victim.name} is Stun Immune and shrugs it off.`);
    return;
  }
  if (victim.stunImmune) {
    log(`${victim.name} is Stun Immune and keeps coming.`);
    return;
  }
  if ((victim.stunGuard || 0) >= dmg) {
    log(`${victim.name}'s Stun Guard ${victim.stunGuard} holds against ${dmg}.`);
    return;
  }
  victim.stunned = true;
  log(`${victim.name} is STUNNED — their activation is cancelled.`);
}

function checkEnd(s, log) {
  if (s.over) return;
  if (s.player.life <= 0) {
    s.over = true; s.victory = false;
    log(`${s.player.name} falls. The run ends here.`);
  } else if (s.enemies.every((e) => e.life <= 0)) {
    s.over = true; s.victory = true;
    log('Encounter cleared!');
  }
}

// ------------------------------------------------------------ UI helpers

export function threatSpaces(space, atk) {
  const out = [];
  if (atk.noDamage || !atk.power) return out;
  for (let i = 1; i <= ARENA_SIZE; i++) {
    const d = Math.abs(i - space);
    if (d >= atk.range[0] && d <= atk.range[1]) out.push(i);
  }
  return out;
}

/** Where an actor ends up after its telegraphed BA movement. */
export function projectedSpace(s, actor, atk, targetSpace) {
  let from = actor.space;
  for (const eff of atk.before) {
    const dir = towardDir(from, targetSpace);
    if (eff.k === 'advance' || eff.k === 'close') from += dir * (eff.max ?? 0);
    if (eff.k === 'retreat') from -= dir * (eff.max ?? 0);
  }
  return Math.max(1, Math.min(ARENA_SIZE, from));
}

export function intentThreatens(s, enemy) {
  if (!enemy.intent || enemy.life <= 0) return false;
  const from = projectedSpace(s, enemy, enemy.intent, s.player.space);
  const d = Math.abs(from - s.player.space);
  return d >= enemy.intent.range[0] && d <= enemy.intent.range[1];
}

/** Worst-case incoming damage this beat, for the "will I survive" readout. */
export function incomingDamage(s, myAtk) {
  let total = 0;
  const myPriority = myAtk.priority + (s.player.priorityBonus || 0);
  for (const e of s.enemies) {
    if (e.life <= 0 || !intentThreatens(s, e)) continue;
    // if we out-prioritise and would kill it, assume it never lands
    total += Math.max(0, e.intent.power - (myAtk.soak || 0));
  }
  return { total, myPriority };
}
