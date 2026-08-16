import { describe, expect, it } from 'vitest';
import { chance, nativeRand, pick } from './random';

describe('pick', () => {
  it('returns the only item', () => {
    expect(pick(['solo'], () => 0.99)).toBe('solo');
  });
  it('uses rand to index', () => {
    const list = ['a', 'b', 'c'];
    expect(pick(list, () => 0)).toBe('a');
    expect(pick(list, () => 0.34)).toBe('b');
    expect(pick(list, () => 0.99)).toBe('c');
  });
  it('throws on empty', () => {
    expect(() => pick([])).toThrow(/empty/);
  });
});

describe('chance', () => {
  it('is false at 0 and below', () => {
    expect(chance(0, () => 0)).toBe(false);
    expect(chance(-1, () => 0)).toBe(false);
  });
  it('is true at 1 and above', () => {
    expect(chance(1, () => 0.99)).toBe(true);
    expect(chance(2, () => 0)).toBe(true);
  });
  it('compares against rand', () => {
    expect(chance(0.5, () => 0.49)).toBe(true);
    expect(chance(0.5, () => 0.5)).toBe(false);
  });
});

describe('nativeRand', () => {
  it('returns a number in [0, 1)', () => {
    const n = nativeRand();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(1);
  });
});
