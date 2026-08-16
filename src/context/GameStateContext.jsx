import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { deposit, withdraw, formatCredits, wordPressure, CREDIT_LIMIT } from '../game/ledger';
import { TASKS_PER_SHIFT, createPendingDispatch } from '../game/dispatch';
import {
  ACTION_CAP,
  REGEN_INTERVAL_MS,
  accrue,
  formatActions,
  formatCountdown,
  msUntilFull,
  msUntilNextAction,
  spend as spendFromTank
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
  zoneById
} from '../game/progression';
import { SUPPLY_DEFS, supplyById, isPurchaseable } from '../game/shop';
import {
  GAME_SAVE_KEY,
  createInitialGameState,
  createStoredSaveEnvelope,
  gameStateFingerprint,
  parseSaveJson,
  parseStoredSaveEnvelope,
  serializeSaveEnvelope
} from '../lib/gameSave';
import { clearLocalGameSave, loadLocalGameSave, writeLocalGameSave } from '../lib/localGameSave';
import { useCloudSave } from '../hooks/useCloudSave';

const GameStateContext = createContext();

/** Read the persisted tank fields as an ActionTank. */
function tankOf(state) {
  return {
    actions: state.actions,
    lastTick: state.actionsLastTick,
    unbound: state.actionsUnbound
  };
}

/** Fold a tank result back into game state. */
function commitTank(state, tank) {
  return {
    ...state,
    actions: tank.actions,
    actionsLastTick: tank.lastTick,
    actionsUnbound: tank.unbound ?? state.actionsUnbound
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
    actionsSpentThisShift: Math.min((next.actionsSpentThisShift ?? 0) + cost, ACTION_CAP)
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
    logbook: appendResidue(prev.logbook, { day: prev.day, text, timestamp: Date.now() }, LOGBOOK_CAP)
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
      discoveries: appendResidue(prev.discoveries, {
        day: prev.day,
        text: `THE WORD: the municipal ledger is ${CREDIT_LIMIT.toLocaleString()} wide. Nothing in a city needs to be exactly that wide.`,
        timestamp: Date.now()
      }, DISCOVERIES_CAP)
    }
  );
}

export function GameStateProvider({ children }) {
  const [boot] = useState(() => loadLocalGameSave());
  const [state, setState] = useState(() => hydrateActionTank(boot.state));
  const [devMode] = useState(() => detectDevMode());
  // Re-renders the HUD countdown once a second. State itself accrues lazily on
  // read, so this timer is presentation only — nothing depends on it firing.
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [persistence, setPersistence] = useState(() => ({
    status: boot.error ? 'recovered' : boot.migrated ? 'migrating' : 'ready',
    error: null,
    recoveryError: boot.error,
    lastSavedAt: boot.envelope?.savedAt ?? null,
    hadLocalSaveAtBoot: boot.hadLocalSave,
    tabConflict: null,
    /**
     * True when another tab erased the canonical operator file (a reset).
     * There is no foreign copy to offer adoption of — only this tab's
     * in-memory work and a paused writer.
     */
    remoteReset: false
  }));
  const firstPersistence = useRef(true);
  const stateRef = useRef(state);
  const localWritesBlocked = useRef(false);
  const skipNextPersistence = useRef(false);
  stateRef.current = state;
  /**
   * Bumped whenever a whole new operator file is loaded (file import). Cloud
   * sync re-runs its Records check with autosave disarmed first, so an import
   * surfaces as a two-copies-disagree prompt instead of silently overwriting
   * the remote file.
   */
  const [cloudRecheck, setCloudRecheck] = useState(0);

  useEffect(() => {
    function onStorage(event) {
      if (event.key !== GAME_SAVE_KEY) return;
      if (event.newValue == null) {
        // The key disappeared: another tab reset the game. Without this branch
        // the removal is invisible here, and this tab's next ordinary write
        // would silently resurrect the file the operator just erased — the
        // resetting tab would then read that resurrection as a foreign edit.
        // Pause writes and surface the wipe instead.
        localWritesBlocked.current = true;
        setPersistence(prev => ({
          ...prev,
          status: 'conflict',
          error: 'Another tab erased this operator file. Local saving is paused — keep this tab\'s copy to continue it here.',
          tabConflict: null,
          remoteReset: true
        }));
        return;
      }
      try {
        const incoming = parseSaveJson(event.newValue);
        if (gameStateFingerprint(incoming.game) === gameStateFingerprint(stateRef.current)) {
          setPersistence(prev => ({ ...prev, lastSavedAt: incoming.savedAt }));
          return;
        }
        localWritesBlocked.current = true;
        setPersistence(prev => ({
          ...prev,
          status: 'conflict',
          error: 'Another tab changed this operator file. Choose a terminal before local saving continues.',
          tabConflict: incoming,
          remoteReset: false
        }));
      } catch (error) {
        // Invalid replacement bytes are just as dangerous to overwrite: hold
        // this tab's valid state in memory and surface recovery rather than
        // turning a malformed cross-tab write into silent data loss.
        localWritesBlocked.current = true;
        setPersistence(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Another tab wrote an invalid operator file.'
        }));
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    // A valid canonical file was already read; do not rewrite it just because
    // React mounted. Fresh and migrated files are committed immediately.
    if (firstPersistence.current) {
      firstPersistence.current = false;
      if (boot.envelope && !boot.migrated) return;
    }
    if (skipNextPersistence.current) {
      skipNextPersistence.current = false;
      return;
    }
    // Another tab advanced the canonical key. Keep this tab's in-memory work,
    // but do not silently write it over the newer bytes before the operator
    // chooses which terminal wins.
    if (localWritesBlocked.current) return;
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

  /**
   * The wall clock is the source of truth for regeneration, so the tank is
   * recomputed on an interval rather than counted down. A backgrounded tab, a
   * sleeping laptop and a closed browser all resolve to the same arithmetic
   * the moment anything reads the tank again.
   */
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setClockTick(now);
      setState(prev => {
        const result = accrue(tankOf(prev), now);
        if (result.gained === 0 && result.lastTick === prev.actionsLastTick) return prev;
        return commitTank(prev, result);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const replaceGameState = useCallback((nextState) => {
    const envelope = createStoredSaveEnvelope(nextState);
    setState(hydrateActionTank(parseStoredSaveEnvelope(envelope).game));
  }, []);

  const importGameSave = useCallback((text) => {
    const loaded = parseSaveJson(text);
    // Importing a file IS the operator choosing which copy wins. If a stale
    // cross-tab block is still standing, the import would otherwise stay in
    // memory only — silently dropped on the next reload, and one "USE OTHER
    // TAB" click away from being clobbered by the file it just replaced.
    localWritesBlocked.current = false;
    setPersistence(prev => ({
      ...prev,
      status: 'ready',
      error: null,
      tabConflict: null
    }));
    setState(hydrateActionTank(loaded.game));
    // A new operator file is now live; Records must be re-read, not overwritten.
    setCloudRecheck((n) => n + 1);
    return loaded.game;
  }, []);

  const exportGameSave = useCallback(() =>
    serializeSaveEnvelope(createStoredSaveEnvelope(state)), [state]);

  const useOtherTabSave = useCallback(() => {
    const incoming = persistence.tabConflict;
    if (!incoming) return false;
    localWritesBlocked.current = false;
    skipNextPersistence.current = true;
    setState(hydrateActionTank(incoming.game));
    setPersistence(prev => ({
      ...prev,
      status: 'ready',
      error: null,
      lastSavedAt: incoming.savedAt,
      tabConflict: null,
      remoteReset: false
    }));
    // This is a whole-file replacement, like import. Reconcile it with cloud
    // before autosave is allowed to resume.
    setCloudRecheck(value => value + 1);
    return true;
  }, [persistence.tabConflict]);

  const keepThisTabSave = useCallback(() => {
    // Valid whenever local writes were paused by a foreign event — a rival
    // tab's save, or a rival tab's reset, which has no save to adopt.
    if (!persistence.tabConflict && !persistence.remoteReset) return false;
    localWritesBlocked.current = false;
    const result = writeLocalGameSave(stateRef.current);
    if (!result.ok) {
      localWritesBlocked.current = true;
      setPersistence(prev => ({ ...prev, status: 'error', error: result.error }));
      return false;
    }
    setPersistence(prev => ({
      ...prev,
      status: 'saved',
      error: null,
      lastSavedAt: result.envelope.savedAt,
      tabConflict: null,
      remoteReset: false
    }));
    return true;
  }, [persistence.tabConflict, persistence.remoteReset]);

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

  /**
   * Order a supply from the municipal terminal. Salary is the mundane
   * economy's job; a purchase is one transaction through the same ledger,
   * and the arrival is filed in the logbook like any other result.
   */
  const purchaseSupply = useCallback((supplyId) => {
    setState(prev => {
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
          supplies: { ...prev.supplies, [supplyId]: true }
        },
        `Supply order filed: ${def.name} (¤${def.price.toLocaleString()}).${note}`
      );
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
    tier: state.promotion.tier,
    unlocks: state.promotion.unlocks,
    zones: state.zones,
    supplies: state.supplies
  }), [state.qualities, state.attention, componentsCount, state.deaths, state.day, state.promotion.tier, state.promotion.unlocks, state.zones, state.supplies]);

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
   * (the next unread notice).
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
        tier: prev.promotion.tier,
        unlocks: prev.promotion.unlocks,
        zones: prev.zones,
        supplies: prev.supplies
      };
      if (zoneState(zone, ctx) !== 'open') return prev;
      // Opening a file is free; the choice made inside it is what costs. This
      // keeps the operator free to look before committing.
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
   * Resolve a storylet choice: apply its effects, remember the card, advance
   * or close the zone, and award the zone's Component when it completes.
   * Consequences file once, on first read — a re-read replays the fiction
   * only, or an expedition becomes a quality farm.
   */
  const resolveStorylet = useCallback((storylet, choice) => {
    setState(prev => {
      const pointer = prev.currentStorylet;
      if (
        !pointer ||
        pointer.zone !== storylet?.zone ||
        pointer.storyletId !== storylet?.id
      ) {
        // Reject stale closures, double clicks after a transition, and callers
        // attempting to resolve a card other than the one actually open.
        return prev;
      }
      const selectedChoice = storylet.choices?.find((candidate) => candidate.id === choice?.id);
      if (!selectedChoice) return prev;

      // A re-read replays the fiction and files nothing, so it is free. Only a
      // first reading — the one that has consequences — costs an action.
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
              'The operator file remained open because you did.',
            {
              deaths: deathNumber,
              // Death is a patch boundary, not an accidental chain-death loop.
              // The lethal choice was explicit; the next investigation begins
              // with the system watching from a clean baseline.
              attention: 0,
              discoveries: appendResidue(next.discoveries, {
                day: next.day,
                text: `THE INTERIM ${deathNumber}: the frame after termination and before shift start. The city forgot. You did not.`,
                timestamp: Date.now()
              }, DISCOVERIES_CAP)
            }
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
              { components: { ...next.components, [zone.component]: true } }
            );
          }
        }

        return next;
      });
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

      // Orientation is the game teaching its own verb. The tank is not charged
      // — being taught how to work should not cost a shift's worth of budget —
      // but the night still moves, because the work still happened. Budget and
      // clock are separate ledgers, and only the budget is forgiven here.
      const credited = commitLedger(prev, deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, 10));

      return withLog(credited, 'Orientation link verified. The live queue opened and the terminal began counting what it was owed.', {
        tasksCompleted: prev.tasksCompleted + 1,
        tasksThisShift: 1,
        actionsSpentThisShift: 1,
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

  /**
   * Roll the shift over. The tank is deliberately *not* refilled: the night
   * ending is a fiction beat, while the budget is real time. Ending a shift
   * early to get fifty more actions would make the tank meaningless.
   */
  const incrementDay = useCallback(() => {
    setState(prev => {
      // An acknowledged result is the boundary of a work order. Never let a
      // caller roll the date while a reserved result still needs a signature.
      if (prev.pendingDispatch) return prev;
      return {
        ...prev,
        day: prev.day + 1,
        tasksThisShift: 0,
        actionsSpentThisShift: 0,
        anomaliesSeenThisShift: 0
      };
    });
  }, []);

  /**
   * Reserve a console task and its action in one state transition. The pending
   * result is canonical state, not component state, so route changes and
   * reloads cannot reroll an anomaly or abandon an unpaid work order.
   */
  const startDispatchTask = useCallback(({ anomalyRoll, corruptionRoll }) => {
    setState(prev => {
      if (
        prev.pendingDispatch ||
        prev.tasksThisShift >= TASKS_PER_SHIFT ||
        prev.actionsSpentThisShift >= ACTION_CAP
      ) return prev;

      return withSpentAction(prev, 1, (charged) => ({
        ...charged,
        pendingDispatch: createPendingDispatch({
          day: charged.day,
          tasksCompleted: charged.tasksCompleted,
          tasksThisShift: charged.tasksThisShift,
          actionsSpentThisShift: charged.actionsSpentThisShift,
          anomaliesSeenThisShift: charged.anomaliesSeenThisShift,
          anomalyRoll,
          corruptionRoll
        })
      }));
    });
  }, []);

  /**
   * File the reserved task result. The action was charged when Dispatch
   * released the work order, so acknowledgement only commits its consequences.
   */
  const fileTaskResult = useCallback(({
    effects,
    payout = 0,
    logbookEntry,
    discrepancy = false,
    anomaly = false
  }) => {
    setState(prev => {
      if (!prev.pendingDispatch) return prev;
      let next = applyEffectsToState(prev, effects);
      if (payout) {
        next = commitLedger(next, deposit({ credits: next.credits, unbound: next.ledgerUnbound }, payout));
      }
      next = {
        ...next,
        pendingDispatch: null,
        // Career total, uncapped — the operator file's lifetime stat.
        tasksCompleted: next.tasksCompleted + 1,
        tasksThisShift: Math.min(next.tasksThisShift + 1, TASKS_PER_SHIFT),
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
    // An explicit wipe outranks the cross-tab pause: if this tab was blocked
    // by a foreign write, the reset is the operator's answer to it. Clearing
    // the block lets the fresh state persist instead of dying in memory.
    localWritesBlocked.current = false;
    setPersistence(prev => ({
      ...prev,
      status: 'ready',
      error: null,
      tabConflict: null
    }));
    clearLocalGameSave();
    setState(hydrateActionTank(createInitialGameState()));
  }, []);

  /* ---------------- dev capability ---------------- */

  /**
   * God mode for the tank. Unbound actions follow the `ledgerUnbound`
   * precedent — a flag, not a magic number, so nothing downstream has to
   * recognise 999999 as meaning "infinite".
   *
   * `devTouched` latches on and never clears, and the HUD wears a badge for as
   * long as it is set: a file that was granted infinite actions can always be
   * told apart from one that earned its way (design/dev-tools.md §7).
   */
  const setActionsUnbound = useCallback((unbound) => {
    setState(prev => {
      if (prev.actionsUnbound === unbound) return prev;
      return withLog(
        {
          ...prev,
          actionsUnbound: unbound,
          actions: unbound ? ACTION_CAP : prev.actions,
          actionsLastTick: Date.now(),
          devTouched: true
        },
        unbound
          ? 'MAINTENANCE OVERRIDE // action budget detached from the clock. The terminal stopped asking what time it was.'
          : 'MAINTENANCE OVERRIDE WITHDRAWN // action budget reattached to the clock.'
      );
    });
  }, []);

  /** Refill the tank without waiting out the clock. */
  const grantActions = useCallback((amount = ACTION_CAP) => {
    setState(prev => ({
      ...prev,
      actions: Math.max(0, Math.min(ACTION_CAP, prev.actions + amount)),
      actionsLastTick: Date.now(),
      devTouched: true
    }));
  }, []);

  const ledger = useMemo(() => ({
    credits: state.credits,
    unbound: state.ledgerUnbound,
    display: formatCredits({ credits: state.credits, unbound: state.ledgerUnbound }),
    pressure: wordPressure({ credits: state.credits, unbound: state.ledgerUnbound }),
    limit: CREDIT_LIMIT
  }), [state.credits, state.ledgerUnbound]);

  /**
   * The tank as the UI wants it. Recomputed on `clockTick` so the countdown
   * ticks every second without persisting a write per second.
   */
  const actionTank = useMemo(() => {
    const tank = tankOf(state);
    const live = accrue(tank, clockTick);
    const untilNext = msUntilNextAction(tank, clockTick);
    return {
      actions: live.actions,
      cap: ACTION_CAP,
      unbound: Boolean(state.actionsUnbound),
      empty: !state.actionsUnbound && live.actions <= 0,
      display: formatActions(live),
      regenIntervalMs: REGEN_INTERVAL_MS,
      msUntilNext: untilNext,
      msUntilFull: msUntilFull(tank, clockTick),
      countdown: formatCountdown(untilNext),
      spentThisShift: state.actionsSpentThisShift,
      devTouched: Boolean(state.devTouched)
    };
  }, [state, clockTick]);

  const value = {
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
    actions: {
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
      grantActions
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
