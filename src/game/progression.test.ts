import { describe, expect, it } from 'vitest';
import {
  PROMOTIONS,
  ZONES,
  clearanceLabel,
  meetsRequirements,
  missingRequirements,
  nextPromotion,
  requirementLabel,
  unlockLabel,
  unlocksThrough,
  visibleZones,
  zoneState,
  type RequirementCtx,
} from './progression';

function ctx(overrides: Partial<RequirementCtx> = {}): RequirementCtx {
  return {
    qualities: { doubt: 0, perception: 0, routine: 0 },
    attention: 0,
    componentsCount: 0,
    deaths: 0,
    day: 1,
    tier: 0,
    unlocks: [...PROMOTIONS[0].unlocks],
    zones: {},
    supplies: {},
    ...overrides,
  };
}

describe('promotions', () => {
  it('no longer touches the credit ledger', () => {
    for (const p of PROMOTIONS) expect(p).not.toHaveProperty('maxCredits');
  });

  it('promotes to Operator on the first point of Doubt', () => {
    expect(nextPromotion(0, ctx())).toBeNull();
    const earned = nextPromotion(0, ctx({ qualities: { doubt: 1, perception: 0, routine: 0 } }));
    expect(earned?.title).toBe('Operator');
    expect(earned?.unlocks).toContain('notice-storylets');
  });

  it('holds Senior clearance until the Shift 2 Floor 12 lead has arrived', () => {
    const curious = { doubt: 2, perception: 1, routine: 0 };
    expect(nextPromotion(1, ctx({ qualities: curious }))).toBeNull();
    const earned = nextPromotion(1, ctx({ day: 2, qualities: curious }));
    expect(earned?.title).toBe('Senior Operator');
  });

  it('accumulates unlocks through the tiers', () => {
    expect(unlocksThrough(1)).toEqual(expect.arrayContaining(['basic-tasks', 'notice-storylets']));
  });

  it('renders requirement labels from data', () => {
    expect(requirementLabel({ doubt: 3, components: 2 })).toBe('Doubt ≥ 3 · Components ≥ 2');
    expect(requirementLabel(undefined)).toBe('No requirements');
    expect(missingRequirements({ doubt: 3 }, ctx({ qualities: { doubt: 1, perception: 0, routine: 0 } })))
      .toEqual(['Doubt 1/3']);
  });

  it('reads context metrics as well as qualities', () => {
    expect(meetsRequirements({ components: 6 }, ctx({ componentsCount: 6 }))).toBe(true);
    expect(meetsRequirements({ deaths: 1 }, ctx())).toBe(false);
  });

  it('reads the promotion tier as a clearance metric', () => {
    expect(meetsRequirements({ tier: 1 }, ctx())).toBe(false);
    expect(meetsRequirements({ tier: 1 }, ctx({ tier: 1 }))).toBe(true);
    expect(requirementLabel({ tier: 2 })).toBe('Promotion ≥ 2');
  });

  it('reads supply ownership as a requirement metric and labels it by product', () => {
    expect(meetsRequirements({ coffee: 1 }, ctx())).toBe(false);
    expect(meetsRequirements({ coffee: 1 }, ctx({ supplies: { coffee: true } }))).toBe(true);
    expect(requirementLabel({ coffee: 1 })).toBe('GROUND COFFEE ≥ 1');
    expect(missingRequirements({ coffee: 1, day: 2 }, ctx({ supplies: { coffee: true } })))
      .toEqual(['Day 1/2']);
  });

  it('labels clearance flags by the promotion that grants them', () => {
    expect(clearanceLabel('restricted-areas')).toBe('SENIOR OPERATOR CLEARANCE');
    expect(clearanceLabel('notice-storylets')).toBe('OPERATOR CLEARANCE');
    expect(clearanceLabel('never-granted')).toBe('NEVER GRANTED');
    expect(unlockLabel('operator5-log')).toBe('Operator 5\u2019s log');
    expect(unlockLabel('made-up-flag')).toBe('MADE UP FLAG');
  });
});

describe('zones', () => {
  it('keeps routine notices separate from active investigations', () => {
    expect(Object.fromEntries(ZONES.map((zone) => [zone.id, zone.board]))).toEqual({
      'annex-order': 'investigations',
      routine: 'notices',
      floor12: 'investigations',
    });
  });

  it('reveals the universal Annex order on Shift 2 while promotion controls the rest', () => {
    expect(visibleZones(ctx())).toHaveLength(0);
    expect(visibleZones(ctx({ day: 2 })).map((z) => z.id)).toEqual(['annex-order']);
    const withNotices = visibleZones(ctx({ unlocks: ['notice-storylets'] }));
    expect(withNotices.map((z) => z.id)).toEqual(['routine']);
  });

  it('opens Floor 12 only on Shift 2 with curiosity and restricted-area clearance', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    const clearance = ['notice-storylets', 'restricted-areas'];
    const curious = { doubt: 2, perception: 1, routine: 0 };
    expect(zoneState(floor12, ctx({ unlocks: clearance, qualities: curious }))).toBe('locked');
    expect(zoneState(floor12, ctx({ day: 2, unlocks: clearance, qualities: curious }))).toBe('open');
  });

  it('reports a finished zone as complete regardless of requirements', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    expect(zoneState(floor12, ctx({ zones: { floor12: 'complete' } }))).toBe('complete');
  });

  it('awards exactly one component per expedition zone', () => {
    expect(ZONES.filter((z) => z.component).map((z) => z.component)).toEqual(['key']);
  });
});
