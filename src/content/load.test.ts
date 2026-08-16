import { describe, expect, it } from 'vitest';
import { ZONE_IDS } from '../game/storylets';
import { ZONES } from '../game/progression';
import { cardsInZone, findCard, loadAllStorylets } from './load';

describe('content pipeline', () => {
  const cards = loadAllStorylets();

  it('loads every live deck, including the one-card Shift 2 lead', () => {
    expect(cards).toHaveLength(13);
    expect(cardsInZone(cards, 'annex-order')).toHaveLength(1);
    expect(cardsInZone(cards, 'routine')).toHaveLength(6);
    expect(cardsInZone(cards, 'floor12')).toHaveLength(6);
  });

  it('keeps the content zone list pinned to the configured zones', () => {
    expect(ZONE_IDS).toEqual(ZONES.map((zone) => zone.id));
  });

  it('every card id is unique and findable', () => {
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findCard(cards, 'routine-01')?.title).toBe('Building 7, basement light');
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

  it('gives every expedition an opt-out and the pool one-shot notices', () => {
    const door = findCard(cards, 'floor12-01');
    expect(door?.choices.some((c) => c.endZone)).toBe(true);
    const stairs = findCard(cards, 'floor12-04');
    expect(stairs?.choices.some((c) => c.completeZone)).toBe(true);
    const end = findCard(cards, 'floor12-06');
    expect(end?.choices.some((c) => c.completeZone)).toBe(true);
    const notice = findCard(cards, 'routine-01');
    expect(notice?.choices.every((c) => c.endZone)).toBe(true);
  });
});
