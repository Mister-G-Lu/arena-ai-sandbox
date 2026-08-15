import { describe, expect, it } from 'vitest';
import { currentSeq, nextId, resetIds } from './id';

describe('id', () => {
  it('increments with a prefix', () => {
    resetIds(0);
    expect(nextId('ln')).toBe('ln-1');
    expect(nextId('ln')).toBe('ln-2');
    expect(currentSeq()).toBe(2);
  });
  it('resetIds restores the counter', () => {
    resetIds(10);
    expect(nextId()).toBe('id-11');
    resetIds();
    expect(currentSeq()).toBe(0);
  });
});
