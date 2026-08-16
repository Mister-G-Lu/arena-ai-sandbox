import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../utils/storage';
import { loadProgress, useProgress } from './useProgress';

describe('loadProgress', () => {
  it('starts a fresh operator on an empty desk', () => {
    const p = loadProgress();
    expect(p.current?.storyletId).toBe('tutorial-01');
    expect(p.qualities.Attention).toBe(0);
  });

  it('rehydrates fr:progress', () => {
    localStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({
        qualities: { Attention: 2, Perception: 1 },
        zones: { tutorial: 'complete', routine: 'open', floor12: 'open' },
        seen: ['tutorial-01'],
        current: null,
      }),
    );
    const p = loadProgress();
    expect(p.zones.tutorial).toBe('complete');
    expect(p.qualities.Attention).toBe(2);
    expect(p.current).toBeNull();
  });
});

describe('useProgress', () => {
  it('plays the first tutorial choice and records the outcome', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.currentCard?.id).toBe('tutorial-01');
    act(() => {
      expect(result.current.choose('sit')).toBe(true);
    });
    expect(result.current.progress.current?.storyletId).toBe('tutorial-02');
    expect(result.current.lastOutcome).toMatch(/Attendance/);
    expect(result.current.progress.qualities.Routine).toBe(1);
  });

  it('refuses an unknown choice and a locked zone', () => {
    const { result } = renderHook(() => useProgress());
    act(() => {
      expect(result.current.choose('nope')).toBe(false);
      expect(result.current.openZone('floor12')).toBe(false);
    });
    act(() => {
      expect(result.current.openZone('routine')).toBe(true);
    });
    expect(result.current.progress.current?.zone).toBe('routine');
    act(() => {
      result.current.clearOutcome();
    });
    expect(result.current.lastOutcome).toBeNull();
  });

  it('lists six cards per zone', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.zoneCards('tutorial')).toHaveLength(6);
    expect(result.current.cards).toHaveLength(18);
  });
});
