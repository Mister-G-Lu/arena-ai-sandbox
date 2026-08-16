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
): Promise<void> {
  const userId = requireUserId(session);
  // Validate again at the network boundary. Callers cannot upload a partial or
  // future-version object by casting around TypeScript.
  const loaded = parseStoredSaveEnvelope(envelope);
  const payload = createStoredSaveEnvelope(loaded.game, new Date(loaded.savedAt));
  const { error } = await client.from('saves').upsert(
    {
      user_id: userId,
      payload,
      updated_at: payload.savedAt,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
): Promise<void> {
  const userId = requireUserId(session);
  const { error } = await client.from('saves').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}
