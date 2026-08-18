import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';
import { useCloudSave } from './useCloudSave';
import { mockClient, mutationQuery, otherSession, resetSupabaseForTests } from './useCloudSave.testUtils';

describe('useCloudSave — revision races & conflict resolution', () => {
  beforeEach(() => {
    resetSupabaseForTests();
  });

  it("heals an in-session revision race caused only by another device's clock", async () => {
    const initial = createInitialGameState();
    initial.credits = 30;
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
      { initialProps: { state: initial } },
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));

    // The other "device" is the same file, a few regen ticks later.
    const drifted = {
      ...initial,
      actions: 40,
      actionsLastTick: initial.actionsLastTick + 5 * 60 * 1000,
    };
    client.__setRemote(createStoredSaveEnvelope(drifted));
    rerender({ state: { ...initial, credits: 31 } });

    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(result.current.conflict).toBeNull();
    // The clock-only race is abandoned, then the next write lands normally.
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('still raises a conflict when non-clock fields genuinely diverge', async () => {
    const initial = createInitialGameState();
    const remote = { ...initial, credits: 999, day: 3 };
    const client = mockClient(createStoredSaveEnvelope(remote));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const local = { ...initial, actions: 20, actionsLastTick: initial.actionsLastTick + 10 };
    const { result } = renderHook(() =>
      useCloudSave({ state: local, hadLocalSaveAtBoot: true, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(result.current.conflict?.game.credits).toBe(999);
  });

  it('stops on a conflict and lets the player choose local or remote', async () => {
    const local = createInitialGameState();
    local.day = 2;
    const remote = createInitialGameState();
    remote.day = 5;
    const client = mockClient(
      createStoredSaveEnvelope(remote, new Date('2026-08-16T12:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state: local, hadLocalSaveAtBoot: true, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(client.__upsert).not.toHaveBeenCalled();

    act(() => {
      expect(result.current.useCloud()).toBe(true);
    });
    expect(replaceState).toHaveBeenCalledWith(expect.objectContaining({ day: 5 }));
    expect(result.current.status).toBe('synced');
  });

  it('can explicitly replace a conflicting remote file with local state', async () => {
    const local = createInitialGameState();
    local.credits = 75;
    const remote = createInitialGameState();
    remote.credits = 10;
    const client = mockClient(createStoredSaveEnvelope(remote));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state: local, hadLocalSaveAtBoot: true, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    await act(async () => {
      expect(await result.current.keepLocal()).toBe(true);
    });
    expect(client.__upsert).toHaveBeenCalledTimes(1);
    expect(client.__upsert.mock.calls[0]?.[0].payload.game.credits).toBe(75);
  });

  it('turns an in-session cross-device race into a visible conflict', async () => {
    const initial = createInitialGameState();
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
      { initialProps: { state: initial } },
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));

    const otherDevice = { ...initial, credits: 400 };
    client.__setRemote(createStoredSaveEnvelope(otherDevice));
    rerender({ state: { ...initial, credits: 99 } });

    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(result.current.conflict?.game.credits).toBe(400);
    expect(client.__update).toHaveBeenCalledTimes(1);
  });

  it('debounces and uploads later state changes after initial agreement', async () => {
    const initial = createInitialGameState();
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const props: { state: ReturnType<typeof createInitialGameState> } = { state: initial };
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
      { initialProps: props },
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));

    const changed = { ...initial, credits: 99 };
    rerender({ state: changed });
    await waitFor(() => expect(client.__update).toHaveBeenCalledTimes(1));
    expect(client.__update.mock.calls[0]?.[0].payload.game.credits).toBe(99);
  });

  it('never drains operator A\'s queued save into operator B\'s session', async () => {
    const initial = createInitialGameState();
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
      { initialProps: { state: initial } },
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));

    let finishFirst!: (value: { data: { updated_at: string }; error: null }) => void;
    const firstPush = new Promise<{ data: { updated_at: string }; error: null }>((resolve) => {
      finishFirst = resolve;
    });
    client.__update.mockImplementationOnce(() => mutationQuery(() => firstPush));

    vi.useFakeTimers();
    try {
      rerender({ state: { ...initial, credits: 1 } });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      await act(async () => { await Promise.resolve(); });
      expect(client.__update).toHaveBeenCalledTimes(1);

      // Queue a newer A save behind the in-flight request, then change the
      // authenticated operator before that second queue entry can execute.
      rerender({ state: { ...initial, credits: 2 } });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      act(() => { client.__listeners[0]?.('SIGNED_IN', otherSession); });

      finishFirst({ data: { updated_at: 'server-revision-finished' }, error: null });
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(client.__update).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
