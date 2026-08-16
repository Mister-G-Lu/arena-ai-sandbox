import {
  GAME_SAVE_BACKUP_KEY,
  GAME_SAVE_KEY,
  GAME_SAVE_RECOVERY_KEY,
  LEGACY_GAME_SAVE_KEY,
  SaveValidationError,
  createInitialGameState,
  createStoredSaveEnvelope,
  migrateLegacyGameState,
  parseSaveJson,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope,
  type GameState,
  type StoredSaveEnvelope,
} from './gameSave';

export interface LocalSaveLoad {
  state: GameState;
  envelope: StoredSaveEnvelope | null;
  hadLocalSave: boolean;
  migrated: boolean;
  error: string | null;
}

function storageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

function preserveInvalidSave(raw: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(GAME_SAVE_RECOVERY_KEY, raw);
  } catch {
    // The original key remains untouched if recovery storage is unavailable.
  }
}

export function loadLocalGameSave(now = new Date()): LocalSaveLoad {
  const fresh = (): LocalSaveLoad => ({
    state: createInitialGameState(),
    envelope: null,
    hadLocalSave: false,
    migrated: false,
    error: null,
  });
  if (!storageAvailable()) return { ...fresh(), error: 'Browser storage is unavailable.' };

  let canonicalRaw: string | null = null;
  let legacyRaw: string | null = null;
  try {
    canonicalRaw = localStorage.getItem(GAME_SAVE_KEY);
    legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY);
  } catch {
    return { ...fresh(), error: 'Browser storage could not be read.' };
  }

  if (canonicalRaw != null) {
    try {
      const loaded = parseSaveJson(canonicalRaw);
      const envelope = createStoredSaveEnvelope(loaded.game, new Date(loaded.savedAt));
      return {
        state: loaded.game,
        envelope,
        hadLocalSave: true,
        migrated: false,
        error: null,
      };
    } catch (error) {
      preserveInvalidSave(canonicalRaw);
      const message = error instanceof Error ? error.message : 'The local save is invalid.';
      return { ...fresh(), hadLocalSave: true, error: message };
    }
  }

  if (legacyRaw != null) {
    try {
      const parsed = JSON.parse(legacyRaw, (_key, value) =>
        value === '__INFINITY__' ? Infinity : value,
      );
      const envelope = migrateLegacyGameState(parsed, now);
      const loaded = parseStoredSaveEnvelope(envelope);
      return {
        state: loaded.game,
        envelope,
        hadLocalSave: true,
        migrated: true,
        error: null,
      };
    } catch (error) {
      preserveInvalidSave(legacyRaw);
      const message =
        error instanceof SaveValidationError || error instanceof Error
          ? error.message
          : 'The legacy save is invalid.';
      return { ...fresh(), hadLocalSave: true, error: message };
    }
  }

  return fresh();
}

export function writeLocalGameSave(
  state: GameState | Record<string, unknown>,
  now = new Date(),
): { ok: true; envelope: StoredSaveEnvelope } | { ok: false; error: string } {
  if (!storageAvailable()) return { ok: false, error: 'Browser storage is unavailable.' };
  try {
    const envelope = createStoredSaveEnvelope(state, now);
    const serialized = serializeSaveEnvelope(envelope);
    const previous = localStorage.getItem(GAME_SAVE_KEY);
    if (previous != null && previous !== serialized) {
      localStorage.setItem(GAME_SAVE_BACKUP_KEY, previous);
    }
    localStorage.setItem(GAME_SAVE_KEY, serialized);
    localStorage.removeItem(LEGACY_GAME_SAVE_KEY);
    return { ok: true, envelope };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error || 'The save could not be written.'),
    };
  }
}

export function replaceLocalGameSave(raw: unknown, now = new Date()): GameState {
  const loaded = typeof raw === 'string' ? parseSaveJson(raw) : parseStoredSaveEnvelope(raw);
  const result = writeLocalGameSave(loaded.game, now);
  if (!result.ok) throw new SaveValidationError(result.error);
  return loaded.game;
}

export function clearLocalGameSave(): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(GAME_SAVE_KEY);
    localStorage.removeItem(GAME_SAVE_BACKUP_KEY);
    localStorage.removeItem(GAME_SAVE_RECOVERY_KEY);
    localStorage.removeItem(LEGACY_GAME_SAVE_KEY);
  } catch {
    // Reset still succeeds in memory when storage is blocked.
  }
}
