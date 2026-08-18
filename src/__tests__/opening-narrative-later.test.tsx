/** Regression coverage for the later opening beats: death, ambient dialogue,
 * personal anomalies, and the Day 3 coincidence cases.
 */
import { render, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import App from '../App';
import {
  GAME_SAVE_KEY,
  createInitialGameState,
  createStoredSaveEnvelope,
  serializeSaveEnvelope,
} from '../lib/gameSave';
import {
  button, click, go, save, settleRoute, tick,
} from './opening-narrative.helpers';

describe('opening narrative — later beats', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

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
