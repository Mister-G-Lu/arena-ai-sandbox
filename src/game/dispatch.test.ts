import { describe, expect, it } from 'vitest';
import {
  ANOMALY_CHANCE,
  CORRUPT_RESULTS,
  GUARANTEED_ANOMALIES_PER_SHIFT,
  HOOK_DEADLINE,
  PERSONAL_RESULTS,
  TASKS_PER_SHIFT,
  anomalyChance,
  createPendingDispatch,
  personalPoolFor,
  shouldTriggerAnomaly,
  shouldUsePersonalAnomaly,
} from './dispatch';

describe('dispatch anomaly schedule', () => {
  it('materializes an immutable pending result for the canonical save', () => {
    const pending = createPendingDispatch({
      day: 3,
      tasksCompleted: 15,
      tasksThisShift: 2,
      actionsSpentThisShift: 7,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0.5,
    });
    expect(pending).toMatchObject({
      id: 'dispatch-3-16',
      day: 3,
      taskNumber: 3,
      shiftAction: 8,
      code: 'S9-RC-041',
      isCorrupt: true,
    });
    expect(pending.displayedResult).not.toBe(pending.cleanResult);
    // Day 3, first anomaly of the shift: the corruption is personal.
    expect(pending.isPersonal).toBe(true);
    expect(personalPoolFor()).toContain(pending.displayedResult);
  });

  it('uses at least the authored chance on the first task', () => {
    expect(
      shouldTriggerAnomaly({ taskNumber: 1, anomaliesSeenThisShift: 0, roll: ANOMALY_CHANCE - 0.001 }),
    ).toBe(true);
  });

  it('runs the authored chance once the shift has paid both anomalies', () => {
    expect(
      shouldTriggerAnomaly({
        taskNumber: 20,
        anomaliesSeenThisShift: GUARANTEED_ANOMALIES_PER_SHIFT,
        roll: ANOMALY_CHANCE,
      }),
    ).toBe(false);
    expect(anomalyChance({ taskNumber: 20, anomaliesSeenThisShift: 2 })).toBe(ANOMALY_CHANCE);
  });

  it('guarantees the hook anomaly by task 10 when the shift has had none', () => {
    expect(
      shouldTriggerAnomaly({
        taskNumber: HOOK_DEADLINE,
        anomaliesSeenThisShift: 0,
        roll: 0.999999,
      }),
    ).toBe(true);
  });

  it('never lets ten clean tasks open a shift', () => {
    // Worst case: every roll misses. The forced task must land inside the hook
    // window, whatever the RNG does.
    let anomalies = 0;
    for (let taskNumber = 1; taskNumber <= HOOK_DEADLINE; taskNumber += 1) {
      if (shouldTriggerAnomaly({ taskNumber, anomaliesSeenThisShift: anomalies, roll: 0.999999 })) {
        anomalies += 1;
      }
    }
    expect(anomalies).toBeGreaterThanOrEqual(1);
  });

  it('ramps the odds as the hook deadline approaches', () => {
    const early = anomalyChance({ taskNumber: 1, anomaliesSeenThisShift: 0 });
    const late = anomalyChance({ taskNumber: 8, anomaliesSeenThisShift: 0 });
    expect(early).toBeGreaterThanOrEqual(ANOMALY_CHANCE);
    expect(late).toBeGreaterThan(early);
    expect(anomalyChance({ taskNumber: HOOK_DEADLINE, anomaliesSeenThisShift: 0 })).toBe(1);
  });

  it('still owes a second anomaly after the hook has fired', () => {
    expect(
      shouldTriggerAnomaly({
        taskNumber: TASKS_PER_SHIFT,
        anomaliesSeenThisShift: 1,
        roll: 0.999999,
      }),
    ).toBe(true);
  });

  it('does not force the second anomaly early in the shift', () => {
    expect(
      shouldTriggerAnomaly({ taskNumber: 12, anomaliesSeenThisShift: 1, roll: 0.5 }),
    ).toBe(false);
  });

  it('owes the second anomaly by the last task the budget can still afford', () => {
    // A shift that spends actions on notices files fewer tasks: with no slots
    // left after this one, the owed anomaly must land now or never.
    expect(
      shouldTriggerAnomaly({
        taskNumber: 45,
        anomaliesSeenThisShift: 1,
        taskSlotsLeft: 0,
        roll: 0.999999,
      }),
    ).toBe(true);
  });

  it('spreads the owed second anomaly across the remaining budget', () => {
    // Nine tasks left after this one: one in ten.
    expect(anomalyChance({ taskNumber: 40, anomaliesSeenThisShift: 1, taskSlotsLeft: 9 })).toBe(1 / 10);
    // The classic call (no budget info) keeps the old full-quota schedule.
    expect(anomalyChance({ taskNumber: 40, anomaliesSeenThisShift: 1 })).toBeCloseTo(1 / 11);
  });

  it('forces the second anomaly into the last filed task of a shortened shift', () => {
    // 49 actions already spent (48 tasks + one notice) and this is the final
    // reservation the budget can afford. `actionsSpentThisShift` is the
    // pre-reservation count, as the caller passes it.
    const pending = createPendingDispatch({
      day: 3,
      tasksCompleted: 48,
      tasksThisShift: 48,
      actionsSpentThisShift: 49,
      anomaliesSeenThisShift: 1,
      anomalyRoll: 0.999999,
      corruptionRoll: 0.5,
    });
    expect(pending.taskNumber).toBe(49);
    expect(pending.isCorrupt).toBe(true);
  });

  it('delivers both guaranteed anomalies across a maximally unlucky shift', () => {
    let anomalies = 0;
    for (let taskNumber = 1; taskNumber <= TASKS_PER_SHIFT; taskNumber += 1) {
      if (shouldTriggerAnomaly({ taskNumber, anomaliesSeenThisShift: anomalies, roll: 0.999999 })) {
        anomalies += 1;
      }
    }
    expect(anomalies).toBe(GUARANTEED_ANOMALIES_PER_SHIFT);
  });
});

describe('personal anomaly schedule (arcs §2.3 — the wrongness turns personal)', () => {
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
    // Roll 0 used to draw the handwriting line; the closed case shifts it to
    // the next line in the remaining deck.
    expect(pending.displayedResult).toBe(personalPoolFor(['handwritten-order'])[0]);
    expect(pending.displayedResult).not.toContain('a work order in your handwriting');
  });

  it('makes the first anomaly of every shift from Day 2 on personal', () => {
    expect(shouldUsePersonalAnomaly(1, 0)).toBe(false);
    expect(shouldUsePersonalAnomaly(2, 0)).toBe(true);
    expect(shouldUsePersonalAnomaly(9, 0)).toBe(true);
    // Once the shift has paid its personal debt, corruption goes generic again.
    expect(shouldUsePersonalAnomaly(9, 1)).toBe(false);
    expect(shouldUsePersonalAnomaly(2, 3)).toBe(false);
  });

  it('draws the personal line from the personal pool, deterministically by roll', () => {
    const first = createPendingDispatch({
      day: 2,
      tasksCompleted: 10,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0,
    });
    const last = createPendingDispatch({
      day: 2,
      tasksCompleted: 10,
      tasksThisShift: 1,
      actionsSpentThisShift: 1,
      anomaliesSeenThisShift: 0,
      anomalyRoll: 0,
      corruptionRoll: 0.999999,
    });
    expect(personalPoolFor()).toContain(first.displayedResult);
    expect(personalPoolFor()).toContain(last.displayedResult);
    expect(first.displayedResult).not.toBe(last.displayedResult);
    expect(first.displayedResult).toBe(personalPoolFor()[0]);
    expect(last.displayedResult).toBe(personalPoolFor()[personalPoolFor().length - 1]);
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
