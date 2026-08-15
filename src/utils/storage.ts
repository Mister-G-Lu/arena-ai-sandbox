export const STORAGE_KEYS = {
  progress: 'fr:progress',
  shift: 'fr:shift',
  actions: 'fr:actions',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* quota / private mode */
  }
}

export function clearGameKeys(): void {
  removeKey(STORAGE_KEYS.progress);
  removeKey(STORAGE_KEYS.shift);
  removeKey(STORAGE_KEYS.actions);
}
