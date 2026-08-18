import { describe, expect, it } from 'vitest';
import {
  CORRUPT_RESULTS,
  HOOK_DEADLINE,
  PERSONAL_RESULTS,
  createPendingDispatch,
  personalPoolFor,
  shouldUsePersonalAnomaly,
} from './dispatch';

/** arcs §2.3 — the wrongness turns personal. The first anomaly of each shift
 * from Day 2 on is authored in the operator's own hand. */
describe('personal anomaly schedule', () => {
  it('keeps Shift 1 corruption generic — the first shift is a glitch', () => {
    const pending = createPendingDispatch({
      day: 1,
      tasksCompleted: 3,
      tasksThisShift: 3,
      actionsSpentThisShift: 3,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0.5,
    });
    expect(pending.isCorrupt).toBe(true);
    expect(pending.isPersonal).toBe(false);
    expect(CORRUPT_RESULTS).toContain(pending.displayedResult);
    expect(personalPoolFor()).not.toContain(pending.displayedResult);
  });

  it('widens the decks so a week of shifts does not recycle the same lines', () => {
    // A shift owes two anomalies; a week owes ~fourteen. Pools this size mean
    // a given line lands roughly once a week, not twice a shift.
    expect(CORRUPT_RESULTS.length).toBeGreaterThanOrEqual(10);
    expect(personalPoolFor().length).toBeGreaterThanOrEqual(7);
  });

  it('retires a personal reveal whose case the operator already closed', () => {
    const open = personalPoolFor();
    const closed = personalPoolFor(['handwritten-order', 'day-crew-notes']);
    expect(closed.length).toBe(open.length - 2);
    expect(closed.some((line) => line.includes('a work order in your handwriting'))).toBe(false);
    expect(closed.some((line) => line.includes('the night operator seems familiar'))).toBe(false);
    // The rest of the deck is untouched.
    expect(closed.some((line) => line.includes('you are on the roster twice'))).toBe(true);
  });

  it('draws around a closed case so the first personal anomaly stays fresh', () => {
    const pending = createPendingDispatch({
      day: 3,
      tasksCompleted: 60,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0,
      completedZones: ['handwritten-order'],
    });
    expect(pending.isPersonal).toBe(true);
    // The retired line is gone from the deck the night rotates through.
    expect(pending.displayedResult).not.toContain('a work order in your handwriting');
    const deck = personalPoolFor(['handwritten-order']);
    expect(pending.displayedResult).toBe(deck[3 % deck.length]);
  });

  it('makes the first anomaly of every shift from Day 2 on personal', () => {
    expect(shouldUsePersonalAnomaly(1, 0)).toBe(false);
    expect(shouldUsePersonalAnomaly(2, 0)).toBe(true);
    expect(shouldUsePersonalAnomaly(9, 0)).toBe(true);
    // Once the shift has paid its personal debt, corruption goes generic again.
    expect(shouldUsePersonalAnomaly(9, 1)).toBe(false);
    expect(shouldUsePersonalAnomaly(2, 3)).toBe(false);
  });

  it('rotates the personal line by night so two shifts never repeat the reveal', () => {
    const day2 = createPendingDispatch({
      day: 2,
      tasksCompleted: 10,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0,
    });
    const day3 = createPendingDispatch({
      day: 3,
      tasksCompleted: 10,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0.999999,
    });
    // The night picks the line, not the roll: consecutive shifts advance
    // through the deck instead of gambling on a repeat.
    expect(day2.displayedResult).toBe(personalPoolFor()[2 % personalPoolFor().length]);
    expect(day3.displayedResult).toBe(personalPoolFor()[3 % personalPoolFor().length]);
    expect(day2.displayedResult).not.toBe(day3.displayedResult);
  });

  it('flags clean results as never personal', () => {
    const pending = createPendingDispatch({
      day: 2,
      tasksCompleted: 10,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0.999999,
      corruptionRoll: 0.5,
    });
    expect(pending.isCorrupt).toBe(false);
    expect(pending.isPersonal).toBe(false);
    expect(pending.displayedResult).toBe(pending.cleanResult);
  });

  it('guarantees one personal anomaly before task 10 from Shift 2 on', () => {
    // Worst case: every roll misses. The forced anomaly must be personal and
    // must land inside the hook window whatever the RNG does.
    const anomalies = [];
    for (let taskNumber = 1; taskNumber <= HOOK_DEADLINE; taskNumber += 1) {
      const pending = createPendingDispatch({
        day: 2,
        tasksCompleted: taskNumber - 1,
        tasksThisShift: taskNumber - 1,
        actionsSpentThisShift: taskNumber - 1,
        anomaliesSeenThisShift: anomalies.length,
        anomalyRoll: 0.999999,
        corruptionRoll: 0.5,
      });
      if (pending.isCorrupt) anomalies.push(pending);
    }
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[0]?.isPersonal).toBe(true);
  });

  it('keeps the second owed anomaly generic — one personal line per shift', () => {
    const second = createPendingDispatch({
      day: 2,
      tasksCompleted: 40,
      tasksThisShift: 40,
      actionsSpentThisShift: 40,
      anomaliesSeenThisShift: 1,
      anomalyRoll: 0,
      corruptionRoll: 0.5,
    });
    expect(second.isCorrupt).toBe(true);
    expect(second.isPersonal).toBe(false);
    expect(CORRUPT_RESULTS).toContain(second.displayedResult);
  });

  it('keeps personal lines free of digits so filing them clean cannot pay a field', () => {
    for (const line of PERSONAL_RESULTS) {
      expect(line.text).not.toMatch(/\d/);
    }
  });
});
