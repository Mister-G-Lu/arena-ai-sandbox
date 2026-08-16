import { describe, expect, it, vi } from 'vitest';
import { createActionState } from '../game/actions';
import { createShift } from '../game/shift';
import { createProgress } from '../game/storylets';
import { makeEnvelope } from './saveFile';
import { deleteSave, pullSave, pushSave } from './sync';

const session = { user: { id: 'op-1', email: 'op@meridian.city' } };
const envelope = makeEnvelope({
  progress: createProgress(),
  shift: createShift(),
  actions: createActionState(0),
});

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

describe('sync', () => {
  it('refuses a session without user.id', async () => {
    const client = { from: vi.fn() } as never;
    await expect(pullSave(client, null)).rejects.toThrow(/user.id/);
    await expect(pullSave(client, { user: {} })).rejects.toThrow(/user.id/);
    await expect(pushSave(client, { user: null }, envelope)).rejects.toThrow(/user.id/);
  });

  it('pulls a payload and parses it', async () => {
    const client = {
      from: vi.fn().mockReturnValue(chain({ data: { payload: envelope }, error: null })),
    };
    const pulled = await pullSave(client as never, session);
    expect(pulled?.version).toBe(1);
    expect(client.from).toHaveBeenCalledWith('saves');
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

  it('upserts on push and deletes on terminate', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const delEq = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockImplementation(() => ({
        upsert,
        delete: () => ({ eq: delEq }),
      })),
    };
    await pushSave(client as never, session, envelope);
    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0]?.[0] as { user_id: string };
    expect(arg.user_id).toBe('op-1');
    await deleteSave(client as never, session);
    expect(delEq).toHaveBeenCalledWith('user_id', 'op-1');
  });

  it('throws on push / delete errors', async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        upsert: async () => ({ error: { message: 'nope' } }),
        delete: () => ({ eq: async () => ({ error: { message: 'gone' } }) }),
      }),
    };
    await expect(pushSave(client as never, session, envelope)).rejects.toThrow(/nope/);
    await expect(deleteSave(client as never, session)).rejects.toThrow(/gone/);
  });
});
