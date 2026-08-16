import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../utils/storage';
import { createProgress } from '../game/storylets';
import { hasLocalFile, readLocalEnvelope, wipeLocalFile, writeLocalEnvelope } from './localFile';
import { makeEnvelope } from './saveFile';
import { createShift } from '../game/shift';
import { createActionState } from '../game/actions';

describe('localFile', () => {
  it('is empty until written', () => {
    expect(hasLocalFile()).toBe(false);
    const env = makeEnvelope({
      progress: createProgress(),
      shift: createShift(),
      actions: createActionState(0, { current: 6 }),
    });
    writeLocalEnvelope(env);
    expect(hasLocalFile()).toBe(true);
    expect(readLocalEnvelope(0).actions.current).toBe(6);
    wipeLocalFile();
    expect(localStorage.getItem(STORAGE_KEYS.progress)).toBeNull();
    expect(hasLocalFile()).toBe(false);
  });
});
