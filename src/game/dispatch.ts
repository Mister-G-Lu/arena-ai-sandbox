import { ACTION_CAP } from './actions';

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
  'DELIVERY LOG: driver VANTABLACK reports street names that do not appear on the municipal map. the map agrees. the map is wrong. report filed.',
  'FLEET TELEMETRY ▓▓ truck 312 ▓▓ truck 312 ▓▓ trucks on site: 0 ▓▓',
  '▓▓ 05:59 ▓▓ 05:59 ▓▓ 05:59 ▓▓ the clock refused the next minute ▓▓',
  'MEMO BOARD: the night shift is requested not to look out of the window after 05:00. the window is not there after 05:00.',
] as const;

/**
 * The personal corruption pool — results that are not merely damaged, but
 * addressed to the operator. After the Shift 2 Annex lead, the shift's first
 * anomaly stops being a random glitch and becomes a signature: the city's
 * errors have started knowing who files them (design/arcs.md §2.3 — the
 * wrongness turns personal). Deliberately number-free: a corrupt field pays
 * the number it contains when filed clean, and a guaranteed personal line
 * must not hand out a guaranteed windfall (src/game/payouts.ts).
 */
export interface PersonalResult {
  text: string;
  /**
   * The zone whose resolution makes this line a stale reveal. A personal
   * anomaly is written like a first-time discovery; once the operator has
   * already closed the matching case, replaying it reads as a continuity
   * error, so it retires from the pool.
   */
  excludesZone?: string;
}

export const PERSONAL_RESULTS: PersonalResult[] = [
  {
    text: 'OPERATOR: a work order in your handwriting was filed from the night desk. you did not write it. the desk is certain you did not.',
    excludesZone: 'handwritten-order',
  },
  {
    text: 'the day crew left a note on the memo board: the night operator seems familiar. they mean you. you have never met the day crew.',
    excludesZone: 'day-crew-notes',
  },
  { text: 'message from your next shift: stop leaving notes where the day crew can find them. — you' },
  { text: 'ATTENDANCE: your signature appears on the sheet for a shift you have not worked yet. it is a good signature. it is yours.' },
  { text: 'you are on the roster twice tonight. one of you has already clocked in. neither of you has left.' },
  { text: 'the coffee maker was warm before you arrived. it was warm because you will have turned it on. this sentence was filed by you.' },
  { text: 'a memo from M.: you are reading this memo earlier than you filed it. please continue. — M.' },
  { text: 'the terminal asked if you were still awake. it asked in your voice. you answered. the log shows no question was asked.' },
];

/**
 * The personal lines still valid tonight. Lines whose case the operator has
 * already closed retire so the queue never re-reveals a resolved mystery as
 * if it were new.
 */
export function personalPoolFor(completedZones?: string[]): string[] {
  const done = new Set(completedZones ?? []);
  return PERSONAL_RESULTS.filter((r) => !r.excludesZone || !done.has(r.excludesZone)).map((r) => r.text);
}

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
  /** True when the corruption is addressed to the operator personally. */
  isPersonal: boolean;
}

export interface CreateDispatchInput {
  day: number;
  tasksCompleted: number;
  tasksThisShift: number;
  actionsSpentThisShift: number;
  anomaliesSeenThisShift: number;
  anomalyRoll: number;
  corruptionRoll: number;
  /** Zones the operator has closed; retires stale personal reveals. */
  completedZones?: string[];
}

function indexFromRoll(roll: number, length: number): number {
  const normalized = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
  return Math.floor(normalized * length);
}

export function taskOrderFor(tasksCompleted: number): DispatchOrder {
  const safeTotal = Number.isFinite(tasksCompleted) ? Math.max(0, Math.floor(tasksCompleted)) : 0;
  return DISPATCH_ORDERS[safeTotal % DISPATCH_ORDERS.length];
}

/**
 * Whether an anomaly that fires right now must be *personal*. The first
 * anomaly of every shift from Day 2 on is: after the Annex order, the queue
 * itself starts answering in the operator's own hand (the opening-retention
 * review's "one personal anomaly before task 10, not only a random corruption
 * line"). Day 1 keeps generic corruption — the first shift is a glitch, the
 * second is a pattern, and the pattern is about you.
 */
export function shouldUsePersonalAnomaly(day: number, anomaliesSeenThisShift: number): boolean {
  return day >= 2 && anomaliesSeenThisShift <= 0;
}

/** Build the immutable work order that is reserved in the canonical save. */
export function createPendingDispatch(input: CreateDispatchInput): PendingDispatch {
  const taskNumber = input.tasksThisShift + 1;
  const order = taskOrderFor(input.tasksCompleted);
  const isCorrupt = shouldTriggerAnomaly({
    taskNumber,
    anomaliesSeenThisShift: input.anomaliesSeenThisShift,
    roll: input.anomalyRoll,
    // The caller charges this reservation's own action around the mutate, so
    // `actionsSpentThisShift` here is still the pre-reservation count. What
    // remains is the number of further tasks the shift can start after this
    // one: the cap minus everything spent before it minus this task itself.
    taskSlotsLeft: Math.max(0, ACTION_CAP - input.actionsSpentThisShift - 1),
  });
  const personalPool = personalPoolFor(input.completedZones);
  const isPersonal =
    isCorrupt &&
    personalPool.length > 0 &&
    shouldUsePersonalAnomaly(input.day, input.anomaliesSeenThisShift);
  const displayedResult = isCorrupt
    ? isPersonal
      ? personalPool[indexFromRoll(input.corruptionRoll, personalPool.length)]
      : CORRUPT_RESULTS[indexFromRoll(input.corruptionRoll, CORRUPT_RESULTS.length)]
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
    isPersonal,
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
  /**
   * Tasks the shift's remaining action budget can still start after this one.
   * Defaults to a full quota (the classic pure-grind shift) so callers that
   * only know the task number keep the original schedule.
   */
  taskSlotsLeft?: number;
}

/**
 * The task by which the next anomaly is owed, given how many the shift has
 * already produced. Once the shift has paid its debt, there is no deadline
 * and the authored chance runs unmodified.
 */
export function anomalyDeadline(
  taskNumber: number,
  anomaliesSeenThisShift: number,
  taskSlotsLeft = TASKS_PER_SHIFT - taskNumber,
): number {
  if (anomaliesSeenThisShift <= 0) {
    return Math.min(HOOK_DEADLINE, taskNumber + taskSlotsLeft);
  }
  if (anomaliesSeenThisShift < GUARANTEED_ANOMALIES_PER_SHIFT) {
    // Owed by the last task the budget can still afford — a shift that spends
    // actions on notices files fewer tasks, and its second anomaly must land
    // inside whichever tasks it does file, not in the unfiled remainder.
    return taskNumber + taskSlotsLeft;
  }
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
  taskSlotsLeft,
}: Omit<AnomalyRoll, 'roll'>): number {
  const deadline = anomalyDeadline(
    taskNumber,
    anomaliesSeenThisShift,
    taskSlotsLeft ?? TASKS_PER_SHIFT - taskNumber,
  );
  if (!Number.isFinite(deadline)) return ANOMALY_CHANCE;
  if (taskNumber >= deadline) return 1;

  const tasksLeftInWindow = deadline - taskNumber + 1;
  return Math.max(ANOMALY_CHANCE, 1 / tasksLeftInWindow);
}

/**
 * Normal results use the authored chance, but progression can never be
 * blocked by an unlucky shift. Two anomalies are owed per shift: the first by
 * task 10, the second by the last result the shift's budget can file — a
 * shift that spends actions on notices still pays its second anomaly, just
 * inside the shorter queue of tasks it actually files.
 */
export function shouldTriggerAnomaly({
  taskNumber,
  anomaliesSeenThisShift,
  roll,
  taskSlotsLeft,
}: AnomalyRoll): boolean {
  return roll < anomalyChance({ taskNumber, anomaliesSeenThisShift, taskSlotsLeft });
}
