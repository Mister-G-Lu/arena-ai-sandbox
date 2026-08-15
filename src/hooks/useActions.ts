import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accrue,
  canSpend,
  createActionState,
  msUntilNext,
  parseActionState,
  spend,
  type ActionState,
} from '../game/actions';
import { STORAGE_KEYS, readJson, writeJson } from '../utils/storage';

export function loadActions(now = Date.now()): ActionState {
  const raw = readJson<unknown>(STORAGE_KEYS.actions, null);
  if (raw == null) return createActionState(now);
  return parseActionState(raw, now);
}

export function useActions(nowFn: () => number = Date.now) {
  const [state, setState] = useState<ActionState>(() => loadActions(nowFn()));
  const [now, setNow] = useState(() => nowFn());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    writeJson(STORAGE_KEYS.actions, state);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = nowFn();
      setNow(t);
      setState((s) => accrue(s, t));
    }, 1000);
    return () => window.clearInterval(id);
  }, [nowFn]);

  const spendOne = useCallback((): boolean => {
    const t = nowFn();
    const result = spend(stateRef.current, 1, t);
    setState(result.state);
    setNow(t);
    return result.spent;
  }, [nowFn]);

  const accrued = accrue(state, now);

  return {
    actions: accrued,
    remaining: accrued.current,
    cap: accrued.cap,
    untilNext: msUntilNext(accrued, now),
    canAct: canSpend(accrued, 1, now),
    spendOne,
  };
}
