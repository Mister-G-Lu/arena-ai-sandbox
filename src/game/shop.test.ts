import { describe, expect, it } from 'vitest';
import {
  SUPPLY_DEFS,
  isPurchaseable,
  ownedSupplyIds,
  supplyById,
  supplyCount,
} from './shop';

describe('supply table', () => {
  it('gives every supply a unique id and every real good a price', () => {
    const ids = SUPPLY_DEFS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const supply of SUPPLY_DEFS.filter((s) => !s.locked)) {
      expect(supply.price).toBeGreaterThan(0);
      expect(supply.name.length).toBeGreaterThan(0);
      expect(supply.blurb.length).toBeGreaterThan(0);
    }
  });

  it('keeps one classified teaser item permanently out of stock', () => {
    const teasers = SUPPLY_DEFS.filter((s) => s.locked);
    expect(teasers.length).toBe(1);
    expect(isPurchaseable(teasers[0].id)).toBe(false);
    expect(isPurchaseable('no-such-supply')).toBe(false);
  });

  it('resolves ids and counts owned goods in table order', () => {
    expect(supplyById('coffee')?.name).toBe('GROUND COFFEE');
    expect(supplyById('bogus')).toBeUndefined();
    expect(ownedSupplyIds({ coffee: true, thermos: true })).toEqual(['coffee', 'thermos']);
    // A teaser item can never be "owned" even if the file says so.
    expect(ownedSupplyIds({ 'machine-favor': true })).toEqual([]);
    expect(supplyCount(undefined)).toBe(0);
    expect(supplyCount({ coffee: true })).toBe(1);
  });

  it('every unlocked good names a storylet zone to open', () => {
    for (const supply of SUPPLY_DEFS.filter((s) => s.unlocksZone)) {
      expect(supply.unlocksZone!.length).toBeGreaterThan(0);
    }
    // The zone table itself pins supplies to their zones (see progression's
    // ZONES); this side of the contract is asserted with the zones.
  });
});
