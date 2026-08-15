import { describe, expect, it } from 'vitest';
import { createActionState } from '../game/actions';
import { createShift } from '../game/shift';
import { createProgress } from '../game/storylets';
import {
  EnvelopeError,
  makeEnvelope,
  parseEnvelope,
  parseEnvelopeJson,
  serializeEnvelope,
} from './saveFile';

const T0 = 1_700_000_000_000;

function parts() {
  return {
    progress: createProgress(),
    shift: createShift(),
    actions: createActionState(T0, { current: 12 }),
  };
}

describe('save envelope v1', () => {
  it('round-trips through JSON', () => {
    const env = makeEnvelope(parts(), new Date(T0));
    const text = serializeEnvelope(env);
    const back = parseEnvelopeJson(text, T0);
    expect(back.version).toBe(1);
    expect(back.actions.current).toBe(12);
    expect(back.progress.current?.storyletId).toBe('tutorial-01');
    expect(back.shift.day).toBe(4);
    expect(back.exportedAt).toBe(new Date(T0).toISOString());
  });

  it('rejects unknown keys', () => {
    const env = makeEnvelope(parts(), new Date(T0));
    expect(() => parseEnvelope({ ...env, extra: true }, T0)).toThrow(EnvelopeError);
    expect(() => parseEnvelope({ ...env, extra: true }, T0)).toThrow(/unknown key/);
  });

  it('rejects a missing / wrong version', () => {
    const env = makeEnvelope(parts(), new Date(T0));
    expect(() => parseEnvelope({ ...env, version: 2 }, T0)).toThrow(/version/);
    expect(() => parseEnvelope({ ...env, version: undefined }, T0)).toThrow(/version/);
  });

  it('rejects a non-object and bad JSON', () => {
    expect(() => parseEnvelope(null, T0)).toThrow(/object/);
    expect(() => parseEnvelope([], T0)).toThrow(/object/);
    expect(() => parseEnvelopeJson('{', T0)).toThrow(/JSON/);
  });

  it('rejects a bad exportedAt', () => {
    const env = makeEnvelope(parts(), new Date(T0));
    expect(() => parseEnvelope({ ...env, exportedAt: 'Tuesday' }, T0)).toThrow(/exportedAt/);
  });
});
