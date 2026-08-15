import { parseActionState, type ActionState } from '../game/actions';
import { parseShift, type ShiftState } from '../game/shift';
import { parseProgress, type Progress } from '../game/storylets';

export const SAVE_VERSION = 1 as const;
export const ENVELOPE_KEYS = new Set(['version', 'exportedAt', 'progress', 'shift', 'actions']);

export interface SaveEnvelope {
  version: typeof SAVE_VERSION;
  exportedAt: string;
  progress: Progress;
  shift: ShiftState;
  actions: ActionState;
}

export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

export function makeEnvelope(
  parts: { progress: Progress; shift: ShiftState; actions: ActionState },
  now = new Date(),
): SaveEnvelope {
  return {
    version: SAVE_VERSION,
    exportedAt: now.toISOString(),
    progress: parts.progress,
    shift: parts.shift,
    actions: parts.actions,
  };
}

export function parseEnvelope(raw: unknown, now = Date.now()): SaveEnvelope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EnvelopeError('envelope must be an object');
  }
  const obj = raw as Record<string, unknown>;
  const unknown = Object.keys(obj).filter((k) => !ENVELOPE_KEYS.has(k));
  if (unknown.length > 0) {
    throw new EnvelopeError(`unknown key(s): ${unknown.join(', ')}`);
  }
  if (obj.version !== SAVE_VERSION) {
    throw new EnvelopeError(`unsupported version: ${String(obj.version)}`);
  }
  if (typeof obj.exportedAt !== 'string' || Number.isNaN(Date.parse(obj.exportedAt))) {
    throw new EnvelopeError('exportedAt must be an ISO timestamp');
  }
  return {
    version: SAVE_VERSION,
    exportedAt: obj.exportedAt,
    progress: parseProgress(obj.progress),
    shift: parseShift(obj.shift),
    actions: parseActionState(obj.actions, now),
  };
}

export function serializeEnvelope(env: SaveEnvelope): string {
  return `${JSON.stringify(env, null, 2)}\n`;
}

export function parseEnvelopeJson(text: string, now = Date.now()): SaveEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new EnvelopeError('envelope is not valid JSON');
  }
  return parseEnvelope(raw, now);
}
