import { describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope } from './gameSave';
import { deleteSave, pullSave, pushSave } from './sync';

const session = { user: { id: 'op-1', email: 'op@meridian.city' } };
const envelope = createStoredSaveEnvelope(
  createInitialGameState(),
  new Date('2026-08-16T12:00:00Z'),
);

function chain(result: unknown) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = self;
  api.maybeSingle = async () => result;
  api.upsert = async () => result;
  api.delete = self;
  return api;
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

  it('upserts the canonical envelope and deletes by owner', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const delEq = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockImplementation(() => ({
        upsert,
        delete: () => ({ eq: delEq }),
      })),
    };
    await pushSave(client as never, session, envelope);
    const [row, options] = upsert.mock.calls[0] as [
      { user_id: string; payload: typeof envelope; updated_at: string },
      { onConflict: string },
    ];
    expect(row.user_id).toBe('op-1');
    expect(row.payload.version).toBe(2);
    expect(row.updated_at).toBe(envelope.savedAt);
    expect(options).toEqual({ onConflict: 'user_id' });

    await deleteSave(client as never, session);
    expect(delEq).toHaveBeenCalledWith('user_id', 'op-1');
  });

  it('validates before push and surfaces network errors', async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        upsert: async () => ({ error: { message: 'nope' } }),
        delete: () => ({ eq: async () => ({ error: { message: 'gone' } }) }),
      }),
    };
    await expect(pushSave(client as never, session, envelope)).rejects.toThrow(/nope/);
    await expect(pushSave(client as never, session, { ...envelope, version: 1 } as never)).rejects.toThrow(
      /version/,
    );
    await expect(deleteSave(client as never, session)).rejects.toThrow(/gone/);
  });
});
