/** Regression coverage for the long run to the first Component: curiosity
 * through Notices, the Shift 2 lead, and the Day 4 Floor 12 expedition. */
import { render, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import App from '../App';
import {
  button, click, finishCurrentShift, go, resource, runOrientation, save, tick, waitForActions,
} from './opening-narrative.helpers';

describe('opening narrative — the first Component (Floor 12)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
});
