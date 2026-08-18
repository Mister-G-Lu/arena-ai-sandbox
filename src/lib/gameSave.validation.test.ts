import { describe, expect, it } from 'vitest';
import { CREDIT_LIMIT } from '../game/ledger';
import {
  CREDIT_INFINITY,
  MAX_SAVE_BYTES,
  SaveValidationError,
  createInitialGameState,
  createStoredSaveEnvelope,
  encodeGameState,
  migrateLegacyGameState,
  parseSaveJson,
  parseStoredSaveEnvelope,
} from './gameSave';

/** Rejection paths: forged fields, unknown keys, malformed pointers, and the
 * byte cap the validator enforces. */
describe('canonical game save — validation & rejection', () => {
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

  it('enforces the one-megabyte read cap on imported bytes', () => {
    expect(() => parseSaveJson(' '.repeat(MAX_SAVE_BYTES + 1))).toThrow(/operator-file limit/);
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

  it('rejects non-object legacy payloads and runtime junk before writing', () => {
    expect(() => migrateLegacyGameState('not a save')).toThrow(/object/);
    expect(() =>
      encodeGameState({ ...createInitialGameState(), unknownField: true }),
    ).toThrow(/unknownField/);
  });
});
