import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';
import { useCloudSave } from './useCloudSave';
import { mockClient, mutationQuery, resetSupabaseForTests } from './useCloudSave.testUtils';

describe('useCloudSave — retry & post-import recheck', () => {
  beforeEach(() => {
    resetSupabaseForTests();
  });

  it('retries a failed autosave instead of dropping the operator file', async () => {
    const initial = createInitialGameState();
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0, retryMs: 1_000 }),
      { initialProps: { state: initial } },
    );
    // Local and Records agree; nothing is pushed.
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(client.__update).toHaveBeenCalledTimes(0);

    vi.useFakeTimers();
    try {
      client.__update.mockImplementationOnce(() => mutationQuery(async () => { throw new Error('Records unreachable'); }));
      const changed = { ...initial, credits: 99 };
      rerender({ state: changed });

      await act(async () => { await vi.advanceTimersByTimeAsync(0); }); // debounce fires
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(client.__update).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('error');

      await act(async () => { await vi.advanceTimersByTimeAsync(1_100); }); // retry fires
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(client.__update).toHaveBeenCalledTimes(2);
      expect(client.__update.mock.calls[1]?.[0].payload.game.credits).toBe(99);
      expect(result.current.status).toBe('synced');
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-checks Records after an import instead of silently overwriting them', async () => {
    const local = createInitialGameState();
    local.day = 2;
    const remote = createInitialGameState();
    remote.day = 5;
    const client = mockClient(
      createStoredSaveEnvelope(remote, new Date('2026-08-16T12:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state, recheckToken }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, recheckToken }),
      { initialProps: { state: local, recheckToken: 0 } },
    );
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(client.__upsert).not.toHaveBeenCalled();
    expect(client.__pulls()).toBe(1);

    // Import a file that still differs from Records: the conflict must
    // persist, and nothing may be pushed automatically.
    const imported = { ...local, credits: 500 };
    rerender({ state: imported, recheckToken: 1 });
    await waitFor(() => expect(client.__pulls()).toBe(2));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe('conflict');
    expect(client.__upsert).not.toHaveBeenCalled();

    // Import the Records copy itself: the files now agree, so the terminal
    // syncs without replacing the remote file.
    rerender({ state: remote, recheckToken: 2 });
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(client.__pulls()).toBe(3);
    expect(result.current.conflict).toBeNull();
    expect(client.__upsert).not.toHaveBeenCalled();
  });
});
