import { qualityDef } from './qualities';

/** Zones that ship content decks in `src/content/<zone>/`. The content loader
 *  validates every configured zone's entries against this list. */
export const ZONE_IDS = ['annex-order', 'routine', 'floor12'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

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

export function validateStoryGraph(
  cards: Storylet[],
  entryPoints: Partial<Record<ZoneId, string>> = {},
): Storylet[] {
  const byId = new Map<string, Storylet>();
  for (const card of cards) {
    if (byId.has(card.id)) throw new SchemaError(`duplicate storylet id: ${card.id}`);
    byId.set(card.id, card);
  }

  for (const card of cards) {
    const choiceIds = new Set<string>();
    for (const choice of card.choices) {
      if (choiceIds.has(choice.id)) {
        throw new SchemaError(`${card.id} has duplicate choice id: ${choice.id}`);
      }
      choiceIds.add(choice.id);

      const transitions = [Boolean(choice.next), choice.endZone === true, choice.completeZone === true]
        .filter(Boolean).length;
      if (transitions !== 1) {
        throw new SchemaError(
          `${card.id}.${choice.id} must declare exactly one of next, endZone, or completeZone`,
        );
      }

      if (choice.next) {
        const target = byId.get(choice.next);
        if (!target) throw new SchemaError(`${card.id}.${choice.id} points to missing ${choice.next}`);
        if (target.zone !== card.zone) {
          throw new SchemaError(
            `${card.id}.${choice.id} crosses from ${card.zone} to ${target.zone}`,
          );
        }
      }

      for (const effect of Object.keys(choice.outcome.qualities ?? {})) {
        if (!qualityDef(effect)) {
          throw new SchemaError(`${card.id}.${choice.id} uses unknown effect: ${effect}`);
        }
      }
    }
  }

  for (const [zone, entryId] of Object.entries(entryPoints)) {
    if (!entryId) continue;
    const entry = byId.get(entryId);
    if (!entry) throw new SchemaError(`${zone} entry points to missing ${entryId}`);
    if (entry.zone !== zone) {
      throw new SchemaError(`${zone} entry ${entryId} belongs to ${entry.zone}`);
    }
  }

  return cards;
}

/** Validation and typing only. Player progress is owned by the live runtime —
 *  GameStateContext applies choices, gameSave.ts persists them. A second
 *  progress engine here would only drift, and it did. */
