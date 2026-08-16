import { z, ZodError } from 'zod';
import { ACTION_CAP } from '../game/actions';
import { TASKS_PER_SHIFT } from '../game/dispatch';
import { GLITCH_DEFS } from '../game/glitches';
import { CREDIT_LIMIT } from '../game/ledger';
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
/** Matches `saves_payload_max_bytes` in supabase/0003_canonical_saves.sql. */
export const MAX_SAVE_BYTES = 1024 * 1024;

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

const PendingDispatchSchema = z.strictObject({
  id: shortText.min(1),
  day: dayNumber,
  taskNumber: safeInt.min(1).max(TASKS_PER_SHIFT),
  shiftAction: safeInt.min(1).max(ACTION_CAP),
  code: shortText.min(1),
  title: shortText.min(1),
  instruction: storyText.min(1),
  cleanResult: storyText.min(1),
  displayedResult: storyText.min(1),
  isCorrupt: z.boolean(),
});

const glitchIds = Object.keys(GLITCH_DEFS) as [string, ...string[]];
const GlitchIdSchema = z.enum(glitchIds);

/**
 * The one persisted game-state schema. Defaults make additive fields cheap:
 * add the field here once and old saves receive the default automatically.
 * Promotion title/unlocks are derived from PROMOTIONS and are never persisted.
 */
export const StoredGameStateSchema = z.strictObject({
  credits: z.union([
    z.number().finite().min(0).max(CREDIT_LIMIT),
    z.literal(CREDIT_INFINITY),
  ]).default(0),
  ledgerUnbound: z.boolean().default(false),
  components: ComponentsSchema,
  supplies: SuppliesSchema,
  qualities: QualitiesSchema,
  attention: z.number().finite().min(0).max(QUALITY_DEFS.attention.max).default(0),
  day: dayNumber.default(1),
  /**
   * The action tank (src/game/actions.ts) — the pacing currency that replaced
   * the shift quota. `lastTick` is epoch ms; 0 means "anchor on first read",
   * so a fresh file does not accrue fifty actions from the epoch.
   */
  actions: z.number().int().min(0).max(ACTION_CAP).default(ACTION_CAP),
  actionsLastTick: timestamp.default(0),
  /** Dev capability, mirroring `ledgerUnbound`: the tank never depletes. */
  actionsUnbound: z.boolean().default(false),
  /** Latches true the moment a dev tool touches the file. Never clears. */
  devTouched: z.boolean().default(false),
  /**
   * Career total of results filed. This used to be the shift quota counter
   * capped at fifty; it is now an uncapped lifetime stat shown on the operator
   * file, because the tank is what limits a sitting.
   */
  tasksCompleted: safeInt.default(0),
  /** Results filed since the last shift rollover. Drives the anomaly debt. */
  tasksThisShift: safeInt.max(TASKS_PER_SHIFT).default(0),
  /** Actions spent since the last rollover. Drives the 01:00–06:00 clock. */
  actionsSpentThisShift: safeInt.max(ACTION_CAP).default(0),
  anomaliesSeenThisShift: safeInt.max(TASKS_PER_SHIFT).default(0),
  /** A reserved console result survives navigation, reloads, and deploys. */
  pendingDispatch: PendingDispatchSchema.nullable().default(null),
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
}).superRefine((state, ctx) => {
  const infiniteCredits = state.credits === CREDIT_INFINITY;
  if (state.ledgerUnbound !== infiniteCredits) {
    ctx.addIssue({
      code: 'custom',
      path: ['ledgerUnbound'],
      message: 'must match the canonical infinite-credit sentinel',
    });
  }
  if (state.actionsUnbound && !state.devTouched) {
    ctx.addIssue({
      code: 'custom',
      path: ['actionsUnbound'],
      message: 'requires the permanent devTouched audit flag',
    });
  }
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

export function saveByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function assertSaveSize(text: string): void {
  const bytes = saveByteLength(text);
  if (bytes > MAX_SAVE_BYTES) {
    throw new SaveValidationError(
      `Save is ${(bytes / 1024 / 1024).toFixed(2)} MB; the operator-file limit is ` +
      `${MAX_SAVE_BYTES / 1024 / 1024} MB.`,
    );
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
  const envelope: StoredSaveEnvelope = {
    version: GAME_SAVE_VERSION,
    savedAt: now.toISOString(),
    game: encodeGameState(state),
  };
  assertSaveSize(JSON.stringify(envelope));
  return envelope;
}

export function parseStoredSaveEnvelope(raw: unknown): LoadedSaveEnvelope {
  try {
    const serialized = JSON.stringify(raw);
    if (typeof serialized === 'string') assertSaveSize(serialized);
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
  const legacyUnbound = Boolean(
    legacy.ledgerUnbound || legacyCredits || legacy.maxCredits === Infinity || legacy.maxCredits === CREDIT_INFINITY,
  );
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
      credits: legacyUnbound ? Infinity : legacy.credits,
      ledgerUnbound: legacyUnbound,
      orientation: legacyOrientation,
      promotion: legacyPromotion,
    },
    now,
  );
}

export function parseSaveJson(text: string): LoadedSaveEnvelope {
  assertSaveSize(text);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveValidationError('Save is not valid JSON.');
  }
  return parseStoredSaveEnvelope(raw);
}

export function serializeSaveEnvelope(envelope: StoredSaveEnvelope): string {
  // Compact JSON keeps the exported file and the JSON payload sent to Records
  // under the same byte contract. Pretty-print whitespace must not be the
  // difference between a save that works locally and one the database rejects.
  const serialized = `${JSON.stringify(envelope)}\n`;
  assertSaveSize(serialized);
  return serialized;
}

export function gameStateFingerprint(state: GameState | Record<string, unknown>): string {
  return JSON.stringify(encodeGameState(state));
}
