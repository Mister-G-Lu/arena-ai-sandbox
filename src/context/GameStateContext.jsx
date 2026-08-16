import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { deposit, withdraw, formatCredits, wordPressure, CREDIT_LIMIT } from '../game/ledger';
import { TASKS_PER_SHIFT } from '../game/dispatch';
import { QUALITY_DEFS, normalizeEffects, clampQuality, qualityDef } from '../game/qualities';
import { GLITCH_DEFS } from '../game/glitches';
import {
  PROMOTIONS,
  ZONES,
  nextPromotion,
  unlocksThrough,
  visibleZones,
  zoneState,
  zoneById
} from '../game/progression';
import {
  createInitialGameState,
  createStoredSaveEnvelope,
  parseSaveJson,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope
} from '../lib/gameSave';
import { clearLocalGameSave, loadLocalGameSave, writeLocalGameSave } from '../lib/localGameSave';
import { useCloudSave } from '../hooks/useCloudSave';

const GameStateContext = createContext();

/** Append a logbook entry inside a reducer without duplicating the shape. */
function withLog(prev, text, extra = {}) {
  if (!text) return { ...prev, ...extra };
  return {
    ...prev,
    ...extra,
    logbook: [...prev.logbook, { day: prev.day, text, timestamp: Date.now() }]
  };
}

/**
 * Apply a normalised effects map to a state object. Single code path for
 * orientation choices, console discrepancies and storylet outcomes.
 */
function applyEffectsToState(prev, rawEffects) {
  const effects = normalizeEffects(rawEffects);
  if (Object.keys(effects).length === 0) return prev;

  let next = { ...prev, qualities: { ...prev.qualities } };

  for (const [key, delta] of Object.entries(effects)) {
    const def = qualityDef(key);
    if (!def) continue;

    if (def.kind === 'quality') {
      next.qualities[key] = clampQuality(key, (next.qualities[key] ?? 0) + delta);
    } else if (def.kind === 'attention') {
      next.attention = clampQuality('attention', (next.attention ?? 0) + delta);
    } else if (def.kind === 'credits') {
      const result = deposit(
        { credits: next.credits, unbound: next.ledgerUnbound },
        delta * (def.rate ?? 1)
      );
      next = commitLedger(next, result);
    }
  }

  return next;
}

/** Fold a ledger result back into game state, honouring the overflow glitch. */
function commitLedger(prev, result) {
  const next = { ...prev, credits: result.credits, ledgerUnbound: result.unbound };
  const glitch = GLITCH_DEFS['ledger-overflow'];
  if (!result.overflowed || prev.glitches.includes(glitch.id)) return next;

  return withLog(
    next,
    `LEDGER OVERFLOW. The balance read ${result.wrapped?.toLocaleString?.() ?? 'a negative number'} for one frame, ` +
    'then stopped being a number at all. A ledger that wraps is a ledger with a word size. ' +
    'Meridian has a word size.',
    {
      glitches: [...prev.glitches, glitch.id],
      qualities: {
        ...prev.qualities,
        doubt: clampQuality('doubt', (prev.qualities.doubt ?? 0) + 1)
      },
      discoveries: [...prev.discoveries, {
        day: prev.day,
        text: `THE WORD: the municipal ledger is ${CREDIT_LIMIT.toLocaleString()} wide. Nothing in a city needs to be exactly that wide.`,
        timestamp: Date.now()
      }]
    }
  );
}

export function GameStateProvider({ children }) {
  const [boot] = useState(() => loadLocalGameSave());
  const [state, setState] = useState(boot.state);
  const [persistence, setPersistence] = useState(() => ({
    status: boot.error ? 'recovered' : boot.migrated ? 'migrating' : 'ready',
    error: null,
    recoveryError: boot.error,
    lastSavedAt: boot.envelope?.savedAt ?? null,
    hadLocalSaveAtBoot: boot.hadLocalSave
  }));
  const firstPersistence = useRef(true);
  /**
   * Bumped whenever a whole new operator file is loaded (file import). Cloud
   * sync re-runs its Records check with autosave disarmed first, so an import
   * can surface as a two-copies-disagree prompt instead of silently
   * overwriting the remote file 800ms later.
   */
  const [cloudRecheck, setCloudRecheck] = useState(0);

  useEffect(() => {
    // A valid canonical file was already read; do not rewrite it just because
    // React mounted. Fresh and migrated files are committed immediately.
    if (firstPersistence.current) {
      firstPersistence.current = false;
      if (boot.envelope && !boot.migrated) return;
    }
    const result = writeLocalGameSave(state);
    if (result.ok) {
      setPersistence(prev => ({
        ...prev,
        status: prev.recoveryError ? 'recovered' : 'saved',
        error: null,
        lastSavedAt: result.envelope.savedAt
      }));
    } else {
      setPersistence(prev => ({ ...prev, status: 'error', error: result.error }));
    }
  }, [boot.envelope, boot.migrated, state]);

  const replaceGameState = useCallback((nextState) => {
    const envelope = createStoredSaveEnvelope(nextState);
    setState(parseStoredSaveEnvelope(envelope).game);
  }, []);

  const importGameSave = useCallback((text) => {
    const loaded = parseSaveJson(text);
    setState(loaded.game);
    // A new operator file is now live; Records must be re-read, not overwritten.
    setCloudRecheck((n) => n + 1);
    return loaded.game;
  }, []);

  const exportGameSave = useCallback(() =>
    serializeSaveEnvelope(createStoredSaveEnvelope(state)), [state]);

  const cloud = useCloudSave({
    state,
    hadLocalSaveAtBoot: persistence.hadLocalSaveAtBoot,
    replaceState: replaceGameState,
    recheckToken: cloudRecheck
  });

  /* ---------------- ledger ---------------- */

  const addCredits = useCallback((amount) => {
    setState(prev => commitLedger(prev, deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount)));
  }, []);

  const spendCredits = useCallback((amount) => {
    setState(prev => {
      const result = withdraw({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount);
      if (!result.paid) return prev;
      return { ...prev, credits: result.credits, ledgerUnbound: result.unbound };
    });
  }, []);

  const componentsCount = Object.values(state.components).filter(Boolean).length;

  /* ---------------- qualities ---------------- */

  /** The one public way consequences enter the game. */
  const applyEffects = useCallback((effects) => {
    setState(prev => applyEffectsToState(prev, effects));
  }, []);

  /* ---------------- promotion (automatic) ---------------- */

  const requirementCtx = useMemo(() => ({
    qualities: state.qualities,
    attention: state.attention,
    componentsCount,
    deaths: state.deaths,
    day: state.day,
    unlocks: state.promotion.unlocks,
    zones: state.zones
  }), [state.qualities, state.attention, componentsCount, state.deaths, state.day, state.promotion.unlocks, state.zones]);

  // Promotions are evaluated by the system, not requested by the player.
  useEffect(() => {
    const earned = nextPromotion(state.promotion.tier, requirementCtx);
    if (!earned) return;
    setState(prev => withLog(prev, earned.memo, {
      promotion: {
        tier: earned.tier,
        title: earned.title,
        unlocks: unlocksThrough(earned.tier)
      }
    }));
  }, [requirementCtx, state.promotion.tier]);

  /* ---------------- zones and storylets ---------------- */

  const availableZones = useMemo(
    () => visibleZones(requirementCtx).map(zone => ({
      ...zone,
      status: zoneState(zone, requirementCtx)
    })),
    [requirementCtx]
  );

  /**
   * Open a zone. `entryOverride` lets the caller resume a partly-read pool
   * (the next unread notice) without the zone config knowing about progress.
   */
  const enterZone = useCallback((zoneId, entryOverride) => {
    setState(prev => {
      const zone = zoneById(zoneId);
      if (!zone) return prev;
      const ctx = {
        qualities: prev.qualities,
        attention: prev.attention,
        componentsCount: Object.values(prev.components).filter(Boolean).length,
        deaths: prev.deaths,
        day: prev.day,
        unlocks: prev.promotion.unlocks,
        zones: prev.zones
      };
      if (zoneState(zone, ctx) !== 'open') return prev;
      return {
        ...prev,
        zones: { ...prev.zones, [zoneId]: prev.zones[zoneId] ?? 'open' },
        currentStorylet: { zone: zoneId, storyletId: entryOverride || zone.entry }
      };
    });
  }, []);

  /** Move the pointer to any storylet inside an open zone. */
  const closeStorylet = useCallback(() => {
    setState(prev => ({ ...prev, currentStorylet: null }));
  }, []);

  /**
   * Resolve a storylet choice: apply its effects, remember the card, advance or
   * close the zone, and award the zone's Component when it completes.
   *
   * A card's consequences file once, on first read. Re-reading a card (Floor
   * 12 stays open until you either take the stairs or reach the end) replays
   * the fiction but not the payoff — otherwise an expedition is a quality farm
   * and Attention, the hidden death meter, is maxable in two loops.
   */
  const resolveStorylet = useCallback((storylet, choice) => {
    setState(prev => {
      const alreadySeen = prev.seenStorylets.includes(storylet.id);
      let next = alreadySeen
        ? prev
        : applyEffectsToState(prev, choice.outcome?.qualities);

      const seenStorylets = prev.seenStorylets.includes(storylet.id)
        ? prev.seenStorylets
        : [...prev.seenStorylets, storylet.id];

      const zones = { ...prev.zones };
      let currentStorylet = prev.currentStorylet;

      if (choice.completeZone) {
        zones[storylet.zone] = 'complete';
        currentStorylet = null;
      } else if (choice.endZone) {
        currentStorylet = null;
      } else if (choice.next) {
        currentStorylet = { zone: storylet.zone, storyletId: choice.next };
      }

      next = { ...next, seenStorylets, zones, currentStorylet };

      if (choice.completeZone) {
        const zone = zoneById(storylet.zone);
        if (zone?.component && !next.components[zone.component]) {
          next = withLog(
            next,
            `Recovered: ${zone.componentLabel || zone.component.toUpperCase()}. ${zone.closedNote ?? ''}`.trim(),
            { components: { ...next.components, [zone.component]: true } }
          );
        }
      }

      return next;
    });
  }, []);

  /* ---------------- shift progress ---------------- */

  const recordOrientationTask = useCallback(() => {
    setState(prev => {
      if (
        prev.orientation.completed ||
        prev.orientation.taskRecorded ||
        prev.day !== 1 ||
        prev.tasksCompleted !== 0
      ) return prev;

      const credited = commitLedger(prev, deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, 10));

      return withLog(credited, 'Orientation link verified. The live queue opened with forty-nine tasks remaining.', {
        tasksCompleted: 1,
        orientation: { ...prev.orientation, taskRecorded: true }
      });
    });
  }, []);

  const completeOrientation = useCallback((skipped = false) => {
    setState(prev => {
      if (prev.orientation.completed) return prev;
      return withLog(
        prev,
        skipped ? 'Orientation waived. Prior operating knowledge accepted without verification.' : null,
        { orientation: { ...prev.orientation, completed: true, skipped } }
      );
    });
  }, []);

  const incrementDay = useCallback(() => {
    setState(prev => ({
      ...prev,
      day: prev.day + 1,
      tasksCompleted: 0,
      anomaliesSeenThisShift: 0
    }));
  }, []);

  /**
   * File a task result. `effects` and `payout` are computed by the caller from
   * data (see src/game/payouts.ts) so the console holds no balance numbers.
   */
  const fileTaskResult = useCallback(({
    effects,
    payout = 0,
    logbookEntry,
    discrepancy = false,
    anomaly = false
  }) => {
    setState(prev => {
      let next = applyEffectsToState(prev, effects);
      if (payout) {
        next = commitLedger(next, deposit({ credits: next.credits, unbound: next.ledgerUnbound }, payout));
      }
      next = {
        ...next,
        tasksCompleted: Math.min(next.tasksCompleted + 1, TASKS_PER_SHIFT),
        anomaliesSeenThisShift: next.anomaliesSeenThisShift + (anomaly ? 1 : 0),
        discrepanciesLogged: next.discrepanciesLogged + (discrepancy ? 1 : 0)
      };
      return withLog(next, logbookEntry);
    });
  }, []);

  /* ---------------- residue ---------------- */

  const addLogEntry = useCallback((entry) => {
    setState(prev => withLog(prev, entry));
  }, []);

  const resetGame = useCallback(() => {
    clearLocalGameSave();
    setState(createInitialGameState());
  }, []);

  const ledger = useMemo(() => ({
    credits: state.credits,
    unbound: state.ledgerUnbound,
    display: formatCredits({ credits: state.credits, unbound: state.ledgerUnbound }),
    pressure: wordPressure({ credits: state.credits, unbound: state.ledgerUnbound }),
    limit: CREDIT_LIMIT
  }), [state.credits, state.ledgerUnbound]);

  const value = {
    state,
    persistence,
    cloud,
    ledger,
    requirementCtx,
    availableZones,
    QUALITY_DEFS,
    PROMOTIONS,
    ZONES,
    actions: {
      addCredits,
      spendCredits,
      componentsCount,
      applyEffects,
      enterZone,
      closeStorylet,
      resolveStorylet,
      recordOrientationTask,
      completeOrientation,
      incrementDay,
      fileTaskResult,
      addLogEntry,
      importGameSave,
      exportGameSave,
      resetGame
    }
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
