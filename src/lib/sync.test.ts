import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope } from './gameSave';
import {
  CloudSaveConflictError,
  deleteSave,
  pullSave,
  pushSave,
} from './sync';

const session = { user: { id: 'op-1', email: 'op@meridian.city' } };
const envelope = createStoredSaveEnvelope(
  createInitialGameState(),
  new Date('2026-08-16T12:00:00Z'),
);

function chain(result: unknown) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = vi.fn(self);
  api.maybeSingle = async () => result;
  api.single = async () => result;
  api.delete = self;
  return api;
}

function mutation(result: unknown) {
  return chain(result);
}

describe('canonical cloud save sync', () => {
  it('refuses a session without user.id', async () => {
    const client = { from: vi.fn() } as never;
    await expect(pullSave(client, null)).rejects.toThrow(/user.id/);
    await expect(pullSave(client, { user: {} })).rejects.toThrow(/user.id/);
    await expect(pushSave(client, { user: null }, envelope)).rejects.toThrow(/user.id/);
  });

  it('pulls and validates the complete canonical payload', async () => {
    const client = {
      from: vi.fn().mockReturnValue(
        chain({ data: { payload: envelope, updated_at: envelope.savedAt }, error: null }),
      ),
    };
    const pulled = await pullSave(client as never, session);
    expect(pulled?.envelope.version).toBe(2);
    expect(pulled?.game.components).toHaveProperty('key');
    expect(pulled?.updatedAt).toBe(envelope.savedAt);
    expect(client.from).toHaveBeenCalledWith('saves');
  });

  it('rejects malformed or obsolete cloud payloads', async () => {
    const client = {
      from: vi.fn().mockReturnValue(
        chain({ data: { payload: { version: 1 }, updated_at: null }, error: null }),
      ),
    };
    await expect(pullSave(client as never, session)).rejects.toThrow(/validation/i);
  });

  it('returns null when Records has no file', async () => {
    const client = {
      from: vi.fn().mockReturnValue(chain({ data: null, error: null })),
    };
    expect(await pullSave(client as never, session)).toBeNull();
  });

  it('throws on a pull error', async () => {
    const client = {
      from: vi.fn().mockReturnValue(chain({ data: null, error: { message: 'rls' } })),
    };
    await expect(pullSave(client as never, session)).rejects.toThrow(/rls/);
  });

  it('force-overwrites only after explicit confirmation and returns the server revision', async () => {
    const upsert = vi.fn().mockReturnValue(
      mutation({ data: { updated_at: 'server-revision-2' }, error: null }),
    );
    const client = { from: vi.fn().mockReturnValue({ upsert }) };

    const result = await pushSave(client as never, session, envelope, { force: true });
    const [row, options] = upsert.mock.calls[0] as [
      { user_id: string; payload: typeof envelope; updated_at: string },
      { onConflict: string },
    ];
    expect(row.user_id).toBe('op-1');
    expect(row.payload.version).toBe(2);
    expect(options).toEqual({ onConflict: 'user_id' });
    expect(result.updatedAt).toBe('server-revision-2');
  });

  it('creates a missing row without turning a concurrent insert into an overwrite', async () => {
    const insert = vi.fn().mockReturnValue(
      mutation({ data: null, error: { code: '23505', message: 'duplicate' } }),
    );
    const client = { from: vi.fn().mockReturnValue({ insert }) };

    await expect(
      pushSave(client as never, session, envelope, { expectedUpdatedAt: null }),
    ).rejects.toBeInstanceOf(CloudSaveConflictError);
  });

  it('compares the observed server revision before updating', async () => {
    const updateQuery = chain({ data: { updated_at: 'server-revision-3' }, error: null });
    const update = vi.fn().mockReturnValue(updateQuery);
    const client = { from: vi.fn().mockReturnValue({ update }) };

    const result = await pushSave(client as never, session, envelope, {
      expectedUpdatedAt: 'server-revision-2',
    });
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'user_id', 'op-1');
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'updated_at', 'server-revision-2');
    expect(result.updatedAt).toBe('server-revision-3');
  });

  it('reports a conflict when the observed revision lost the race', async () => {
    const update = vi.fn().mockReturnValue(chain({ data: null, error: null }));
    const client = { from: vi.fn().mockReturnValue({ update }) };
    await expect(
      pushSave(client as never, session, envelope, { expectedUpdatedAt: 'stale' }),
    ).rejects.toBeInstanceOf(CloudSaveConflictError);
  });

  it('deletes by owner and surfaces validation and network errors', async () => {
    const delEq = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockReturnValue(
      mutation({ data: null, error: { message: 'nope' } }),
    );
    const client = {
      from: vi.fn().mockReturnValue({
        upsert,
        delete: () => ({ eq: delEq }),
      }),
    };
    await expect(pushSave(client as never, session, envelope, { force: true })).rejects.toThrow(/nope/);
    await expect(pushSave(client as never, session, { ...envelope, version: 1 } as never)).rejects.toThrow(
      /version/,
    );

    await deleteSave(client as never, session);
    expect(delEq).toHaveBeenCalledWith('user_id', 'op-1');
  });
});
