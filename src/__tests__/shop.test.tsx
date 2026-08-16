/**
 * INTEGRATION — the municipal supply terminal. Salary is the mundane
 * economy's reason to exist: a purchase debits the ledger, lands in the
 * operator file, and opens a storylet on the Notices board.
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

async function go(hash: string) {
  window.location.hash = hash;
  await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

/** A working operator: orientation done, one promotion, and a full day's pay. */
function seed(overrides: Record<string, unknown> = {}) {
  const state = createInitialGameState();
  state.orientation.completed = true;
  state.qualities.doubt = 1;
  state.promotion = { ...state.promotion, tier: 1 };
  state.credits = 500;
  Object.assign(state, overrides);
  localStorage.setItem(
    GAME_SAVE_KEY,
    serializeSaveEnvelope(createStoredSaveEnvelope(state)),
  );
  return state;
}

describe('municipal supply', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('lists every good with its price and the classified teaser locked', async () => {
    seed();
    render(<App />);
    await go('shop');

    expect(document.body.textContent).toContain('MUNICIPAL SUPPLY');
    expect(document.body.textContent).toContain('ORDER FOR ¤30');
    expect(document.body.textContent).toContain('THE MACHINE\u2019S FAVOR');
    expect(document.body.textContent).toContain('UNAVAILABLE //');
  });

  it('takes credits for a good and opens its storylet on Notices', async () => {
    seed();
    render(<App />);
    await go('shop');

    await click('ORDER FOR ¤30'); // GROUND COFFEE
    await act(async () => { vi.advanceTimersByTime(50); });

    const filed = save();
    expect(filed.supplies.coffee).toBe(true);
    expect(filed.credits).toBe(470);
    expect(filed.logbook.some((e: { text: string }) => e.text.includes('GROUND COFFEE'))).toBe(true);

    // The good opens its zone on the Notices board: listed, unsealed, playable.
    await go('notices');
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(document.body.textContent).toContain('The Coffee Machine');
    const coffeeCard = Array.from(document.querySelectorAll('.zone-card'))
      .find((z) => z.textContent?.includes('The Coffee Machine')) as HTMLElement;
    expect((coffeeCard.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { (coffeeCard.querySelector('button') as HTMLButtonElement).click(); });
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(document.body.textContent).toContain('MUNICIPAL BREW');
  });

  it('will not sell what the operator cannot afford', async () => {
    seed({ credits: 10 });
    render(<App />);
    await go('shop');

    expect(document.body.textContent).toContain('INSUFFICIENT CREDITS');
    const order = button('ORDER FOR ¤30');
    expect(order?.disabled).toBe(true);
  });

  it('marks an owned good as ordered and will not sell it twice', async () => {
    seed();
    render(<App />);
    await go('shop');

    await click('ORDER FOR ¤30');
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(document.body.textContent).toContain('✓ ORDERED');
    const order = button('ORDER FOR ¤30');
    expect(order).toBeUndefined();
  });

  it('labels the sealed Notices board when an Unknown Operator shops', async () => {
    // The cautious roleplayer at tier 0: the terminal will take their money,
    // but the board the good opens on is sealed. The card must say so.
    seed({ promotion: { tier: 0, title: 'Unknown Operator', unlocks: ['basic-tasks', 'break-room', 'memos'] }, qualities: { doubt: 0 } });
    render(<App />);
    await go('shop');

    expect(document.body.textContent).toContain('THE NOTICES BOARD IS SEALED');
    // The purchase itself is still honest and possible.
    await click('ORDER FOR ¤30');
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(save().supplies.coffee).toBe(true);
  });

  it('drops the sealed label once the operator is recognized', async () => {
    seed();
    render(<App />);
    await go('shop');

    expect(document.body.textContent).not.toContain('THE NOTICES BOARD IS SEALED');
  });

  it('gates the shop behind orientation like the console', async () => {
    seed({ orientation: { completed: false, skipped: false, taskRecorded: false } });
    render(<App />);
    await go('shop');
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(document.body.textContent).toContain('FIRST SHIFT');
    expect(document.body.textContent).not.toContain('SUPPLY TERMINAL // THIRD FLOOR');
  });
});
