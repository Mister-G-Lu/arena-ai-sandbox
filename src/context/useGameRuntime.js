import { useMemo } from 'react';
import { formatCredits, wordPressure, CREDIT_LIMIT } from '../game/ledger';
import {
  ACTION_CAP,
  REGEN_INTERVAL_MS,
  accrue,
  formatActions,
  msUntilFull,
  msUntilNextAction,
} from '../game/actions';
import { QUALITY_DEFS } from '../game/qualities';
import { COMPONENT_DEFS, PROMOTIONS, ZONES } from '../game/progression';
import { SUPPLY_DEFS } from '../game/shop';
import { useGameActions } from './useGameActions';
import { useGamePersistence } from './useGamePersistence';
import { tankOf } from './gameStateUtils';

function formatCountdownStatic(ms) {
  if (ms == null) return 'FULL';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useGameRuntime() {
  const persistence = useGamePersistence();
  const game = useGameActions({ state: persistence.state, setState: persistence.setState });
  const { state } = persistence;

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
    // actionTick invalidates the clock-derived display without changing game state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, persistence.actionTick]);

  const actionsValue = useMemo(
    () => ({
      ...game.actions,
      importGameSave: persistence.importGameSave,
      exportGameSave: persistence.exportGameSave,
      useOtherTabSave: persistence.useOtherTabSave,
      keepThisTabSave: persistence.keepThisTabSave,
      resetGame: persistence.resetGame,
    }),
    [
      game.actions,
      persistence.importGameSave,
      persistence.exportGameSave,
      persistence.useOtherTabSave,
      persistence.keepThisTabSave,
      persistence.resetGame,
    ],
  );

  const stateValue = useMemo(
    () => ({
      state,
      persistence: persistence.persistence,
      cloud: persistence.cloud,
      ledger,
      actionTank,
      devMode: persistence.devMode,
      requirementCtx: game.requirementCtx,
      availableZones: game.availableZones,
      QUALITY_DEFS,
      COMPONENT_DEFS,
      SUPPLY_DEFS,
      PROMOTIONS,
      ZONES,
    }),
    [
      state,
      persistence.persistence,
      persistence.cloud,
      ledger,
      actionTank,
      persistence.devMode,
      game.requirementCtx,
      game.availableZones,
    ],
  );

  return { actionsValue, stateValue };
}
