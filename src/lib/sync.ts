import type { SupabaseClient } from '@supabase/supabase-js';
import { parseEnvelope, type SaveEnvelope } from './saveFile';
import { requireUserId } from '../utils/session';

export async function pullSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
): Promise<SaveEnvelope | null> {
  const userId = requireUserId(session);
  const { data, error } = await client
    .from('saves')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return parseEnvelope(data.payload);
}

export async function pushSave(
  client: SupabaseClient,
  session: { user?: { id?: string } | null } | null,
  envelope: SaveEnvelope,
): Promise<void> {
  const userId = requireUserId(session);
  const { error } = await client.from('saves').upsert(
    {
      user_id: userId,
      payload: envelope,
      updated_at: new Date().toISOString(),
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
