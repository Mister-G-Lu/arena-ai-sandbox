import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { identityFrom, type OperatorIdentity } from '../utils/session';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabase();
    let alive = true;
    client.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(err.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const requestToken = useCallback(async (email: string): Promise<boolean> => {
    setError(null);
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

  const signOut = useCallback(async () => {
    setError(null);
    const { error: err } = await getSupabase().auth.signOut();
    if (err) setError(err.message);
    setSession(null);
  }, []);

  const identity: OperatorIdentity | null = identityFrom(session);

  return { session, identity, loading, error, requestToken, signOut };
}
