import { afterEach, describe, expect, it } from 'vitest';
import {
  SupabaseConfigurationError,
  __setSupabaseForTests,
  getSupabase,
  isSupabaseConfigured,
} from './supabase';

afterEach(() => {
  __setSupabaseForTests(null);
});

describe('getSupabase', () => {
  it('fails closed with a useful message when the build is not configured', () => {
    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabase()).toThrow(SupabaseConfigurationError);
  });

  it('returns an injected singleton client in tests', () => {
    const fake = { auth: {} };
    __setSupabaseForTests(fake as never);
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabase()).toBe(fake);
    expect(getSupabase()).toBe(fake);
  });
});
