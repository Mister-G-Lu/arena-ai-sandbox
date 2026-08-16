export const TASKS_PER_SHIFT = 50;
export const ANOMALY_CHANCE = 0.06;

/**
 * The hook: the operator must see the city slip inside the first handful of
 * tasks. A player who files ten clean results in a row has been shown a data
 * entry job and no reason to come back.
 */
export const HOOK_DEADLINE = 10;

/**
 * And the shift must not be a one-off. One anomaly reads as a fluke; the
 * second is what makes it a pattern, so every full shift owes the operator
 * at least two.
 */
export const GUARANTEED_ANOMALIES_PER_SHIFT = 2;

export interface AnomalyRoll {
  taskNumber: number;
  anomaliesSeenThisShift: number;
  roll: number;
}

/**
 * The task by which the next anomaly is owed, given how many the shift has
 * already produced. Once the shift has paid its debt, there is no deadline
 * and the authored chance runs unmodified.
 */
export function anomalyDeadline(anomaliesSeenThisShift: number): number {
  if (anomaliesSeenThisShift <= 0) return HOOK_DEADLINE;
  if (anomaliesSeenThisShift < GUARANTEED_ANOMALIES_PER_SHIFT) return TASKS_PER_SHIFT;
  return Infinity;
}

/**
 * The chance this task corrupts. It is the authored rate, except when an
 * anomaly is owed and the deadline is close: then the odds ramp so the
 * guarantee is usually met by a real roll instead of by the hard floor.
 *
 * The ramp is 1 / (tasks left before the deadline), which spreads an owed
 * anomaly roughly evenly across the window it is owed in rather than
 * bunching it against the wall.
 */
export function anomalyChance({
  taskNumber,
  anomaliesSeenThisShift,
}: Omit<AnomalyRoll, 'roll'>): number {
  const deadline = anomalyDeadline(anomaliesSeenThisShift);
  if (!Number.isFinite(deadline)) return ANOMALY_CHANCE;
  if (taskNumber >= deadline) return 1;

  const tasksLeftInWindow = deadline - taskNumber + 1;
  return Math.max(ANOMALY_CHANCE, 1 / tasksLeftInWindow);
}

/**
 * Normal results use the authored chance, but progression can never be
 * blocked by an unlucky shift. Two anomalies are owed per shift: the first by
 * task 10, the second by the time the fiftieth result is filed.
 */
export function shouldTriggerAnomaly({
  taskNumber,
  anomaliesSeenThisShift,
  roll,
}: AnomalyRoll): boolean {
  return roll < anomalyChance({ taskNumber, anomaliesSeenThisShift });
}
