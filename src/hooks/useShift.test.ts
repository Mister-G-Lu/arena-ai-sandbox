import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HEAL_MS } from '../game/glitch';
import { STORAGE_KEYS } from '../utils/storage';
import { loadShift, useShift } from './useShift';

describe('loadShift', () => {
  it('creates a fresh shift when empty', () => {
    expect(loadShift().day).toBe(4);
    expect(loadShift().tasks).toBe(50);
  });
  it('rehydrates', () => {
    localStorage.setItem(
      STORAGE_KEYS.shift,
      JSON.stringify({
        day: 8,
        tasks: 12,
        minutes: 120,
        complete: false,
        log: [{ id: 'x', clock: '02:00', text: 'hi', kind: 'system' }],
      }),
    );
    expect(loadShift().day).toBe(8);
    expect(loadShift().tasks).toBe(12);
  });
});

describe('useShift', () => {
  it('perform spends a task and startTomorrow advances the day', () => {
    const { result } = renderHook(() => useShift(true));
    expect(result.current.shift.tasks).toBe(50);
    act(() => {
      expect(result.current.perform()).toBe(true);
    });
    expect(result.current.shift.tasks).toBe(49);
    act(() => {
      result.current.startTomorrow();
    });
    expect(result.current.shift.day).toBe(5);
    expect(result.current.shift.tasks).toBe(50);
  });

  it('refuses to perform when complete', () => {
    localStorage.setItem(
      STORAGE_KEYS.shift,
      JSON.stringify({ day: 1, tasks: 0, minutes: 360, complete: true, log: [] }),
    );
    const { result } = renderHook(() => useShift(true));
    let ok = true;
    act(() => {
      ok = result.current.perform();
    });
    expect(ok).toBe(false);
  });

  it('heals a corrupt line after 950ms', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useShift(false));
    act(() => {
      result.current.perform();
    });
    const line = result.current.shift.log.find((l) => l.kind === 'corrupt');
    expect(line).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(HEAL_MS);
    });
    const healed = result.current.shift.log.find((l) => l.id === line?.id);
    expect(healed?.kind).toBe('routine');
    vi.spyOn(Math, 'random').mockRestore();
    vi.useRealTimers();
  });
});
