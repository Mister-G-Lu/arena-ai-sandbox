import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

let cached: SupabaseClient | null = null;

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export function isSupabaseConfigured(): boolean {
  return cached != null || SUPABASE_CONFIG.enabled;
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  if (!SUPABASE_CONFIG.enabled) {
    throw new SupabaseConfigurationError(
      SUPABASE_CONFIG.error ??
        'Cloud saves are disabled. Configure the two VITE_SUPABASE_* variables.',
    );
  }
  cached = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}

/** Test-only: swap or clear the singleton. */
export function __setSupabaseForTests(client: SupabaseClient | null): void {
  cached = client;
}
