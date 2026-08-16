/**
 * The overflow easter egg, at the state level. No button reaches it — only
 * pushing the ledger past its 32-bit word, because the reward for breaking
 * the number is knowing there is a number.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { GameStateProvider, useGameState } from './GameStateContext';
import { CREDIT_LIMIT } from '../game/ledger';
import { GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY } from '../lib/gameSave';

let api;

function Probe() {
  api = useGameState();
  return null;
}

function mount() {
  render(
    <GameStateProvider>
      <Probe />
    </GameStateProvider>,
  );
}

describe('ledger overflow glitch', () => {
  beforeEach(() => {
    localStorage.clear();
    api = undefined;
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

    api = undefined;
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

describe('effects pipeline', () => {
  beforeEach(() => {
    localStorage.clear();
    api = undefined;
  });

  it('applies storylet-cased effects and clamps them', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Doubt: 9, Attention: 3, Salary: 2 }); });
    expect(api.state.qualities.doubt).toBe(5);
    expect(api.state.attention).toBe(3);
    // Salary converts to credits at its declared rate.
    expect(api.state.credits).toBe(10);
  });

  it('ignores unknown qualities instead of writing junk into the save', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Nonsense: 5 }); });
    expect(api.state.qualities).not.toHaveProperty('nonsense');
  });

  it('files a resolved card\'s consequences once — replays do not farm qualities', async () => {
    mount();
    const card = { id: 'floor12-01', zone: 'floor12' };
    const press = { outcome: { qualities: { Doubt: 1, Attention: 1 } }, endZone: true };

    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.currentStorylet).toBeNull();

    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.seenStorylets.filter((id) => id === 'floor12-01')).toHaveLength(1);
  });

  it('promotes automatically — the player never asks for a promotion', async () => {
    mount();
    expect(api.state.promotion.tier).toBe(0);
    await act(async () => { api.actions.applyEffects({ Doubt: 1 }); });
    expect(api.state.promotion.tier).toBe(1);
    expect(api.state.promotion.unlocks).toContain('notice-storylets');
    expect(api.state.logbook.some((e) => e.text.includes('OPERATOR'))).toBe(true);
  });

  it('tracks anomalies per shift and resets the guarantee counter tomorrow', async () => {
    mount();
    await act(async () => {
      api.actions.fileTaskResult({ anomaly: true, payout: 10 });
    });
    expect(api.state.anomaliesSeenThisShift).toBe(1);
    await act(async () => { api.actions.incrementDay(); });
    expect(api.state.anomaliesSeenThisShift).toBe(0);
  });

  it('exports and imports the same canonical envelope used by cloud sync', async () => {
    mount();
    await act(async () => { api.actions.addCredits(321); });
    const exported = api.actions.exportGameSave();
    expect(JSON.parse(exported).version).toBe(2);

    await act(async () => { api.actions.resetGame(); });
    expect(api.state.credits).toBe(0);
    await act(async () => { api.actions.importGameSave(exported); });
    expect(api.state.credits).toBe(321);
  });

  it('refuses an invalid imported save without replacing live state', async () => {
    mount();
    await act(async () => { api.actions.addCredits(12); });
    expect(() => api.actions.importGameSave('{"version":2}')).toThrow(/validation/i);
    expect(api.state.credits).toBe(12);
  });
});
