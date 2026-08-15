import { describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './motion';

describe('prefersReducedMotion', () => {
  it('is false without matchMedia', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion({} as Window)).toBe(false);
  });

  it('reads the media query', () => {
    const mm = vi.fn().mockReturnValue({ matches: true });
    expect(prefersReducedMotion({ matchMedia: mm } as unknown as Window)).toBe(true);
    expect(mm).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('is false when matchMedia throws', () => {
    const mm = () => {
      throw new Error('old safari');
    };
    expect(prefersReducedMotion({ matchMedia: mm } as unknown as Window)).toBe(false);
  });
});
