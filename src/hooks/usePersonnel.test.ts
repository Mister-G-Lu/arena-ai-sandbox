import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../utils/storage';
import { createProgress } from '../game/storylets';
import { createShift } from '../game/shift';
import { createActionState } from '../game/actions';
import { writeJson } from '../utils/storage';
import { usePersonnel } from './usePersonnel';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePersonnel', () => {
  it('imports a valid envelope and refuses a bad one', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    const { result } = renderHook(() => usePersonnel());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.onImport('{');
    });
    expect(result.current.status).toMatch(/JSON|refused|envelope/i);

    const good = {
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: createProgress(),
      shift: createShift(),
      actions: createActionState(Date.now(), { current: 9 }),
    };
    act(() => {
      result.current.onImport(JSON.stringify(good));
    });
    expect(reload).toHaveBeenCalled();
  });

  it('exports a logbook download', async () => {
    writeJson(STORAGE_KEYS.progress, createProgress());
    const click = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue('blob:log');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: revoke });
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === 'a') Object.assign(el, { click });
      return el;
    });
    const { result } = renderHook(() => usePersonnel());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.onExport();
    });
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
  });
});
