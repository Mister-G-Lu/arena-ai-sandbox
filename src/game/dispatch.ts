export const TASKS_PER_SHIFT = 50;
export const ANOMALY_CHANCE = 0.06;

export interface DispatchOrder {
  code: string;
  title: string;
  instruction: string;
  result: string;
}

/** Canonical queue data. Pending work copies the selected order into the save
 * so a deploy cannot silently change a result that is already awaiting the
 * operator's signature. */
export const DISPATCH_ORDERS: DispatchOrder[] = [
  {
    code: 'S9-RC-041',
    title: 'SECTOR 9 ROLL CALL',
    instruction: 'Open the night channel. Confirm the driver, route, and road conditions before filing.',
    result: 'S9 ROLL CALL — roads clear. stars: nominal. driver: VANTABLACK. status: green.',
  },
  {
    code: 'LGT-4B-118',
    title: 'STREETLIGHT 4-B',
    instruction: 'Compare the outage ticket with the grid. Dispatch a crew only if both records agree.',
    result: 'STREETLIGHT 4-B — records matched. ticket filed. crew dispatched. no follow-up required.',
  },
  {
    code: 'BRK-AM-006',
    title: 'BREAK ROOM AUDIT',
    instruction: 'Verify the coffee temperature, pot level, and operator count. Do not amend the preparation time.',
    result: 'BREAK ROOM — coffee: warm. pot: full. operators present: one. preparation time: unavailable.',
  },
  {
    code: 'WXR-0600',
    title: 'WEATHER DESK',
    instruction: 'Read the overnight model through 06:00. Acknowledge any deviation from clear conditions.',
    result: 'WEATHER — clear through 06:00. deviation: none. forecast after 06:00: not applicable.',
  },
  {
    code: 'RTE-000',
    title: 'ROUTE SYNCHRONIZATION',
    instruction: 'Reconcile every active truck with its assigned route. File the variance to two decimal places.',
    result: 'ROUTE SCAN — all trucks on schedule. deviation: 0.00%. reconciliation accepted.',
  },
  {
    code: 'RAD-NC-9',
    title: 'NIGHT CREW RADIO CHECK',
    instruction: 'Ping the night channel and wait for three clean tones before confirming the link.',
    result: 'RADIO — night crew confirmed. three tones received. signal: strong. no anomalies.',
  },
  {
    code: 'INV-41312',
    title: 'MUNICIPAL INVENTORY',
    instruction: 'Compare the current inventory total with the prior shift. Escalate any non-zero delta.',
    result: 'INVENTORY — count: 41,312. previous: 41,312. delta: 0. escalation not required.',
  },
  {
    code: 'MEM-TUE-0',
    title: 'MEMO BOARD REVIEW',
    instruction: 'Read all overnight notices. Confirm that no unfiled directive remains on the board.',
    result: 'MEMO BOARD — notices reviewed: 0. unfiled directives: 0. board cleared.',
  },
  {
    code: 'WND-GRID',
    title: 'EXTERIOR GRID CHECK',
    instruction: 'Verify the streetlight pattern from the interior window. Remain inside while observing.',
    result: 'WINDOW CHECK — streetlights active. grid stable. city compliant. operator remained indoors.',
  },
  {
    code: 'ATT-100',
    title: 'ATTENDANCE RECONCILIATION',
    instruction: 'Match the active operator against the century roster. Do not create a new roster entry.',
    result: 'ATTENDANCE — operator: PRESENT. record: unbroken. existing entry confirmed.',
  },
  {
    code: 'POP-DELTA',
    title: 'POPULATION LEDGER',
    instruction: 'Recalculate the municipal total. If it differs, repeat the count until it does not.',
    result: 'POPULATION — 41,312. delta: 0. all accounted for. recount not required.',
  },
  {
    code: 'RFA-012',
    title: 'ROOFTOP ARRAY SCAN',
    instruction: 'Read the antenna health report remotely. Roof access is neither needed nor permitted.',
    result: 'ROOF ARRAY — antennas clear. signal optimal. receiving endpoint: unspecified.',
  },
  {
    code: 'DSP-S7',
    title: 'SECTOR 7 DISPATCH LOG',
    instruction: 'Confirm that Sector 7 generated no calls. Do not compare against the public sector map.',
    result: 'DISPATCH LOG — Sector 7 quiet. calls received: 0. map comparison skipped.',
  },
  {
    code: 'ELV-11',
    title: 'ELEVATOR STATUS',
    instruction: 'Confirm service to every recognized floor. Discard readings outside the approved range.',
    result: 'ELEVATOR — floors 1–11 normal. out-of-range reading discarded. service confirmed.',
  },
  {
    code: 'CLK-0100',
    title: 'TERMINAL CLOCK SYNC',
    instruction: 'Compare local time to Dispatch. Accept the reading only when both clocks agree.',
    result: 'CLOCK SYNC — Dispatch and terminal agree. time is advancing within permitted bounds.',
  },
];

export const CORRUPT_RESULTS = [
  '▓▓▓ S9 ▓▓▓ all clear ▓▓▓ you were not here yesterday ▓▓▓',
  'building 7 does not exist. building 7 does not exist. you know this.',
  'population: 41,31▓ — unchanged. forever. unchanged.',
  'OPERATOR: you are not supposed to remember this shift.',
  '██ 06:00 ██ DO NOT BE AWAKE ██ DO NOT ██',
  'ERROR: the coffee was warm before you arrived. it was warm before the building existed.',
  '▓▓ ATTENDANCE ██ 100% ██ it was 100% before you were hired ▓▓',
] as const;

export interface PendingDispatch {
  id: string;
  day: number;
  taskNumber: number;
  shiftAction: number;
  code: string;
  title: string;
  instruction: string;
  cleanResult: string;
  displayedResult: string;
  isCorrupt: boolean;
}

export interface CreateDispatchInput {
  day: number;
  tasksCompleted: number;
  tasksThisShift: number;
  actionsSpentThisShift: number;
  anomaliesSeenThisShift: number;
  anomalyRoll: number;
  corruptionRoll: number;
}

function indexFromRoll(roll: number, length: number): number {
  const normalized = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
  return Math.floor(normalized * length);
}

export function taskOrderFor(tasksCompleted: number): DispatchOrder {
  const safeTotal = Number.isFinite(tasksCompleted) ? Math.max(0, Math.floor(tasksCompleted)) : 0;
  return DISPATCH_ORDERS[safeTotal % DISPATCH_ORDERS.length];
}

/** Build the immutable work order that is reserved in the canonical save. */
export function createPendingDispatch(input: CreateDispatchInput): PendingDispatch {
  const taskNumber = input.tasksThisShift + 1;
  const order = taskOrderFor(input.tasksCompleted);
  const isCorrupt = shouldTriggerAnomaly({
    taskNumber,
    anomaliesSeenThisShift: input.anomaliesSeenThisShift,
    roll: input.anomalyRoll,
  });
  const displayedResult = isCorrupt
    ? CORRUPT_RESULTS[indexFromRoll(input.corruptionRoll, CORRUPT_RESULTS.length)]
    : order.result;

  return {
    id: `dispatch-${input.day}-${input.tasksCompleted + 1}`,
    day: input.day,
    taskNumber,
    shiftAction: input.actionsSpentThisShift + 1,
    code: order.code,
    title: order.title,
    instruction: order.instruction,
    cleanResult: order.result,
    displayedResult,
    isCorrupt,
  };
}

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
