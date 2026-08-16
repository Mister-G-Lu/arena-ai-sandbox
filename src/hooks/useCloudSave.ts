import { useCallback, useEffect, useRef, useState } from 'react';
import { createStoredSaveEnvelope, gameStateFingerprint, type GameState } from '../lib/gameSave';
import { getSupabase } from '../lib/supabase';
import { pullSave, pushSave, type CloudSave } from '../lib/sync';
import { useAuth } from './useAuth';

export type CloudSaveStatus =
  | 'disabled'
  | 'loading'
  | 'signed-out'
  | 'checking'
  | 'saving'
  | 'synced'
  | 'conflict'
  | 'error';

export interface UseCloudSaveOptions {
  state: GameState;
  hadLocalSaveAtBoot: boolean;
  replaceState: (state: GameState) => void;
  debounceMs?: number;
  /**
   * Bump when a whole new operator file becomes live (file import). The
   * boot-time Records check re-runs with autosave disarmed first, so an
   * import surfaces as a two-copies-disagree prompt instead of silently
   * overwriting Records.
   */
  recheckToken?: number;
  /** How long to wait before re-attempting a push that failed (e.g. offline). */
  retryMs?: number;
}

export function useCloudSave({
  state,
  hadLocalSaveAtBoot,
  replaceState,
  debounceMs = 800,
  recheckToken = 0,
  retryMs = 30_000,
}: UseCloudSaveOptions) {
  const auth = useAuth();
  const [status, setStatus] = useState<CloudSaveStatus>(auth.disabled ? 'disabled' : 'loading');
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CloudSave | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const stateRef = useRef(state);
  const replaceStateRef = useRef(replaceState);
  const authRef = useRef(auth);
  const initialFingerprint = useRef(gameStateFingerprint(state));
  const remoteFingerprint = useRef<string | null>(null);
  const readyToAutosave = useRef(false);
  const requestSequence = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const retryTimer = useRef<number | null>(null);
  stateRef.current = state;
  replaceStateRef.current = replaceState;
  authRef.current = auth;

  const userId = auth.session?.user.id ?? null;

  useEffect(() => {
    const sequence = ++requestSequence.current;
    readyToAutosave.current = false;
    remoteFingerprint.current = null;
    setConflict(null);

    if (auth.disabled) {
      setStatus('disabled');
      setMessage(null);
      return;
    }
    if (auth.loading) {
      setStatus('loading');
      return;
    }
    if (!auth.session || !userId) {
      setStatus('signed-out');
      setMessage(null);
      return;
    }

    setStatus('checking');
    setMessage('Checking Records for an existing operator file…');
    void (async () => {
      try {
        const remote = await pullSave(getSupabase(), auth.session);
        if (requestSequence.current !== sequence) return;
        const localFingerprint = gameStateFingerprint(stateRef.current);
        const localChangedSinceBoot = localFingerprint !== initialFingerprint.current;

        if (!remote) {
          const envelope = createStoredSaveEnvelope(stateRef.current);
          await pushSave(getSupabase(), auth.session, envelope);
          if (requestSequence.current !== sequence) return;
          remoteFingerprint.current = gameStateFingerprint(stateRef.current);
          readyToAutosave.current = true;
          setStatus('synced');
          setMessage('Operator file established in Records.');
          return;
        }

        const remotePrint = gameStateFingerprint(remote.game);
        if (!hadLocalSaveAtBoot && !localChangedSinceBoot) {
          remoteFingerprint.current = remotePrint;
          readyToAutosave.current = true;
          replaceStateRef.current(remote.game);
          setStatus('synced');
          setMessage('Operator file restored from Records.');
          return;
        }

        if (localFingerprint === remotePrint) {
          remoteFingerprint.current = remotePrint;
          readyToAutosave.current = true;
          setStatus('synced');
          setMessage('Local terminal and Records agree.');
          return;
        }

        setConflict(remote);
        setStatus('conflict');
        setMessage('Local terminal and Records contain different files. Choose one before syncing.');
      } catch (error) {
        if (requestSequence.current !== sequence) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Records could not be reached.');
      }
    })();
  }, [auth.disabled, auth.loading, auth.session, hadLocalSaveAtBoot, recheckToken, retryToken, userId]);

  useEffect(() => {
    if (!readyToAutosave.current || !auth.session || !userId || conflict) return;
    const fingerprint = gameStateFingerprint(state);
    if (fingerprint === remoteFingerprint.current) return;

    const attempt = () => {
      if (!authRef.current.session) return; // signed out while queued
      const envelope = createStoredSaveEnvelope(state);
      setStatus('saving');
      setMessage('Filing operator record…');
      saveQueue.current = saveQueue.current
        .then(() => pushSave(getSupabase(), authRef.current.session!, envelope))
        .then(() => {
          // Superseded by a newer change; the newer attempt owns the queue.
          if (gameStateFingerprint(stateRef.current) !== fingerprint) return;
          remoteFingerprint.current = fingerprint;
          setStatus('synced');
          setMessage('Operator file synchronized.');
        })
        .catch((error) => {
          if (gameStateFingerprint(stateRef.current) !== fingerprint) return;
          if (!authRef.current.session) return; // signed out while in flight
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Records could not save the file.');
          // A dropped record is a lost night. Keep trying until the state
          // moves on or the operator signs out — either clears this timer.
          retryTimer.current = window.setTimeout(attempt, retryMs);
        });
    };

    const timer = window.setTimeout(attempt, debounceMs);

    return () => {
      window.clearTimeout(timer);
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [auth.session, conflict, debounceMs, retryMs, state, userId]);

  const requestToken = useCallback(async (email: string) => {
    const ok = await auth.requestToken(email);
    if (ok) setMessage('Sign-in link dispatched. Check your inbox.');
    return ok;
  }, [auth.requestToken]);

  const signOut = useCallback(async () => {
    const ok = await auth.signOut();
    if (ok) {
      readyToAutosave.current = false;
      setConflict(null);
      setStatus('signed-out');
      setMessage('Signed out. This terminal will continue saving locally.');
    }
    return ok;
  }, [auth.signOut]);

  const keepLocal = useCallback(async () => {
    if (!auth.session) return false;
    try {
      setStatus('saving');
      setMessage('Replacing the Records copy with this terminal…');
      const envelope = createStoredSaveEnvelope(stateRef.current);
      await pushSave(getSupabase(), auth.session, envelope);
      remoteFingerprint.current = gameStateFingerprint(stateRef.current);
      readyToAutosave.current = true;
      setConflict(null);
      setStatus('synced');
      setMessage('Records now matches this terminal.');
      return true;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Records could not save the file.');
      return false;
    }
  }, [auth.session]);

  const useCloud = useCallback(() => {
    if (!conflict) return false;
    remoteFingerprint.current = gameStateFingerprint(conflict.game);
    readyToAutosave.current = true;
    replaceStateRef.current(conflict.game);
    setConflict(null);
    setStatus('synced');
    setMessage('This terminal now uses the Records copy.');
    return true;
  }, [conflict]);

  const retry = useCallback(() => setRetryToken((value) => value + 1), []);

  return {
    configured: !auth.disabled,
    identity: auth.identity,
    loading: auth.loading,
    error: auth.error,
    status,
    message,
    conflict,
    requestToken,
    signOut,
    keepLocal,
    useCloud,
    retry,
  };
}
