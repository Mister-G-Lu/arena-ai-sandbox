export interface SupabaseConfig {
  enabled: boolean;
  url: string;
  publishableKey: string;
  error: string | null;
}

export interface PublicEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/**
 * The only Supabase configuration path. Browser builds read Vite variables;
 * tests and tooling can pass an explicit object to this pure parser.
 */
export function parseSupabaseConfig(env: PublicEnv): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  if (!url && !publishableKey) {
    return { enabled: false, url: '', publishableKey: '', error: null };
  }
  if (!url || !publishableKey) {
    return {
      enabled: false,
      url,
      publishableKey,
      error: 'Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  } catch (error) {
    return {
      enabled: false,
      url,
      publishableKey,
      error: error instanceof Error ? error.message : 'Supabase URL is invalid.',
    };
  }

  if (!publishableKey.startsWith('sb_publishable_')) {
    return {
      enabled: false,
      url,
      publishableKey,
      error: 'VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable browser key.',
    };
  }

  return { enabled: true, url, publishableKey, error: null };
}

export const SUPABASE_CONFIG = parseSupabaseConfig(import.meta.env);
