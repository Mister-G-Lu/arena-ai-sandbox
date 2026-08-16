import { describe, expect, it } from 'vitest';
import { createActionState, REGEN_MS } from '../game/actions';
import { createShift } from '../game/shift';
import { createProgress } from '../game/storylets';
import { makeEnvelope } from './saveFile';
import {
  envelopesDiffer,
  fileView,
  mergeActions,
  mergeEnvelopes,
  mergeQualities,
  mergeShift,
  mergeZones,
} from './merge';

const T0 = 2_000_000;

function env(over: Parameters<typeof makeEnvelope>[0]) {
  return makeEnvelope(over, new Date(T0));
}

describe('mergeQualities / mergeZones', () => {
  it('takes the max per quality, Attention included', () => {
    expect(mergeQualities({ Attention: 2, Perception: 1 }, { Attention: 5, Salary: 3 })).toEqual({
      Attention: 5,
      Perception: 1,
      Salary: 3,
    });
  });
  it('ranks complete > open > locked', () => {
    const a = { tutorial: 'complete', routine: 'locked', floor12: 'open' } as const;
    const b = { tutorial: 'open', routine: 'open', floor12: 'locked' } as const;
    expect(mergeZones(a, b)).toEqual({
      tutorial: 'complete',
      routine: 'open',
      floor12: 'open',
    });
  });
});

describe('mergeShift / mergeActions', () => {
  it('prefers the later day, then the lower task count', () => {
    const early = { ...createShift(), day: 4, tasks: 10 };
    const later = { ...createShift(), day: 5, tasks: 40 };
    expect(mergeShift(early, later).day).toBe(5);
    const sameA = { ...createShift(), day: 4, tasks: 10 };
    const sameB = { ...createShift(), day: 4, tasks: 30 };
    expect(mergeShift(sameA, sameB).tasks).toBe(10);
  });
  it('takes max current after accruing; resets lastTick at cap', () => {
    const low = createActionState(T0, { current: 10, lastTick: T0 });
    const high = createActionState(T0, { current: 40, lastTick: T0 });
    const merged = mergeActions(low, high, T0);
    expect(merged.current).toBe(40);
    expect(merged.lastTick).toBe(T0);
    const full = mergeActions(
      createActionState(T0, { current: 50, lastTick: T0 }),
      createActionState(T0, { current: 12, lastTick: T0 - REGEN_MS }),
      T0,
    );
    expect(full.current).toBe(50);
    expect(full.lastTick).toBe(T0);
  });
});

describe('mergeEnvelopes / fileView', () => {
  it('unions seen and keeps Attention in the file', () => {
    const local = env({
      progress: { ...createProgress(), seen: ['a'], qualities: { Attention: 1, Perception: 0, Doubt: 0, Salary: 0, Routine: 0 } },
      shift: createShift(),
      actions: createActionState(T0, { current: 3 }),
    });
    const cloud = env({
      progress: { ...createProgress(), seen: ['b'], qualities: { Attention: 4, Perception: 2, Doubt: 0, Salary: 0, Routine: 0 } },
      shift: { ...createShift(), day: 9 },
      actions: createActionState(T0, { current: 8 }),
    });
    const out = mergeEnvelopes(local, cloud, T0);
    expect(out.progress.seen.sort()).toEqual(['a', 'b']);
    expect(out.progress.qualities.Attention).toBe(4);
    expect(out.shift.day).toBe(9);
    expect(out.actions.current).toBe(8);
  });

  it('fileView omits Attention', () => {
    const e = env({
      progress: { ...createProgress(), qualities: { Attention: 9, Perception: 1, Doubt: 0, Salary: 0, Routine: 0 } },
      shift: createShift(),
      actions: createActionState(T0, { current: 7 }),
    });
    const view = fileView(e);
    expect(view.qualities.map(([k]) => k)).not.toContain('Attention');
    expect(view.qualities.map(([k]) => k)).toContain('Perception');
    expect(view.actions).toBe(7);
  });

  it('envelopesDiffer ignores log ids', () => {
    const a = env({ progress: createProgress(), shift: createShift(), actions: createActionState(T0) });
    const b = env({ progress: createProgress(), shift: createShift(), actions: createActionState(T0) });
    expect(envelopesDiffer(a, b)).toBe(false);
    const c = env({
      progress: createProgress(),
      shift: { ...createShift(), day: 99 },
      actions: createActionState(T0),
    });
    expect(envelopesDiffer(a, c)).toBe(true);
  });
});
