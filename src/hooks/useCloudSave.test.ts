import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope, type GameState } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';
import { useCloudSave } from './useCloudSave';

const session = {
  user: { id: 'op-1', email: 'op@meridian.city' },
  access_token: 'token',
};

function mockClient(remote: ReturnType<typeof createStoredSaveEnvelope> | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const listeners: Array<(event: string, next: unknown) => void> = [];
  let pulls = 0;
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      onAuthStateChange: (fn: (event: string, next: unknown) => void) => {
        listeners.push(fn);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            pulls += 1;
            return {
              data: remote ? { payload: remote, updated_at: remote.savedAt } : null,
              error: null,
            };
          },
        }),
      }),
      upsert,
    })),
    __upsert: upsert,
    __pulls: () => pulls,
    __listeners: listeners,
  };
  return client;
}

beforeEach(() => {
  __setSupabaseForTests(null);
});

describe('useCloudSave', () => {
  it('disables cloud cleanly when public configuration is absent', async () => {
    const state = createInitialGameState();
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: false, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(result.current.configured).toBe(false);
  });

  it('creates a remote file when Records is empty', async () => {
    const client = mockClient();
    __setSupabaseForTests(client as never);
    const state = createInitialGameState();
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(client.__upsert).toHaveBeenCalledTimes(1);
    expect(client.__upsert.mock.calls[0]?.[0].payload.version).toBe(2);
  });

  it('restores remote state only when the local terminal is genuinely fresh', async () => {
    const remoteState = createInitialGameState();
    remoteState.day = 4;
    const client = mockClient(
      createStoredSaveEnvelope(remoteState, new Date('2026-08-16T12:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const state = createInitialGameState();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: false, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(replaceState).toHaveBeenCalledWith(expect.objectContaining({ day: 4 }));
    expect(client.__upsert).not.toHaveBeenCalled();
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

  it('debounces and uploads later state changes after initial agreement', async () => {
    const initial = createInitialGameState();
    const client = mockClient(createStoredSaveEnvelope(initial));
    __setSupabaseForTests(client as never);
    const props: { state: GameState } = { state: initial };
    const replaceState = vi.fn();
    const { result, rerender } = renderHook(
      ({ state }) =>
        useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
      { initialProps: props },
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));

    const changed = { ...initial, credits: 99 };
    rerender({ state: changed });
    await waitFor(() => expect(client.__upsert).toHaveBeenCalledTimes(1));
    expect(client.__upsert.mock.calls[0]?.[0].payload.game.credits).toBe(99);
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
