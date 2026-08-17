import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { identityFrom, type OperatorIdentity } from '../utils/session';

export interface AuthState {
  session: Session | null;
  identity: OperatorIdentity | null;
  loading: boolean;
  disabled: boolean;
  error: string | null;
  requestToken: (email: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
}

export function useAuth(): AuthState {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const client = getSupabase();
    let alive = true;
    void client.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(err.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      if (!alive) return;
      setSession(next);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const requestToken = useCallback(async (email: string): Promise<boolean> => {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError('Cloud saves are not configured in this build.');
      return false;
    }
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!isSupabaseConfigured()) {
      setSession(null);
      return true;
    }
    const { error: err } = await getSupabase().auth.signOut();
    if (err) {
      setError(err.message);
      return false;
    }
    setSession(null);
    return true;
  }, []);

  const identity = useMemo(() => identityFrom(session), [session]);

  return {
    session,
    identity,
    loading,
    disabled: !configured,
    error,
    requestToken,
    signOut,
  };
}
