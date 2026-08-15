import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  it('starts from matchMedia and follows changes', () => {
    const listeners: Array<() => void> = [];
    const mq = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => undefined,
    };
    window.matchMedia = vi.fn().mockReturnValue(mq);
    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    mq.matches = true;
    act(() => {
      listeners.forEach((fn) => fn());
    });
    expect(result.current).toBe(true);
    unmount();
  });
});
