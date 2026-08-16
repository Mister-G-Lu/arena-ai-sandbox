/**
 * INTEGRATION — the opening narrative, walked end to end. The adversarial
 * click-through kept as a regression test: orientation, the first filed
 * consequence, the discrepancy decision, the promotion it earns, notices, and
 * the Floor 12 expedition that pays out the first Component.
 */
import { render, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
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

function resource(label: string): string | null {
  const items = Array.from(document.querySelectorAll('.resource-item'));
  const item = items.find((i) => i.querySelector('.resource-label')?.textContent === label);
  return item?.querySelector('.resource-value')?.textContent ?? null;
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

/** Advance timers in slices so effect-registered timer chains keep running. */
async function tick(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    await act(async () => { vi.advanceTimersByTime(50); });
  }
}

async function go(hash: string) {
  window.location.hash = hash;
  await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

/** Walk orientation, answering the break-room question with `answer`. */
async function runOrientation(answer: string) {
  await go('first-shift');
  await click('INITIATE ORIENTATION');
  await tick(3000);
  await click('CONTINUE');
  await tick(400);
  await click('PROCEED TO STATION');
  await tick(400);
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
async function executeUntilCorrupt(maxTries = 40): Promise<boolean> {
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

async function finishCurrentShift() {
  while (button('EXECUTE TASK')) {
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
    else await click('ACKNOWLEDGE RESULT');
    await tick(100);
  }
}

describe('opening narrative', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('never shows a credit cap anywhere in the console shell', async () => {
    render(<App />);
    expect(document.body.textContent).not.toMatch(/\/\s*500/);
    expect(resource('Credits')).toBe('0');
  });

  it('keeps Components off the resource bar until the first one is discovered', async () => {
    render(<App />);
    // A fresh operator has found nothing; the counter would only raise questions.
    expect(resource('Components')).toBeNull();
    expect(document.body.textContent).not.toContain('0/6');
  });

  it('turns the orientation waiver into a direct, snarky exchange with M.', async () => {
    render(<App />);
    await go('first-shift');
    await click('I ALREADY KNOW ALL OF THIS');
    await tick(400);

    expect(document.body.textContent).toContain('Oh, so you think you already know all of this?');
    expect(document.body.textContent).toContain('Let’s see how smart you are');
    expect(save().orientation.completed).toBe(false);

    await click('I KNOW WHAT I’M DOING');
    await tick(100);
    expect(save().orientation).toEqual({ completed: true, skipped: true, taskRecorded: false });
    expect(document.body.textContent).toContain('OPERATOR CONSOLE');
  });

  it('files the break-room answer as a real consequence', async () => {
    render(<App />);
    await runOrientation('WHO MADE IT?');

    // "The system appreciates your curiosity" is now true: Doubt was filed.
    expect(save().qualities.doubt).toBe(1);
    expect(save().attention).toBe(1);
    expect(save().logbook.some((e: { text: string }) => e.text.includes('asked who makes the coffee'))).toBe(true);
  });

  it('promotes on the first point of Doubt and unlocks Notices', async () => {
    render(<App />);
    await runOrientation('WHO MADE IT?');
    await tick(100);

    expect(save().promotion.title).toBe('Operator');
    expect(save().promotion.unlocks).toContain('notice-storylets');

    const navLabels = Array.from(document.querySelectorAll('.nav-link')).map((n) => n.textContent);
    expect(navLabels.some((l) => l?.includes('NOTICES'))).toBe(true);
  });

  it('keeps Notices unreachable for an incurious operator during Shift 1', async () => {
    render(<App />);
    await runOrientation("IT'S FINE");
    await tick(100);

    expect(save().qualities.doubt).toBe(0);
    expect(save().promotion.tier).toBe(0);

    await go('notices');
    await tick(100);
    // Both story surfaces redirect until their own opening condition exists.
    expect(document.body.textContent).toContain('OPERATOR CONSOLE');
    await go('investigations');
    await tick(100);
    expect(document.body.textContent).toContain('OPERATOR CONSOLE');
  });

  it('posts the Floor 12 lead to every operator at the start of Shift 2', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 2;
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    expect(document.body.textContent).toContain('OUT-OF-RANGE STOP: FLOOR 12');
    expect(document.body.textContent).toContain('INVESTIGATIONS · NEW');
    expect(document.body.textContent).not.toContain('NOTICES');

    await go('investigations');
    await tick(100);
    expect(document.body.textContent).toContain('INVESTIGATIONS');
    const zoneTitles = Array.from(document.querySelectorAll('.zone-card h3'))
      .map((title) => title.textContent);
    // The expedition is *listed* on Shift 2 for every operator — sealed, with
    // its clearance shown. The lock itself is the hint that promotion buys.
    expect(zoneTitles).toEqual(['Annex elevator discrepancy', 'Floor 12']);
    const floor12Card = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Floor 12')) as HTMLElement;
    expect(floor12Card.textContent).toContain('CLEARANCE REQUIRED: SENIOR OPERATOR CLEARANCE');
    expect((floor12Card.querySelector('button') as HTMLButtonElement).disabled).toBe(true);

    await click('▸ OPEN');
    await tick(100);
    await click('Trace the request');
    await tick(200);

    const filed = save();
    expect(filed.zones['annex-order']).toBe('complete');
    expect(filed.qualities.doubt).toBe(1);
    expect(filed.qualities.perception).toBe(1);
    expect(filed.promotion.title).toBe('Operator');
    expect(document.body.textContent).not.toContain('INVESTIGATIONS · NEW');
    // The trace itself earns Operator status, exposing ordinary Notices beside
    // the now-filed investigation.
    expect(document.body.textContent).toContain('NOTICES');
  });

  it('forecasts the next promotion and the content waiting on clearance', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.qualities.doubt = 1;
    state.promotion.tier = 1;
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#notices';

    render(<App />);
    await tick(100);

    // The forecast is the game's own "what's next": the next rank with the
    // live gap, what it adds, and the sealed content waiting on file.
    expect(document.body.textContent).toContain('CLEARANCE FORECAST');
    expect(document.body.textContent).toContain('SENIOR OPERATOR');
    expect(document.body.textContent).toContain('Doubt 1/2');
    expect(document.body.textContent).toContain('Restricted areas — Floor 12 access');
    expect(document.body.textContent).toContain('RESTRICTED FILES');
    expect(document.body.textContent).toContain('GROUND COFFEE ≥ 1');
  });

  it('holds an open Notice when the player checks Investigations', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 2;
    state.qualities.doubt = 1;
    state.promotion.tier = 1;
    state.currentStorylet = { zone: 'routine', storyletId: 'routine-01' };
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#investigations';

    render(<App />);
    expect(document.body.textContent).toContain('ANOTHER FILE IS OPEN');
    expect(document.body.textContent).toContain('RETURN TO OPEN FILE');
    expect(document.body.textContent).not.toContain('SAVED ORDER COULD NOT BE RESTORED');
  });

  it('recovers from a story pointer removed by a content update', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.qualities.doubt = 1;
    state.promotion = { ...state.promotion, tier: 1 };
    state.currentStorylet = { zone: 'routine', storyletId: 'routine-removed-in-update' };
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#notices';

    render(<App />);
    expect(document.body.textContent).toContain('SAVED ORDER COULD NOT BE RESTORED');
    await click('CLEAR INVALID ORDER');
    expect(save().currentStorylet).toBeNull();
  });

  it('turns a corrupted result into a choice with opposite consequences', async () => {
    // Force every result to come back corrupted.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<App />);
    await runOrientation("IT'S FINE");

    expect(await executeUntilCorrupt()).toBe(true);
    const before = save();
    await click('LOG THE DISCREPANCY');
    await tick(300);
    const after = save();

    expect(after.qualities.doubt).toBe(before.qualities.doubt + 1);
    expect(after.attention).toBe(before.attention + 1);
    expect(after.discrepanciesLogged).toBe(1);
    // Unreconciled work is unbilled work.
    expect(after.credits).toBe(before.credits);
    // The corrupt line stays in the log, unsmoothed.
    expect(document.querySelector('.log-line.corrupt')).not.toBeNull();
    // ...and in the logbook, which is the diegetic save file.
    expect(after.logbook.some((e: { text: string }) => e.text.includes('Ink does not forget'))).toBe(true);

    random.mockRestore();
  });

  it('pays the damaged field when a corrupted result is filed as clean', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<App />);
    await runOrientation("IT'S FINE");

    expect(await executeUntilCorrupt()).toBe(true);
    const before = save();
    await click('FILE AS CLEAN');
    await tick(300);
    const after = save();

    // The corruption used here carries no number, so it pays the standard rate;
    // what matters is that payroll pays *something* and the record self-heals.
    expect(after.credits).toBeGreaterThan(before.credits);
    expect(after.qualities.routine).toBe(before.qualities.routine + 1);
    expect(document.querySelector('.log-line.corrupt')).toBeNull();

    random.mockRestore();
  });

  it('hooks the operator with an anomaly inside the first ten tasks', async () => {
    // Every roll misses, so only the guarantee can produce an anomaly.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<App />);
    await runOrientation("IT'S FINE");

    // Orientation records task 1. The hook is owed by task 10, so it must land
    // within the next nine executions.
    let sawAnomaly = false;
    for (let i = 0; i < 9 && !sawAnomaly; i++) {
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) {
        sawAnomaly = true;
        await click('FILE AS CLEAN');
      } else {
        await click('ACKNOWLEDGE RESULT');
      }
      await tick(100);
    }

    expect(sawAnomaly).toBe(true);
    expect(save().tasksCompleted).toBeLessThanOrEqual(10);
    expect(save().anomaliesSeenThisShift).toBe(1);

    random.mockRestore();
  }, 60000);

  it('owes a second anomaly by the end of the shift when rolls never produce one', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<App />);
    await runOrientation("IT'S FINE");

    // Orientation records task 1; run the remaining 49 of the shift.
    let anomalies = 0;
    for (let i = 0; i < 49; i++) {
      if (!button('EXECUTE TASK')) break;
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) {
        anomalies += 1;
        await click('FILE AS CLEAN');
      } else {
        await click('ACKNOWLEDGE RESULT');
      }
      await tick(100);
    }

    expect(save().tasksCompleted).toBe(50);
    // One to hook them, one more before the shift is over.
    expect(anomalies).toBe(2);
    expect(save().anomaliesSeenThisShift).toBe(2);

    random.mockRestore();
  }, 60000);

  it('runs a full shift without ever hitting a ceiling', async () => {
    render(<App />);
    await runOrientation("IT'S FINE");

    for (let i = 0; i < 49; i++) {
      if (!button('EXECUTE TASK')) break;
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
      else await click('ACKNOWLEDGE RESULT');
      await tick(150);
    }

    const end = save();
    expect(end.tasksCompleted).toBe(50);
    // The old build stopped paying at exactly 500. This one does not.
    expect(end.credits).toBeGreaterThanOrEqual(500);
    expect(resource('Credits')).not.toContain('/');

    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().day).toBe(2);
    expect(save().tasksCompleted).toBe(0);

    // Day 2 still pays.
    const beforeDay2 = save().credits;
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
    else await click('ACKNOWLEDGE RESULT');
    await tick(150);
    expect(save().credits).toBeGreaterThan(beforeDay2);
  }, 60000);

  it('walks Doubt into Floor 12 and pays out the first Component', async () => {
    render(<App />);
    await runOrientation('WHO MADE IT?');
    await tick(100);

    await go('notices');
    await tick(100);
    expect(document.body.textContent).toContain('The Routine Pool');
    // The expedition itself is not listed during Shift 1 — no zone card for
    // it yet, even though the clearance forecast may name it in passing.
    const zoneTitlesDay1 = Array.from(document.querySelectorAll('.zone-card h3'))
      .map((title) => title.textContent);
    expect(zoneTitlesDay1).not.toContain('Floor 12');

    // Read notices until the operator is a Senior Operator with the eye for it.
    for (let i = 0; i < 6; i++) {
      const open = button('▸ OPEN');
      if (!open || open.disabled) break;
      await click('▸ OPEN');
      await tick(100);
      // Always take the option that notices something.
      const choices = Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[];
      const noticing = choices.find((c) => /Doubt|Perception/.test(c.textContent ?? '')) ?? choices[0];
      await act(async () => { noticing.click(); });
      await tick(200);
    }

    const afterNotices = save();
    expect(afterNotices.qualities.doubt).toBeGreaterThanOrEqual(2);
    expect(afterNotices.qualities.perception).toBeGreaterThanOrEqual(1);
    // Curiosity alone cannot surface the restricted expedition during Shift 1.
    expect(afterNotices.promotion.title).toBe('Operator');
    expect(Array.from(document.querySelectorAll('.zone-card h3')).map((h) => h.textContent))
      .not.toContain('Floor 12');

    await go('console');
    await finishCurrentShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);

    // Shift 2 names the mystery immediately, before another quota begins.
    expect(document.body.textContent).toContain('OUT-OF-RANGE STOP: FLOOR 12');
    expect(save().promotion.title).toBe('Senior Operator');

    await go('investigations');
    await tick(100);
    expect(document.body.textContent).toContain('Annex elevator discrepancy');
    expect(document.body.textContent).toContain('Floor 12');
    expect(Array.from(document.querySelectorAll('.zone-card h3')).map((h) => h.textContent))
      .not.toContain('The Routine Pool');

    // Resolve the universal lead first. It personalizes the order, while the
    // promotion earned above determines whether the expedition is also shown.
    const lead = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Annex elevator discrepancy')) as HTMLElement;
    await act(async () => { (lead.querySelector('button') as HTMLButtonElement).click(); });
    await tick(100);
    await click('Trace the request');
    await tick(200);

    // Run the expedition, retreating at the first telegraphed death.
    const zoneButtons = Array.from(document.querySelectorAll('.zone-card')) as HTMLElement[];
    const floor12 = zoneButtons.find((z) => z.textContent?.includes('Floor 12'))!;
    const openFloor12 = floor12.querySelector('button') as HTMLButtonElement;
    expect(openFloor12.disabled).toBe(false);
    await act(async () => { openFloor12.click(); });
    await tick(100);

    for (let i = 0; i < 8; i++) {
      const choices = Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[];
      if (choices.length === 0) break;
      // Prefer to leave with the key rather than die on the first expedition.
      const retreat = choices.find((c) => /Do not proceed|Retreat/.test(c.textContent ?? ''));
      const forward = choices.find((c) => /Press the warmth|1207|Read the form|Go through/.test(c.textContent ?? ''));
      const pick = retreat ?? forward ?? choices[0];
      await act(async () => { pick.click(); });
      await tick(200);
    }

    const done = save();
    expect(done.zones.floor12).toBe('complete');
    expect(done.components.key).toBe(true);
    expect(resource('Components')).toBe('1/6');
    expect(done.logbook.some((e: { text: string }) => e.text.includes('NULL KEY'))).toBe(true);
  }, 60000);
});
