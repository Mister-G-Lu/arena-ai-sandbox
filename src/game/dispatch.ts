export const TASKS_PER_SHIFT = 50;
export const ANOMALY_CHANCE = 0.06;

export interface AnomalyRoll {
  taskNumber: number;
  anomaliesSeenThisShift: number;
  roll: number;
}

/**
 * Normal results use the authored chance, but progression can never be blocked
 * by an unlucky shift: if no anomaly has appeared, the final task is one.
 */
export function shouldTriggerAnomaly({
  taskNumber,
  anomaliesSeenThisShift,
  roll,
}: AnomalyRoll): boolean {
  if (anomaliesSeenThisShift <= 0 && taskNumber >= TASKS_PER_SHIFT) return true;
  return roll < ANOMALY_CHANCE;
}
