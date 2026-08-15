import { describe, expect, it } from 'vitest';
import { SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF, SUPABASE_URL } from './config';

describe('supabase config', () => {
  it('points at the Meridian project with the publishable key', () => {
    expect(SUPABASE_PROJECT_REF).toBe('ltawgurvhffikilulyfj');
    expect(SUPABASE_URL).toContain(SUPABASE_PROJECT_REF);
    expect(SUPABASE_ANON_KEY.startsWith('sb_publishable_')).toBe(true);
  });
});
