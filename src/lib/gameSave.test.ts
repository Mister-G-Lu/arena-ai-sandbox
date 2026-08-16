import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS, PROMOTIONS, ZONES } from '../game/progression';
import { QUALITY_DEFS } from '../game/qualities';
import { SUPPLY_DEFS } from '../game/shop';
import {
  CREDIT_INFINITY,
  GAME_SAVE_VERSION,
  SaveValidationError,
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
    expect(loaded.credits).toBe(9000);
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
});
