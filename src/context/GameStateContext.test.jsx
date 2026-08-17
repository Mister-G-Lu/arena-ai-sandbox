/** State-level regression coverage for the ledger overflow boundary. */
import { act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { api, mount } from './GameStateContext.testUtils';
import { CREDIT_LIMIT } from '../game/ledger';
import { GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY } from '../lib/gameSave';

describe('ledger overflow glitch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has no credit ceiling in the initial file', () => {
    mount();
    expect(api.state).not.toHaveProperty('maxCredits');
    expect(api.ledger.display).toBe('0');
    expect(api.ledger.limit).toBe(CREDIT_LIMIT);
  });

  it('keeps paying far past the retired 500 cap', async () => {
    mount();
    await act(async () => { api.actions.addCredits(50_000); });
    expect(api.state.credits).toBe(50_000);
    expect(api.ledger.unbound).toBe(false);
  });

  it('breaks the word, wraps, and awards infinite credit exactly once', async () => {
    mount();
    await act(async () => { api.actions.addCredits(CREDIT_LIMIT); });
    expect(api.state.credits).toBe(CREDIT_LIMIT);
    expect(api.state.glitches).toEqual([]);

    await act(async () => { api.actions.addCredits(1); });

    expect(api.ledger.unbound).toBe(true);
    expect(api.ledger.display).toBe('∞');
    expect(api.state.glitches).toEqual(['ledger-overflow']);
    // Breaking the world teaches you something about it.
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.discoveries.some((d) => d.text.includes('WORD'))).toBe(true);
    expect(api.state.logbook.some((e) => e.text.includes('LEDGER OVERFLOW'))).toBe(true);

    const glitchCount = api.state.glitches.length;
    await act(async () => { api.actions.addCredits(10_000); });
    expect(api.state.glitches).toHaveLength(glitchCount);
  });

  it('an unbound ledger can always pay', async () => {
    mount();
    await act(async () => { api.actions.addCredits(Infinity); });
    expect(api.ledger.unbound).toBe(true);
    await act(async () => { api.actions.spendCredits(10 ** 12); });
    expect(api.ledger.display).toBe('∞');
  });

  it('survives a save/load round trip', async () => {
    mount();
    await act(async () => { api.actions.addCredits(Infinity); });
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe('__INFINITY__');

    mount();
    expect(api.ledger.unbound).toBe(true);
    expect(api.ledger.display).toBe('∞');
  });

  it('migrates a legacy capped save without losing the balance', () => {
    localStorage.setItem(LEGACY_GAME_SAVE_KEY, JSON.stringify({
      credits: 500,
      maxCredits: 500,
      day: 3,
      tasksCompleted: 12,
      orientation: { completed: true, skipped: false, taskRecorded: true },
    }));
    mount();
    expect(api.state.credits).toBe(500);
    expect(api.state).not.toHaveProperty('maxCredits');
    expect(api.ledger.unbound).toBe(false);
    expect(api.state.day).toBe(3);
  });

  it('migrates a legacy Manager save (maxCredits: Infinity) to an unbound ledger', () => {
    localStorage.setItem(LEGACY_GAME_SAVE_KEY, JSON.stringify({
      credits: 9000,
      maxCredits: '__INFINITY__',
      orientation: { completed: true, skipped: true, taskRecorded: true },
    }));
    mount();
    expect(api.ledger.unbound).toBe(true);
  });
});
