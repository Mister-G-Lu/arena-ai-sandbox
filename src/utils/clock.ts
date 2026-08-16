/** Format an in-shift minute count (0–1439) as HH:MM. */
export function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, '0');
}

export function clockStr(minutes: number): string {
  const wrapped = ((Math.trunc(minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

/** Format a millisecond countdown as m:ss (or h:mm:ss if ≥ 60 min). */
export function countdownStr(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}
