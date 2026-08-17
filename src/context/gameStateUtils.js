import { deposit, CREDIT_LIMIT } from '../game/ledger';
import { ACTION_CAP, accrue, spend as spendFromTank } from '../game/actions';
import { normalizeEffects, clampQuality, qualityDef } from '../game/qualities';
import { GLITCH_DEFS } from '../game/glitches';

/** Read the persisted tank fields as an ActionTank. */
export function tankOf(state) {
  return {
    actions: state.actions,
    lastTick: state.actionsLastTick,
    unbound: state.actionsUnbound,
  };
}

/** Fold a tank result back into game state. */
export function commitTank(state, tank) {
  return {
    ...state,
    actions: tank.actions,
    actionsLastTick: tank.lastTick,
    actionsUnbound: tank.unbound ?? state.actionsUnbound,
  };
}

/**
 * Bring a state loaded from any persistence boundary onto the local clock.
 * `lastTick: 0` is the additive-schema sentinel for "not anchored yet", never
 * permission to regenerate from the Unix epoch.
 */
export function hydrateActionTank(state, now = Date.now()) {
  const anchored = state.actionsLastTick > 0 ? state : { ...state, actionsLastTick: now };
  return commitTank(anchored, accrue(tankOf(anchored), now));
}

/**
 * Charge the tank for one action and apply `mutate` only if it paid.
 *
 * Every consequential verb in the game funnels through here, so there is
 * exactly one place where "can the operator afford this?" is answered and
 * exactly one place where a refusal short-circuits an interaction. A refused
 * spend returns the previous state untouched — never a partial application.
 */
export function withSpentAction(prev, cost, mutate, now = Date.now()) {
  const result = spendFromTank(tankOf(prev), cost, now);
  if (!result.paid) return prev;

  const charged = commitTank(prev, result);
  const next = mutate(charged);
  if (next === charged) return charged;

  // The shift clock counts actions taken, not actions deducted, so a dev with
  // an unbound tank still watches the night advance normally.
  return {
    ...next,
    actionsSpentThisShift: Math.min((next.actionsSpentThisShift ?? 0) + cost, ACTION_CAP),
  };
}

/**
 * Residue is forever — but the file that holds it is not infinite. The save
 * schema caps logbook, discoveries and seen-storylets (see gameSave.ts), and
 * before this cap the reducers appended without limit: a file that played its
 * way across the ceiling became a file the schema rejected, and from that
 * append onward every local write, cloud sync and export failed validation.
 * These live caps sit safely below the schema ceilings, so an in-game-grown
 * file can never reach the wall — the app prunes its oldest residue instead.
 */
export const LOGBOOK_CAP = 1000;
export const DISCOVERIES_CAP = 500;
export const SEEN_STORYLETS_CAP = 9500;

/**
 * What a termination costs, in actions. Design P3/§6 prices a death at one
 * hour of the next shift's budget ("you wake at 01:00 minus the hours you
 * spent dead") — six actions at the ten-minutes-per-action regen rate.
 */
export const DEATH_ACTION_DOCK = 6;

export function appendResidue(list, entry, cap) {
  const next = [...list, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Append a logbook entry inside a reducer without duplicating the shape. */
export function withLog(prev, text, extra = {}) {
  if (!text) return { ...prev, ...extra };
  return {
    ...prev,
    ...extra,
    logbook: appendResidue(
      prev.logbook,
      { day: prev.day, text, timestamp: Date.now() },
      LOGBOOK_CAP,
    ),
  };
}

/**
 * Apply a normalised effects map to state. Single code path for orientation
 * choices, console discrepancies and storylet outcomes.
 */
export function applyEffectsToState(prev, rawEffects) {
  const effects = normalizeEffects(rawEffects);
  if (Object.keys(effects).length === 0) return prev;

  let next = { ...prev, qualities: { ...prev.qualities } };

  for (const [key, delta] of Object.entries(effects)) {
    const def = qualityDef(key);
    if (!def) continue;

    if (def.kind === 'quality') {
      next.qualities[key] = clampQuality(key, (next.qualities[key] ?? 0) + delta);
    } else if (def.kind === 'attention') {
      next.attention = clampQuality('attention', (next.attention ?? 0) + delta);
    } else if (def.kind === 'credits') {
      const result = deposit(
        { credits: next.credits, unbound: next.ledgerUnbound },
        delta * (def.rate ?? 1),
      );
      next = commitLedger(next, result);
    }
  }

  return next;
}

/** Fold a ledger result back into game state, honouring the overflow glitch. */
export function commitLedger(prev, result) {
  const next = { ...prev, credits: result.credits, ledgerUnbound: result.unbound };
  const glitch = GLITCH_DEFS['ledger-overflow'];
  if (!result.overflowed || prev.glitches.includes(glitch.id)) return next;

  return withLog(
    next,
    `LEDGER OVERFLOW. The balance read ${result.wrapped?.toLocaleString?.() ?? 'a negative number'} for one frame, ` +
      'then stopped being a number at all. A ledger that wraps is a ledger with a word size. ' +
      'Meridian has a word size.',
    {
      glitches: [...prev.glitches, glitch.id],
      qualities: {
        ...prev.qualities,
        doubt: clampQuality('doubt', (prev.qualities.doubt ?? 0) + 1),
      },
      discoveries: appendResidue(
        prev.discoveries,
        {
          day: prev.day,
          text: `THE WORD: the municipal ledger is ${CREDIT_LIMIT.toLocaleString()} wide. Nothing in a city needs to be exactly that wide.`,
          timestamp: Date.now(),
        },
        DISCOVERIES_CAP,
      ),
    },
  );
}
