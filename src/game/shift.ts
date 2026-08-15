import { nextId } from '../utils/id';
import { clockStr } from '../utils/clock';
import { pick, type Rand, nativeRand } from '../utils/random';
import {
  DEFAULT_DAY,
  MAX_TASKS,
  MINUTES_PER_TASK,
  ROUTINE_SNIPPETS,
  SHIFT_COMPLETE_LINE,
  SHIFT_END_MINUTES,
  SHIFT_START_LINE,
  SHIFT_START_MINUTES,
} from './snippets';
import { pickCorrupt, shouldGlitch } from './glitch';

export type LogKind = 'routine' | 'system' | 'corrupt';

export interface LogLine {
  id: string;
  clock: string;
  text: string;
  kind: LogKind;
  healTo?: string;
}

export interface ShiftState {
  day: number;
  tasks: number;
  minutes: number;
  log: LogLine[];
  complete: boolean;
}

export function createShift(day = DEFAULT_DAY): ShiftState {
  const minutes = SHIFT_START_MINUTES;
  return {
    day,
    tasks: MAX_TASKS,
    minutes,
    complete: false,
    log: [
      {
        id: nextId('ln'),
        clock: clockStr(minutes),
        text: SHIFT_START_LINE,
        kind: 'system',
      },
    ],
  };
}

function isLogLine(v: unknown): v is LogLine {
  if (!v || typeof v !== 'object') return false;
  const l = v as LogLine;
  return (
    typeof l.id === 'string' &&
    typeof l.clock === 'string' &&
    typeof l.text === 'string' &&
    (l.kind === 'routine' || l.kind === 'system' || l.kind === 'corrupt')
  );
}

export function parseShift(raw: unknown): ShiftState {
  const fresh = createShift();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<ShiftState>;
  const day = typeof r.day === 'number' && Number.isFinite(r.day) ? Math.trunc(r.day) : fresh.day;
  const tasks =
    typeof r.tasks === 'number' && Number.isFinite(r.tasks) ? Math.trunc(r.tasks) : fresh.tasks;
  const minutes =
    typeof r.minutes === 'number' && Number.isFinite(r.minutes)
      ? Math.trunc(r.minutes)
      : fresh.minutes;
  const log = Array.isArray(r.log) ? r.log.filter(isLogLine) : fresh.log;
  const complete = r.complete === true || tasks <= 0;
  return { day, tasks: Math.max(0, tasks), minutes, log, complete };
}

export function healLine(shift: ShiftState, id: string): ShiftState {
  return {
    ...shift,
    log: shift.log.map((line) => {
      if (line.id !== id || !line.healTo) return line;
      return { id: line.id, clock: line.clock, text: line.healTo, kind: 'routine' as const };
    }),
  };
}

export interface PerformOpts {
  reducedMotion: boolean;
  rand?: Rand;
  snippet?: string;
}

export function performTask(shift: ShiftState, opts: PerformOpts): ShiftState {
  if (shift.complete || shift.tasks <= 0) return shift;
  const rand = opts.rand ?? nativeRand;
  const tasks = shift.tasks - 1;
  const minutes = Math.min(shift.minutes + MINUTES_PER_TASK, SHIFT_END_MINUTES);
  const text = opts.snippet ?? pick(ROUTINE_SNIPPETS, rand);
  const glitch = shouldGlitch(opts.reducedMotion, rand);
  const line: LogLine = glitch
    ? {
        id: nextId('ln'),
        clock: clockStr(minutes),
        text: pickCorrupt(rand),
        kind: 'corrupt',
        healTo: text,
      }
    : {
        id: nextId('ln'),
        clock: clockStr(minutes),
        text,
        kind: 'routine',
      };
  const log = [...shift.log, line];
  if (tasks === 0) {
    return {
      ...shift,
      tasks: 0,
      minutes: SHIFT_END_MINUTES,
      complete: true,
      log: [
        ...log,
        {
          id: nextId('ln'),
          clock: clockStr(SHIFT_END_MINUTES),
          text: SHIFT_COMPLETE_LINE,
          kind: 'system',
        },
      ],
    };
  }
  return { ...shift, tasks, minutes, log };
}

export function nextShift(shift: ShiftState): ShiftState {
  return createShift(shift.day + 1);
}

export { clockStr };
