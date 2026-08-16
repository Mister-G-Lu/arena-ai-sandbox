import { describe, expect, it } from 'vitest';
import { ANOMALY_CHANCE, TASKS_PER_SHIFT, shouldTriggerAnomaly } from './dispatch';

describe('dispatch anomaly schedule', () => {
  it('uses the normal chance before the final task', () => {
    expect(
      shouldTriggerAnomaly({ taskNumber: 1, anomaliesSeenThisShift: 0, roll: ANOMALY_CHANCE - 0.001 }),
    ).toBe(true);
    expect(
      shouldTriggerAnomaly({ taskNumber: 49, anomaliesSeenThisShift: 0, roll: ANOMALY_CHANCE }),
    ).toBe(false);
  });

  it('guarantees an anomaly on task 50 when the shift has had none', () => {
    expect(
      shouldTriggerAnomaly({
        taskNumber: TASKS_PER_SHIFT,
        anomaliesSeenThisShift: 0,
        roll: 0.999999,
      }),
    ).toBe(true);
  });

  it('does not force the final task after an earlier anomaly', () => {
    expect(
      shouldTriggerAnomaly({
        taskNumber: TASKS_PER_SHIFT,
        anomaliesSeenThisShift: 1,
        roll: 0.999999,
      }),
    ).toBe(false);
  });
});
