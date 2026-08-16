import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GAME_SAVE_BACKUP_KEY,
  GAME_SAVE_KEY,
  GAME_SAVE_RECOVERY_KEY,
  LEGACY_GAME_SAVE_KEY,
  createInitialGameState,
  createStoredSaveEnvelope,
  serializeSaveEnvelope,
} from './gameSave';
import {
  clearLocalGameSave,
  loadLocalGameSave,
  replaceLocalGameSave,
  writeLocalGameSave,
} from './localGameSave';

describe('canonical local save storage', () => {
  beforeEach(() => localStorage.clear());

  it('writes, loads, and backs up the previous valid file', () => {
    const state = createInitialGameState();
    const first = writeLocalGameSave(state, new Date('2026-08-16T12:00:00Z'));
    expect(first.ok).toBe(true);
    expect(loadLocalGameSave().state.credits).toBe(0);

    state.credits = 25;
    const second = writeLocalGameSave(state, new Date('2026-08-16T12:01:00Z'));
    expect(second.ok).toBe(true);
    expect(loadLocalGameSave().state.credits).toBe(25);
    expect(JSON.parse(localStorage.getItem(GAME_SAVE_BACKUP_KEY) ?? '{}').game.credits).toBe(0);
  });

  it('migrates v1 only after a validated canonical write', () => {
    localStorage.setItem(
      LEGACY_GAME_SAVE_KEY,
      JSON.stringify({ credits: 500, maxCredits: 500, day: 2, tasksCompleted: 4 }),
    );
    const loaded = loadLocalGameSave(new Date('2026-08-16T12:00:00Z'));
    expect(loaded.migrated).toBe(true);
    expect(loaded.state.orientation.completed).toBe(true);
    expect(localStorage.getItem(LEGACY_GAME_SAVE_KEY)).not.toBeNull();

    expect(writeLocalGameSave(loaded.state).ok).toBe(true);
    expect(localStorage.getItem(LEGACY_GAME_SAVE_KEY)).toBeNull();
    expect(localStorage.getItem(GAME_SAVE_KEY)).not.toBeNull();
  });

  it('preserves invalid canonical bytes for recovery and starts safely', () => {
    localStorage.setItem(GAME_SAVE_KEY, '{not-json');
    const loaded = loadLocalGameSave();
    expect(loaded.error).toMatch(/valid JSON/);
    expect(loaded.state.day).toBe(1);
    expect(localStorage.getItem(GAME_SAVE_RECOVERY_KEY)).toBe('{not-json');
    expect(localStorage.getItem(GAME_SAVE_KEY)).toBe('{not-json');
  });

  it('imports only a valid canonical envelope', () => {
    const state = createInitialGameState();
    state.credits = 42;
    const text = serializeSaveEnvelope(createStoredSaveEnvelope(state));
    expect(replaceLocalGameSave(text).credits).toBe(42);
    expect(() => replaceLocalGameSave({ version: 2, savedAt: 'bad', game: {} })).toThrow();
  });

  it('surfaces storage write failures instead of claiming success', () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    const spy = vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      const result = writeLocalGameSave(createInitialGameState());
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('quota');
    } finally {
      spy.mockRestore();
    }
  });

  it('clears canonical, backup, recovery, and legacy files', () => {
    for (const key of [GAME_SAVE_KEY, GAME_SAVE_BACKUP_KEY, GAME_SAVE_RECOVERY_KEY, LEGACY_GAME_SAVE_KEY]) {
      localStorage.setItem(key, 'x');
    }
    clearLocalGameSave();
    expect(localStorage.length).toBe(0);
  });
});
