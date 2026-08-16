/**
 * INTEGRATION — pacing invariants the casual speedplay found and the fixes
 * now guarantee, walked through the real App. (See the review that produced
 * these: a Day-by-Day casual playthrough showed the Floor 12 climax firing on
 * Day 2, a 15-card content dump, zero new cards after Day 6, and a shift that
 * paid a single anomaly when notices ate its budget.)
 */
import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import {
  GAME_SAVE_KEY,
  createInitialGameState,
  createStoredSaveEnvelope,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope,
} from '../lib/gameSave';

function save() {
  const raw = JSON.parse(localStorage.getItem(GAME_SAVE_KEY) ?? '{}');
  return parseStoredSaveEnvelope(raw).game;
}

function button(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  ) as HTMLButtonElement | undefined;
}

async function click(text: string) {
  const el = button(text);
  if (!el) throw new Error(`no button matching "${text}" — saw: ${
    Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim()).join(' | ')
  }`);
  await act(async () => { el.click(); });
}

async function tick(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    await act(async () => { vi.advanceTimersByTime(50); });
  }
}

async function go(hash: string) {
  window.location.hash = hash;
  await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

async function waitForActions(count: number) {
  await act(async () => { vi.advanceTimersByTime(count * 10 * 60 * 1000); });
  await act(async () => { vi.advanceTimersByTime(1000); });
}

async function runOrientation(answer: string) {
  await go('first-shift');
  await click('INITIATE ORIENTATION');
  await tick(3000);
  await click('CONTINUE');
  await tick(400);
  await click('PROCEED TO STATION');
  await tick(400);
  if (button('ACKNOWLEDGE — RETURN TO CONSOLE')) {
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

/** Execute one task and file its result; returns true when it came back corrupt. */
async function executeOneTask(): Promise<boolean> {
  await click('EXECUTE TASK');
  await tick(1200);
  const corrupt = button('LOG THE DISCREPANCY') !== undefined;
  if (corrupt) await click('FILE AS CLEAN');
  else await click('ACKNOWLEDGE RESULT');
  await tick(150);
  return corrupt;
}

/** Grind until the budget is spent or the quota is met. */
async function grindToEndOfShift() {
  for (let i = 0; i < 60; i++) {
    if (!button('EXECUTE TASK')) break;
    await executeOneTask();
  }
}

describe('multi-day pacing (casual playthrough invariants)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('pays two anomalies on a shift whose budget went to notices as well as tasks', async () => {
    // Every roll misses, so only the guarantees can produce an anomaly.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<App />);
    await runOrientation("I DIDN'T MAKE THIS");
    // Log the first anomaly as a discrepancy (Doubt 1 unlocks the notices
    // board and pays the first of the shift's two owed anomalies).
    let logged = false;
    for (let i = 0; i < 12 && !logged; i++) {
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) {
        await click('LOG THE DISCREPANCY');
        logged = true;
      } else {
        await click('ACKNOWLEDGE RESULT');
      }
      await tick(150);
    }
    expect(logged).toBe(true);
    expect(save().anomaliesSeenThisShift).toBe(1);
    // Spend six actions on routine notices before returning to the queue.
    await go('notices');
    await tick(100);
    for (let i = 0; i < 6; i++) {
      const opens = (Array.from(document.querySelectorAll('.zone-card button')) as HTMLButtonElement[])
        .filter((b) => (b.textContent ?? '').includes('▸ OPEN') && !b.disabled);
      if (opens.length === 0) break;
      await act(async () => { opens[0].click(); });
      await tick(100);
      const choices = Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[];
      if (choices.length > 0) {
        await act(async () => { choices[0].click(); });
        await tick(200);
      }
    }
    await go('console');
    await tick(100);
    await grindToEndOfShift();

    const after = save();
    // The notices spent budget, so fewer than fifty tasks were filed this
    // shift — and the shift still paid both owed anomalies.
    expect(after.actionsSpentThisShift).toBe(50);
    expect(after.tasksThisShift).toBeLessThan(50);
    expect(after.anomaliesSeenThisShift).toBe(2);
    random.mockRestore();
  }, 120000);

  it('never re-reveals a resolved case as a fresh personal anomaly', async () => {
    // Roll 0 corrupts the first task and draws the first line of the pool.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 3;
    // Both Day 3 cases are closed; the queue must not re-reveal either.
    state.zones = { 'handwritten-order': 'complete', 'day-crew-notes': 'complete' };
    state.promotion = { ...state.promotion, tier: 1 };
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    await tick(100);

    await click('EXECUTE TASK');
    await tick(1200);
    const personalLine = document.querySelector('.task-result.corrupt.personal');
    expect(personalLine).not.toBeNull();
    const text = personalLine?.textContent ?? '';
    expect(text).not.toContain('a work order in your handwriting');
    expect(text).not.toContain('the night operator seems familiar');
    // The night's rotation (day 3 → index 3) draws from the remaining deck.
    expect(text).toContain('the coffee maker was warm before you arrived');
    random.mockRestore();
  }, 120000);

  it('walks the staggered week: a new beat per night instead of a one-evening dump', async () => {
    render(<App />);
    await runOrientation('WHO MADE IT?');
    await tick(200);

    // Day 1: the pool opens with Operator status, but the Shift 2+ content is
    // not listed yet.
    await go('notices');
    await tick(100);
    expect(document.body.textContent).toContain('The Routine Pool');
    expect(document.body.textContent).not.toContain('The day crew');
    // Read the pool with a noticing eye so Day 2 can promote.
    for (let i = 0; i < 6; i++) {
      const opens = (Array.from(document.querySelectorAll('.zone-card button')) as HTMLButtonElement[])
        .filter((b) => (b.textContent ?? '').includes('▸ OPEN') && !b.disabled);
      if (opens.length === 0) break;
      await act(async () => { opens[0].click(); });
      await tick(100);
      const choices = Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[];
      const noticing = choices.find((c) => /Doubt|Perception/.test(c.textContent ?? '')) ?? choices[0];
      await act(async () => { noticing.click(); });
      await tick(200);
    }

    // Day 2: the annex lead arrives and is traced — but the expedition stays
    // sealed, and the lock itself shows the missing evidence.
    await go('console');
    await tick(100);
    await waitForActions(50);
    await grindToEndOfShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().promotion.title).toBe('Senior Operator');
    await go('investigations');
    await tick(100);
    const lead = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Annex elevator discrepancy')) as HTMLElement;
    await act(async () => { (lead.querySelector('button') as HTMLButtonElement).click(); });
    await tick(100);
    await click('Trace the request');
    await tick(200);
    const floor12Day2 = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Floor 12')) as HTMLElement;
    expect((floor12Day2.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(floor12Day2.textContent).toContain('Doubt');

    // Days 3 and 4 roll past: the coincidences land on 3, the expedition
    // opens on 4 — and it awards the NULL KEY without a death.
    await go('console');
    await tick(100);
    await waitForActions(50);
    await grindToEndOfShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().day).toBe(3);
    expect(document.body.textContent).toContain('NIGHT DESK // FILED 03:12 // IN YOUR HAND');
    await waitForActions(50);
    await grindToEndOfShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().day).toBe(4);
    await waitForActions(50);

    await go('investigations');
    await tick(100);
    const floor12Day4 = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Floor 12')) as HTMLElement;
    const open = floor12Day4.querySelector('button') as HTMLButtonElement;
    expect(open.disabled).toBe(false);
    await act(async () => { open.click(); });
    await tick(100);
    // Walk to the telegraphed death and retreat with the key.
    for (let i = 0; i < 8; i++) {
      const choices = Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[];
      if (choices.length === 0) break;
      const retreat = choices.find((c) => /Do not proceed|Retreat/.test(c.textContent ?? ''));
      const forward = choices.find((c) => /Press the warmth|1207|Read the form|Go through/.test(c.textContent ?? ''));
      await act(async () => { (retreat ?? forward ?? choices[0]).click(); });
      await tick(200);
    }
    const done = save();
    expect(done.zones.floor12).toBe('complete');
    expect(done.components.key).toBe(true);
    expect(done.deaths).toBe(0);
  }, 120000);
});
