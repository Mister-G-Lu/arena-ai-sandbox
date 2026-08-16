import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEV_MODE_KEY,
  consumeDevQueryFlag,
  detectDevMode,
  isDevEnvironment,
  setDevOptIn,
} from './devMode';

/** A stand-in for `window.location` — the functions only read two fields. */
function at(href: string): URL {
  return new URL(href);
}

describe('dev capability gate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recognises non-production origins', () => {
    expect(isDevEnvironment(at('http://localhost:5173/'))).toBe(true);
    expect(isDevEnvironment(at('http://127.0.0.1:4173/'))).toBe(true);
    expect(isDevEnvironment(at('https://3000-abc.e2b.app/'))).toBe(true);
    expect(isDevEnvironment(at('http://tower.local/'))).toBe(true);
    expect(isDevEnvironment(at('file:///Users/op/index.html'))).toBe(true);
  });

  it('stays off for a real deployment', () => {
    expect(isDevEnvironment(at('https://mister-g-lu.github.io/arena-ai-sandbox/'))).toBe(false);
    expect(isDevEnvironment(at('https://falsereality.example/'))).toBe(false);
    expect(isDevEnvironment(at('https://falsereality.example:8080/play'))).toBe(false);
  });

  it('persists the opt-in from ?dev=1 and clears it with ?dev=0', () => {
    expect(consumeDevQueryFlag('?dev=1')).toBe(true);
    expect(localStorage.getItem(DEV_MODE_KEY)).toBe('1');

    // The flag outlives the query string — a reload keeps the capability.
    expect(consumeDevQueryFlag('')).toBe(true);

    expect(consumeDevQueryFlag('?dev=0')).toBe(false);
    expect(localStorage.getItem(DEV_MODE_KEY)).toBeNull();
  });

  it('lets the opt-in grant dev mode on a production origin', () => {
    const prod = at('https://falsereality.example/?dev=1');
    expect(detectDevMode(prod)).toBe(true);
    // And the panel's own switch can hand it back.
    setDevOptIn(false);
    expect(detectDevMode(at('https://falsereality.example/'))).toBe(false);
  });

  it('grants dev mode on a dev origin with no opt-in at all', () => {
    expect(detectDevMode(at('http://localhost:5173/'))).toBe(true);
    expect(localStorage.getItem(DEV_MODE_KEY)).toBeNull();
  });

  it('ignores a malformed query string', () => {
    expect(() => consumeDevQueryFlag('%%%')).not.toThrow();
    expect(consumeDevQueryFlag('%%%')).toBe(false);
  });
});
