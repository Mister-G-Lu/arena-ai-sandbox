// Beat resolution on a 7-space line: one player versus 1..3 enemies.
//
// BEAT STRUCTURE
//   1. Ante       — spend tokens (Cadenza: Shield -> Stun Immunity)
//   2. Reveal     — Style + Base combine; enemy intents are already public
//   3. START      — every fighter's Start effects, in Priority order
//                   (faster fighters resolve their Start first).
//                   Dodge and Burst live here: you reposition before anyone
//                   swings, which is what makes them pre-emptive.
//   4. ACTIVATION — in Priority order, one fighter at a time:
//                     a. Before Activating (BA)
//                     b. the attack  (skipped entirely if stunned)
//                     c. On Hit (OH) riders
//                     d. After Activating  (skipped if stunned)
//   5. END OF BEAT — EoB effects for EVERY fighter, in Priority order.
//                    These fire NO MATTER WHAT: being stunned, whiffing, or
//                    never having a legal target does not cancel them.
//
// The After / End-of-Beat distinction is the load-bearing one. A stun cancels
// a fighter's activation and everything welded to it (BA, the attack, After),
// but never touches End of Beat.
//
// PRIORITY TIES ("clash")
//   The player acts first on a tie. Encounters are one-vs-many, so a
//   simultaneous-reveal clash rule would stall constantly; giving the player
//   the tie is both simpler to read and the generous reading.
//
// DAMAGE AND STUN (the core rule)
//   damage = max(0, power - armor)
//   Any damage stuns the target UNLESS
//     • the target is Stun Immune, or
//     • the target's Guard >= damage dealt
//   A stunned fighter does not activate: no attack, no EoB.
//   Armor therefore does double duty — it blunts damage AND prevents stuns.

import { combine, baseLibrary, styleLibrary } from './characters.js';
import { applyTokenMods, startingPool, TOKEN_BY_ID } from './tokens.js';
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
      actor.armor += eff.amount;
      log(`${name} gains Armor ${eff.amount}.`);
      return;
    case 'heal': {
      const before = actor.life;
      actor.life = Math.min(actor.maxLife, actor.life + eff.amount);
      if (actor.life > before) log(`${name} heals ${actor.life - before}.`);
      return;
    }
    case 'stun':
      if (!target) return;
      // An explicit "OH: Stun" rider ignores Guard — Guard only
      // protects against the automatic stun that damage causes. Stun Immunity
      // is the only thing that stops it, which is the point of the ante.
      if (target.stunImmune) {
        log(`${target.name} is Stun Immune and shrugs off the stun.`);
        return;
      }
      if (target.stunned) return;
      target.stunned = true;
      log(`${target.name} is stunned by the attack's rider (Guard does not apply).`);
      return;
    case 'move': {
      // "Move n" is toward OR away from the target — the actor chooses.
      // dir +1 = toward the target, -1 = away. Default away for a fighter
      // that wants distance; the solver enumerates both.
      const n = pick(eff, 'move');
      if (n <= 0) return;
      const wantDir = pick(eff, 'moveDir');
      const dir = (wantDir === undefined ? -1 : wantDir) >= 0 ? 1 : -1;
      const toward = target ? towardDir(actor.space, target.space) : 1;
      // Move as far as we can in the CHOSEN direction. Never silently flip:
      // at the board edge "away" used to fall back to "toward", which walked
      // a fleeing sniper straight back into melee.
      const m = step(s, actor, n, dir * toward);
      if (m) log(`${name} moves ${m} to space ${actor.space}.`);
      return;
    }
    case 'teleport': {
      // Reload: teleport to any free space. Prefer maximum distance from the
      // nearest threat, which is what a sniper actually wants.
      const want = pick(eff, 'teleport');
      const free = [];
      for (let i = 1; i <= ARENA_SIZE; i++) if (!occupiedBy(s, i, actor)) free.push(i);
      if (!free.length) return;
      let dest = free.includes(want) ? want : null;
      if (dest === null) {
        const foes = living(s).filter((a) => a !== actor);
        dest = free.reduce((best, i) => {
          const d = Math.min(...foes.map((f) => Math.abs(f.space - i)));
          const bd = Math.min(...foes.map((f) => Math.abs(f.space - best)));
          return d > bd ? i : best;
        }, free[0]);
      }
      actor.space = dest;
      log(`${name} teleports to space ${dest}.`);
      return;
    }
    case 'regainAllAmmo': {
      if (!actor.isPlayer || !s.tokenSpec) return;
      actor.tokenPool = startingPool(s.tokenSpec);
      log(`${name} reloads — all ${actor.tokenPool.length} shells are back.`);
      return;
    }
    case 'retreatAtRange1': {
      if (!target) return;
      if (Math.abs(actor.space - target.space) !== 1) return;
      const m = step(s, actor, pick(eff, 'retreatAtRange1'), -towardDir(actor.space, target.space));
      if (m) log(`${name} slips back ${m}.`);
      return;
    }
    case 'spendAmmoForPower': {
      // Crossfire OH, optional. Spend if we chose to.
      if (!actor.isPlayer) return;
      if (!actor.optIns || !actor.optIns.crossfire) return;
      if (!actor.tokenPool || !actor.tokenPool.length) return;
      const spent = actor.tokenPool.shift();
      actor.powerBonus = (actor.powerBonus || 0) + eff.amount;
      log(`${name} burns a ${TOKEN_BY_ID[spent]?.name || 'shell'} for +${eff.amount} Power.`);
      return;
    }
    case 'spendAmmoForRange': {
      if (!actor.isPlayer) return;
      if (!actor.optIns || !actor.optIns.gunner) return;
      if (!actor.tokenPool || !actor.tokenPool.length) return;
      const spent = actor.tokenPool.shift();
      actor.rangeBonus = actor.optIns.gunnerRange ?? 1;
      log(`${name} burns a ${TOKEN_BY_ID[spent]?.name || 'shell'} to adjust range by ${actor.rangeBonus >= 0 ? '+' : ''}${actor.rangeBonus}.`);
      return;
    }
    case 'spendAllAmmoForPower': {
      if (!actor.isPlayer || !actor.tokenPool) return;
      const n = actor.tokenPool.length;
      if (!n) return;
      actor.tokenPool = [];
      actor.powerBonus = (actor.powerBonus || 0) + n * eff.amount;
      log(`${name} empties the magazine — ${n} shells for +${n * eff.amount} Power.`);
      return;
    }
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
    case 'powerPerDamageArmored': {
      const bonus = (actor.damageArmoredThisBeat || 0) * eff.amount;
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
    tokenSpec: char.tokens,
    // pending reactive prompt: { attackerName, damage, kills }
    pendingShield: null,
    player: {
      name: char.name,
      isPlayer: true,
      life: run.life,
      maxLife: char.life,
      space: encounter.playerSpace ?? 1,
      armor: 0,
      guard: 0,
      stunImmune: false,
      stunned: false,
      tokenPool: run.tokenPool ? [...run.tokenPool] : startingPool(char.tokens),
      antedTokens: [],
      antedStunImmunity: false,
      optIns: {},
      rangeBonus: 0,
      damageTakenThisBeat: 0,
      damageArmoredThisBeat: 0,
      powerBonus: 0,
      priorityBonusNext: 0,
      priorityBonus: 0,
      dodging: new Set(),
    },
    enemies: encounter.enemies.map((e, i) => makeEnemy(e.type, e.space, i)),
  };
  // `tokens` is a convenience count over the pool. Writing it (mostly from
  // tests and the balance harness) trims or refills the pool to match.
  Object.defineProperty(s.player, 'tokens', {
    get() { return this.tokenPool.length; },
    set(n) {
      const full = startingPool(s.tokenSpec);
      while (this.tokenPool.length > n) this.tokenPool.pop();
      while (this.tokenPool.length < n && this.tokenPool.length < full.length) {
        const missing = full.find((id) => !this.tokenPool.includes(id));
        this.tokenPool.push(missing ?? full[0]);
      }
    },
    enumerable: false,
    configurable: true,
  });
  telegraph(s);
  s.log.push(`— ${encounter.name} —`);
  return s;
}

/**
 * Deep-ish copy of a state for lookahead. Rebuilds the `tokens` accessor:
 * a bare object spread drops it, which silently turns every solver score
 * into NaN.
 */
export function cloneState(s) {
  const player = {
    ...s.player,
    dodging: new Set(s.player.dodging || []),
    tokenPool: [...(s.player.tokenPool || [])],
    optIns: { ...(s.player.optIns || {}) },
  };
  const copy = {
    ...s,
    log: [],
    player,
    enemies: s.enemies.map((e) => ({ ...e, dodging: new Set(e.dodging || []) })),
  };
  Object.defineProperty(player, 'tokens', {
    get() { return this.tokenPool.length; },
    set(n) {
      const full = startingPool(copy.tokenSpec);
      while (this.tokenPool.length > n) this.tokenPool.pop();
      while (this.tokenPool.length < n && this.tokenPool.length < full.length) {
        const missing = full.find((id) => !this.tokenPool.includes(id));
        this.tokenPool.push(missing ?? full[0]);
      }
    },
    enumerable: false,
    configurable: true,
  });
  return copy;
}

export function playerAttack(char, baseId, styleId) {
  const B = baseLibrary(char);
  const S = styleLibrary(char);
  return combine(B[baseId], styleId ? S[styleId] : null);
}

export const canUseFinisher = (s) => s.force >= s.player.life;

const clampPick = (eff, want) => {
  // Effects with no declared range (teleport's destination, direction flags)
  // are free-form: pass the requested value straight through. Clamping them
  // to a non-existent max silently forced every teleport to space 1.
  if (eff.min === undefined && eff.max === undefined) return want;
  return Math.max(eff.min ?? 0, Math.min(eff.max ?? 0, want === undefined ? (eff.max ?? 0) : want));
};

/** Picks that are choices, not magnitudes, and must not be clamped. */
const DIRECTION_KEYS = new Set(['moveDir', 'dodgeDir', 'teleport']);

// ------------------------------------------------------------------ ante

/**
 * Ante phase. `ante` is either `true` (fungible: spend one) or an array of
 * token ids (unique: spend those specific shells).
 */
export function anteTokens(s, ante) {
  const p = s.player;
  const spec = s.tokenSpec;
  p.antedStunImmunity = false;
  p.antedTokens = [];
  if (!spec || !ante) return s;

  const wanted = ante === true ? [spec.list[0].id] : [...ante];
  const spent = [];
  for (const id of wanted) {
    const i = p.tokenPool.indexOf(id);
    if (i >= 0) { p.tokenPool.splice(i, 1); spent.push(id); }
  }
  if (!spent.length) return s;
  p.antedTokens = spent;

  if (spec.ante && spec.ante.stunImmune) {
    p.antedStunImmunity = true;
    s.log.push(`${p.name} antes a ${spec.name} — Stun Immunity this beat. (${p.tokenPool.length} left)`);
  } else {
    const names = spent.map((id) => TOKEN_BY_ID[id]?.name || id).join(', ');
    s.log.push(`${p.name} loads ${names}. (${p.tokenPool.length} left)`);
  }
  return s;
}

// kept for older call sites
export const anteShield = (s, spend) => anteTokens(s, spend ? true : null);

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
  anteTokens(s, play.ante ?? null);
  p.optIns = play.optIns || {};
  p.rangeBonus = 0;

  // (2) REVEAL band. Finishers that negate Ammo do so here: the shell is
  // still spent, but its effect never applies.
  const negate = !!atk.negateAmmo;
  if (negate && p.antedTokens.length) {
    log(`${atk.name} negates the loaded shell — it is spent regardless.`);
  }
  applyTokenMods(atk, p.antedTokens, { negate });

  // Rukyuk's passive: no shell loaded means no Range at all.
  const spec = s.tokenSpec;
  if (spec && spec.requiredOrMiss && !atk.noHit && !atk.alwaysHits
      && p.antedTokens.length === 0) {
    atk.range = null;
    atk.noRange = true;
    log(`${p.name} has no shell loaded — Range becomes N/A and the shot cannot connect.`);
  }

  // reset per-beat state
  p.armor = atk.armor;
  p.guard = atk.guard;
  p.stunImmune = atk.stunImmune || p.antedStunImmunity;
  p.stunned = false;
  p.damageTakenThisBeat = 0;
  p.damageArmoredThisBeat = 0;
  p.powerBonus = 0;
  p.priorityBonus = p.priorityBonusNext || 0;
  p.priorityBonusNext = 0;
  p.shieldsUsedThisBeat = 0;
  p.dodging = new Set();

  for (const e of s.enemies) {
    if (e.life <= 0) continue;
    const i = e.intent;
    e.armor = i.armor || 0;
    e.guard = i.guard || 0;
    e.stunImmune = !!i.stunImmune;
    e.stunned = false;
    e.damageTakenThisBeat = 0;
    e.damageArmoredThisBeat = 0;
    e.powerBonus = 0;
    e.dodging = new Set();
  }

  const pPriority = atk.priority + p.priorityBonus;
  log(`${p.name}: ${atk.name} — ` +
    (atk.noDamage || !atk.range
      ? `no damage / Pri ${pPriority}`
      : `R ${atk.range[0]}~${atk.range[1]} / P ${atk.power} / Pri ${pPriority}`) +
    `${atk.armor ? ` / Armor ${atk.armor}` : ''}${atk.guard ? ` / SG ${atk.guard}` : ''}` +
    `${p.stunImmune ? ' / STUN IMMUNE' : ''}`);

  // ---- initiative: higher Priority first. On a tie (a "clash") the player
  // acts first — see the note at the top of this file.
  const order = [
    { kind: 'player', actor: p, atk, priority: pPriority },
    ...s.enemies.filter((e) => e.life > 0 && e.intent)
      .map((e) => ({ kind: 'enemy', actor: e, atk: e.intent, priority: e.intent.priority })),
  ].sort((a, b) => b.priority - a.priority || (a.kind === 'player' ? -1 : 1));

  const pickFor = (entry) => (eff, key) =>
    entry.kind === 'player'
      ? (DIRECTION_KEYS.has(key) ? play.picks?.[key] : clampPick(eff, play.picks?.[key]))
      : (DIRECTION_KEYS.has(key) ? undefined : clampPick(eff, undefined));

  const targetOf = (entry) => {
    if (entry.kind === 'enemy') return s.player;
    const chosen = s.enemies.find((e) => e.uid === play.targetUid && e.life > 0);
    return chosen || nearestEnemy(s);
  };

  // ---- (3) START band. Every fighter's Start effects, faster first.
  // A stun cannot happen yet, so nothing here can be cancelled.
  for (const entry of order) {
    if (entry.actor.life <= 0) continue;
    for (const eff of entry.atk.start || [])
      applyEffect(s, entry.actor, targetOf(entry), eff, pickFor(entry), log);
  }

  // ---- (4) ACTIVATION, in Priority order.
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
    // The attack itself. A non-damaging pair (Reload, Dodge) or a whiff
    // simply skips this part — but NOT the After Activating band below.
    // Getting that wrong silently deleted Reload's teleport.
    const canHit = !a.noDamage && !a.noHit && !!a.range;
    if (canHit) {
      const pool = entry.kind === 'enemy' ? [s.player] : s.enemies.filter((e) => e.life > 0);
      const myKey = actor.uid ?? 'player';
      // A fixed (*) range ignores range modifiers, Gunner's shell included.
      const rb = a.rangeFixed ? 0 : (actor.rangeBonus || 0);
      const lo = Math.max(0, a.range[0] - Math.max(0, -rb));
      const hi = a.range[1] + Math.max(0, rb);
      const reachable = pool.filter((t) => {
        // A fighter that dodged past us this beat cannot be hit by us at all.
        if (t.dodging && t.dodging.has(myKey)) return false;
        const d = Math.abs(actor.space - t.space);
        return d >= lo && d <= hi;
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
      } else {
        for (const v of victims) {
          // ON HIT resolves BEFORE damage is dealt. This is the official
          // order, and it is load-bearing: effects like "spend Ammo for +2
          // Power" or Feedback Field's "+2 Power per damage absorbed" must be
          // able to raise Power before that Power is applied.
          for (const eff of a.hit) applyEffect(s, actor, v, eff, pickFor(entry), log);

          const power = (a.power ?? 0) + (actor.powerBonus || 0);
          const dealt = dealDamage(s, actor, v, power, a, play, log);

          // ON DAMAGE only fires if damage actually got through.
          if (dealt > 0 && v.life > 0 && !s.over) {
            for (const eff of a.damage || [])
              applyEffect(s, actor, v, eff, pickFor(entry), log);
          }
        }
        checkEnd(s, log);
      }
    }

    // (4d) AFTER ACTIVATING. Welded to the activation, so a stun cancels it —
    // but a whiff or a non-damaging pair does NOT. This is what makes
    // Reload's teleport and Sniper's repositioning actually work.
    if (!s.over && !actor.stunned && actor.life > 0) {
      for (const eff of a.after || [])
        applyEffect(s, actor, targetOf(entry), eff, pickFor(entry), log);
    }
    checkEnd(s, log);
  }

  // ---- (5) END OF BEAT band.
  // These fire NO MATTER WHAT. Being stunned, whiffing, or having had no
  // legal target does not cancel an EoB effect — only death does.
  for (const entry of order) {
    if (entry.actor.life <= 0) continue;
    for (const eff of entry.atk.end || [])
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
 * Apply damage with Armor, reactive Shields, and the stun rule.
 */
function dealDamage(s, attacker, victim, power, a, play, log) {
  // Reactive Shield: "Whenever you are hit, you may use a Shield" -> Guard 9001.
  if (victim.isPlayer && victim.tokens > 0 && s.char.tokens) {
    const raw = Math.max(0, power - victim.armor);
    const policy = play.autoShield || 'lethal';
    const wants =
      policy === 'always' ? raw > 0 :
      policy === 'lethal' ? raw >= victim.life :
      false;
    if (wants) {
      victim.tokens--;
      victim.shieldsUsedThisBeat = (victim.shieldsUsedThisBeat || 0) + 1;
      log(`${victim.name} raises a Shield — Guard 9001 absorbs ${attacker.name}'s blow entirely. (${victim.tokens} left)`);
      victim.damageArmoredThisBeat += raw;
      return 0;
    }
  }

  const armor = a.ignoreArmor ? 0 : (victim.armor || 0);
  const dmg = Math.max(0, power - armor);
  const absorbed = Math.min(armor, power);
  victim.damageArmoredThisBeat += absorbed;

  if (dmg <= 0) {
    log(`${attacker.name} hits ${victim.name} but Armor ${armor} absorbs all ${power}.`);
    return 0;
  }

  victim.life -= dmg;
  victim.damageTakenThisBeat += dmg;
  log(`${attacker.name} hits ${victim.name} for ${dmg}` +
    `${absorbed ? ` (Armor ${absorbed} absorbed)` : ''}${a.ignoreArmor && victim.armor ? ' (Armor ignored)' : ''}. ` +
    `${victim.name}: ${Math.max(0, victim.life)} life.`);

  if (victim.life <= 0) {
    if (!victim.isPlayer) log(`${victim.name} is destroyed.`);
    return dmg;
  }

  // ---- the stun rule
  if (victim.stunImmune) {
    log(`${victim.name} is Stun Immune and keeps coming.`);
    return dmg;
  }
  // Ignore Guard / pierce: Guard does not protect, but Stun Immunity still does.
  if (a.pierceGuard || a.ignoreGuard) {
    victim.stunned = true;
    log(`${victim.name} is STUNNED — Guard ignored.`);
    return dmg;
  }
  if ((victim.guard || 0) >= dmg) {
    log(`${victim.name}'s Guard ${victim.guard} holds against ${dmg}.`);
    return dmg;
  }
  victim.stunned = true;
  log(`${victim.name} is STUNNED — their activation is cancelled.`);
  return dmg;
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
  // Start effects happen before the attack, so they count toward where the
  // attack is made from — as do Before Activating effects.
  for (const eff of [...(atk.start || []), ...(atk.before || [])]) {
    const dir = towardDir(from, targetSpace);
    if (eff.k === 'advance' || eff.k === 'close') from += dir * (eff.max ?? 0);
    if (eff.k === 'retreat') from -= dir * (eff.max ?? 0);
    // A fighter can never move onto or through the target: approaching
    // movement stops adjacent. Without this the projection reported
    // distance 0 and the "will hit you" warning silently went false.
    if ((eff.k === 'advance' || eff.k === 'close')
        && (from === targetSpace || Math.sign(targetSpace - from) !== Math.sign(targetSpace - actor.space))) {
      from = targetSpace - dir;
    }
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
    total += Math.max(0, e.intent.power - (myAtk.armor || 0));
  }
  return { total, myPriority };
}
