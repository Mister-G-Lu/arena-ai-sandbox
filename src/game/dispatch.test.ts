import { describe, expect, it } from 'vitest';
import {
  ANOMALY_CHANCE,
  GUARANTEED_ANOMALIES_PER_SHIFT,
  HOOK_DEADLINE,
  TASKS_PER_SHIFT,
  anomalyChance,
  shouldTriggerAnomaly,
} from './dispatch';

describe('dispatch anomaly schedule', () => {
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
