import { describe, expect, it } from 'vitest';
import {
  ACTION_CAP,
  REGEN_INTERVAL_MS,
  accrue,
  canSpend,
  formatActions,
  formatCountdown,
  msUntilFull,
  msUntilNextAction,
  spend,
} from './actions';

/** A tank at an explicit level, anchored at `t`. */
function tank(actions: number, lastTick = 0, unbound = false) {
  return { actions, lastTick, unbound };
}

describe('action tank', () => {
  it('mints one action per whole interval and carries the remainder', () => {
    const start = tank(0, 0);
    const halfway = accrue(start, REGEN_INTERVAL_MS / 2);
    expect(halfway.actions).toBe(0);
    expect(halfway.gained).toBe(0);
    // The partial interval is not thrown away: the anchor has not moved.
    expect(halfway.lastTick).toBe(0);

    const later = accrue(start, REGEN_INTERVAL_MS * 2.5);
    expect(later.actions).toBe(2);
    expect(later.gained).toBe(2);
    // Half an interval of credit survives into the next tick.
    expect(later.lastTick).toBe(REGEN_INTERVAL_MS * 2);
  });

  it('clamps at the cap and parks the anchor at now', () => {
    const nearlyFull = tank(ACTION_CAP - 1, 0);
    const t = REGEN_INTERVAL_MS * 500;
    const result = accrue(nearlyFull, t);
    expect(result.actions).toBe(ACTION_CAP);
    // Nothing accrues while full, so time away from a full tank is not banked.
    expect(result.lastTick).toBe(t);
    // Nothing is coming when there is no room for it.
    expect(msUntilNextAction(result, t)).toBeNull();
    expect(msUntilFull(result, t)).toBeNull();
  });

  it('keeps a full tank stable across presentation reads', () => {
    const full = tank(ACTION_CAP, 123_456);
    expect(accrue(full, 5_000_000)).toEqual({
      ...full,
      gained: 0,
    });
    expect(accrue(full, 5_001_000)).toEqual({
      ...full,
      gained: 0,
    });
  });

  it('restarts the clock only when spending from a full tank', () => {
    const t = 5_000_000;
    const full = spend(tank(ACTION_CAP, 0), 1, t);
    expect(full.paid).toBe(true);
    expect(full.actions).toBe(ACTION_CAP - 1);
    // The Fallen London candle rule: the first spend starts the burn.
    expect(full.lastTick).toBe(t);

    // A tank that is merely part-way through an interval keeps its anchor, so
    // spending never pushes the next action further away.
    const anchor = t - 1000;
    const partial = spend(tank(ACTION_CAP - 1, anchor), 1, t);
    expect(partial.paid).toBe(true);
    expect(partial.actions).toBe(ACTION_CAP - 2);
    expect(partial.lastTick).toBe(anchor);
  });

  it('refuses an overspend without mutating the tank', () => {
    const result = spend(tank(2, 0), 5, 0);
    expect(result.paid).toBe(false);
    // Refusal reports accrued truth, but the balance is untouched.
    expect(result.actions).toBe(2);
    expect(canSpend(tank(2, 0), 5, 0)).toBe(false);
    expect(canSpend(tank(2, 0), 2, 0)).toBe(true);

    // Accrual still counts toward affordability: wait long enough and the
    // same spend goes through.
    expect(canSpend(tank(2, 0), 5, REGEN_INTERVAL_MS * 3)).toBe(true);
  });

  it('re-anchors instead of minting when the clock runs backwards', () => {
    const result = accrue(tank(10, 1_000_000), 500_000);
    expect(result.actions).toBe(10);
    expect(result.gained).toBe(0);
    expect(result.lastTick).toBe(500_000);
  });

  it('treats an unbound tank as always full and always payable', () => {
    const dev = tank(0, 0, true);
    expect(accrue(dev, 0).actions).toBe(ACTION_CAP);
    expect(canSpend(dev, 999, 0)).toBe(true);
    expect(spend(dev, 999, 0).paid).toBe(true);
    expect(msUntilNextAction(dev, 0)).toBeNull();
    expect(formatActions(dev)).toBe('∞');
  });

  it('formats the countdown and the readout for the HUD', () => {
    expect(formatCountdown(null)).toBe('--:--');
    expect(formatCountdown(0)).toBe('--:--');
    expect(formatCountdown(65_000)).toBe('01:05');
    // Hours fold into minutes rather than growing a third field.
    expect(formatCountdown(3_600_000 + 30_000)).toBe('60:30');
    expect(formatActions(tank(7))).toBe(`7/${ACTION_CAP}`);
  });

  it('reports the wait to a full tank', () => {
    const t = 0;
    const empty = tank(0, 0);
    expect(msUntilFull(empty, t)).toBe(ACTION_CAP * REGEN_INTERVAL_MS);
    expect(msUntilNextAction(empty, t)).toBe(REGEN_INTERVAL_MS);
  });
});
