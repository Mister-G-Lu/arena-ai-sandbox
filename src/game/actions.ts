/**
 * The action tank — the game's real pacing currency.
 *
 * FALSE REALITY used to count tasks *up* to a quota of fifty. That made the
 * shift the limiter and left storylets free, which meant the two economies
 * (design/core-design.md P2) had nothing to trade against: reading a notice
 * cost the operator nothing, so there was never a reason not to.
 *
 * The tank inverts it. There is one budget, ACTION_CAP deep, and everything
 * the operator does draws on it: filing a console result, taking a storylet
 * choice, walking into a zone. It refills on the wall clock at one action per
 * REGEN_INTERVAL_MS, whether or not the tab is open.
 *
 * This is the client half of design/server-authoritative-actions.md. The
 * arithmetic here is deliberately identical to the RPC contract staged in
 * supabase/0002_actions.sql, so moving authority to the server later is a
 * transport change and not a rules change:
 *
 *   - accrual is `floor(elapsed / REGEN_INTERVAL_MS)`, so a closed tab and a
 *     slow network land on the same number;
 *   - `lastTick` advances by whole intervals only, so the remainder of a
 *     partial interval is never silently discarded;
 *   - a spend from a *full* tank restarts the clock, which is the Fallen
 *     London candle rule: the timer means nothing while you are at cap;
 *   - an overspend is refused outright rather than clamped to zero, because a
 *     half-applied action is worse than a rejected one.
 *
 * Time is always passed in, never read from the ambient clock, so tests and
 * the eventual server both stay deterministic.
 */

/** A full tank. One sitting's worth of work — design/core-design.md P9. */
export const ACTION_CAP = 50;

/** One action per ten minutes. A full tank takes 8h20m to rebuild. */
export const REGEN_INTERVAL_MS = 10 * 60 * 1000;

export interface ActionTank {
  /** Actions currently in hand. Never above ACTION_CAP, never below 0. */
  actions: number;
  /** Epoch ms the current regeneration interval is measured from. */
  lastTick: number;
  /**
   * Dev capability: the tank never depletes. Mirrors `ledgerUnbound` — the
   * codebase already prefers a flag over a magic number for "no limit here".
   */
  unbound?: boolean;
}

export interface AccrualResult extends ActionTank {
  /** How many actions the wall clock just handed back. */
  gained: number;
}

export interface SpendResult extends ActionTank {
  /** False when the tank could not cover the cost; no state was changed. */
  paid: boolean;
}

function clampActions(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(ACTION_CAP, Math.floor(value)));
}

/**
 * Bring a tank up to date against the wall clock.
 *
 * Accrual is whole intervals only. `lastTick` moves forward by exactly the
 * intervals consumed, so the leftover seconds of a partial interval carry into
 * the next call instead of being rounded away — otherwise a player who
 * refreshed every nine minutes would never regenerate at all.
 *
 * At cap the clock is parked at `now`: time spent full is not banked, so
 * emptying a full tank does not immediately refund the hours it sat idle.
 */
export function accrue(tank: ActionTank, now: number): AccrualResult {
  const actions = clampActions(tank.actions);
  const lastTick = Number.isFinite(tank.lastTick) ? tank.lastTick : now;

  if (tank.unbound) {
    return { ...tank, actions: ACTION_CAP, lastTick: now, gained: 0 };
  }
  if (actions >= ACTION_CAP) {
    return { ...tank, actions: ACTION_CAP, lastTick: now, gained: 0 };
  }

  const elapsed = now - lastTick;
  if (!Number.isFinite(elapsed) || elapsed <= 0) {
    // A clock that went backwards (timezone change, corrected NTP, edited
    // save) must not mint actions. Re-anchor and hand back nothing.
    return { ...tank, actions, lastTick: elapsed < 0 ? now : lastTick, gained: 0 };
  }

  const intervals = Math.floor(elapsed / REGEN_INTERVAL_MS);
  if (intervals <= 0) return { ...tank, actions, lastTick, gained: 0 };

  const next = clampActions(actions + intervals);
  const gained = next - actions;

  return {
    ...tank,
    actions: next,
    // Full tanks park the clock at `now`; partial tanks keep the remainder.
    lastTick: next >= ACTION_CAP ? now : lastTick + intervals * REGEN_INTERVAL_MS,
    gained,
  };
}

/**
 * Spend actions, accruing first so an offline player is never told they are
 * empty when the clock has already refilled them.
 *
 * Refuses rather than clamps: the caller checks `paid` and abandons the whole
 * interaction, which keeps a filing from applying its effects for free.
 */
export function spend(tank: ActionTank, cost: number, now: number): SpendResult {
  const price = Math.max(0, Math.floor(Number.isFinite(cost) ? cost : 0));
  const current = accrue(tank, now);

  if (tank.unbound) {
    return { ...current, actions: ACTION_CAP, paid: true };
  }
  if (price === 0) return { ...current, paid: true };
  if (current.actions < price) return { ...current, paid: false };

  const wasFull = current.actions >= ACTION_CAP;

  return {
    ...current,
    actions: current.actions - price,
    // The candle rule: while the tank is full the timer is meaningless, so
    // the first spend from a full tank is what starts it running.
    lastTick: wasFull ? now : current.lastTick,
    paid: true,
  };
}

/** Whether the tank can currently cover `cost`. */
export function canSpend(tank: ActionTank, cost: number, now: number): boolean {
  if (tank.unbound) return true;
  return accrue(tank, now).actions >= Math.max(0, Math.floor(cost));
}

/**
 * Milliseconds until the next action lands, or null when none is coming
 * (the tank is full, or it never depletes).
 */
export function msUntilNextAction(tank: ActionTank, now: number): number | null {
  if (tank.unbound) return null;
  const current = accrue(tank, now);
  if (current.actions >= ACTION_CAP) return null;

  const elapsedInInterval = Math.max(0, now - current.lastTick) % REGEN_INTERVAL_MS;
  return REGEN_INTERVAL_MS - elapsedInInterval;
}

/** Milliseconds until the tank is completely full, or null if it already is. */
export function msUntilFull(tank: ActionTank, now: number): number | null {
  if (tank.unbound) return null;
  const current = accrue(tank, now);
  if (current.actions >= ACTION_CAP) return null;

  const next = msUntilNextAction(current, now) ?? 0;
  const remaining = ACTION_CAP - current.actions;
  return next + (remaining - 1) * REGEN_INTERVAL_MS;
}

/** `mm:ss` for the HUD countdown. Hours fold into minutes: 70:00 is fine. */
export function formatCountdown(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '--:--';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** What the HUD shows where the number goes. */
export function formatActions(tank: ActionTank): string {
  return tank.unbound ? '∞' : `${clampActions(tank.actions)}/${ACTION_CAP}`;
}
