import { describe, expect, it } from 'vitest';
import { CREDIT_LIMIT } from '../game/ledger';
import { COMPONENT_DEFS, PROMOTIONS, ZONES } from '../game/progression';
import { QUALITY_DEFS } from '../game/qualities';
import { SUPPLY_DEFS } from '../game/shop';
import {
  CREDIT_INFINITY,
  GAME_SAVE_VERSION,
  MAX_SAVE_BYTES,
  SaveValidationError,
  clockIndependentFingerprint,
  createInitialGameState,
  createStoredSaveEnvelope,
  encodeGameState,
  gameStateFingerprint,
  migrateLegacyGameState,
  parseSaveJson,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope,
} from './gameSave';

describe('canonical game save', () => {
  it('derives additive defaults from the game data tables', () => {
    const state = createInitialGameState();
    expect(Object.keys(state.components)).toEqual(COMPONENT_DEFS.map(({ id }) => id));
    expect(Object.keys(state.supplies)).toEqual(SUPPLY_DEFS.map(({ id }) => id));
    expect(Object.values(state.supplies)).toEqual(SUPPLY_DEFS.map(() => false));
    expect(Object.keys(state.qualities)).toEqual(
      Object.values(QUALITY_DEFS)
        .filter(({ kind }) => kind === 'quality')
        .map(({ key }) => key),
    );
    expect(Object.keys(state.zones)).toEqual([]);
    expect(state.promotion).toEqual({
      tier: 0,
      title: PROMOTIONS[0].title,
      unlocks: PROMOTIONS[0].unlocks,
    });
  });

  it('round-trips the complete state and encodes infinity safely', () => {
    const state = createInitialGameState();
    state.credits = Infinity;
    state.ledgerUnbound = true;
    state.components.key = true;
    state.supplies.coffee = true;
    state.supplies['bolt-cutters'] = true;
    state.qualities.doubt = 2;
    state.promotion = {
      tier: 2,
      title: PROMOTIONS[2].title,
      unlocks: ['stale-client-value'],
    };
    state.zones.floor12 = 'complete';
    state.logbook.push({ day: 2, text: 'Ink does not forget.', timestamp: 123 });

    const stored = createStoredSaveEnvelope(state, new Date('2026-08-16T12:00:00Z'));
    expect(stored.version).toBe(GAME_SAVE_VERSION);
    expect(stored.game.credits).toBe(CREDIT_INFINITY);
    expect(stored.game.promotion).toEqual({ tier: 2 });

    const loaded = parseSaveJson(serializeSaveEnvelope(stored));
    expect(loaded.game.credits).toBe(Infinity);
    expect(loaded.game.components.key).toBe(true);
    expect(loaded.game.supplies.coffee).toBe(true);
    expect(loaded.game.supplies['bolt-cutters']).toBe(true);
    expect(loaded.game.promotion.title).toBe(PROMOTIONS[2].title);
    expect(loaded.game.promotion.unlocks).toEqual(
      PROMOTIONS.slice(0, 3).flatMap(({ unlocks }) => unlocks),
    );
    expect(loaded.game.logbook[0]?.text).toBe('Ink does not forget.');
  });

  it('round-trips a reserved personal anomaly and defaults old reservations to generic', () => {
    const state = createInitialGameState();
    state.pendingDispatch = {
      id: 'dispatch-2-1',
      day: 2,
      taskNumber: 1,
      shiftAction: 1,
      code: 'S9-RC-041',
      title: 'SECTOR 9 ROLL CALL',
      instruction: 'Open the night channel.',
      cleanResult: 'all clear',
      displayedResult: 'a work order in your handwriting was filed from the night desk',
      isCorrupt: true,
      isPersonal: true,
    };

    const stored = createStoredSaveEnvelope(state, new Date('2026-08-16T12:00:00Z'));
    const loaded = parseSaveJson(serializeSaveEnvelope(stored));
    expect(loaded.game.pendingDispatch?.isPersonal).toBe(true);

    // A reservation written before the flag existed must still parse, with the
    // safe default: the reservation stays corrupt but reads as generic.
    const legacy = createStoredSaveEnvelope(state, new Date('2026-08-16T12:00:00Z'));
    const { isPersonal: _flag, ...withoutFlag } = legacy.game.pendingDispatch ?? {};
    const legacyEnvelope = {
      ...legacy,
      game: { ...legacy.game, pendingDispatch: withoutFlag },
    };
    const migrated = parseStoredSaveEnvelope(legacyEnvelope);
    expect(migrated.game.pendingDispatch?.isPersonal).toBe(false);
    expect(migrated.game.pendingDispatch?.isCorrupt).toBe(true);
  });

  it('rejects unknown top-level and nested keys', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    expect(() => parseStoredSaveEnvelope({ ...envelope, debug: true })).toThrow(SaveValidationError);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, orientation: { ...envelope.game.orientation, debug: true } },
      }),
    ).toThrow(/orientation.*debug/);
  });

  it('rejects impossible numbers, forged derived fields, and unknown inventory', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, tasksThisShift: 51 },
      }),
    ).toThrow(/tasksThisShift/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, anomaliesSeenThisShift: 51 },
      }),
    ).toThrow(/anomaliesSeenThisShift/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, promotion: { tier: 1, title: 'Forged' } },
      }),
    ).toThrow(/promotion.*title/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, components: { ...envelope.game.components, bogus: true } },
      }),
    ).toThrow(/components.*bogus/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, supplies: { ...envelope.game.supplies, bogus: true } },
      }),
    ).toThrow(/supplies.*bogus/);
  });

  it('rejects forged unbound capabilities and balances beyond the ledger word', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    expect(() => parseStoredSaveEnvelope({
      ...envelope,
      game: { ...envelope.game, credits: CREDIT_LIMIT + 1 },
    })).toThrow(/credits/);
    expect(() => parseStoredSaveEnvelope({
      ...envelope,
      game: { ...envelope.game, ledgerUnbound: true },
    })).toThrow(/ledgerUnbound/);
    expect(() => parseStoredSaveEnvelope({
      ...envelope,
      game: { ...envelope.game, credits: CREDIT_INFINITY },
    })).toThrow(/ledgerUnbound/);
    expect(() => parseStoredSaveEnvelope({
      ...envelope,
      game: { ...envelope.game, actionsUnbound: true, devTouched: false },
    })).toThrow(/actionsUnbound.*devTouched/);
  });

  it('rejects unknown zones, glitches, malformed pointers, and oversized text', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, zones: { nowhere: 'open' } },
      }),
    ).toThrow(/zones.*nowhere/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, glitches: ['made-up-glitch'] },
      }),
    ).toThrow(/glitches/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: { ...envelope.game, currentStorylet: { zone: 'nowhere', storyletId: 'x' } },
      }),
    ).toThrow(/currentStorylet.*zone/);
    expect(() =>
      parseStoredSaveEnvelope({
        ...envelope,
        game: {
          ...envelope.game,
          logbook: [{ day: 1, text: 'x'.repeat(20_001), timestamp: 1 }],
        },
      }),
    ).toThrow(/logbook.*0.*text/);
  });

  it('enforces the same one-megabyte contract locally and in Records', () => {
    expect(() => parseSaveJson(' '.repeat(MAX_SAVE_BYTES + 1))).toThrow(/operator-file limit/);

    const state = createInitialGameState();
    state.logbook = Array.from({ length: 60 }, (_, index) => ({
      day: 1,
      text: `${index}:${'x'.repeat(19_990)}`,
      timestamp: index,
    }));
    expect(() => createStoredSaveEnvelope(state)).toThrow(/operator-file limit/);
  });

  it('requires a supported version and a valid timestamp', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    expect(() => parseStoredSaveEnvelope({ ...envelope, version: 999 })).toThrow(/version/);
    expect(() => parseStoredSaveEnvelope({ ...envelope, savedAt: 'Tuesday' })).toThrow(/savedAt/);
    expect(() => parseSaveJson('{')).toThrow(/valid JSON/);
  });

  it('deduplicates bounded identity lists', () => {
    const envelope = createStoredSaveEnvelope(createInitialGameState());
    const loaded = parseStoredSaveEnvelope({
      ...envelope,
      game: {
        ...envelope.game,
        seenStorylets: ['routine-01', 'routine-01'],
        glitches: ['ledger-overflow', 'ledger-overflow'],
      },
    });
    expect(loaded.game.seenStorylets).toEqual(['routine-01']);
    expect(loaded.game.glitches).toEqual(['ledger-overflow']);
  });

  it('migrates the raw v1 state, including old console and Manager saves', () => {
    const migrated = migrateLegacyGameState(
      {
        credits: 9000,
        maxCredits: Infinity,
        day: 3,
        tasksCompleted: 12,
        promotion: { tier: 1, title: 'stale', unlocks: [] },
      },
      new Date('2026-08-16T12:00:00Z'),
    );
    const loaded = parseStoredSaveEnvelope(migrated).game;
    expect(loaded.credits).toBe(Infinity);
    expect(loaded.ledgerUnbound).toBe(true);
    expect(loaded.orientation.completed).toBe(true);
    expect(loaded.orientation.skipped).toBe(true);
    expect(loaded.promotion.title).toBe(PROMOTIONS[1].title);
  });

  it('rejects non-object legacy payloads and runtime junk before writing', () => {
    expect(() => migrateLegacyGameState('not a save')).toThrow(/object/);
    expect(() =>
      encodeGameState({ ...createInitialGameState(), unknownField: true }),
    ).toThrow(/unknownField/);
  });

  it('produces a stable fingerprint independent of derived promotion labels', () => {
    const state = createInitialGameState();
    const changedLabel = {
      ...state,
      promotion: { ...state.promotion, title: 'client-only stale title', unlocks: [] },
    };
    expect(gameStateFingerprint(state)).toBe(gameStateFingerprint(changedLabel));
    expect(ZONES.length).toBeGreaterThan(0);
  });

  it('clock-independent fingerprint: clock drift agrees, real play still differs', () => {
    const saved = createInitialGameState();
    saved.actions = 5;
    saved.actionsLastTick = 1_700_000_000_000;

    // The same file after a night of offline regen: identical in every
    // meaningful field, moved only in the tank's clock arithmetic.
    const nextMorning = {
      ...saved,
      actions: 50,
      actionsLastTick: 1_700_000_600_000,
    };
    expect(gameStateFingerprint(saved)).not.toBe(gameStateFingerprint(nextMorning));
    expect(clockIndependentFingerprint(saved)).toBe(clockIndependentFingerprint(nextMorning));

    // The override flag is a capability, not a clock reading — it must differ.
    const unbound = { ...nextMorning, actionsUnbound: true, devTouched: true };
    expect(clockIndependentFingerprint(saved)).not.toBe(clockIndependentFingerprint(unbound));

    // And a genuine play difference (one filed result) never hides in drift.
    const played = { ...nextMorning, tasksCompleted: 1, actionsSpentThisShift: 1 };
    expect(clockIndependentFingerprint(saved)).not.toBe(clockIndependentFingerprint(played));
  });
});
