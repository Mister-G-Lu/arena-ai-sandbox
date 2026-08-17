import { act } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { GAME_SAVE_KEY, parseStoredSaveEnvelope } from '../lib/gameSave';

export function save() {
  const raw = JSON.parse(localStorage.getItem(GAME_SAVE_KEY) ?? '{}');
  return parseStoredSaveEnvelope(raw).game;
}

export function resource(label: string): string | null {
  const items = Array.from(document.querySelectorAll('.resource-item'));
  const item = items.find((i) => i.querySelector('.resource-label')?.textContent === label);
  return item?.querySelector('.resource-value')?.textContent ?? null;
}

export function button(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  ) as HTMLButtonElement | undefined;
}

export async function click(text: string) {
  const el = button(text);
  if (!el) throw new Error(`no button matching "${text}" — saw: ${
    Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim()).join(' | ')
  }`);
  await act(async () => { el.click(); });
}

/** Advance timers in slices so effect-registered timer chains keep running. */
export async function tick(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    await act(async () => { vi.advanceTimersByTime(50); });
  }
}

/**
 * Let the clock mint actions. One shift drains one full tank by design, so an
 * operator who wants to go somewhere after the quota waits for the building to
 * hand the budget back — ten minutes per action.
 */
export async function waitForActions(count: number) {
  await act(async () => { vi.advanceTimersByTime(count * 10 * 60 * 1000); });
  await act(async () => { vi.advanceTimersByTime(1000); });
}

export async function settleRoute() {
  await vi.dynamicImportSettled();
  await act(async () => undefined);
}

export async function go(hash: string) {
  window.location.hash = hash;
  await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await settleRoute();
}

/** Walk orientation, answering the break-room question with `answer`. */
export async function runOrientation(answer: string) {
  await go('first-shift');
  await click('INITIATE ORIENTATION');
  await tick(3000);
  await click('CONTINUE');
  await tick(400);
  await click('PROCEED TO STATION');
  await tick(400);
  // The vista interlude — the neon skyline before the desk.
  if (button('ACKNOWLEDGE — RETURN TO CONSOLE')) {
    // The vista is the visual counterweight to the short/boring tasks: hoverlanes, cutters, drones.
    expect(document.body.textContent).toContain('neon city skylines');
    expect(document.body.textContent).toContain('hovercars');
    await click('ACKNOWLEDGE — RETURN TO CONSOLE');
    await tick(400);
  }
  await click('CHECK THE BREAK ROOM');
  await tick(400);
  await click(answer);
  await tick(1000);
  await click('RETURN TO STATION');
  await tick(400);
  await click('EXECUTE FIRST TASK');
  await tick(1500);
  await click('CONFIRM RESULT');
  await tick(1200);
  await click('ENTER THE LIVE QUEUE');
  await tick(500);
  await go('console');
}

/** Execute tasks until one comes back corrupted, then return its filing verbs. */
export async function executeUntilCorrupt(maxTries = 40): Promise<boolean> {
  for (let i = 0; i < maxTries; i++) {
    if (!button('EXECUTE TASK')) return false;
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) return true;
    await click('ACKNOWLEDGE RESULT');
    await tick(200);
  }
  return false;
}

export async function finishCurrentShift() {
  while (button('EXECUTE TASK')) {
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
    else await click('ACKNOWLEDGE RESULT');
    await tick(100);
  }
}
