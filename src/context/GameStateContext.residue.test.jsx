/** State-level coverage for residue caps (logbook, discoveries, seen
 * storylets) and the import/export envelope used by cloud sync. */
import { act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { api, mount } from './GameStateContext.testUtils';
import { CREDIT_LIMIT } from '../game/ledger';
import { GAME_SAVE_KEY } from '../lib/gameSave';
import { LOGBOOK_CAP, DISCOVERIES_CAP, SEEN_STORYLETS_CAP } from './GameStateContext';

describe('residue caps & import/export', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prunes the oldest logbook residue instead of outgrowing the writable schema', async () => {
    mount();
    // A legitimate file can arrive at the schema ceiling (5,000) via import.
    const big = JSON.parse(api.actions.exportGameSave());
    big.game.logbook = Array.from({ length: 5000 }, (_, i) => ({
      day: 1,
      text: `legacy residue ${i}`,
      timestamp: 1000 + i,
    }));
    await act(async () => { api.actions.importGameSave(JSON.stringify(big)); });
    expect(api.state.logbook).toHaveLength(5000);

    // The next ordinary residue must not tip the file past the wall and into
    // permanent write failure: the in-game cap prunes the oldest lines.
    await act(async () => { api.actions.addLogEntry('one more line'); });
    expect(api.state.logbook).toHaveLength(LOGBOOK_CAP);
    expect(api.state.logbook.at(-1).text).toBe('one more line');
    expect(api.persistence.status).not.toBe('error');
    const written = JSON.parse(localStorage.getItem(GAME_SAVE_KEY));
    expect(written.game.logbook).toHaveLength(LOGBOOK_CAP);
  });

  it('keeps discoveries writable past the schema ceiling', async () => {
    mount();
    const big = JSON.parse(api.actions.exportGameSave());
    big.game.discoveries = Array.from({ length: 5000 }, (_, i) => ({
      day: 1,
      text: `old discovery ${i}`,
      timestamp: 1000 + i,
    }));
    await act(async () => { api.actions.importGameSave(JSON.stringify(big)); });
    expect(api.state.discoveries).toHaveLength(5000);

    // The overflow glitch files a discovery; the file must stay writable.
    await act(async () => { api.actions.addCredits(CREDIT_LIMIT + 1); });
    expect(api.state.glitches).toContain('ledger-overflow');
    expect(api.state.discoveries.length).toBeLessThanOrEqual(DISCOVERIES_CAP);
    expect(api.state.discoveries.some((d) => d.text.includes('THE WORD'))).toBe(true);
    expect(api.persistence.status).not.toBe('error');
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.discoveries.length)
      .toBeLessThanOrEqual(DISCOVERIES_CAP);
  });

  it('keeps the seen-storylet record writable past the schema ceiling', async () => {
    mount();
    const big = JSON.parse(api.actions.exportGameSave());
    big.game.seenStorylets = Array.from({ length: 10_000 }, (_, i) => `archived-${i}`);
    big.game.zones.floor12 = 'open';
    big.game.currentStorylet = { zone: 'floor12', storyletId: 'floor12-01' };
    await act(async () => { api.actions.importGameSave(JSON.stringify(big)); });
    expect(api.state.seenStorylets).toHaveLength(10_000);

    const press = { id: 'press', outcome: { qualities: {} }, next: 'floor12-02' };
    const card = { id: 'floor12-01', zone: 'floor12', choices: [press] };
    await act(async () => { api.actions.resolveStorylet(card, press); });

    expect(api.state.seenStorylets).toHaveLength(SEEN_STORYLETS_CAP);
    expect(api.state.seenStorylets).toContain('floor12-01');
    expect(api.persistence.status).not.toBe('error');
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_KEY)).game.seenStorylets.length)
      .toBeLessThanOrEqual(SEEN_STORYLETS_CAP);
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
