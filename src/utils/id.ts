let seq = 0;

export function nextId(prefix = 'id'): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function resetIds(to = 0): void {
  seq = to;
}

export function currentSeq(): number {
  return seq;
}
