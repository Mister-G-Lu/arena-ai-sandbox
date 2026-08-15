import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_CAP, REGEN_MS } from '../game/actions';
import { STORAGE_KEYS } from '../utils/storage';
import { loadActions, useActions } from './useActions';

describe('loadActions', () => {
  it('creates a full tank when storage is empty', () => {
    expect(loadActions(1000).current).toBe(ACTION_CAP);
  });
  it('rehydrates a saved tank', () => {
    localStorage.setItem(
      STORAGE_KEYS.actions,
      JSON.stringify({ current: 4, cap: 50, regenMs: REGEN_MS, lastTick: 0 }),
    );
    expect(loadActions(0).current).toBe(4);
  });
});

describe('useActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts full and spendOne drops by one', () => {
    const { result } = renderHook(() => useActions());
    expect(result.current.remaining).toBe(50);
    expect(result.current.canAct).toBe(true);
    let spent = false;
    act(() => {
      spent = result.current.spendOne();
    });
    expect(spent).toBe(true);
    expect(result.current.remaining).toBe(49);
    expect(result.current.untilNext).toBe(REGEN_MS);
  });

  it('refuses to spend when empty', () => {
    localStorage.setItem(
      STORAGE_KEYS.actions,
      JSON.stringify({ current: 0, cap: 50, regenMs: REGEN_MS, lastTick: 1_000_000 }),
    );
    const { result } = renderHook(() => useActions());
    expect(result.current.canAct).toBe(false);
    let spent = true;
    act(() => {
      spent = result.current.spendOne();
    });
    expect(spent).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it('accrues on the interval', () => {
    localStorage.setItem(
      STORAGE_KEYS.actions,
      JSON.stringify({ current: 1, cap: 50, regenMs: REGEN_MS, lastTick: 1_000_000 }),
    );
    const { result } = renderHook(() => useActions());
    expect(result.current.remaining).toBe(1);
    act(() => {
      vi.advanceTimersByTime(REGEN_MS + 1000);
    });
    expect(result.current.remaining).toBe(2);
  });
});
