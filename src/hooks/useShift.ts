import { useCallback, useEffect, useRef, useState } from 'react';
import { healDelay } from '../game/glitch';
import {
  createShift,
  healLine,
  nextShift as advanceShift,
  parseShift,
  performTask,
  type ShiftState,
} from '../game/shift';
import { STORAGE_KEYS, readJson, writeJson } from '../utils/storage';

export function loadShift(): ShiftState {
  const raw = readJson<unknown>(STORAGE_KEYS.shift, null);
  if (raw == null) return createShift();
  return parseShift(raw);
}

export function useShift(reducedMotion: boolean) {
  const [shift, setShift] = useState<ShiftState>(loadShift);
  const shiftRef = useRef(shift);
  shiftRef.current = shift;
  const timers = useRef<number[]>([]);
  const scheduled = useRef(new Set<string>());

  useEffect(() => {
    writeJson(STORAGE_KEYS.shift, shift);
  }, [shift]);

  useEffect(() => {
    for (const line of shift.log) {
      if (line.kind !== 'corrupt' || !line.healTo) continue;
      if (scheduled.current.has(line.id)) continue;
      scheduled.current.add(line.id);
      const t = window.setTimeout(() => {
        setShift((s) => healLine(s, line.id));
      }, healDelay());
      timers.current.push(t);
    }
  }, [shift]);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  const perform = useCallback((): boolean => {
    let changed = false;
    setShift((s) => {
      if (s.complete || s.tasks <= 0) return s;
      changed = true;
      return performTask(s, { reducedMotion });
    });
    return changed;
  }, [reducedMotion]);

  const startTomorrow = useCallback(() => {
    setShift((s) => advanceShift(s));
  }, []);

  return { shift, perform, startTomorrow };
}
