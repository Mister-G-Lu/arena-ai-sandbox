import { describe, expect, it } from 'vitest';
import {
  PROMOTIONS,
  ZONES,
  clearanceLabel,
  hasSkillRequirements,
  meetsRequirements,
  missingRequirements,
  nextPromotion,
  requirementBadges,
  requirementLabel,
  skillCheckPercent,
  skillChecksFor,
  unlockLabel,
  unlocksThrough,
  visibleZones,
  zoneById,
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

  it('computes Fallen London-style skill check odds, clamped to 5–95', () => {
    expect(skillCheckPercent(1, 1)).toBe(60); // at the bar
    expect(skillCheckPercent(0, 1)).toBe(50); // one below the bar
    expect(skillCheckPercent(2, 1)).toBe(70); // one above
    expect(skillCheckPercent(20, 1)).toBe(95); // ceiling
    expect(skillCheckPercent(0, 20)).toBe(5); // floor
  });

  it('builds render-ready badges, with skill checks only on demand', () => {
    const c = ctx({ day: 2, qualities: { doubt: 2, perception: 1, routine: 0 } });
    const gate = requirementBadges({ day: 2, perception: 1 }, c);
    expect(gate.find((b) => b.name === 'Day')!.met).toBe(true);
    // A promotion reads skills as hard bars — no chance attached.
    expect(gate.find((b) => b.name === 'Perception')!.chance).toBeNull();
    expect(gate.find((b) => b.name === 'Perception')!.met).toBe(true);

    const checks = requirementBadges({ day: 2, perception: 1 }, c, { skillChecks: true });
    expect(checks.find((b) => b.name === 'Perception')!.chance).toBe(60);
    expect(skillChecksFor({ day: 2, perception: 1 }, c).map((b) => b.name)).toEqual(['Perception']);
    expect(hasSkillRequirements({ day: 2, perception: 1 })).toBe(true);
    expect(hasSkillRequirements({ day: 2 })).toBe(false);
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
      'handwritten-order': 'investigations',
      routine: 'notices',
      'day-crew-notes': 'notices',
      floor12: 'investigations',
      'restricted-files': 'notices',
      breakroom: 'notices',
      'night-radio': 'notices',
      'utility-closet': 'notices',
      'custodial-stores': 'notices',
      'window-ledge': 'notices',
      doorman: 'notices',
    });
  });

  it('lists the Day 3 coincidences once the shift arrives, gated on a Perception check', () => {
    // Day 2: not yet — the Annex lead is the only case that shift.
    expect(visibleZones(ctx({ day: 2 })).map((z) => z.id)).not.toContain('handwritten-order');
    expect(visibleZones(ctx({ day: 2 })).map((z) => z.id)).not.toContain('day-crew-notes');

    // Day 3: both are listed for everyone, sealed behind a Perception check —
    // the lock itself is the hint. Meeting the bar does not open the door; it
    // only moves the odds.
    const day3 = ctx({ day: 3 });
    const ids = visibleZones(day3).map((z) => z.id);
    expect(ids).toContain('handwritten-order');
    expect(ids).toContain('day-crew-notes');
    expect(zoneState(zoneById('handwritten-order')!, day3)).toBe('challengeable');
    expect(zoneState(zoneById('day-crew-notes')!, day3)).toBe('challengeable');

    const noticing = ctx({ day: 3, qualities: { doubt: 0, perception: 1, routine: 0 } });
    expect(zoneState(zoneById('handwritten-order')!, noticing)).toBe('challengeable');
    expect(zoneState(zoneById('day-crew-notes')!, noticing)).toBe('challengeable');

    // A passed check is recorded in the zones map; that is what flips to open.
    const opened = ctx({
      day: 3,
      qualities: { doubt: 0, perception: 1, routine: 0 },
      zones: { 'handwritten-order': 'open' },
    });
    expect(zoneState(zoneById('handwritten-order')!, opened)).toBe('open');
  });

  it('reveals the universal Annex order on Shift 2 while promotion controls the rest', () => {
    expect(visibleZones(ctx())).toHaveLength(0);
    // On Shift 2 the Floor 12 expedition is *listed* for everyone — sealed,
    // with its clearance shown — so the hierarchy itself is the hint.
    expect(visibleZones(ctx({ day: 2 })).map((z) => z.id)).toEqual(['annex-order', 'floor12']);
    const withNotices = visibleZones(ctx({ unlocks: ['notice-storylets'] }));
    expect(withNotices.map((z) => z.id)).toEqual(['routine']);
  });

  it('lists promotion-gated content as a locked teaser before clearance', () => {
    const operator = ctx({
      tier: 1,
      unlocks: ['basic-tasks', 'break-room', 'memos', 'notice-storylets'],
    });
    const ids = visibleZones(operator).map((z) => z.id);
    expect(ids).toContain('restricted-files');
    expect(zoneState(zoneById('restricted-files')!, operator)).toBe('locked');
    // Supply zones are listed for operators but stay sealed until the good is
    // ordered from the terminal.
    expect(ids).toContain('breakroom');
    expect(zoneState(zoneById('breakroom')!, operator)).toBe('locked');
    // ...and a day-1 Operator does not yet see the Shift 2 expedition.
    expect(ids).not.toContain('floor12');
  });

  it('opens Floor 12 only on Shift 2 with curiosity and restricted-area clearance', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    const clearance = ['notice-storylets', 'restricted-areas'];
    const curious = { doubt: 2, perception: 1, routine: 0 };
    // Shift 1 keeps the expedition sealed outright; Shift 2 with clearance and
    // curiosity leaves it challengeable — the door is a roll, not a key.
    expect(zoneState(floor12, ctx({ unlocks: clearance, qualities: curious }))).toBe('locked');
    expect(zoneState(floor12, ctx({ day: 2, unlocks: clearance, qualities: curious }))).toBe('challengeable');
    expect(zoneState(floor12, ctx({
      day: 2,
      unlocks: clearance,
      qualities: curious,
      zones: { floor12: 'open' },
    }))).toBe('open');
  });

  it('opens a supply zone when the good is owned', () => {
    const operator = ctx({
      tier: 1,
      unlocks: ['basic-tasks', 'break-room', 'memos', 'notice-storylets'],
      supplies: { coffee: true },
    });
    expect(zoneState(zoneById('breakroom')!, operator)).toBe('open');
    expect(zoneState(zoneById('night-radio')!, operator)).toBe('locked');
  });

  it('reports a finished zone as complete regardless of requirements', () => {
    const floor12 = ZONES.find((z) => z.id === 'floor12')!;
    expect(zoneState(floor12, ctx({ zones: { floor12: 'complete' } }))).toBe('complete');
  });

  it('awards exactly one component per expedition zone', () => {
    expect(ZONES.filter((z) => z.component).map((z) => z.component)).toEqual(['key']);
  });
});
