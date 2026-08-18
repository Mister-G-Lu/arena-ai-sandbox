import { describe, expect, it } from 'vitest';
import {
  ANOMALY_CHANCE,
  GUARANTEED_ANOMALIES_PER_SHIFT,
  HOOK_DEADLINE,
  TASKS_PER_SHIFT,
  anomalyChance,
  createPendingDispatch,
  personalPoolFor,
  shouldTriggerAnomaly,
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

