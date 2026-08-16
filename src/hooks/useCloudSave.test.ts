import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope, type GameState } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';
import { useCloudSave } from './useCloudSave';

const session = {
  user: { id: 'op-1', email: 'op@meridian.city' },
  access_token: 'token',
};

const otherSession = {
  user: { id: 'op-2', email: 'other@meridian.city' },
  access_token: 'other-token',
};

function mutationQuery(run: () => Promise<{ data: unknown; error: unknown }>) {
  const query: Record<string, unknown> = {};
  query.eq = vi.fn(() => query);
  query.select = () => query;
  query.single = run;
  query.maybeSingle = run;
  return query;
}

function mockClient(remote: ReturnType<typeof createStoredSaveEnvelope> | null = null) {
  const listeners: Array<(event: string, next: unknown) => void> = [];
  let pulls = 0;
  let writes = 0;
  let remoteEnvelope = remote;
  let updatedAt = remote?.savedAt ?? null;
  const nextRevision = () => `server-revision-${++writes}`;

  const upsert = vi.fn().mockImplementation((row) => mutationQuery(async () => {
    remoteEnvelope = row.payload;
    updatedAt = nextRevision();
    return { data: { updated_at: updatedAt }, error: null };
  }));
  const insert = vi.fn().mockImplementation((row) => mutationQuery(async () => {
    if (remoteEnvelope) {
      return { data: null, error: { code: '23505', message: 'duplicate' } };
    }
    remoteEnvelope = row.payload;
    updatedAt = nextRevision();
    return { data: { updated_at: updatedAt }, error: null };
  }));
  const update = vi.fn().mockImplementation((row) => {
    const filters: unknown[][] = [];
    const query = mutationQuery(async () => {
      const expected = filters.find(([column]) => column === 'updated_at')?.[1];
      if (!remoteEnvelope || expected !== updatedAt) return { data: null, error: null };
      remoteEnvelope = row.payload;
      updatedAt = nextRevision();
      return { data: { updated_at: updatedAt }, error: null };
    });
    query.eq = vi.fn((...args: unknown[]) => {
      filters.push(args);
      return query;
    });
    return query;
  });

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
              data: remoteEnvelope ? { payload: remoteEnvelope, updated_at: updatedAt } : null,
              error: null,
            };
          },
        }),
      }),
      upsert,
      insert,
      update,
    })),
    __upsert: upsert,
    __insert: insert,
    __update: update,
    __pulls: () => pulls,
    __listeners: listeners,
    __setRemote: (next: ReturnType<typeof createStoredSaveEnvelope>) => {
      remoteEnvelope = next;
      updatedAt = nextRevision();
    },
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
    expect(client.__insert).toHaveBeenCalledTimes(1);
    expect(client.__insert.mock.calls[0]?.[0].payload.version).toBe(2);
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
    await waitFor(() => expect(client.__update).toHaveBeenCalledTimes(1));
    expect(client.__update.mock.calls[0]?.[0].payload.game.credits).toBe(99);
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
