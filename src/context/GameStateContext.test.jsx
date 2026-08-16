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

  it('files consequences once and rejects a stale card after transition', async () => {
    mount();
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.currentStorylet = { zone: 'floor12', storyletId: 'floor12-01' };
    saved.game.zones.floor12 = 'open';
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    const press = {
      id: 'press',
      outcome: { qualities: { Doubt: 1, Attention: 1 } },
      next: 'floor12-02',
    };
    const card = { id: 'floor12-01', zone: 'floor12', choices: [press] };

    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-02' });
    const actionsAfterFirstChoice = api.state.actions;

    // The old button closure cannot resolve the previous card again after the pointer moved.
    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.actions).toBe(actionsAfterFirstChoice);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-02' });
    expect(api.state.seenStorylets.filter((id) => id === 'floor12-01')).toHaveLength(1);
  });

  it('records an explicitly lethal choice once and enters its aftermath', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Attention: 8 }); });
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.currentStorylet = { zone: 'floor12', storyletId: 'floor12-05' };
    saved.game.zones.floor12 = 'open';
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    const forward = {
      id: 'forward',
      outcome: { qualities: { Attention: 3, Doubt: 1 } },
      next: 'floor12-06',
      death: true,
    };
    const card = { id: 'floor12-05', zone: 'floor12', choices: [forward] };
    await act(async () => { api.actions.resolveStorylet(card, forward); });

    expect(api.state.deaths).toBe(1);
    expect(api.state.attention).toBe(0);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-06' });
    expect(api.state.discoveries.some((entry) => entry.text.includes('THE INTERIM 1'))).toBe(true);
    expect(api.state.logbook.some((entry) => entry.text.includes('TERMINATION 1'))).toBe(true);

    await act(async () => { api.actions.resolveStorylet(card, forward); });
    expect(api.state.deaths).toBe(1);
  });

  it('promotes automatically — the player never asks for a promotion', async () => {
    mount();
    expect(api.state.promotion.tier).toBe(0);
    await act(async () => { api.actions.applyEffects({ Doubt: 1 }); });
    expect(api.state.promotion.tier).toBe(1);
    expect(api.state.promotion.unlocks).toContain('notice-storylets');
    expect(api.state.logbook.some((e) => e.text.includes('OPERATOR'))).toBe(true);
  });

  it('reserves a pending task and its action before the result is filed', async () => {
    mount();
    await act(async () => {
      api.actions.startDispatchTask({ anomalyRoll: 0.999, corruptionRoll: 0 });
    });

    expect(api.state.pendingDispatch).toMatchObject({
      id: 'dispatch-1-1',
      taskNumber: 1,
      shiftAction: 1,
      isCorrupt: false,
    });
    expect(api.state.actions).toBe(49);
    expect(api.state.actionsSpentThisShift).toBe(1);
    expect(JSON.parse(api.actions.exportGameSave()).game.pendingDispatch.id).toBe('dispatch-1-1');

    await act(async () => { api.actions.fileTaskResult({ payout: 10 }); });
    expect(api.state.pendingDispatch).toBeNull();
    expect(api.state.tasksCompleted).toBe(1);
    // Acknowledgement commits the result; it does not charge the reserved action twice.
    expect(api.state.actions).toBe(49);
  });

  it('tracks anomalies per shift and resets the guarantee counter tomorrow', async () => {
    mount();
    await act(async () => {
      api.actions.startDispatchTask({ anomalyRoll: 0, corruptionRoll: 0 });
      api.actions.fileTaskResult({ anomaly: true, payout: 10 });
    });
    expect(api.state.anomaliesSeenThisShift).toBe(1);
    await act(async () => { api.actions.incrementDay(); });
    expect(api.state.anomaliesSeenThisShift).toBe(0);
  });

  it('pauses local writes when another tab advances the save', async () => {
    mount();
    await act(async () => { api.actions.addCredits(10); });

    const incoming = JSON.parse(api.actions.exportGameSave());
    incoming.savedAt = '2026-08-16T13:00:00.000Z';
    incoming.game.credits = 75;
    const incomingRaw = JSON.stringify(incoming);
    localStorage.setItem(GAME_SAVE_KEY, incomingRaw);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: incomingRaw,
      }));
    });

    expect(api.persistence.status).toBe('conflict');
    expect(api.persistence.tabConflict.game.credits).toBe(75);

    // This tab may keep working in memory, but cannot silently clobber the key.
    await act(async () => { api.actions.addCredits(1); });
    expect(api.state.credits).toBe(11);
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe(75);

    await act(async () => { expect(api.actions.useOtherTabSave()).toBe(true); });
    expect(api.state.credits).toBe(75);
    expect(api.persistence.tabConflict).toBeNull();
  });

  it('importing under an outstanding tab-conflict block actually persists', async () => {
    mount();
    await act(async () => { api.actions.addCredits(10); });

    // Another tab advances the canonical key; this tab's writes pause.
    const incoming = JSON.parse(api.actions.exportGameSave());
    incoming.game.credits = 75;
    const incomingRaw = JSON.stringify(incoming);
    localStorage.setItem(GAME_SAVE_KEY, incomingRaw);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: incomingRaw,
      }));
    });
    expect(api.persistence.status).toBe('conflict');
    expect(api.persistence.tabConflict).not.toBeNull();

    // Importing a file is the operator choosing the winner: it resolves the
    // block, and the imported bytes — not the foreign ones — reach the key.
    const imported = JSON.parse(api.actions.exportGameSave());
    imported.game.credits = 500;
    await act(async () => { api.actions.importGameSave(JSON.stringify(imported)); });

    expect(api.state.credits).toBe(500);
    expect(api.persistence.tabConflict).toBeNull();
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe(500);
  });

  it('resetting under an outstanding tab-conflict block persists the fresh file', async () => {
    mount();
    await act(async () => { api.actions.addCredits(10); });

    const incoming = JSON.parse(api.actions.exportGameSave());
    incoming.game.credits = 75;
    const incomingRaw = JSON.stringify(incoming);
    localStorage.setItem(GAME_SAVE_KEY, incomingRaw);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: incomingRaw,
      }));
    });
    expect(api.persistence.status).toBe('conflict');

    await act(async () => { api.actions.resetGame(); });
    expect(api.state.credits).toBe(0);
    expect(api.persistence.tabConflict).toBeNull();
    // The fresh file is written — a reload must not resurrect the foreign one.
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe(0);
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

  it('anchors zero-timestamp imports instead of regenerating from the epoch', async () => {
    mount();
    const imported = JSON.parse(api.actions.exportGameSave());
    imported.game.actions = 0;
    imported.game.actionsLastTick = 0;

    await act(async () => { api.actions.importGameSave(JSON.stringify(imported)); });
    expect(api.state.actions).toBe(0);
    expect(api.state.actionsLastTick).toBeGreaterThan(0);
  });

  it('refuses an invalid imported save without replacing live state', async () => {
    mount();
    await act(async () => { api.actions.addCredits(12); });
    expect(() => api.actions.importGameSave('{"version":2}')).toThrow(/validation/i);
    expect(api.state.credits).toBe(12);
  });
});

describe('supply purchases', () => {
  beforeEach(() => {
    localStorage.clear();
    api = undefined;
  });

  it('buys a supply, debits the ledger, and files the order in the logbook', async () => {
    mount();
    await act(async () => { api.actions.addCredits(100); });
    await act(async () => { api.actions.purchaseSupply('coffee'); });

    expect(api.state.supplies.coffee).toBe(true);
    expect(api.state.credits).toBe(70);
    expect(api.state.logbook.some((e) => e.text.includes('GROUND COFFEE'))).toBe(true);
  });

  it('refuses a purchase the operator cannot afford', async () => {
    mount();
    await act(async () => { api.actions.purchaseSupply('bolt-cutters'); });
    expect(api.state.supplies['bolt-cutters']).toBe(false);
    expect(api.state.credits).toBe(0);
  });

  it('never sells the same supply twice', async () => {
    mount();
    await act(async () => { api.actions.addCredits(1000); });
    await act(async () => { api.actions.purchaseSupply('thermos'); });
    const logLength = api.state.logbook.length;
    await act(async () => { api.actions.purchaseSupply('thermos'); });
    expect(api.state.supplies.thermos).toBe(true);
    expect(api.state.logbook).toHaveLength(logLength);
  });

  it('ignores unknown ids and classified teaser stock', async () => {
    mount();
    await act(async () => { api.actions.addCredits(1000); });
    await act(async () => { api.actions.purchaseSupply('no-such-supply'); });
    await act(async () => { api.actions.purchaseSupply('machine-favor'); });
    expect(api.state.supplies).not.toHaveProperty('no-such-supply');
    expect(api.state.supplies['machine-favor']).toBe(false);
    expect(api.state.credits).toBe(1000);
  });

  it('an unbound ledger can always pay', async () => {
    mount();
    await act(async () => { api.actions.addCredits(Infinity); });
    await act(async () => { api.actions.purchaseSupply('doorman-smokes'); });
    expect(api.ledger.unbound).toBe(true);
    expect(api.state.supplies['doorman-smokes']).toBe(true);
  });

  it('feeds the requirement context so supply-gated zones can open', async () => {
    mount();
    await act(async () => { api.actions.addCredits(500); });
    await act(async () => { api.actions.purchaseSupply('coffee'); });
    expect(api.requirementCtx.supplies.coffee).toBe(true);
    expect(api.requirementCtx.tier).toBe(0);
  });
});
