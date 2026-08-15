import { describe, expect, it } from 'vitest';
import {
  ACTION_CAP,
  REGEN_MS,
  accrue,
  canSpend,
  createActionState,
  msUntilNext,
  parseActionState,
  spend,
} from './actions';

const T0 = 1_000_000;

describe('createActionState', () => {
  it('starts full with the clock reset', () => {
    const s = createActionState(T0);
    expect(s.current).toBe(ACTION_CAP);
    expect(s.cap).toBe(50);
    expect(s.regenMs).toBe(REGEN_MS);
    expect(s.lastTick).toBe(T0);
  });
  it('accepts overrides', () => {
    const s = createActionState(T0, { current: 3, lastTick: 10 });
    expect(s.current).toBe(3);
    expect(s.lastTick).toBe(10);
  });
});

describe('accrue', () => {
  it('does nothing below one regen interval', () => {
    const s = createActionState(T0, { current: 10, lastTick: T0 });
    expect(accrue(s, T0 + REGEN_MS - 1)).toEqual(s);
  });

  it('adds one action per 10 minutes and keeps the rhythm', () => {
    const s = createActionState(T0, { current: 10, lastTick: T0 });
    const next = accrue(s, T0 + REGEN_MS * 2 + 100);
    expect(next.current).toBe(12);
    expect(next.lastTick).toBe(T0 + REGEN_MS * 2);
  });

  it('clamps to cap and resets the clock', () => {
    const s = createActionState(T0, { current: 49, lastTick: T0 });
    const next = accrue(s, T0 + REGEN_MS * 5);
    expect(next.current).toBe(50);
    expect(next.lastTick).toBe(T0 + REGEN_MS * 5);
  });

  it('already-at-cap resets lastTick to now', () => {
    const s = createActionState(T0, { current: 50, lastTick: T0 });
    const next = accrue(s, T0 + 99999);
    expect(next.current).toBe(50);
    expect(next.lastTick).toBe(T0 + 99999);
  });

  it('ignores a clock that went backwards', () => {
    const s = createActionState(T0, { current: 10, lastTick: T0 });
    expect(accrue(s, T0 - 50)).toEqual(s);
  });

  it('offline from empty fills to cap and no further', () => {
    const s = createActionState(T0, { current: 0, lastTick: T0 });
    const nineHours = T0 + 9 * 60 * 60 * 1000;
    const next = accrue(s, nineHours);
    expect(next.current).toBe(50);
    expect(next.lastTick).toBe(nineHours);
  });
});

describe('spend', () => {
  it('full-tank spend restarts the clock', () => {
    const s = createActionState(T0, { current: 50, lastTick: T0 - 999 });
    const { state, spent } = spend(s, 1, T0);
    expect(spent).toBe(true);
    expect(state.current).toBe(49);
    expect(state.lastTick).toBe(T0);
  });

  it('below-cap spend keeps the rhythm', () => {
    const s = createActionState(T0, { current: 40, lastTick: T0 - 4000 });
    const { state, spent } = spend(s, 1, T0);
    expect(spent).toBe(true);
    expect(state.current).toBe(39);
    expect(state.lastTick).toBe(T0 - 4000);
  });

  it('refuses when empty', () => {
    const s = createActionState(T0, { current: 0, lastTick: T0 });
    const { state, spent } = spend(s, 1, T0);
    expect(spent).toBe(false);
    expect(state.current).toBe(0);
  });

  it('refuses non-positive spend but still accrues', () => {
    const s = createActionState(T0, { current: 10, lastTick: T0 });
    const { state, spent } = spend(s, 0, T0 + REGEN_MS);
    expect(spent).toBe(false);
    expect(state.current).toBe(11);
  });

  it('accrues first, then spends', () => {
    const s = createActionState(T0, { current: 0, lastTick: T0 });
    const { state, spent } = spend(s, 1, T0 + REGEN_MS);
    expect(spent).toBe(true);
    expect(state.current).toBe(0);
    expect(state.lastTick).toBe(T0 + REGEN_MS);
  });

  it('can spend several at once from below cap', () => {
    const s = createActionState(T0, { current: 10, lastTick: T0 });
    const { state, spent } = spend(s, 4, T0);
    expect(spent).toBe(true);
    expect(state.current).toBe(6);
    expect(state.lastTick).toBe(T0);
  });
});

describe('canSpend / msUntilNext', () => {
  it('canSpend is false for n<=0', () => {
    expect(canSpend(createActionState(T0), 0, T0)).toBe(false);
  });
  it('canSpend is true when the tank has the actions', () => {
    expect(canSpend(createActionState(T0, { current: 2, lastTick: T0 }), 2, T0)).toBe(true);
    expect(canSpend(createActionState(T0, { current: 1, lastTick: T0 }), 2, T0)).toBe(false);
  });
  it('msUntilNext is null at cap', () => {
    expect(msUntilNext(createActionState(T0), T0)).toBeNull();
  });
  it('msUntilNext counts down from lastTick', () => {
    const s = createActionState(T0, { current: 3, lastTick: T0 });
    expect(msUntilNext(s, T0 + 1000)).toBe(REGEN_MS - 1000);
  });
});

describe('parseActionState', () => {
  it('falls back on garbage', () => {
    const s = parseActionState(null, T0);
    expect(s.current).toBe(50);
    expect(parseActionState('nope', T0).current).toBe(50);
  });
  it('accepts a valid blob and accrues', () => {
    const s = parseActionState(
      { current: 10, cap: 50, regenMs: REGEN_MS, lastTick: T0 },
      T0 + REGEN_MS,
    );
    expect(s.current).toBe(11);
  });
  it('rejects non-finite fields', () => {
    const s = parseActionState(
      { current: NaN, cap: -4, regenMs: 0, lastTick: Infinity },
      T0,
    );
    expect(s.cap).toBe(50);
    expect(s.regenMs).toBe(REGEN_MS);
    expect(s.current).toBe(50);
  });
});
