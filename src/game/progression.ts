/**
 * Promotions and zones as data. Requirements are declarative maps
 * ({ doubt: 2, components: 3 }) evaluated by one generic checker, so a tier
 * or zone is a data edit. Rank buys clearance, not credit headroom — see
 * src/game/ledger.ts. Supplies (src/game/shop.ts) are requirement metrics
 * too: a zone can demand `{ coffee: 1 }` and the same checker reads it off
 * the operator file.
 */
import { supplyById } from './shop';
import { ZONES, type ZoneDef, type ZoneState } from './progressionZones';

export { ZONES } from './progressionZones';
export type { ZoneDef, ZoneState } from './progressionZones';

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
  /** Current promotion tier — clearance is a metric like any other. */
  tier: number;
  unlocks: string[];
  zones: Record<string, string>;
  /** Owned supplies, keyed by supply id (see src/game/shop.ts). */
  supplies: Record<string, boolean>;
}

/** Anything that is not a quality name is read off the context by these keys. */
const CONTEXT_METRICS: Record<string, (ctx: RequirementCtx) => number> = {
  components: (ctx) => ctx.componentsCount,
  deaths: (ctx) => ctx.deaths,
  day: (ctx) => ctx.day,
  attention: (ctx) => ctx.attention,
  tier: (ctx) => ctx.tier,
};

const METRIC_LABELS: Record<string, string> = {
  components: 'Components',
  deaths: 'Deaths',
  day: 'Day',
  attention: 'Attention',
  tier: 'Promotion',
  doubt: 'Doubt',
  perception: 'Perception',
  routine: 'Routine',
};

/** Human label for a requirement key — supply ids render as their product name. */
function labelFor(name: string): string {
  const key = name.toLowerCase();
  return METRIC_LABELS[key] ?? supplyById(key)?.name ?? name;
}

export function metricValue(name: string, ctx: RequirementCtx): number {
  const key = name.toLowerCase();
  const fromContext = CONTEXT_METRICS[key];
  if (fromContext) return fromContext(ctx);
  const supplies = ctx.supplies ?? {};
  if (Object.prototype.hasOwnProperty.call(supplies, key)) return supplies[key] ? 1 : 0;
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
    .map(([name, threshold]) => `${labelFor(name)} ≥ ${threshold}`)
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
      `${labelFor(name)} ${metricValue(name, ctx)}/${threshold}`,
    );
}

/**
 * Promotion unlock flags, rendered as human copy (the "what this promotion
 * adds" list on the clearance forecast).
 */
export const UNLOCK_LABELS: Record<string, string> = {
  'basic-tasks': 'Basic tasks',
  'break-room': 'Break room',
  memos: 'Memos',
  'notice-storylets': 'Notice storylets',
  'restricted-areas': 'Restricted areas — Floor 12 access',
  'deeper-investigation': 'Deeper investigation',
  'self-dispatch': 'Self-dispatch',
  'operator5-log': 'Operator 5\u2019s log',
  'classified-memos': 'Classified memos',
  'all-secret-zones': 'All secret zones',
  'the-summons': 'The Summons',
  'final-choice': 'Final choice',
  endings: 'Endings',
};

/** Human label for a single unlock flag, with a data-driven fallback. */
export function unlockLabel(flag: string): string {
  return UNLOCK_LABELS[flag] ?? flag.replace(/-/g, ' ').toUpperCase();
}

/** "SENIOR OPERATOR CLEARANCE" for the promotion that grants `flag`. */
export function clearanceLabel(flag: string): string {
  const promo = PROMOTIONS.find((p) => p.unlocks.includes(flag));
  return promo ? `${promo.title.toUpperCase()} CLEARANCE` : unlockLabel(flag);
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

export function zoneById(id: string): ZoneDef | undefined {
  return ZONES.find((z) => z.id === id);
}

/** Zones the operator is allowed to know about at all. A zone whose clearance
 *  is still locked is listed anyway when it declares `hintUnlock` — the lock
 *  itself is the hint. */
export function visibleZones(ctx: RequirementCtx): ZoneDef[] {
  return ZONES.filter((z) =>
    meetsRequirements(z.visibleRequires, ctx) &&
    (!z.requiresUnlock || ctx.unlocks.includes(z.requiresUnlock) || z.hintUnlock),
  );
}

export function zoneState(zone: ZoneDef, ctx: RequirementCtx): ZoneState {
  if (ctx.zones?.[zone.id] === 'complete') return 'complete';
  if (zone.requiresUnlock && !ctx.unlocks.includes(zone.requiresUnlock)) return 'locked';
  return meetsRequirements(zone.requires, ctx) ? 'open' : 'locked';
}
