import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { deposit, withdraw, formatCredits, wordPressure, CREDIT_LIMIT } from '../game/ledger';
import { TASKS_PER_SHIFT, createPendingDispatch } from '../game/dispatch';
import {
  ACTION_CAP,
  REGEN_INTERVAL_MS,
  accrue,
  formatActions,
  msUntilFull,
  msUntilNextAction,
  spend as spendFromTank,
} from '../game/actions';
import { detectDevMode } from '../lib/devMode';
import { QUALITY_DEFS, normalizeEffects, clampQuality, qualityDef } from '../game/qualities';
import { GLITCH_DEFS } from '../game/glitches';
import {
  COMPONENT_DEFS,
  PROMOTIONS,
  ZONES,
  nextPromotion,
  unlocksThrough,
  visibleZones,
  zoneState,
  zoneById,
} from '../game/progression';
import { SUPPLY_DEFS, supplyById, isPurchaseable } from '../game/shop';
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

// ---------------------------------------------------------------------------
// Two-context split
//
// GameStateContext  — game state data (changes on user actions, not every second)
// GameActionsContext — stable action functions (never changes after mount)
//
// Components that only need actions (DevPanel, SaveManagement) do not re-render
// when state changes. Components that need both can consume both.
// ---------------------------------------------------------------------------

const GameStateContext = createContext(null);
const GameActionsContext = createContext(null);

/** Read the persisted tank fields as an ActionTank. */
function tankOf(state) {
  return {
    actions: state.actions,
    lastTick: state.actionsLastTick,
    unbound: state.actionsUnbound,
  };
}

/** Fold a tank result back into game state. */
function commitTank(state, tank) {
  return {
    ...state,
    actions: tank.actions,
    actionsLastTick: tank.lastTick,
    actionsUnbound: tank.unbound ?? state.actionsUnbound,
  };
}

/**
 * Bring a state loaded from any persistence boundary onto the local clock.
 * `lastTick: 0` is the additive-schema sentinel for "not anchored yet", never
 * permission to regenerate from the Unix epoch.
 */
function hydrateActionTank(state, now = Date.now()) {
  const anchored = state.actionsLastTick > 0 ? state : { ...state, actionsLastTick: now };
  return commitTank(anchored, accrue(tankOf(anchored), now));
}

/**
 * Charge the tank for one action and apply `mutate` only if it paid.
 *
 * Every consequential verb in the game funnels through here, so there is
 * exactly one place where "can the operator afford this?" is answered and
 * exactly one place where a refusal short-circuits an interaction. A refused
 * spend returns the previous state untouched — never a partial application.
 */
function withSpentAction(prev, cost, mutate, now = Date.now()) {
  const result = spendFromTank(tankOf(prev), cost, now);
  if (!result.paid) return prev;

  const charged = commitTank(prev, result);
  const next = mutate(charged);
  if (next === charged) return charged;

  // The shift clock counts actions taken, not actions deducted, so a dev with
  // an unbound tank still watches the night advance normally.
  return {
    ...next,
    actionsSpentThisShift: Math.min((next.actionsSpentThisShift ?? 0) + cost, ACTION_CAP),
  };
}

/**
 * Residue is forever — but the file that holds it is not infinite. The save
 * schema caps logbook, discoveries and seen-storylets (see gameSave.ts), and
 * before this cap the reducers appended without limit: a file that played its
 * way across the ceiling became a file the schema rejected, and from that
 * append onward every local write, cloud sync and export failed validation.
 * These live caps sit safely below the schema ceilings, so an in-game-grown
 * file can never reach the wall — the app prunes its oldest residue instead.
 */
export const LOGBOOK_CAP = 1000;
export const DISCOVERIES_CAP = 500;
export const SEEN_STORYLETS_CAP = 9500;

/**
 * What a termination costs, in actions. Design P3/§6 prices a death at one
 * hour of the next shift's budget ("you wake at 01:00 minus the hours you
 * spent dead") — six actions at the ten-minutes-per-action regen rate.
 */
export const DEATH_ACTION_DOCK = 6;

function appendResidue(list, entry, cap) {
  const next = [...list, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Append a logbook entry inside a reducer without duplicating the shape. */
function withLog(prev, text, extra = {}) {
  if (!text) return { ...prev, ...extra };
  return {
    ...prev,
    ...extra,
    logbook: appendResidue(
      prev.logbook,
      { day: prev.day, text, timestamp: Date.now() },
      LOGBOOK_CAP,
    ),
  };
}

/**
 * Apply a normalised effects map to state. Single code path for orientation
 * choices, console discrepancies and storylet outcomes.
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
        delta * (def.rate ?? 1),
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
        doubt: clampQuality('doubt', (prev.qualities.doubt ?? 0) + 1),
      },
      discoveries: appendResidue(
        prev.discoveries,
        {
          day: prev.day,
          text: `THE WORD: the municipal ledger is ${CREDIT_LIMIT.toLocaleString()} wide. Nothing in a city needs to be exactly that wide.`,
          timestamp: Date.now(),
        },
        DISCOVERIES_CAP,
      ),
    },
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameStateProvider({ children }) {
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

  /* ---- ledger ---- */

  const addCredits = useCallback((amount) => {
    setState((prev) =>
      commitLedger(prev, deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount)),
    );
  }, []);

  const spendCredits = useCallback((amount) => {
    setState((prev) => {
      const result = withdraw({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount);
      if (!result.paid) return prev;
      return { ...prev, credits: result.credits, ledgerUnbound: result.unbound };
    });
  }, []);

  const purchaseSupply = useCallback((supplyId) => {
    setState((prev) => {
      if (!isPurchaseable(supplyId)) return prev;
      const def = supplyById(supplyId);
      if (!def || prev.supplies[supplyId]) return prev;
      const result = withdraw({ credits: prev.credits, unbound: prev.ledgerUnbound }, def.price);
      if (!result.paid) return prev;
      const note = def.arrivalNote ? ` ${def.arrivalNote}` : '';
      return withLog(
        {
          ...prev,
          credits: result.credits,
          ledgerUnbound: result.unbound,
          supplies: { ...prev.supplies, [supplyId]: true },
        },
        `Supply order filed: ${def.name} (¤${def.price.toLocaleString()}).${note}`,
      );
    });
  }, []);

  /* ---- qualities ---- */

  const applyEffects = useCallback((effects) => {
    setState((prev) => applyEffectsToState(prev, effects));
  }, []);

  /* ---- promotion (automatic) ---- */

  const componentsCount = Object.values(state.components).filter(Boolean).length;

  const requirementCtx = useMemo(
    () => ({
      qualities: state.qualities,
      attention: state.attention,
      componentsCount,
      deaths: state.deaths,
      day: state.day,
      tier: state.promotion.tier,
      unlocks: state.promotion.unlocks,
      zones: state.zones,
      supplies: state.supplies,
    }),
    [
      state.qualities,
      state.attention,
      componentsCount,
      state.deaths,
      state.day,
      state.promotion.tier,
      state.promotion.unlocks,
      state.zones,
      state.supplies,
    ],
  );

  useEffect(() => {
    const earned = nextPromotion(state.promotion.tier, requirementCtx);
    if (!earned) return;
    setState((prev) =>
      withLog(prev, earned.memo, {
        promotion: {
          tier: earned.tier,
          title: earned.title,
          unlocks: unlocksThrough(earned.tier),
        },
      }),
    );
  }, [requirementCtx, state.promotion.tier]);

  /* ---- zones and storylets ---- */

  const availableZones = useMemo(
    () =>
      visibleZones(requirementCtx).map((zone) => ({
        ...zone,
        status: zoneState(zone, requirementCtx),
      })),
    [requirementCtx],
  );

  const enterZone = useCallback((zoneId, entryOverride) => {
    setState((prev) => {
      const zone = zoneById(zoneId);
      if (!zone) return prev;
      const ctx = {
        qualities: prev.qualities,
        attention: prev.attention,
        componentsCount: Object.values(prev.components).filter(Boolean).length,
        deaths: prev.deaths,
        day: prev.day,
        tier: prev.promotion.tier,
        unlocks: prev.promotion.unlocks,
        zones: prev.zones,
        supplies: prev.supplies,
      };
      if (zoneState(zone, ctx) !== 'open') return prev;
      return {
        ...prev,
        zones: { ...prev.zones, [zoneId]: prev.zones[zoneId] ?? 'open' },
        currentStorylet: { zone: zoneId, storyletId: entryOverride || zone.entry },
      };
    });
  }, []);

  const closeStorylet = useCallback(() => {
    setState((prev) => ({ ...prev, currentStorylet: null }));
  }, []);

  const resolveStorylet = useCallback((storylet, choice) => {
    setState((prev) => {
      const pointer = prev.currentStorylet;
      if (!pointer || pointer.zone !== storylet?.zone || pointer.storyletId !== storylet?.id) {
        return prev;
      }
      const selectedChoice = storylet.choices?.find((candidate) => candidate.id === choice?.id);
      if (!selectedChoice) return prev;

      const alreadySeen = prev.seenStorylets.includes(storylet.id);
      const cost = alreadySeen ? 0 : 1;

      return withSpentAction(prev, cost, (charged) => {
        let next = alreadySeen
          ? charged
          : applyEffectsToState(charged, selectedChoice.outcome?.qualities);

        if (selectedChoice.death && !alreadySeen) {
          const deathNumber = next.deaths + 1;
          next = withLog(
            next,
            `TERMINATION ${deathNumber} // You remember the interval the city removed. ` +
              'The operator file remained open because you did. The paperwork docked an hour ' +
              'of your budget: −6 actions.',
            {
              deaths: deathNumber,
              attention: 0,
              actions: Math.max(0, (next.actions ?? 0) - DEATH_ACTION_DOCK),
              discoveries: appendResidue(
                next.discoveries,
                {
                  day: next.day,
                  text: `THE INTERIM ${deathNumber}: the frame after termination and before shift start. The city forgot. You did not.`,
                  timestamp: Date.now(),
                },
                DISCOVERIES_CAP,
              ),
            },
          );
        }

        const seenStorylets = charged.seenStorylets.includes(storylet.id)
          ? charged.seenStorylets
          : appendResidue(charged.seenStorylets, storylet.id, SEEN_STORYLETS_CAP);

        const zones = { ...charged.zones };
        let currentStorylet = charged.currentStorylet;

        if (selectedChoice.completeZone) {
          zones[storylet.zone] = 'complete';
          currentStorylet = null;
        } else if (selectedChoice.endZone) {
          currentStorylet = null;
        } else if (selectedChoice.next) {
          currentStorylet = { zone: storylet.zone, storyletId: selectedChoice.next };
        }

        next = { ...next, seenStorylets, zones, currentStorylet };

        if (selectedChoice.completeZone) {
          const zone = zoneById(storylet.zone);
          if (zone?.component && !next.components[zone.component]) {
            next = withLog(
              next,
              `Recovered: ${zone.componentLabel || zone.component.toUpperCase()}. ${zone.closedNote ?? ''}`.trim(),
              { components: { ...next.components, [zone.component]: true } },
            );
          }
        }

        return next;
      });
    });
  }, []);

  /* ---- shift progress ---- */

  const recordOrientationTask = useCallback(() => {
    setState((prev) => {
      if (
        prev.orientation.completed ||
        prev.orientation.taskRecorded ||
        prev.day !== 1 ||
        prev.tasksCompleted !== 0
      )
        return prev;

      const credited = commitLedger(
        prev,
        deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, 10),
      );

      return withLog(
        credited,
        'Orientation link verified. The live queue opened and the terminal began counting what it was owed.',
        {
          tasksCompleted: prev.tasksCompleted + 1,
          tasksThisShift: 1,
          actionsSpentThisShift: 1,
          orientation: { ...prev.orientation, taskRecorded: true },
        },
      );
    });
  }, []);

  const completeOrientation = useCallback((skipped = false) => {
    setState((prev) => {
      if (prev.orientation.completed) return prev;
      return withLog(
        prev,
        skipped ? 'Orientation waived. Prior operating knowledge accepted without verification.' : null,
        { orientation: { ...prev.orientation, completed: true, skipped } },
      );
    });
  }, []);

  const incrementDay = useCallback(() => {
    setState((prev) => {
      if (prev.pendingDispatch) return prev;
      return {
        ...prev,
        day: prev.day + 1,
        tasksThisShift: 0,
        actionsSpentThisShift: 0,
        anomaliesSeenThisShift: 0,
      };
    });
  }, []);

  const startDispatchTask = useCallback(({ anomalyRoll, corruptionRoll }) => {
    setState((prev) => {
      if (
        prev.pendingDispatch ||
        prev.tasksThisShift >= TASKS_PER_SHIFT ||
        prev.actionsSpentThisShift >= ACTION_CAP
      )
        return prev;

      return withSpentAction(prev, 1, (charged) => ({
        ...charged,
        pendingDispatch: createPendingDispatch({
          day: charged.day,
          tasksCompleted: charged.tasksCompleted,
          tasksThisShift: charged.tasksThisShift,
          actionsSpentThisShift: charged.actionsSpentThisShift,
          anomaliesSeenThisShift: charged.anomaliesSeenThisShift,
          anomalyRoll,
          corruptionRoll,
          completedZones: Object.entries(charged.zones)
            .filter(([, status]) => status === 'complete')
            .map(([id]) => id),
        }),
      }));
    });
  }, []);

  const fileTaskResult = useCallback(
    ({ effects, payout = 0, logbookEntry, discrepancy = false, anomaly = false }) => {
      setState((prev) => {
        if (!prev.pendingDispatch) return prev;
        let next = applyEffectsToState(prev, effects);
        if (payout) {
          next = commitLedger(
            next,
            deposit({ credits: next.credits, unbound: next.ledgerUnbound }, payout),
          );
        }
        next = {
          ...next,
          pendingDispatch: null,
          tasksCompleted: next.tasksCompleted + 1,
          tasksThisShift: Math.min(next.tasksThisShift + 1, TASKS_PER_SHIFT),
          anomaliesSeenThisShift: next.anomaliesSeenThisShift + (anomaly ? 1 : 0),
          discrepanciesLogged: next.discrepanciesLogged + (discrepancy ? 1 : 0),
        };
        return withLog(next, logbookEntry);
      });
    },
    [],
  );

  /* ---- residue ---- */

  const addLogEntry = useCallback((entry) => {
    setState((prev) => withLog(prev, entry));
  }, []);

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

  /* ---- dev capability ---- */

  const setActionsUnbound = useCallback((unbound) => {
    setState((prev) => {
      if (prev.actionsUnbound === unbound) return prev;
      return withLog(
        {
          ...prev,
          actionsUnbound: unbound,
          actions: unbound ? ACTION_CAP : prev.actions,
          actionsLastTick: Date.now(),
          devTouched: true,
        },
        unbound
          ? 'MAINTENANCE OVERRIDE // action budget detached from the clock. The terminal stopped asking what time it was.'
          : 'MAINTENANCE OVERRIDE WITHDRAWN // action budget reattached to the clock.',
      );
    });
  }, []);

  const grantActions = useCallback((amount = ACTION_CAP) => {
    setState((prev) => ({
      ...prev,
      actions: Math.max(0, Math.min(ACTION_CAP, prev.actions + amount)),
      actionsLastTick: Date.now(),
      devTouched: true,
    }));
  }, []);

  /* ---- derived values (memoized) ---- */

  const ledger = useMemo(
    () => ({
      credits: state.credits,
      unbound: state.ledgerUnbound,
      display: formatCredits({ credits: state.credits, unbound: state.ledgerUnbound }),
      pressure: wordPressure({ credits: state.credits, unbound: state.ledgerUnbound }),
      limit: CREDIT_LIMIT,
    }),
    [state.credits, state.ledgerUnbound],
  );

  const actionTank = useMemo(() => {
    const now = Date.now();
    const tank = tankOf(state);
    const live = accrue(tank, now);
    const untilNext = msUntilNextAction(tank, now);
    return {
      actions: live.actions,
      cap: ACTION_CAP,
      unbound: Boolean(state.actionsUnbound),
      empty: !state.actionsUnbound && live.actions <= 0,
      display: formatActions(live),
      regenIntervalMs: REGEN_INTERVAL_MS,
      msUntilNext: untilNext,
      msUntilFull: msUntilFull(tank, now),
      countdown: formatCountdownStatic(untilNext),
      spentThisShift: state.actionsSpentThisShift,
      devTouched: Boolean(state.devTouched),
    };
    // actionTick is included so this recomputes when the count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, actionTick]);

  /* ---- memoized context values ---- */

  const actionsValue = useMemo(
    () => ({
      addCredits,
      spendCredits,
      componentsCount,
      applyEffects,
      purchaseSupply,
      enterZone,
      closeStorylet,
      resolveStorylet,
      recordOrientationTask,
      completeOrientation,
      incrementDay,
      startDispatchTask,
      fileTaskResult,
      addLogEntry,
      importGameSave,
      exportGameSave,
      useOtherTabSave,
      keepThisTabSave,
      resetGame,
      setActionsUnbound,
      grantActions,
    }),
    [
      addCredits,
      spendCredits,
      componentsCount,
      applyEffects,
      purchaseSupply,
      enterZone,
      closeStorylet,
      resolveStorylet,
      recordOrientationTask,
      completeOrientation,
      incrementDay,
      startDispatchTask,
      fileTaskResult,
      addLogEntry,
      importGameSave,
      exportGameSave,
      useOtherTabSave,
      keepThisTabSave,
      resetGame,
      setActionsUnbound,
      grantActions,
    ],
  );

  const stateValue = useMemo(
    () => ({
      state,
      persistence,
      cloud,
      ledger,
      actionTank,
      devMode,
      requirementCtx,
      availableZones,
      QUALITY_DEFS,
      COMPONENT_DEFS,
      SUPPLY_DEFS,
      PROMOTIONS,
      ZONES,
    }),
    [
      state,
      persistence,
      cloud,
      ledger,
      actionTank,
      devMode,
      requirementCtx,
      availableZones,
    ],
  );

  return (
    <GameActionsContext.Provider value={actionsValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access game state data. Components that only need actions should use
 * `useGameActions()` instead to avoid re-rendering on state changes.
 */
export function useGameState() {
  const stateCtx = useContext(GameStateContext);
  const actionsCtx = useContext(GameActionsContext);
  if (!stateCtx || !actionsCtx) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  // Backward-compatible: returns { ...state, ...actions }
  return useMemo(() => ({ ...stateCtx, actions: actionsCtx }), [stateCtx, actionsCtx]);
}

/** Access only the stable action functions. Does not re-render on state changes. */
export function useGameActions() {
  const ctx = useContext(GameActionsContext);
  if (!ctx) {
    throw new Error('useGameActions must be used within a GameStateProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Static countdown from milliseconds — no per-second state update needed. */
function formatCountdownStatic(ms) {
  if (ms == null) return 'FULL';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
