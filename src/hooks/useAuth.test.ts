import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __setSupabaseForTests } from '../lib/supabase';
import { useAuth } from './useAuth';

const fakeSession = {
  user: { id: 'op-1', email: 'op@meridian.city' },
  access_token: 'tok',
};

function mockClient(opts: {
  session?: typeof fakeSession | null;
  getError?: string;
  otpError?: string;
  signOutError?: string;
}) {
  const listeners: Array<(e: string, s: unknown) => void> = [];
  return {
    auth: {
      getSession: async () => ({
        data: { session: opts.session ?? null },
        error: opts.getError ? { message: opts.getError } : null,
      }),
      onAuthStateChange: (fn: (e: string, s: unknown) => void) => {
        listeners.push(fn);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithOtp: async () => ({
        error: opts.otpError ? { message: opts.otpError } : null,
      }),
      signOut: async () => ({
        error: opts.signOutError ? { message: opts.signOutError } : null,
      }),
      __listeners: listeners,
    },
  };
}

beforeEach(() => {
  __setSupabaseForTests(null);
});

describe('useAuth', () => {
  it('loads a session that has user.id', async () => {
    __setSupabaseForTests(mockClient({ session: fakeSession }) as never);
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.identity?.id).toBe('op-1');
    expect(result.current.session?.user.id).toBe('op-1');
  });

  it('requestToken posts a magic link and surfaces errors', async () => {
    const client = mockClient({});
    __setSupabaseForTests(client as never);
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });
    let ok = false;
    await act(async () => {
      ok = await result.current.requestToken('op@meridian.city');
    });
    expect(ok).toBe(true);

    __setSupabaseForTests(mockClient({ otpError: 'rate' }) as never);
    const again = renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });
    let failed = true;
    await act(async () => {
      failed = await again.result.current.requestToken('op@meridian.city');
    });
    expect(failed).toBe(false);
    expect(again.result.current.error).toBe('rate');
  });

  it('signOut clears the session', async () => {
    __setSupabaseForTests(mockClient({ session: fakeSession }) as never);
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.session).toBeNull();
    expect(result.current.identity).toBeNull();
  });
});
