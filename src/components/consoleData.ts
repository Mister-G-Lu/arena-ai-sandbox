import { ACTION_CAP } from '../game/actions';

export const SHIFT_ACTIONS = ACTION_CAP;

export interface FilingDef {
  id: string;
  label: string;
  hint?: string;
  effects: Record<string, number> | null;
  logbook: ((task: PendingTaskDisplay) => string) | string | null;
}

/** Consequence table for filing a result: every verb carries its own effects,
 *  payout rule and residue line, so adding a filing verb is one entry here. */
export const FILINGS: Record<string, FilingDef> = {
  clean: {
    id: 'clean',
    label: '✓ ACKNOWLEDGE RESULT',
    effects: null,
    logbook: null,
  },
  'file-clean': {
    id: 'file-clean',
    label: '✓ FILE AS CLEAN',
    hint: 'The system will correct the record and pay the reading it took. Nothing further is required of you.',
    effects: { Routine: 1 },
    logbook: null,
  },
  discrepancy: {
    id: 'discrepancy',
    label: '⚠ LOG THE DISCREPANCY',
    hint: 'The line stays in the log exactly as it arrived. Unreconciled work is unbilled work. The system will notice that you noticed.',
    effects: { Doubt: 1, Attention: 1 },
    logbook: (task: PendingTaskDisplay) =>
      `Day-log, ${task.timestamp} — ${task.code} returned: "${task.displayedResult}" ` +
      'I did not correct it. Ink does not forget.',
  },
};

/** What the window shows while you file — the city you never touch. Rotates with time and tasks so the outside feels alive while the queue feels identical. */
export const WINDOW_VISTAS = [
  'Hoverlanes hum thirty stories up — six cars cut the limit at once, their taillights smearing amber across wet Sector 4. You initial a form.',
  'A police cutter holds altitude over the annex, searchlight painting floor 11 amber, lingering on the blank where 12 should be. You verify a light.',
  'Delivery drones stitch the dark between towers, quiet as paper. One manifest lists only STATIONERY in a hand that tried too hard.',
  'Neon rain. The city throws itself back at its own windows until you can’t tell which lights are real. The log says CLEAR.',
  'Through the glass: the rooftop array blinks once. The system says nominal. The blink says otherwise.',
  'Far out over Sector 9, a single set of tail-lights holds at the map’s edge — VANTABLACK, waiting for a name you haven’t said yet.',
  'The towers breathe. Thirty floors of wet glass inhaling amber, exhaling teal. On your screen: 0.00% variance.',
  'A drone convoy threads the gap between the municipal spires at 180 kph, obedient and bright. Below, a streetlight you cleared flickers and holds.',
  'Meridian at 02:47 — a cutter’s wail dopplers down the canyon between buildings and is answered by nothing. The coffee stays warm.',
  'A man in a gray coat watches the annex from the corner, patient as a filing. His ID badge reads a different name every time the light changes.',
];

/** Deterministic vista for a given shift moment — no extra state, just atmosphere that ticks forward. */
export function vistaForMoment({ day, tasksThisShift, minutes }: { day: number; tasksThisShift: number; minutes: number }) {
  const idx = (tasksThisShift + day * 3 + Math.floor(minutes / 40)) % WINDOW_VISTAS.length;
  return WINDOW_VISTAS[idx];
}

export function formatTime(mins: number) {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * The in-fiction clock runs on actions spent this shift, not on the career
 * task total: the night is 01:00–06:00 however the operator chooses to spend
 * it, and it advances whether an action went to the queue or to a notice.
 */
export function timeForActionsSpent(actionsSpent: number) {
  return formatTime(Math.min(60 + actionsSpent * 6, 360));
}

/**
 * The plain shift-open line, rotated by day so the later nights — after the
 * bespoke opens of Days 1–3 — do not all read byte-identical. The first entry
 * is the canonical line; the rest are variations on it.
 */
export const GENERIC_INIT = [
  'SHIFT INITIALIZED // COFFEE: WARM // LIVE QUEUE OPEN.',
  'SHIFT INITIALIZED // COFFEE: WARM // LIVE QUEUE OPEN. AGAIN.',
  'SHIFT INITIALIZED // TUESDAY // POPULATION: 41,312 // LIVE QUEUE OPEN.',
  'SHIFT INITIALIZED // THE QUEUE REMEMBERS YOU // LIVE QUEUE OPEN.',
];

/**
 * The one line a shift gets when the operator has never noticed anything.
 * A cautious roleplayer can file everything clean for a week and never earn
 * Doubt — the loop stays shut. M. is the game's pressure valve, and this is
 * the pressure: noticing is the on-ramp, and the button has been there the
 * whole time.
 */
export const M_PROD =
  'M. // \u201cYou file everything clean. Admirable. Also suspicious. Noticing is permitted — the button has been on your screen all along.\u201d';

/**
 * M.'s direct-channel check-in, one per night from Day 4 on. Days 1–3 carry
 * their own bespoke asides; after that the Manager goes quiet in the old
 * build, and P7 asks for roughly one or two memorable exchanges per shift.
 * Each line quietly keeps a thread warm without naming a reveal.
 */
export const M_AMBIENT = [
  'M. // \u201cYou are ahead of your paperwork. That is not a compliment.\u201d',
  'M. // \u201cThe doorman says he has seen you. The doorman is not on payroll. He has seen everyone.\u201d',
  'M. // \u201cSector 9 called. There is no Sector 9 line. Do not ask me to reconcile that.\u201d',
  'M. // \u201cThe roof is under maintenance. It has been under maintenance for forty-one weeks. Maintenance has never attended.\u201d',
  'M. // \u201cA truck reports a street that is not on the map. I filed it under MAP ERRORS. The map does not make errors.\u201d',
  'M. // \u201cSomeone left you a note. It was me. No — it was not me. — M.\u201d',
  'M. // \u201c06:00 approaches. We do not discuss 06:00. You were not going to ask.\u201d',
  'M. // \u201cYour file grows. Files do that. I would not read it if I were you.\u201d',
];

interface ShiftInitParams {
  day: number;
  tasksThisShift: number;
  annexOrderComplete: boolean;
  handwritingOrderComplete: boolean;
}

export function shiftInitializationText({ day, tasksThisShift, annexOrderComplete, handwritingOrderComplete }: ShiftInitParams) {
  if (day === 1 && tasksThisShift > 0) {
    return 'ORIENTATION RECORD RECEIVED // TASK VERIFIED // LIVE QUEUE OPEN.';
  }
  if (day >= 2 && !annexOrderComplete) {
    return 'SHIFT INITIALIZED // SECONDARY ORDER POSTED: ANNEX ELEVATOR, OUT-OF-RANGE STOP 12.';
  }
  if (day >= 3 && !handwritingOrderComplete) {
    return 'SHIFT INITIALIZED // NIGHT DESK: ONE NEW ORDER, FILED IN YOUR HANDWRITING.';
  }
  return GENERIC_INIT[day % GENERIC_INIT.length];
}

export interface PendingTaskDisplay {
  id: string;
  logId: string;
  timestamp: string;
  code: string;
  title: string;
  displayedResult: string;
  cleanResult?: string;
  isCorrupt: boolean;
  isPersonal: boolean;
  shiftAction: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  text: string;
}
