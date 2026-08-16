import { z, ZodError } from 'zod';
import { TASKS_PER_SHIFT } from '../game/dispatch';
import { GLITCH_DEFS } from '../game/glitches';
import {
  COMPONENT_DEFS,
  PROMOTIONS,
  ZONES,
  unlocksThrough,
} from '../game/progression';
import { QUALITY_DEFS } from '../game/qualities';
import { SUPPLY_DEFS } from '../game/shop';

export const GAME_SAVE_VERSION = 2 as const;
export const CREDIT_INFINITY = '__INFINITY__' as const;
export const GAME_SAVE_KEY = 'fr:game-save:v2';
export const GAME_SAVE_BACKUP_KEY = 'fr:game-save:backup:v2';
export const GAME_SAVE_RECOVERY_KEY = 'fr:game-save:recovery';
export const LEGACY_GAME_SAVE_KEY = 'fr:player-progress:v1';

const shortText = z.string().max(500);
const storyText = z.string().max(20_000);
const safeInt = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const dayNumber = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const timestamp = z.number().finite().min(0);

const componentShape = Object.fromEntries(
  COMPONENT_DEFS.map(({ id }) => [id, z.boolean().default(false)]),
);
const supplyShape = Object.fromEntries(
  SUPPLY_DEFS.map(({ id }) => [id, z.boolean().default(false)]),
);
const qualityShape = Object.fromEntries(
  Object.values(QUALITY_DEFS)
    .filter(({ kind }) => kind === 'quality')
    .map((def) => [def.key, z.number().finite().min(0).max(def.max).default(0)]),
);
const zoneShape = Object.fromEntries(
  ZONES.map(({ id }) => [id, z.enum(['open', 'complete']).optional()]),
);

const ComponentsSchema = z.strictObject(componentShape).default(
  Object.fromEntries(COMPONENT_DEFS.map(({ id }) => [id, false])),
);
const SuppliesSchema = z.strictObject(supplyShape).default(
  Object.fromEntries(SUPPLY_DEFS.map(({ id }) => [id, false])),
);
const QualitiesSchema = z.strictObject(qualityShape).default(
  Object.fromEntries(
    Object.values(QUALITY_DEFS)
      .filter(({ kind }) => kind === 'quality')
      .map(({ key }) => [key, 0]),
  ),
);
const ZonesSchema = z.strictObject(zoneShape).default({});

const OrientationSchema = z.strictObject({
  completed: z.boolean().default(false),
  skipped: z.boolean().default(false),
  taskRecorded: z.boolean().default(false),
}).default({ completed: false, skipped: false, taskRecorded: false });

const StoryletPointerSchema = z.strictObject({
  zone: z.enum(ZONES.map(({ id }) => id) as [string, ...string[]]),
  storyletId: shortText.min(1),
});

const JournalEntrySchema = z.strictObject({
  day: dayNumber,
  text: storyText,
  timestamp,
});

const ContactSchema = z.strictObject({
  name: shortText.min(1),
  role: shortText.default('Unknown'),
  firstMet: dayNumber,
  interactions: safeInt.min(1),
});

const glitchIds = Object.keys(GLITCH_DEFS) as [string, ...string[]];
const GlitchIdSchema = z.enum(glitchIds);

/**
 * The one persisted game-state schema. Defaults make additive fields cheap:
 * add the field here once and old saves receive the default automatically.
 * Promotion title/unlocks are derived from PROMOTIONS and are never persisted.
 */
export const StoredGameStateSchema = z.strictObject({
  credits: z.union([z.number().finite().min(0), z.literal(CREDIT_INFINITY)]).default(0),
  ledgerUnbound: z.boolean().default(false),
  components: ComponentsSchema,
  supplies: SuppliesSchema,
  qualities: QualitiesSchema,
  attention: z.number().finite().min(0).max(QUALITY_DEFS.attention.max).default(0),
  day: dayNumber.default(1),
  tasksCompleted: z.number().int().min(0).max(TASKS_PER_SHIFT).default(0),
  anomaliesSeenThisShift: safeInt.max(TASKS_PER_SHIFT).default(0),
  discrepanciesLogged: safeInt.default(0),
  deaths: safeInt.default(0),
  orientation: OrientationSchema,
  promotion: z.strictObject({
    tier: z.number().int().min(0).max(PROMOTIONS.length - 1).default(0),
  }).default({ tier: 0 }),
  zones: ZonesSchema,
  seenStorylets: z.array(shortText.min(1)).max(10_000).default([])
    .transform((items) => [...new Set(items)]),
  currentStorylet: StoryletPointerSchema.nullable().default(null),
  glitches: z.array(GlitchIdSchema).max(100).default([])
    .transform((items) => [...new Set(items)])
    .pipe(z.array(GlitchIdSchema).max(glitchIds.length)),
  logbook: z.array(JournalEntrySchema).max(5_000).default([]),
  discoveries: z.array(JournalEntrySchema).max(5_000).default([]),
  contacts: z.array(ContactSchema).max(1_000).default([]),
});

export const StoredSaveEnvelopeSchema = z.strictObject({
  version: z.literal(GAME_SAVE_VERSION),
  savedAt: z.string().datetime({ offset: true }),
  game: StoredGameStateSchema,
});

export type StoredGameState = z.infer<typeof StoredGameStateSchema>;
export type StoredSaveEnvelope = z.infer<typeof StoredSaveEnvelopeSchema>;
export type GameState = Omit<StoredGameState, 'credits' | 'promotion'> & {
  credits: number;
  promotion: { tier: number; title: string; unlocks: string[] };
};
export interface LoadedSaveEnvelope {
  version: typeof GAME_SAVE_VERSION;
  savedAt: string;
  game: GameState;
}

export class SaveValidationError extends Error {
  issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'SaveValidationError';
    this.issues = issues;
  }
}

function errorFromZod(error: ZodError): SaveValidationError {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'save';
    return `${path}: ${issue.message}`;
  });
  return new SaveValidationError(`Save validation failed: ${issues.join('; ')}`, issues);
}

function decodeGameState(stored: StoredGameState): GameState {
  const tier = stored.promotion.tier;
  const promotion = PROMOTIONS[tier] ?? PROMOTIONS[0];
  return {
    ...stored,
    credits: stored.credits === CREDIT_INFINITY ? Infinity : stored.credits,
    ledgerUnbound: stored.ledgerUnbound || stored.credits === CREDIT_INFINITY,
    promotion: {
      tier,
      title: promotion.title,
      unlocks: unlocksThrough(tier),
    },
  };
}

export function createInitialGameState(): GameState {
  return decodeGameState(StoredGameStateSchema.parse({}));
}

export function encodeGameState(state: GameState | Record<string, unknown>): StoredGameState {
  const candidate = {
    ...state,
    credits: state.credits === Infinity ? CREDIT_INFINITY : state.credits,
    promotion: {
      tier:
        typeof state.promotion === 'object' && state.promotion !== null && 'tier' in state.promotion
          ? state.promotion.tier
          : 0,
    },
  };
  try {
    return StoredGameStateSchema.parse(candidate);
  } catch (error) {
    if (error instanceof ZodError) throw errorFromZod(error);
    throw error;
  }
}

export function createStoredSaveEnvelope(
  state: GameState | Record<string, unknown>,
  now = new Date(),
): StoredSaveEnvelope {
  return {
    version: GAME_SAVE_VERSION,
    savedAt: now.toISOString(),
    game: encodeGameState(state),
  };
}

export function parseStoredSaveEnvelope(raw: unknown): LoadedSaveEnvelope {
  try {
    const stored = StoredSaveEnvelopeSchema.parse(raw);
    return { ...stored, game: decodeGameState(stored.game) };
  } catch (error) {
    if (error instanceof ZodError) throw errorFromZod(error);
    throw error;
  }
}

/** Migrate the raw v1 GameStateContext payload into the canonical envelope. */
export function migrateLegacyGameState(raw: unknown, now = new Date()): StoredSaveEnvelope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SaveValidationError('Legacy save must be an object.');
  }
  const legacy = raw as Record<string, unknown>;
  const { maxCredits: _retiredCap, ...candidate } = legacy;
  const legacyCredits = legacy.credits === Infinity || legacy.credits === CREDIT_INFINITY;
  const legacyPromotion =
    legacy.promotion && typeof legacy.promotion === 'object' && !Array.isArray(legacy.promotion)
      ? { tier: (legacy.promotion as Record<string, unknown>).tier }
      : undefined;
  const hasLegacyConsoleProgress =
    legacy.orientation == null &&
    (Number(legacy.tasksCompleted) > 0 || Number(legacy.day) > 1);
  const legacyOrientation = hasLegacyConsoleProgress
    ? { completed: true, skipped: true, taskRecorded: false }
    : legacy.orientation;
  return createStoredSaveEnvelope(
    {
      ...candidate,
      credits: legacyCredits ? Infinity : legacy.credits,
      ledgerUnbound: Boolean(legacy.ledgerUnbound || legacyCredits || legacy.maxCredits === Infinity),
      orientation: legacyOrientation,
      promotion: legacyPromotion,
    },
    now,
  );
}

export function parseSaveJson(text: string): LoadedSaveEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveValidationError('Save is not valid JSON.');
  }
  return parseStoredSaveEnvelope(raw);
}

export function serializeSaveEnvelope(envelope: StoredSaveEnvelope): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function gameStateFingerprint(state: GameState | Record<string, unknown>): string {
  return JSON.stringify(encodeGameState(state));
}
