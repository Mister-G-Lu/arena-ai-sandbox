import { describe, expect, it } from 'vitest';
import {
  PROMOTIONS,
  ZONES,
  meetsRequirements,
  missingRequirements,
  nextPromotion,
  requirementLabel,
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
    unlocks: [...PROMOTIONS[0].unlocks],
    zones: {},
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

  it('does not gate the second tier behind a death the player cannot reach yet', () => {
    const earned = nextPromotion(1, ctx({ qualities: { doubt: 2, perception: 1, routine: 0 } }));
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
});

describe('zones', () => {
  it('hides zones whose unlock flag is missing', () => {
    expect(visibleZones(ctx())).toHaveLength(0);
    const withNotices = visibleZones(ctx({ unlocks: ['notice-storylets'] }));
    expect(withNotices.map((z) => z.id)).toEqual(['routine']);
  });

  it('opens Floor 12 only on Doubt 2 / Perception 1 with restricted-area clearance', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    const clearance = ['notice-storylets', 'restricted-areas'];
    expect(zoneState(floor12, ctx({ unlocks: clearance }))).toBe('locked');
    expect(
      zoneState(floor12, ctx({ unlocks: clearance, qualities: { doubt: 2, perception: 1, routine: 0 } })),
    ).toBe('open');
  });

  it('reports a finished zone as complete regardless of requirements', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    expect(zoneState(floor12, ctx({ zones: { floor12: 'complete' } }))).toBe('complete');
  });

  it('awards exactly one component per expedition zone', () => {
    expect(ZONES.filter((z) => z.component).map((z) => z.component)).toEqual(['key']);
  });
});
