import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HINT_GLITCH, WEATHER_STATIC } from '../game/glitch';
import { useGlitch } from './useGlitch';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useGlitch', () => {
  it('stays idle under reduced motion', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGlitch(true));
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current).toEqual({
      flicker: null,
      weatherOverride: null,
      hintOverride: null,
    });
  });

  it('fires weather static when the target is weather', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const { result } = renderHook(() => useGlitch(false));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.weatherOverride).toBe(WEATHER_STATIC);
    expect(result.current.flicker).toBe('weather');
    act(() => {
      vi.advanceTimersByTime(420);
    });
    expect(result.current.weatherOverride).toBeNull();
  });

  it('fires the hint swap', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.65);
    const { result } = renderHook(() => useGlitch(false));
    act(() => {
      vi.advanceTimersByTime(41_250);
    });
    expect(result.current.hintOverride).toBe(HINT_GLITCH);
    act(() => {
      vi.advanceTimersByTime(520);
    });
    expect(result.current.hintOverride).toBeNull();
  });

  it('fires a brand flicker', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => useGlitch(false));
    act(() => {
      vi.advanceTimersByTime(25_000);
    });
    expect(result.current.flicker).toBe('brand');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.flicker).toBeNull();
  });
});
