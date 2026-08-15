import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let cached: SupabaseClient | null = null;

function testStub(): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      upsert: async () => ({ error: null }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  } as unknown as SupabaseClient;
}

export function getSupabase(): SupabaseClient {
  if (!cached) {
    if (import.meta.env.MODE === 'test') {
      cached = testStub();
    } else {
      cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }
  return cached;
}

/** Test-only: swap or clear the singleton. */
export function __setSupabaseForTests(client: SupabaseClient | null): void {
  cached = client;
}
