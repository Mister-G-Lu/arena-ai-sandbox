/**
 * Promotions and zones as data. Requirements are declarative maps
 * ({ doubt: 2, components: 3 }) evaluated by one generic checker, so a tier
 * or zone is a data edit. Rank buys clearance, not credit headroom — see
 * src/game/ledger.ts.
 */

export interface ComponentDef {
  id: string;
  label: string;
}

/** Canonical component inventory. Save validation and every component counter
 *  derive from this table, so adding a component is one data edit. */
export const COMPONENT_DEFS: ComponentDef[] = [
  { id: 'key', label: 'NULL KEY' },
  { id: 'lens', label: 'LENS' },
  { id: 'wire', label: 'WIRE' },
  { id: 'crystal', label: 'CRYSTAL' },
  { id: 'chip', label: 'CHIP' },
  { id: 'interim', label: 'INTERIM' },
];

export interface RequirementCtx {
  qualities: Record<string, number>;
  attention: number;
  componentsCount: number;
  deaths: number;
  day: number;
  unlocks: string[];
  zones: Record<string, string>;
}

/** Anything that is not a quality name is read off the context by these keys. */
const CONTEXT_METRICS: Record<string, (ctx: RequirementCtx) => number> = {
  components: (ctx) => ctx.componentsCount,
  deaths: (ctx) => ctx.deaths,
  day: (ctx) => ctx.day,
  attention: (ctx) => ctx.attention,
};

const METRIC_LABELS: Record<string, string> = {
  components: 'Components',
  deaths: 'Deaths',
  day: 'Day',
  attention: 'Attention',
  doubt: 'Doubt',
  perception: 'Perception',
  routine: 'Routine',
};

export function metricValue(name: string, ctx: RequirementCtx): number {
  const key = name.toLowerCase();
  const fromContext = CONTEXT_METRICS[key];
  if (fromContext) return fromContext(ctx);
  return ctx.qualities?.[key] ?? 0;
}

export function meetsRequirements(
  requires: Record<string, number> | undefined,
  ctx: RequirementCtx,
): boolean {
  if (!requires) return true;
  return Object.entries(requires).every(([name, threshold]) => metricValue(name, ctx) >= threshold);
}

export function requirementLabel(requires: Record<string, number> | undefined): string {
  if (!requires || Object.keys(requires).length === 0) return 'No requirements';
  return Object.entries(requires)
    .map(([name, threshold]) => `${METRIC_LABELS[name.toLowerCase()] ?? name} ≥ ${threshold}`)
    .join(' · ');
}

/** What is still missing, for the "next promotion" panel. */
export function missingRequirements(
  requires: Record<string, number> | undefined,
  ctx: RequirementCtx,
): string[] {
  if (!requires) return [];
  return Object.entries(requires)
    .filter(([name, threshold]) => metricValue(name, ctx) < threshold)
    .map(([name, threshold]) =>
      `${METRIC_LABELS[name.toLowerCase()] ?? name} ${metricValue(name, ctx)}/${threshold}`,
    );
}

/* ------------------------------------------------------------------ */
/* Promotions                                                          */
/* ------------------------------------------------------------------ */

export interface PromotionDef {
  tier: number;
  title: string;
  unlocks: string[];
  requires?: Record<string, number>;
  /** Line the Manager files when the tier lands. */
  memo?: string;
}

export const PROMOTIONS: PromotionDef[] = [
  {
    tier: 0,
    title: 'Unknown Operator',
    unlocks: ['basic-tasks', 'break-room', 'memos'],
  },
  {
    tier: 1,
    title: 'Operator',
    unlocks: ['notice-storylets'],
    requires: { doubt: 1 },
    memo: 'Your file has been upgraded from UNKNOWN OPERATOR to OPERATOR. You have been noticing. Noticing is permitted. — M.',
  },
  {
    tier: 2,
    title: 'Senior Operator',
    unlocks: ['restricted-areas', 'deeper-investigation'],
    // The first shift establishes the job; the second is allowed to reveal
    // what the job has been hiding. Even a highly curious orientation cannot
    // surface the full Floor 12 expedition before its Shift 2 lead arrives.
    requires: { day: 2, doubt: 2, perception: 1 },
    memo: 'SENIOR OPERATOR. Restricted areas are now listed on your terminal. The Annex attachment has always been open. — M.',
  },
  {
    tier: 3,
    title: 'Lead Operator',
    unlocks: ['self-dispatch', 'operator5-log'],
    requires: { doubt: 3, components: 2 },
    memo: 'LEAD OPERATOR. You may now dispatch yourself. Please do not dispatch yourself. — M.',
  },
  {
    tier: 4,
    title: 'Acting Manager',
    unlocks: ['classified-memos', 'all-secret-zones'],
    requires: { doubt: 4, components: 4 },
    memo: 'ACTING MANAGER. The previous holder of this title is not available for handover. — M.',
  },
  {
    tier: 5,
    title: 'Manager',
    unlocks: ['the-summons', 'final-choice', 'endings'],
    requires: { components: 6 },
    memo: 'MANAGER. There is only one office left. You already know which floor it is on. — M.',
  },
];

/** The highest tier the operator now qualifies for (never demotes). */
export function nextPromotion(currentTier: number, ctx: RequirementCtx): PromotionDef | null {
  const next = PROMOTIONS[currentTier + 1];
  if (!next) return null;
  return meetsRequirements(next.requires, ctx) ? next : null;
}

export function unlocksThrough(tier: number): string[] {
  return PROMOTIONS.slice(0, tier + 1).flatMap((p) => p.unlocks);
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

export type ZoneState = 'locked' | 'open' | 'complete';

export interface ZoneDef {
  id: string;
  title: string;
  kicker: string;
  blurb: string;
  /** First storylet id in `src/content/<zone>/`. */
  entry: string;
  /** Quality/metric thresholds required to enter. */
  requires?: Record<string, number>;
  /** Thresholds required before the zone is listed at all. */
  visibleRequires?: Record<string, number>;
  /** Promotion unlock flag required to even see the zone listed. */
  requiresUnlock?: string;
  /** Component awarded the first time the zone completes. */
  component?: string;
  componentLabel?: string;
  /** Cards in this zone can only ever be taken once each. */
  onceEach?: boolean;
  /** Fiction shown when the zone is closed for good. */
  closedNote?: string;
}

export const ZONES: ZoneDef[] = [
  {
    id: 'annex-order',
    title: 'Annex elevator discrepancy',
    kicker: 'SECONDARY ORDER // SHIFT 2',
    blurb:
      'Car 2 registered an out-of-range stop three seconds before your shift began. The service field says FLOOR 12. It also says you requested it.',
    entry: 'annex-order-01',
    visibleRequires: { day: 2 },
    requires: { day: 2 },
    onceEach: true,
    closedNote:
      'The discrepancy is filed. The attachment remains on your record; what it reveals depends on your clearance.',
  },
  {
    id: 'routine',
    title: 'The Routine Pool',
    kicker: 'NOTICES // OPTIONAL',
    blurb:
      'Ordinary work, read twice. The pool is where a careful operator finds the seams: a basement in a building that is not on the map, a population that does not move.',
    entry: 'routine-01',
    requiresUnlock: 'notice-storylets',
    onceEach: true,
    closedNote: 'Every notice in the pool has been read. The pool refills on a schedule nobody has ever seen.',
  },
  {
    id: 'floor12',
    title: 'Floor 12',
    kicker: 'EXPEDITION // UNLISTED',
    blurb:
      'The Municipal Annex has eleven floors. The elevator panel disagrees, quietly, at exactly the height where a twelfth would be.',
    entry: 'floor12-01',
    requiresUnlock: 'restricted-areas',
    requires: { day: 2, doubt: 2, perception: 1 },
    component: 'key',
    componentLabel: 'NULL KEY',
    closedNote:
      'Floor 12 has been redesignated. The elevator panel is warm and blank again. The key is still in your pocket.',
  },
];

export function zoneById(id: string): ZoneDef | undefined {
  return ZONES.find((z) => z.id === id);
}

/** Zones the operator is allowed to know about at all. */
export function visibleZones(ctx: RequirementCtx): ZoneDef[] {
  return ZONES.filter((z) =>
    meetsRequirements(z.visibleRequires, ctx) &&
    (!z.requiresUnlock || ctx.unlocks.includes(z.requiresUnlock)),
  );
}

export function zoneState(zone: ZoneDef, ctx: RequirementCtx): ZoneState {
  if (ctx.zones?.[zone.id] === 'complete') return 'complete';
  if (zone.requiresUnlock && !ctx.unlocks.includes(zone.requiresUnlock)) return 'locked';
  return meetsRequirements(zone.requires, ctx) ? 'open' : 'locked';
}
