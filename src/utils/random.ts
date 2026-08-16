export type Rand = () => number;

export const nativeRand: Rand = () => Math.random();

export function pick<T>(list: readonly T[], rand: Rand = nativeRand): T {
  if (list.length === 0) {
    throw new Error('pick() called on empty list');
  }
  const i = Math.min(list.length - 1, Math.floor(rand() * list.length));
  return list[i] as T;
}

export function chance(p: number, rand: Rand = nativeRand): boolean {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return rand() < p;
}
