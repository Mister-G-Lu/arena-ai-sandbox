/**
 * INTEGRATION — the opening narrative, walked end to end.
 *
 * This is the adversarial click-through kept as a regression test: orientation,
 * the first filed consequence, the console discrepancy decision, the promotion
 * it earns, the notices it unlocks, and the Floor 12 expedition that pays out
 * the game's first Component.
 */
import { render, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import App from '../App';

const SAVE_KEY = 'fr:player-progress:v1';

function save() {
  return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
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

describe('opening narrative', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never shows a credit cap anywhere in the console shell', async () => {
    render(<App />);
    expect(document.body.textContent).not.toMatch(/\/\s*500/);
    expect(resource('Credits')).toBe('0');
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

  it('keeps Notices unreachable for an incurious operator', async () => {
    render(<App />);
    await runOrientation("IT'S FINE");
    await tick(100);

    expect(save().qualities.doubt).toBe(0);
    expect(save().promotion.tier).toBe(0);

    await go('notices');
    await tick(100);
    // The gate redirects rather than rendering an empty page.
    expect(document.body.textContent).toContain('OPERATOR CONSOLE');
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
    // Floor 12 is listed but sealed until the operator has clearance.
    expect(document.body.textContent).not.toContain('Floor 12');

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
    expect(afterNotices.promotion.title).toBe('Senior Operator');

    await go('notices');
    await tick(100);
    expect(document.body.textContent).toContain('Floor 12');

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
