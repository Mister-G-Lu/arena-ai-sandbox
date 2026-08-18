import { vi } from 'vitest';
import { createStoredSaveEnvelope } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';

export const session = {
  user: { id: 'op-1', email: 'op@meridian.city' },
  access_token: 'token',
};

export const otherSession = {
  user: { id: 'op-2', email: 'other@meridian.city' },
  access_token: 'other-token',
};

export function mutationQuery(run: () => Promise<{ data: unknown; error: unknown }>) {
  const query: Record<string, unknown> = {};
  query.eq = vi.fn(() => query);
  query.select = () => query;
  query.single = run;
  query.maybeSingle = run;
  return query;
}

/** Build a fake Supabase client that stores one remote envelope in memory and
 * mimics the upsert/insert/update path the sync layer depends on. */
export function mockClient(remote: ReturnType<typeof createStoredSaveEnvelope> | null = null) {
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

/** Reset the Supabase module-level test hook before each test. */
export function resetSupabaseForTests() {
  __setSupabaseForTests(null);
}
