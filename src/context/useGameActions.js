import { useCallback, useEffect, useMemo } from 'react';
import { deposit, withdraw } from '../game/ledger';
import { TASKS_PER_SHIFT, createPendingDispatch } from '../game/dispatch';
import { ACTION_CAP } from '../game/actions';
import {
  nextPromotion,
  unlocksThrough,
  visibleZones,
  zoneState,
  zoneById,
} from '../game/progression';
import { supplyById, isPurchaseable } from '../game/shop';
import {
  DEATH_ACTION_DOCK,
  DISCOVERIES_CAP,
  SEEN_STORYLETS_CAP,
  appendResidue,
  applyEffectsToState,
  commitLedger,
  withLog,
  withSpentAction,
} from './gameStateUtils';

export function useGameActions({ state, setState }) {
  /* ---- ledger ---- */

  const addCredits = useCallback((amount) => {
    setState((prev) =>
      commitLedger(prev, deposit({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount)),
    );
  }, [setState]);

  const spendCredits = useCallback((amount) => {
    setState((prev) => {
      const result = withdraw({ credits: prev.credits, unbound: prev.ledgerUnbound }, amount);
      if (!result.paid) return prev;
      return { ...prev, credits: result.credits, ledgerUnbound: result.unbound };
    });
  }, [setState]);

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
  }, [setState]);

  /* ---- qualities ---- */

  const applyEffects = useCallback((effects) => {
    setState((prev) => applyEffectsToState(prev, effects));
  }, [setState]);

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
  }, [requirementCtx, setState, state.promotion.tier]);

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
  }, [setState]);

  const closeStorylet = useCallback(() => {
    setState((prev) => ({ ...prev, currentStorylet: null }));
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

  const completeOrientation = useCallback((skipped = false) => {
    setState((prev) => {
      if (prev.orientation.completed) return prev;
      return withLog(
        prev,
        skipped ? 'Orientation waived. Prior operating knowledge accepted without verification.' : null,
        { orientation: { ...prev.orientation, completed: true, skipped } },
      );
    });
  }, [setState]);

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
  }, [setState]);

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
  }, [setState]);

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
    [setState],
  );

  /* ---- residue ---- */

  const addLogEntry = useCallback((entry) => {
    setState((prev) => withLog(prev, entry));
  }, [setState]);

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
  }, [setState]);

  const grantActions = useCallback((amount = ACTION_CAP) => {
    setState((prev) => ({
      ...prev,
      actions: Math.max(0, Math.min(ACTION_CAP, prev.actions + amount)),
      actionsLastTick: Date.now(),
      devTouched: true,
    }));
  }, [setState]);


  const actions = useMemo(
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
      setActionsUnbound,
      grantActions,
    ],
  );

  return { actions, componentsCount, requirementCtx, availableZones };
}
