/** State-level coverage for local persistence and cross-tab conflicts. */
import { act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { api, mount } from './GameStateContext.testUtils';
import { GAME_SAVE_KEY } from '../lib/gameSave';

describe('persistence & tab conflicts', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('treats a cross-tab reset as a foreign event instead of resurrecting the erased file', async () => {
    mount();
    await act(async () => { api.actions.addCredits(42); });
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe(42);

    // Another tab runs resetGame(): the canonical key disappears there.
    localStorage.removeItem(GAME_SAVE_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: null,
      }));
    });
    expect(api.persistence.status).toBe('conflict');
    expect(api.persistence.remoteReset).toBe(true);

    // This tab keeps its work in memory, but its next ordinary write must not
    // silently resurrect the file the other tab just erased.
    await act(async () => { api.actions.addCredits(1); });
    expect(api.state.credits).toBe(43);
    expect(localStorage.getItem(GAME_SAVE_KEY)).toBeNull();

    // KEEP THIS TAB works even though there is no foreign copy to compare.
    await act(async () => { expect(api.actions.keepThisTabSave()).toBe(true); });
    expect(api.persistence.remoteReset).toBe(false);
    expect(api.persistence.status).toBe('saved');
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.credits).toBe(43);
  });

  it('a foreign write after a foreign reset reads as an ordinary tab conflict', async () => {
    mount();
    localStorage.removeItem(GAME_SAVE_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: null,
      }));
    });
    expect(api.persistence.remoteReset).toBe(true);

    const incoming = JSON.parse(api.actions.exportGameSave());
    incoming.game.credits = 88;
    const incomingRaw = JSON.stringify(incoming);
    localStorage.setItem(GAME_SAVE_KEY, incomingRaw);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: GAME_SAVE_KEY,
        newValue: incomingRaw,
      }));
    });
    expect(api.persistence.status).toBe('conflict');
    expect(api.persistence.remoteReset).toBe(false);
    expect(api.persistence.tabConflict.game.credits).toBe(88);
  });
});
