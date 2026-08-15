export const ZONE_IDS = ['tutorial', 'routine', 'floor12'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];
export type ZoneStatus = 'locked' | 'open' | 'complete';

export const HIDDEN_QUALITIES = new Set(['Attention']);

export const STORYLET_KEYS = new Set(['id', 'zone', 'title', 'body', 'choices']);
export const CHOICE_KEYS = new Set(['id', 'label', 'outcome', 'next', 'endZone', 'completeZone']);
export const OUTCOME_KEYS = new Set(['text', 'qualities']);

export interface Outcome {
  text: string;
  qualities?: Record<string, number>;
}

export interface Choice {
  id: string;
  label: string;
  outcome: Outcome;
  next?: string;
  endZone?: boolean;
  completeZone?: boolean;
}

export interface Storylet {
  id: string;
  zone: ZoneId;
  title: string;
  body: string;
  choices: Choice[];
}

export interface Progress {
  qualities: Record<string, number>;
  zones: Record<ZoneId, ZoneStatus>;
  seen: string[];
  current: { zone: ZoneId; storyletId: string } | null;
}

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

function assertObject(raw: unknown, label: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError(`${label} must be an object`);
  }
  return raw as Record<string, unknown>;
}

function rejectUnknown(obj: Record<string, unknown>, allowed: Set<string>, label: string): void {
  const unknown = Object.keys(obj).filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    throw new SchemaError(`${label} has unknown key(s): ${unknown.join(', ')}`);
  }
}

function requireString(obj: Record<string, unknown>, key: string, label: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new SchemaError(`${label}.${key} must be a non-empty string`);
  }
  return v;
}

export function validateOutcome(raw: unknown, label = 'outcome'): Outcome {
  const obj = assertObject(raw, label);
  rejectUnknown(obj, OUTCOME_KEYS, label);
  const text = requireString(obj, 'text', label);
  let qualities: Record<string, number> | undefined;
  if (obj.qualities !== undefined) {
    if (!obj.qualities || typeof obj.qualities !== 'object' || Array.isArray(obj.qualities)) {
      throw new SchemaError(`${label}.qualities must be an object`);
    }
    qualities = {};
    for (const [k, v] of Object.entries(obj.qualities as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new SchemaError(`${label}.qualities.${k} must be a finite number`);
      }
      qualities[k] = v;
    }
  }
  return qualities ? { text, qualities } : { text };
}

export function validateChoice(raw: unknown, label = 'choice'): Choice {
  const obj = assertObject(raw, label);
  rejectUnknown(obj, CHOICE_KEYS, label);
  const id = requireString(obj, 'id', label);
  const choiceLabel = requireString(obj, 'label', label);
  const outcome = validateOutcome(obj.outcome, `${label}.outcome`);
  const choice: Choice = { id, label: choiceLabel, outcome };
  if (obj.next !== undefined) {
    if (typeof obj.next !== 'string' || obj.next.length === 0) {
      throw new SchemaError(`${label}.next must be a non-empty string`);
    }
    choice.next = obj.next;
  }
  if (obj.endZone !== undefined) {
    if (typeof obj.endZone !== 'boolean') throw new SchemaError(`${label}.endZone must be a boolean`);
    choice.endZone = obj.endZone;
  }
  if (obj.completeZone !== undefined) {
    if (typeof obj.completeZone !== 'boolean') {
      throw new SchemaError(`${label}.completeZone must be a boolean`);
    }
    choice.completeZone = obj.completeZone;
  }
  return choice;
}

export function validateStorylet(raw: unknown): Storylet {
  const obj = assertObject(raw, 'storylet');
  rejectUnknown(obj, STORYLET_KEYS, 'storylet');
  const id = requireString(obj, 'id', 'storylet');
  const zone = requireString(obj, 'zone', 'storylet');
  if (!ZONE_IDS.includes(zone as ZoneId)) {
    throw new SchemaError(`storylet.zone must be one of ${ZONE_IDS.join(', ')}`);
  }
  const title = requireString(obj, 'title', 'storylet');
  const body = requireString(obj, 'body', 'storylet');
  if (!Array.isArray(obj.choices) || obj.choices.length === 0) {
    throw new SchemaError('storylet.choices must be a non-empty array');
  }
  const choices = obj.choices.map((c, i) => validateChoice(c, `storylet.choices[${i}]`));
  return { id, zone: zone as ZoneId, title, body, choices };
}

export function createProgress(): Progress {
  return {
    qualities: { Attention: 0, Perception: 0, Doubt: 0, Salary: 0, Routine: 0 },
    zones: { tutorial: 'open', routine: 'open', floor12: 'locked' },
    seen: [],
    current: { zone: 'tutorial', storyletId: 'tutorial-01' },
  };
}

function isZoneId(v: string): v is ZoneId {
  return (ZONE_IDS as readonly string[]).includes(v);
}

function isZoneStatus(v: unknown): v is ZoneStatus {
  return v === 'locked' || v === 'open' || v === 'complete';
}

export function parseProgress(raw: unknown): Progress {
  const fresh = createProgress();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<Progress>;
  const qualities =
    r.qualities && typeof r.qualities === 'object' && !Array.isArray(r.qualities)
      ? { ...fresh.qualities, ...pickFinite(r.qualities) }
      : fresh.qualities;
  const zones = { ...fresh.zones };
  if (r.zones && typeof r.zones === 'object') {
    for (const [k, v] of Object.entries(r.zones)) {
      if (isZoneId(k) && isZoneStatus(v)) zones[k] = v;
    }
  }
  const seen = Array.isArray(r.seen) ? r.seen.filter((s): s is string => typeof s === 'string') : [];
  let current = fresh.current;
  if (r.current === null) current = null;
  else if (r.current && typeof r.current === 'object') {
    const z = r.current.zone;
    const sid = r.current.storyletId;
    if (typeof z === 'string' && isZoneId(z) && typeof sid === 'string') {
      current = { zone: z, storyletId: sid };
    }
  }
  return { qualities, zones, seen, current };
}

function pickFinite(obj: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function visibleQualities(qualities: Record<string, number>): [string, number][] {
  return Object.entries(qualities).filter(([k]) => !HIDDEN_QUALITIES.has(k));
}

export function applyChoice(
  progress: Progress,
  storylet: Storylet,
  choiceId: string,
): { progress: Progress; choice: Choice } {
  const choice = storylet.choices.find((c) => c.id === choiceId);
  if (!choice) throw new SchemaError(`unknown choice: ${choiceId}`);
  const qualities = { ...progress.qualities };
  for (const [k, delta] of Object.entries(choice.outcome.qualities ?? {})) {
    qualities[k] = (qualities[k] ?? 0) + delta;
  }
  const seen = progress.seen.includes(storylet.id) ? progress.seen : [...progress.seen, storylet.id];
  const zones = { ...progress.zones };
  let current = progress.current;
  if (choice.completeZone) {
    zones[storylet.zone] = 'complete';
    if (storylet.zone === 'tutorial' && zones.floor12 === 'locked') {
      zones.floor12 = 'open';
    }
    current = null;
  } else if (choice.endZone) {
    current = null;
  } else if (choice.next) {
    current = { zone: storylet.zone, storyletId: choice.next };
  }
  return { progress: { qualities, zones, seen, current }, choice };
}

export function enterZone(progress: Progress, zone: ZoneId, firstId: string): Progress {
  if (progress.zones[zone] === 'locked') return progress;
  return { ...progress, current: { zone, storyletId: firstId } };
}

export function firstIdInZone(cards: Storylet[], zone: ZoneId): string | undefined {
  return cards.find((c) => c.zone === zone)?.id;
}
