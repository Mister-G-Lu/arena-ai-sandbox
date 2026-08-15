import { loadActions } from '../hooks/useActions';
import { loadProgress } from '../hooks/useProgress';
import { loadShift } from '../hooks/useShift';
import { STORAGE_KEYS, clearGameKeys, writeJson } from '../utils/storage';
import { makeEnvelope, type SaveEnvelope } from './saveFile';

export function hasLocalFile(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return (
    localStorage.getItem(STORAGE_KEYS.progress) != null ||
    localStorage.getItem(STORAGE_KEYS.shift) != null ||
    localStorage.getItem(STORAGE_KEYS.actions) != null
  );
}

export function readLocalEnvelope(now = Date.now()): SaveEnvelope {
  return makeEnvelope(
    {
      progress: loadProgress(),
      shift: loadShift(),
      actions: loadActions(now),
    },
    new Date(now),
  );
}

export function writeLocalEnvelope(env: SaveEnvelope): void {
  writeJson(STORAGE_KEYS.progress, env.progress);
  writeJson(STORAGE_KEYS.shift, env.shift);
  writeJson(STORAGE_KEYS.actions, env.actions);
}

export function wipeLocalFile(): void {
  clearGameKeys();
}
