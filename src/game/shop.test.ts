import { describe, expect, it } from 'vitest';
import { ZONES, zoneById } from './progression';
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

  it('pins every supply to the zone it unlocks, and the zone to the supply', () => {
    for (const supply of SUPPLY_DEFS.filter((s) => s.unlocksZone)) {
      const zone = zoneById(supply.unlocksZone!);
      expect(zone, `${supply.id} unlocks a configured zone`).toBeDefined();
      // The zone must gate on the good itself. (A zone may *also* carry a day
      // gate — the supply zones are scheduled one per night so the first week
      // keeps paying out — but the supply is always in the requirement map.)
      expect(zone?.requires).toMatchObject({ [supply.id]: 1 });
    }
    // ...and the reverse: every supply-gated zone is gated by a real supply.
    for (const zone of ZONES) {
      for (const key of Object.keys(zone.requires ?? {})) {
        if (supplyById(key)) {
          expect(supplyById(key)?.unlocksZone).toBe(zone.id);
        }
      }
    }
  });
});
