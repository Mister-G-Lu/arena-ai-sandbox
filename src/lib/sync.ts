import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUserId } from '../utils/session';
import {
  createStoredSaveEnvelope,
  parseStoredSaveEnvelope,
  type GameState,
  type StoredSaveEnvelope,
} from './gameSave';

export interface CloudSave {
  envelope: StoredSaveEnvelope;
  game: GameState;
  updatedAt: string;
}

export interface PushSaveOptions {
  /**
   * Server revision observed by the caller. null means "create only"; a
   * timestamp means "update only if this exact revision is still current".
   * Omit only for an explicit, user-confirmed overwrite.
   */
  expectedUpdatedAt?: string | null;
  force?: boolean;
}

export interface PushSaveResult {
  updatedAt: string;
}

export class CloudSaveConflictError extends Error {
  constructor(message = 'Records changed on another device.') {
    super(message);
    this.name = 'CloudSaveConflictError';
  }
}

function serverRevision(data: unknown): string {
  if (
    data &&
    typeof data === 'object' &&
    'updated_at' in data &&
    typeof data.updated_at === 'string'
  ) {
    return data.updated_at;
  }
  throw new Error('Records did not return a save revision.');
}

export async function pullSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
): Promise<CloudSave | null> {
  const userId = requireUserId(session);
  const { data, error } = await client
    .from('saves')
    .select('payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const loaded = parseStoredSaveEnvelope(data.payload);
  return {
    envelope: createStoredSaveEnvelope(loaded.game, new Date(loaded.savedAt)),
    game: loaded.game,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : loaded.savedAt,
  };
}

export async function pushSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
  envelope: StoredSaveEnvelope,
  options: PushSaveOptions = { force: true },
): Promise<PushSaveResult> {
  const userId = requireUserId(session);
  // Validate again at the network boundary. Callers cannot upload a partial or
  // future-version object by casting around TypeScript.
  const loaded = parseStoredSaveEnvelope(envelope);
  const payload = createStoredSaveEnvelope(loaded.game, new Date(loaded.savedAt));
  const row = {
    user_id: userId,
    payload,
    // The database trigger replaces this with server time. Supplying a value
    // keeps the migration backwards-compatible before that trigger is applied.
    updated_at: payload.savedAt,
  };

  if (options.force || options.expectedUpdatedAt === undefined) {
    const { data, error } = await client
      .from('saves')
      .upsert(row, { onConflict: 'user_id' })
      .select('updated_at')
      .single();
    if (error) throw new Error(error.message);
    return { updatedAt: serverRevision(data) };
  }

  if (options.expectedUpdatedAt === null) {
    const { data, error } = await client
      .from('saves')
      .insert(row)
      .select('updated_at')
      .single();
    if (error) {
      if (error.code === '23505') throw new CloudSaveConflictError();
      throw new Error(error.message);
    }
    return { updatedAt: serverRevision(data) };
  }

  const { data, error } = await client
    .from('saves')
    .update({ payload, updated_at: payload.savedAt })
    .eq('user_id', userId)
    .eq('updated_at', options.expectedUpdatedAt)
    .select('updated_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new CloudSaveConflictError();
  return { updatedAt: serverRevision(data) };
}

export async function deleteSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
): Promise<void> {
  const userId = requireUserId(session);
  const { error } = await client.from('saves').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}
