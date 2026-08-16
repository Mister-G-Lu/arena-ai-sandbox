import { describe, expect, it } from 'vitest';
import { parseSupabaseConfig } from './config';

describe('Supabase public configuration', () => {
  it('is disabled cleanly when no variables are present', () => {
    expect(parseSupabaseConfig({})).toEqual({
      enabled: false,
      url: '',
      publishableKey: '',
      error: null,
    });
  });

  it('accepts the one documented URL + publishable-key pair', () => {
    const config = parseSupabaseConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    });
    expect(config.enabled).toBe(true);
    expect(config.error).toBeNull();
  });

  it('rejects partial, insecure, and secret-key-shaped configuration', () => {
    expect(parseSupabaseConfig({ VITE_SUPABASE_URL: 'https://project.supabase.co' }).error).toMatch(
      /both/,
    );
    expect(
      parseSupabaseConfig({
        VITE_SUPABASE_URL: 'http://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      }).error,
    ).toMatch(/HTTPS/);
    expect(
      parseSupabaseConfig({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never-in-a-browser',
      }).error,
    ).toMatch(/publishable/);
  });
});
