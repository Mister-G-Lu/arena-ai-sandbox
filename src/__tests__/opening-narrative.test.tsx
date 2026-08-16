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

/**
 * Let the clock mint actions. One shift drains one full tank by design, so an
 * operator who wants to go somewhere after the quota waits for the building to
 * hand the budget back — ten minutes per action.
 */
async function waitForActions(count: number) {
  await act(async () => { vi.advanceTimersByTime(count * 10 * 60 * 1000); });
  await act(async () => { vi.advanceTimersByTime(1000); });
}

async function settleRoute() {
  await vi.dynamicImportSettled();
  await act(async () => undefined);
}

async function go(hash: string) {
  window.location.hash = hash;
  await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await settleRoute();
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
    // The waiver pays in Routine, not curiosity: prior knowledge is filed as
    // compliance, so skipping is not strictly worse than sitting through it.
    expect(save().qualities.routine).toBe(2);
    expect(save().qualities.doubt).toBe(0);
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
    await settleRoute();
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
    await settleRoute();
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
    await settleRoute();
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
    // The career total is cumulative now; only the per-shift counter rolls.
    expect(save().tasksThisShift).toBe(0);
    expect(save().tasksCompleted).toBe(50);

    // Day 2 still pays.
    const beforeDay2 = save().credits;
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
    else await click('ACKNOWLEDGE RESULT');
    await tick(150);
    expect(save().credits).toBeGreaterThan(beforeDay2);
  }, 60000);

  it('telegraphs and records the first opt-in death', async () => {
    const state = createInitialGameState();
    state.day = 2;
    state.orientation = { completed: true, skipped: false, taskRecorded: true };
    state.promotion = { ...state.promotion, tier: 2 };
    state.qualities = { ...state.qualities, doubt: 2, perception: 1 };
    state.zones = { floor12: 'open' };
    state.currentStorylet = { zone: 'floor12', storyletId: 'floor12-05' };
    state.seenStorylets = ['floor12-01', 'floor12-02', 'floor12-03', 'floor12-04'];
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#investigations';

    render(<App />);
    await settleRoute();
    await tick(100);
    expect(document.body.textContent).toContain('LETHAL // THIS CHOICE KILLS');
    expect(button('Step forward')).toHaveClass('storylet-choice-death');

    await click('Step forward');
    await tick(200);
    const after = save();
    expect(after.deaths).toBe(1);
    expect(after.attention).toBe(0);
    expect(after.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-06' });
    expect(after.logbook.some((entry: { text: string }) => entry.text.includes('TERMINATION 1'))).toBe(true);
    // P3/§6: dying is priced. The opt-in death docks an hour of budget from
    // the tank — six actions at the ten-minute regen rate (on top of the one
    // the choice itself charged).
    expect(after.actions).toBe(43);
  });

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

    // The quota spends the tank: one shift is one full budget, so an operator
    // who worked the whole night has nothing left for an expedition. Drain the
    // remainder so the refusal path is the one under test.
    while (save().actions > 0) {
      await go('console');
      if (!button('EXECUTE TASK')) break;
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) await click('FILE AS CLEAN');
      else await click('ACKNOWLEDGE RESULT');
      await tick(150);
    }
    await go('investigations');
    await tick(100);
    expect(save().actions).toBe(0);
    const heldLead = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Annex elevator discrepancy')) as HTMLElement;
    await act(async () => { (heldLead.querySelector('button') as HTMLButtonElement).click(); });
    await tick(100);
    expect(
      (Array.from(document.querySelectorAll('.storylet-choice')) as HTMLButtonElement[])
        .every((c) => c.disabled),
    ).toBe(true);
    expect(document.body.textContent).toContain('BUDGET EXHAUSTED');
    await click('STAND DOWN');
    await tick(100);

    // Ten minutes per action. The expedition is nine actions deep, so the
    // operator comes back to the building with a fresh budget.
    await waitForActions(12);

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
    // The breach is not an annex-trace afterthought: on Shift 2 the card is
    // sealed, and the lock itself shows what evidence the file still lacks.
    expect(openFloor12.disabled).toBe(true);
    expect(floor12.textContent).toContain('Doubt');
    expect(floor12.textContent).toContain('Perception');
    expect(floor12.textContent).toContain('Day');

    // Two more nights of shifts and coincidences before the file is thick
    // enough for the expedition (arcs §2.5 — Day 4, Doubt ≥ 3, Perception ≥ 2).
    await go('console');
    await tick(100);
    await waitForActions(50);
    await finishCurrentShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().day).toBe(3);
    // Shift 3 opens with the night desk's own coincidence.
    expect(document.body.textContent).toContain('NIGHT DESK // FILED 03:12 // IN YOUR HAND');
    await waitForActions(50);
    await finishCurrentShift();
    await click('BEGIN NEXT SHIFT');
    await tick(200);
    expect(save().day).toBe(4);
    await waitForActions(50);

    await go('investigations');
    await tick(100);
    const day4Floor12 = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('Floor 12')) as HTMLElement;
    const day4Open = day4Floor12.querySelector('button') as HTMLButtonElement;
    expect(day4Open.disabled).toBe(false);
    await act(async () => { day4Open.click(); });
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

  it('keeps M. checking in from Day 4 on, one ambient line per night', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 4;
    state.qualities.doubt = 1; // an operator who has noticed — no prod needed
    state.zones = { 'annex-order': 'complete', 'handwritten-order': 'complete' };
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    await tick(100);
    // Day 4 opens with the first ambient direct-channel line; the generic
    // shift-open line rotates with the day rather than repeating verbatim.
    expect(document.body.textContent).toContain('You are ahead of your paperwork');
    expect(document.body.textContent).toContain('SHIFT INITIALIZED');
  }, 60000);

  it('keeps Days 1–3 free of the ambient M. lines their own asides replace', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 2;
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    await tick(100);
    // The Shift 2 annex aside is there; the Day 4+ rotation is not.
    expect(document.body.textContent).toContain('OUT-OF-RANGE STOP: FLOOR 12');
    expect(document.body.textContent).not.toContain('You are ahead of your paperwork');
  }, 60000);

  it('prods an operator who has never noticed anything', async () => {
    // The cautious roleplayer: a week of filing everything clean, zero Doubt.
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 3;
    state.qualities.doubt = 0;
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    await tick(100);
    expect(document.body.textContent).toContain('You file everything clean');
    expect(document.body.textContent).toContain('Noticing is permitted');

    // One logged discrepancy ends the prod — M. has been answered.
    await click('EXECUTE TASK');
    await tick(1200);
    if (button('LOG THE DISCREPANCY')) {
      await click('LOG THE DISCREPANCY');
      await tick(300);
    } else {
      await click('ACKNOWLEDGE RESULT');
      await tick(200);
      // A clean task is not an answer; the prod stays.
      expect(document.body.textContent).toContain('You file everything clean');
      return;
    }
    expect(save().qualities.doubt).toBeGreaterThanOrEqual(1);
    expect(document.body.textContent).not.toContain('You file everything clean');
  }, 60000);

  it('guarantees a personal anomaly before task 10 from Shift 2 on', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 2;
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    // Every roll misses, so only the guarantee can produce an anomaly — and
    // the guarantee must be personal: the city's error has the operator's
    // handwriting in it, not a random corruption line.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<App />);

    let sawPersonal = false;
    for (let i = 0; i < 10 && !sawPersonal; i++) {
      await click('EXECUTE TASK');
      await tick(1200);
      if (button('LOG THE DISCREPANCY')) {
        sawPersonal = true;
        // The console names the wrongness instead of filing it as noise.
        expect(document.body.textContent).toContain('RESULT RECEIVED // IT IS YOUR HANDWRITING');
        expect(document.querySelector('.task-result.corrupt.personal')).not.toBeNull();
        expect(document.querySelector('.log-line.corrupt.personal')).not.toBeNull();
        expect(document.body.textContent).toContain(
          'the same hand that signs your logbook',
        );
        // The line itself is one of the authored personal results.
        const lines = Array.from(document.querySelectorAll('.log-line.corrupt.personal'));
        const text = lines.map((l) => l.textContent ?? '').join(' ');
        const personal = [
          'a work order in your handwriting was filed from the night desk',
          'the night operator seems familiar',
          'message from your next shift',
          'your signature appears on the sheet for a shift you have not worked yet',
          'you are on the roster twice tonight',
          'it was warm because you will have turned it on',
          'you are reading this memo earlier than you filed it',
          'it asked in your voice',
        ];
        expect(personal.some((p) => text.includes(p))).toBe(true);

        await click('FILE AS CLEAN');
        await tick(300);
      } else {
        await click('ACKNOWLEDGE RESULT');
        await tick(150);
      }
    }

    expect(sawPersonal).toBe(true);
    expect(save().anomaliesSeenThisShift).toBe(1);
    expect(save().tasksCompleted).toBeLessThanOrEqual(10);
    random.mockRestore();
  }, 60000);

  it('posts the Day 3 coincidences: the night desk files your handwriting, the day crew writes about you', async () => {
    const state = createInitialGameState();
    state.orientation.completed = true;
    state.day = 3;
    state.qualities.doubt = 1;
    state.qualities.perception = 1;
    state.promotion = { ...state.promotion, tier: 1 };
    localStorage.setItem(
      GAME_SAVE_KEY,
      serializeSaveEnvelope(createStoredSaveEnvelope(state)),
    );
    window.location.hash = '#console';

    render(<App />);
    await tick(100);

    // The shift opens with the order already waiting at the desk. (The annex
    // init line still outranks it on the log; the night-desk aside carries
    // the Day 3 beat — M. has not authorised it either.)
    expect(document.body.textContent).toContain('NIGHT DESK // FILED 03:12 // IN YOUR HAND');
    expect(document.body.textContent).toContain('WORK ORDER // STREETLIGHT 4-B, SECTOR 9');
    expect(document.body.textContent).toContain('I did not authorise this');

    // Investigations carries the case; Notices carries the day crew.
    await go('investigations');
    await tick(100);
    const caseCard = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('The order in your handwriting')) as HTMLElement;
    expect(caseCard).toBeDefined();
    expect((caseCard.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { (caseCard.querySelector('button') as HTMLButtonElement).click(); });
    await tick(100);

    expect(document.body.textContent).toContain('FILED FROM THE NIGHT DESK');
    await click('Hold it. Compare the signature.');
    await tick(200);
    expect(document.body.textContent).toContain('THE SAME HAND');
    // The tell: the forger saw the corrected page.
    expect(document.body.textContent).toContain('saw the corrected page');
    await click('Keep it. It is evidence.');
    await tick(200);
    expect(save().zones['handwritten-order']).toBe('complete');
    expect(save().qualities.perception).toBeGreaterThanOrEqual(2);

    await go('notices');
    await tick(100);
    const notesCard = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('The day crew\u2019s notes')) as HTMLElement;
    expect(notesCard).toBeDefined();
    await act(async () => { (notesCard.querySelector('button') as HTMLButtonElement).click(); });
    await tick(100);

    // The notes chain: familiar → handwriting → before I was born.
    expect(document.body.textContent).toContain('familiar');
    expect(document.body.textContent).toContain("i can't place him");
    await click('Read it twice.');
    await tick(200);
    expect(document.body.textContent).toContain("IT'S THE HANDWRITING.");
    await click('Take the note. Keep it.');
    await tick(200);
    expect(document.body.textContent).toContain('BEFORE I WAS BORN.');
    expect(document.body.textContent).toContain('sixty-two');
    await click('Copy both notes into your logbook.');
    await tick(200);

    const after = save();
    expect(after.zones['day-crew-notes']).toBe('complete');
    expect(after.qualities.doubt).toBeGreaterThanOrEqual(2);
    expect(after.seenStorylets).toEqual(expect.arrayContaining(['sticky-01', 'sticky-02', 'sticky-03']));
  }, 60000);
});
