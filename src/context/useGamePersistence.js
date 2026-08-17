import { useCallback, useEffect, useRef, useState } from 'react';
import { accrue } from '../game/actions';
import { detectDevMode } from '../lib/devMode';
import {
  GAME_SAVE_KEY,
  createInitialGameState,
  createStoredSaveEnvelope,
  gameStateFingerprint,
  parseSaveJson,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope,
} from '../lib/gameSave';
import { clearLocalGameSave, loadLocalGameSave, writeLocalGameSave } from '../lib/localGameSave';
import { useCloudSave } from '../hooks/useCloudSave';
import {
  commitTank,
  hydrateActionTank,
  tankOf,
} from './gameStateUtils';

export function useGamePersistence() {
  const [boot] = useState(() => loadLocalGameSave());
  const [state, setState] = useState(() => hydrateActionTank(boot.state));
  const [devMode] = useState(() => detectDevMode());
  const [persistence, setPersistence] = useState(() => ({
    status: boot.error ? 'recovered' : boot.migrated ? 'migrating' : 'ready',
    error: null,
    recoveryError: boot.error,
    lastSavedAt: boot.envelope?.savedAt ?? null,
    hadLocalSaveAtBoot: boot.hadLocalSave,
    tabConflict: null,
    remoteReset: false,
  }));
  const firstPersistence = useRef(true);
  const stateRef = useRef(state);
  const localWritesBlocked = useRef(false);
  const skipNextPersistence = useRef(false);
  stateRef.current = state;
  const [cloudRecheck, setCloudRecheck] = useState(0);

  // --- Ref-based action tank (avoids per-second re-renders) ---
  // The action count only changes when the user spends one or when regeneration
  // crosses a whole-number boundary (~every 10 minutes). We track that count
  // and only bump a render-triggering counter when it actually changes.
  const lastRenderedActions = useRef(state.actions);
  const [actionTick, setActionTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        const result = accrue(tankOf(prev), now);
        if (result.gained === 0 && result.lastTick === prev.actionsLastTick) return prev;
        return commitTank(prev, result);
      });
      // Trigger a re-render only when the action count actually changed.
      const current = stateRef.current;
      const live = accrue(tankOf(current), Date.now());
      if (live.actions !== lastRenderedActions.current) {
        lastRenderedActions.current = live.actions;
        setActionTick((n) => n + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Also tick when state changes (user spent an action, etc.)
  useEffect(() => {
    if (state.actions !== lastRenderedActions.current) {
      lastRenderedActions.current = state.actions;
      setActionTick((n) => n + 1);
    }
  }, [state.actions]);

  // --- Cross-tab conflict detection ---
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== GAME_SAVE_KEY) return;
      if (event.newValue == null) {
        localWritesBlocked.current = true;
        setPersistence((prev) => ({
          ...prev,
          status: 'conflict',
          error:
            "Another tab erased this operator file. Local saving is paused — keep this tab's copy to continue it here.",
          tabConflict: null,
          remoteReset: true,
        }));
        return;
      }
      try {
        const incoming = parseSaveJson(event.newValue);
        if (gameStateFingerprint(incoming.game) === gameStateFingerprint(stateRef.current)) {
          setPersistence((prev) => ({ ...prev, lastSavedAt: incoming.savedAt }));
          return;
        }
        localWritesBlocked.current = true;
        setPersistence((prev) => ({
          ...prev,
          status: 'conflict',
          error: 'Another tab changed this operator file. Choose a terminal before local saving continues.',
          tabConflict: incoming,
          remoteReset: false,
        }));
      } catch (error) {
        localWritesBlocked.current = true;
        setPersistence((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Another tab wrote an invalid operator file.',
        }));
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // --- Local persistence ---
  useEffect(() => {
    if (firstPersistence.current) {
      firstPersistence.current = false;
      if (boot.envelope && !boot.migrated) return;
    }
    if (skipNextPersistence.current) {
      skipNextPersistence.current = false;
      return;
    }
    if (localWritesBlocked.current) return;
    const result = writeLocalGameSave(state);
    if (result.ok) {
      setPersistence((prev) => ({
        ...prev,
        status: prev.recoveryError ? 'recovered' : 'saved',
        error: null,
        lastSavedAt: result.envelope.savedAt,
      }));
    } else {
      setPersistence((prev) => ({ ...prev, status: 'error', error: result.error }));
    }
  }, [boot.envelope, boot.migrated, state]);

  // --- Stable action callbacks (never change after mount) ---

  const replaceGameState = useCallback((nextState) => {
    const envelope = createStoredSaveEnvelope(nextState);
    setState(hydrateActionTank(parseStoredSaveEnvelope(envelope).game));
  }, []);

  const importGameSave = useCallback((text) => {
    const loaded = parseSaveJson(text);
    localWritesBlocked.current = false;
    setPersistence((prev) => ({
      ...prev,
      status: 'ready',
      error: null,
      tabConflict: null,
    }));
    setState(hydrateActionTank(loaded.game));
    setCloudRecheck((n) => n + 1);
    return loaded.game;
  }, []);

  const exportGameSave = useCallback(
    () => serializeSaveEnvelope(createStoredSaveEnvelope(stateRef.current)),
    [],
  );

  const useOtherTabSave = useCallback(() => {
    const incoming = persistence.tabConflict;
    if (!incoming) return false;
    localWritesBlocked.current = false;
    skipNextPersistence.current = true;
    setState(hydrateActionTank(incoming.game));
    setPersistence((prev) => ({
      ...prev,
      status: 'ready',
      error: null,
      lastSavedAt: incoming.savedAt,
      tabConflict: null,
      remoteReset: false,
    }));
    setCloudRecheck((value) => value + 1);
    return true;
  }, [persistence.tabConflict]);

  const keepThisTabSave = useCallback(() => {
    if (!persistence.tabConflict && !persistence.remoteReset) return false;
    localWritesBlocked.current = false;
    const result = writeLocalGameSave(stateRef.current);
    if (!result.ok) {
      localWritesBlocked.current = true;
      setPersistence((prev) => ({ ...prev, status: 'error', error: result.error }));
      return false;
    }
    setPersistence((prev) => ({
      ...prev,
      status: 'saved',
      error: null,
      lastSavedAt: result.envelope.savedAt,
      tabConflict: null,
      remoteReset: false,
    }));
    return true;
  }, [persistence.tabConflict, persistence.remoteReset]);

  const cloud = useCloudSave({
    state,
    hadLocalSaveAtBoot: persistence.hadLocalSaveAtBoot,
    replaceState: replaceGameState,
    recheckToken: cloudRecheck,
  });



  const resetGame = useCallback(() => {
    localWritesBlocked.current = false;
    setPersistence((prev) => ({
      ...prev,
      status: 'ready',
      error: null,
      tabConflict: null,
      remoteReset: false,
    }));
    clearLocalGameSave();
    setState(hydrateActionTank(createInitialGameState()));
    setCloudRecheck((value) => value + 1);
  }, []);

  return {
    state,
    setState,
    persistence,
    devMode,
    cloud,
    actionTick,
    resetGame,
    importGameSave,
    exportGameSave,
    useOtherTabSave,
    keepThisTabSave,
  };
}
