import { useCallback, useEffect, useState } from 'react';
import { envelopesDiffer, mergeEnvelopes } from '../lib/merge';
import {
  hasLocalFile,
  readLocalEnvelope,
  wipeLocalFile,
  writeLocalEnvelope,
} from '../lib/localFile';
import { parseEnvelopeJson, type SaveEnvelope } from '../lib/saveFile';
import { getSupabase } from '../lib/supabase';
import { deleteSave, pullSave, pushSave } from '../lib/sync';
import { useAuth } from './useAuth';

export function usePersonnel() {
  const auth = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [conflict, setConflict] = useState<'none' | 'pending'>('none');
  const [cloud, setCloud] = useState<SaveEnvelope | null>(null);
  const [file, setFile] = useState<SaveEnvelope | null>(() =>
    hasLocalFile() ? readLocalEnvelope() : null,
  );

  useEffect(() => {
    if (!auth.session || !auth.identity) return;
    let alive = true;
    void (async () => {
      try {
        const remote = await pullSave(getSupabase(), auth.session);
        if (!alive) return;
        setCloud(remote);
        const localExists = hasLocalFile();
        if (remote && localExists) {
          const local = readLocalEnvelope();
          if (envelopesDiffer(local, remote)) {
            setConflict('pending');
            setFile(local);
            return;
          }
        }
        if (remote && !localExists) {
          writeLocalEnvelope(remote);
          setFile(remote);
          setStatus('Records restored. The logbook remembers.');
          window.location.reload();
          return;
        }
        if (!remote && localExists) {
          const local = readLocalEnvelope();
          await pushSave(getSupabase(), auth.session, local);
          setFile(local);
          setStatus('Logbook filed with Records.');
        }
      } catch (err) {
        if (alive) setStatus(err instanceof Error ? err.message : 'Records unreachable.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.session, auth.identity]);

  const requestToken = useCallback(
    async (email: string) => {
      const ok = await auth.requestToken(email);
      if (ok) setStatus('Token dispatched. Check the inbox the city assigned you.');
      return ok;
    },
    [auth],
  );

  const applyAndReload = useCallback((env: SaveEnvelope, alsoPush: boolean) => {
    writeLocalEnvelope(env);
    setFile(env);
    if (alsoPush && auth.session) {
      void pushSave(getSupabase(), auth.session, env).catch(() => undefined);
    }
    window.location.reload();
  }, [auth.session]);

  const onKeepLocal = useCallback(() => {
    applyAndReload(readLocalEnvelope(), true);
  }, [applyAndReload]);

  const onTakeRecords = useCallback(() => {
    if (cloud) applyAndReload(cloud, false);
  }, [applyAndReload, cloud]);

  const onMerge = useCallback(() => {
    if (!cloud) return;
    const merged = mergeEnvelopes(readLocalEnvelope(), cloud, Date.now());
    applyAndReload(merged, true);
  }, [applyAndReload, cloud]);

  const onExport = useCallback(() => {
    const env = readLocalEnvelope();
    const blob = new Blob([`${JSON.stringify(env, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'false-reality-logbook.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const onImport = useCallback((text: string) => {
    try {
      const env = parseEnvelopeJson(text);
      writeLocalEnvelope(env);
      setFile(env);
      setStatus('Logbook imported.');
      window.location.reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import refused.');
    }
  }, []);

  const onTerminate = useCallback(async () => {
    try {
      if (auth.session) await deleteSave(getSupabase(), auth.session);
    } catch {
      /* still wipe local */
    }
    wipeLocalFile();
    setFile(null);
    await auth.signOut();
    setStatus('Terminated. The roster has a gap. For a moment.');
  }, [auth]);

  return {
    identity: auth.identity,
    loading: auth.loading,
    error: auth.error,
    status,
    conflict,
    file,
    requestToken,
    signOut: auth.signOut,
    onKeepLocal,
    onTakeRecords,
    onMerge,
    onExport,
    onImport,
    onTerminate,
  };
}
