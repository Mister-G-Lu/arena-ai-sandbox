// Combat resolution for one encounter: the player versus 1..3 enemies on a
// 7-space line. Enemies telegraph intents; the player's play and every intent
// resolve through the same pipeline, ordered by Spd.

import { BASE_BY_ID, STYLE_BY_ID, combine } from './cards.js';
import { makeEnemy, telegraph } from './enemies.js';
import { mulberry32 } from './rng.js';

export const ARENA_SIZE = 7;

// ------------------------------------------------------------- board helpers

const inBoard = (n) => n >= 1 && n <= ARENA_SIZE;

const occupants = (s) => [s.player, ...s.enemies.filter((e) => e.life > 0)];

function occupiedBy(s, space, except) {
  return occupants(s).find((a) => a !== except && a.space === space);
}

/**
 * Move `actor` `amount` spaces in `dir` (+1/-1 along the board).
 * Blocked by other fighters: you stop before them, you never share a space.
 * Returns spaces actually moved.
 */
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

const towardDir = (from, to) => (to > from ? 1 : -1);

/** Nearest living enemy to the player (ties break toward the lower space). */
export function nearestEnemy(s) {
  const alive = s.enemies.filter((e) => e.life > 0);
  if (!alive.length) return null;
  return alive.reduce((best, e) =>
    Math.abs(e.space - s.player.space) < Math.abs(best.space - s.player.space) ? e : best
  );
}

export const distanceBetween = (a, b) => Math.abs(a.space - b.space);

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
      log(`${name} has nowhere to vault to.`);
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
    case 'guardUp':
      actor.guard += eff.amount;
      log(`${name} gains ${eff.amount} Guard.`);
      return;
    case 'heal': {
      const before = actor.life;
      actor.life = Math.min(actor.maxLife, actor.life + eff.amount);
      if (actor.life > before) log(`${name} heals ${actor.life - before}.`);
      return;
    }
    case 'stagger':
      if (!target) return;
      target.staggered = true;
      log(`${target.name} is staggered — their attack is cancelled.`);
      return;
    default:
      return;
  }
}

// -------------------------------------------------------------- encounter

export function startEncounter(run, encounter) {
  const s = {
    rng: mulberry32(run.seed + run.node * 977),
    turn: 1,
    over: false,
    victory: false,
    log: [],
    player: {
      name: 'You',
      isPlayer: true,
      life: run.life,
      maxLife: run.maxLife,
      space: encounter.playerSpace ?? 1,
      guard: 0,
      staggered: false,
    },
    enemies: encounter.enemies.map((e, i) => makeEnemy(e.type, e.space, i)),
    encounter,
  };
  telegraph(s);
  s.log.push(`— ${encounter.name} —`);
  return s;
}

/** Every attack the player could make from their current deck. */
export function playerAttack(baseId, styleId) {
  return combine(BASE_BY_ID[baseId], STYLE_BY_ID[styleId]);
}

const clampPick = (eff, want) =>
  Math.max(eff.min, Math.min(eff.max, want === undefined ? eff.max : want));

/**
 * Resolve one full turn.
 * play: { baseId, styleId, picks?, targetUid? }
 */
export function resolveTurn(s, play) {
  if (s.over) return s;
  const log = (m) => s.log.push(m);
  const atk = playerAttack(play.baseId, play.styleId);
  const pickPlayer = (eff, key) => clampPick(eff, play.picks?.[key]);
  const pickEnemy = (eff) => eff.max;

  log(`— Turn ${s.turn} —`);
  log(`You: ${atk.name} (Rng ${atk.range[0]}~${atk.range[1]}, Att ${atk.att}, Spd ${atk.spd})`);

  s.player.guard = atk.guard;
  s.player.staggered = false;
  for (const e of s.enemies) {
    e.guard = e.intent?.guard || 0;
    e.staggered = false;
  }

  // Build the initiative order. Ties: the player acts first (a small,
  // legible bias — the telegraph already tells you the numbers).
  const actors = [
    { kind: 'player', actor: s.player, atk, pick: pickPlayer },
    ...s.enemies
      .filter((e) => e.life > 0 && e.intent)
      .map((e) => ({ kind: 'enemy', actor: e, atk: e.intent, pick: pickEnemy })),
  ].sort((a, b) => b.atk.spd - a.atk.spd || (a.kind === 'player' ? -1 : 1));

  const targetOf = (entry) => {
    if (entry.kind === 'enemy') return s.player;
    const chosen = s.enemies.find((e) => e.uid === play.targetUid && e.life > 0);
    return chosen || nearestEnemy(s);
  };

  for (const entry of actors) {
    if (s.over) break;
    const { actor, atk: a, pick } = entry;
    if (actor.life <= 0) continue;

    // BEFORE
    if (!actor.staggered) {
      for (const eff of a.before) applyEffect(s, actor, targetOf(entry), eff, pick, log);
    }
    if (actor.staggered) {
      continue;
    }

    // HIT — resolve once, or twice for repeating attacks
    const swings = a.repeat ? 2 : 1;
    for (let sw = 0; sw < swings; sw++) {
      if (actor.life <= 0 || s.over) break;
      const pool = entry.kind === 'enemy'
        ? [s.player]
        : s.enemies.filter((e) => e.life > 0);
      const inRangeTargets = pool.filter((t) => {
        const d = Math.abs(actor.space - t.space);
        return d >= a.range[0] && d <= a.range[1];
      });
      let victims;
      if (a.hitAll) victims = inRangeTargets;
      else {
        const primary = targetOf(entry);
        victims = primary && inRangeTargets.includes(primary)
          ? [primary]
          : inRangeTargets.slice(0, 1);
      }
      if (!victims.length) {
        if (sw === 0) {
          const d = pool.length ? Math.abs(actor.space - pool[0].space) : '-';
          log(`${actor.name} misses — nothing in range (nearest ${d}).`);
        }
        break;
      }
      for (const v of victims) {
        const guard = a.ignoreGuard ? 0 : v.guard;
        const dmg = Math.max(0, a.att - guard);
        v.life -= dmg;
        log(
          `${actor.name} hits ${v.name} for ${dmg}` +
          `${guard ? ` (${guard} Guard absorbed)` : ''}. ` +
          `${v.name}: ${Math.max(0, v.life)} life.`
        );
        for (const eff of a.hit) applyEffect(s, actor, v, eff, pick, log);
        if (v.life <= 0 && !v.isPlayer) log(`${v.name} is destroyed.`);
      }
      checkEnd(s, log);
    }

    // AFTER
    if (!s.over && !actor.staggered && actor.life > 0) {
      for (const eff of a.after) applyEffect(s, actor, targetOf(entry), eff, pick, log);
    }
    checkEnd(s, log);
  }

  // advance enemy patterns and re-telegraph
  for (const e of s.enemies) {
    if (e.life > 0) e.patternIndex++;
  }
  telegraph(s);

  s.turn++;
  checkEnd(s, log);
  return s;
}

function checkEnd(s, log) {
  if (s.over) return;
  if (s.player.life <= 0) {
    s.over = true;
    s.victory = false;
    log('You fall. The run ends here.');
  } else if (s.enemies.every((e) => e.life <= 0)) {
    s.over = true;
    s.victory = true;
    log('Encounter cleared!');
  }
}

// ------------------------------------------------------------ UI helpers

/** Which spaces a given attack would threaten from `space`. */
export function threatSpaces(space, atk) {
  const out = [];
  for (let i = 1; i <= ARENA_SIZE; i++) {
    const d = Math.abs(i - space);
    if (d >= atk.range[0] && d <= atk.range[1]) out.push(i);
  }
  return out;
}

/**
 * Would this enemy intent connect with the player right now, ignoring any
 * movement the player is about to make? Powers the "INCOMING" warning.
 */
export function intentThreatens(s, enemy) {
  if (!enemy.intent || enemy.life <= 0) return false;
  let from = enemy.space;
  for (const eff of enemy.intent.before) {
    const dir = towardDir(from, s.player.space);
    if (eff.k === 'advance' || eff.k === 'close') from += dir * eff.max;
    if (eff.k === 'retreat') from -= dir * eff.max;
  }
  from = Math.max(1, Math.min(ARENA_SIZE, from));
  const d = Math.abs(from - s.player.space);
  return d >= enemy.intent.range[0] && d <= enemy.intent.range[1];
}
