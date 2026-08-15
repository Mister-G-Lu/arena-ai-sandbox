import { useCallback, useEffect, useRef, useState } from 'react';
import { cardsInZone, findCard, loadAllStorylets } from '../content/load';
import {
  applyChoice,
  createProgress,
  enterZone,
  firstIdInZone,
  parseProgress,
  type Progress,
  type ZoneId,
} from '../game/storylets';
import { STORAGE_KEYS, readJson, writeJson } from '../utils/storage';

const CARDS = loadAllStorylets();

export function loadProgress(): Progress {
  const raw = readJson<unknown>(STORAGE_KEYS.progress, null);
  if (raw == null) return createProgress();
  return parseProgress(raw);
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    writeJson(STORAGE_KEYS.progress, progress);
  }, [progress]);

  const currentCard = progress.current
    ? findCard(CARDS, progress.current.storyletId)
    : undefined;

  const choose = useCallback((choiceId: string): boolean => {
    const card = progressRef.current.current
      ? findCard(CARDS, progressRef.current.current.storyletId)
      : undefined;
    if (!card) return false;
    try {
      const result = applyChoice(progressRef.current, card, choiceId);
      setProgress(result.progress);
      setLastOutcome(result.choice.outcome.text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const openZone = useCallback((zone: ZoneId): boolean => {
    const first = firstIdInZone(CARDS, zone);
    if (!first) return false;
    const next = enterZone(progressRef.current, zone, first);
    if (next === progressRef.current) return false;
    setProgress(next);
    setLastOutcome(null);
    return true;
  }, []);

  const clearOutcome = useCallback(() => setLastOutcome(null), []);

  return {
    progress,
    cards: CARDS,
    currentCard,
    lastOutcome,
    choose,
    openZone,
    clearOutcome,
    zoneCards: (zone: ZoneId) => cardsInZone(CARDS, zone),
  };
}
