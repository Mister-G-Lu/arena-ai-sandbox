/** P10 — Fallen London action tank. 1 / 10 min, cap 50. */

export const ACTION_CAP = 50;
export const REGEN_MS = 10 * 60 * 1000;

export interface ActionState {
  current: number;
  cap: number;
  regenMs: number;
  lastTick: number;
}

export function createActionState(
  now: number,
  overrides: Partial<ActionState> = {},
): ActionState {
  return {
    current: ACTION_CAP,
    cap: ACTION_CAP,
    regenMs: REGEN_MS,
    lastTick: now,
    ...overrides,
  };
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function parseActionState(raw: unknown, now: number): ActionState {
  const base = createActionState(now);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ActionState>;
  const cap = isFiniteNumber(r.cap) && r.cap > 0 ? Math.trunc(r.cap) : base.cap;
  const regenMs =
    isFiniteNumber(r.regenMs) && r.regenMs > 0 ? Math.trunc(r.regenMs) : base.regenMs;
  const current = isFiniteNumber(r.current) ? Math.trunc(r.current) : base.current;
  const lastTick = isFiniteNumber(r.lastTick) ? r.lastTick : now;
  return accrue({ current, cap, regenMs, lastTick }, now);
}

/** Accrue offline / elapsed regen. Cap clamps and resets the clock. */
export function accrue(state: ActionState, now: number): ActionState {
  const cap = state.cap;
  const regenMs = state.regenMs;
  if (state.current >= cap) {
    return { ...state, current: cap, lastTick: now };
  }
  if (now <= state.lastTick) return state;
  const elapsed = now - state.lastTick;
  const gained = Math.floor(elapsed / regenMs);
  if (gained <= 0) return state;
  const next = state.current + gained;
  if (next >= cap) {
    return { ...state, current: cap, lastTick: now };
  }
  return {
    ...state,
    current: next,
    lastTick: state.lastTick + gained * regenMs,
  };
}

export function canSpend(state: ActionState, n: number, now: number): boolean {
  if (n <= 0) return false;
  return accrue(state, now).current >= n;
}

/**
 * Spend n actions.
 * Full-tank spend restarts the 10-min clock.
 * Below-cap spend keeps the rhythm (lastTick unchanged).
 */
export function spend(
  state: ActionState,
  n: number,
  now: number,
): { state: ActionState; spent: boolean } {
  if (n <= 0) return { state: accrue(state, now), spent: false };
  const accrued = accrue(state, now);
  if (accrued.current < n) return { state: accrued, spent: false };
  const wasFull = accrued.current >= accrued.cap;
  const current = accrued.current - n;
  if (wasFull) {
    return { state: { ...accrued, current, lastTick: now }, spent: true };
  }
  return { state: { ...accrued, current }, spent: true };
}

/** Milliseconds until the next action. `null` if the tank is full. */
export function msUntilNext(state: ActionState, now: number): number | null {
  const s = accrue(state, now);
  if (s.current >= s.cap) return null;
  return Math.max(0, s.lastTick + s.regenMs - now);
}
