import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, clearGameKeys, readJson, removeKey, writeJson } from './storage';

describe('storage', () => {
  it('returns fallback when missing', () => {
    expect(readJson('nope', { a: 1 })).toEqual({ a: 1 });
  });

  it('round-trips JSON', () => {
    expect(writeJson('k', { n: 4 })).toBe(true);
    expect(readJson('k', null)).toEqual({ n: 4 });
  });

  it('returns fallback on corrupt JSON', () => {
    localStorage.setItem('bad', '{');
    expect(readJson('bad', 'fb')).toBe('fb');
  });

  it('removeKey deletes a key', () => {
    writeJson('tmp', 1);
    removeKey('tmp');
    expect(readJson('tmp', null)).toBeNull();
  });

  it('clearGameKeys wipes the three game keys', () => {
    writeJson(STORAGE_KEYS.progress, { x: 1 });
    writeJson(STORAGE_KEYS.shift, { y: 2 });
    writeJson(STORAGE_KEYS.actions, { z: 3 });
    writeJson('other', 9);
    clearGameKeys();
    expect(readJson(STORAGE_KEYS.progress, null)).toBeNull();
    expect(readJson(STORAGE_KEYS.shift, null)).toBeNull();
    expect(readJson(STORAGE_KEYS.actions, null)).toBeNull();
    expect(readJson('other', null)).toBe(9);
  });

  it('writeJson reports failure when setItem throws', () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    const original = proto.setItem;
    proto.setItem = () => {
      throw new Error('quota');
    };
    expect(writeJson('x', 1)).toBe(false);
    proto.setItem = original;
  });

  it('readJson returns fallback when getItem throws', () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    const original = proto.getItem;
    proto.getItem = () => {
      throw new Error('blocked');
    };
    expect(readJson('k', 'fb')).toBe('fb');
    proto.getItem = original;
  });

  it('removeKey swallows throws', () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    const original = proto.removeItem;
    proto.removeItem = () => {
      throw new Error('nope');
    };
    expect(() => removeKey('x')).not.toThrow();
    proto.removeItem = original;
  });
});
