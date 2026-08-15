import { describe, expect, it } from 'vitest';
import { ZONE_IDS } from '../game/storylets';
import { cardsInZone, findCard, loadAllStorylets } from './load';

describe('content pipeline', () => {
  const cards = loadAllStorylets();

  it('loads 18 validated cards — 6 per zone', () => {
    expect(cards).toHaveLength(18);
    for (const zone of ZONE_IDS) {
      expect(cardsInZone(cards, zone)).toHaveLength(6);
    }
  });

  it('every card id is unique and findable', () => {
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findCard(cards, 'tutorial-01')?.title).toBe('Clock in');
    expect(findCard(cards, 'missing')).toBeUndefined();
  });

  it('keeps transition flags on the choice, never the outcome', () => {
    for (const card of cards) {
      for (const choice of card.choices) {
        expect(choice.outcome).not.toHaveProperty('next');
        expect(choice.outcome).not.toHaveProperty('endZone');
        expect(choice.outcome).not.toHaveProperty('completeZone');
      }
    }
  });

  it('tutorial-06 completes the zone; floor12 has an opt-out', () => {
    const t6 = findCard(cards, 'tutorial-06');
    expect(t6?.choices.some((c) => c.completeZone)).toBe(true);
    const f1 = findCard(cards, 'floor12-01');
    expect(f1?.choices.some((c) => c.endZone)).toBe(true);
  });
});
