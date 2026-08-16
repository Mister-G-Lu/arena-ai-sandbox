import { afterEach, describe, expect, it } from 'vitest';
import { __setSupabaseForTests, getSupabase } from './supabase';

afterEach(() => {
  __setSupabaseForTests(null);
});

describe('getSupabase', () => {
  it('returns a singleton client', () => {
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
    expect(a.auth).toBeTruthy();
  });
});
