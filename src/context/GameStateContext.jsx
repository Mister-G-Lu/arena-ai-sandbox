import { createContext, useContext, useMemo } from 'react';
import { useGameRuntime } from './useGameRuntime';

export {
  DEATH_ACTION_DOCK,
  DISCOVERIES_CAP,
  LOGBOOK_CAP,
  SEEN_STORYLETS_CAP,
} from './gameStateUtils';

const GameStateContext = createContext(null);
const GameActionsContext = createContext(null);

export function GameStateProvider({ children }) {
  const { actionsValue, stateValue } = useGameRuntime();

  return (
    <GameActionsContext.Provider value={actionsValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameActionsContext.Provider>
  );
}

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
