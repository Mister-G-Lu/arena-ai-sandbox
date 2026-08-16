/**
 * The one place an outcome becomes state. Every consequence — orientation
 * choices, console discrepancies, storylet cards — is an `effects` object of
 * quality-name -> delta, normalised here (JSON uses capitalised names, the
 * save file lowercase). New qualities are a data change, not a code change.
 */

export type EffectKind = 'quality' | 'attention' | 'credits';

export interface QualityDef {
  key: string;
  label: string;
  kind: EffectKind;
  max: number;
  /** Hidden qualities are never rendered with a number. */
  hidden?: boolean;
  description?: string;
  /** Credits-like effects convert one point into this many credits. */
  rate?: number;
}

/** The canonical quality table. Order is display order. */
export const QUALITY_DEFS: Record<string, QualityDef> = {
  doubt: {
    key: 'doubt',
    label: 'Doubt',
    kind: 'quality',
    max: 5,
    description: 'Understanding of the loop and the system',
  },
  perception: {
    key: 'perception',
    label: 'Perception',
    kind: 'quality',
    max: 5,
    description: 'Ability to notice details and patterns',
  },
  routine: {
    key: 'routine',
    label: 'Routine',
    kind: 'quality',
    max: 99,
    description: 'How much the system likes you. Camouflage.',
  },
  attention: {
    key: 'attention',
    label: 'Attention',
    kind: 'attention',
    max: 10,
    hidden: true,
    description: 'How much the system notices you (death at 10)',
  },
  salary: {
    key: 'salary',
    label: 'Salary',
    kind: 'credits',
    max: Infinity,
    rate: 5,
    description: 'Mundane pay, in credits',
  },
};

export function qualityDef(name: string): QualityDef | undefined {
  return QUALITY_DEFS[String(name).trim().toLowerCase()];
}

export function visibleQualityDefs(): QualityDef[] {
  return Object.values(QUALITY_DEFS).filter((d) => !d.hidden && d.kind === 'quality');
}

/** Lowercase + drop anything the table doesn't know or that isn't a number. */
export function normalizeEffects(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    const def = qualityDef(name);
    if (!def) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) continue;
    out[def.key] = (out[def.key] ?? 0) + value;
  }
  return out;
}

export function clampQuality(name: string, value: number): number {
  const def = qualityDef(name);
  const max = def ? def.max : Infinity;
  return Math.min(Math.max(0, value), max);
}

/**
 * Human-readable summary of an outcome, e.g. "Doubt +1 · ¤+10".
 * Hidden qualities (Attention) never appear. Credit-like effects are shown in
 * the currency the player actually receives, not in their storylet units.
 */
export function describeEffects(raw: unknown): string {
  const effects = normalizeEffects(raw);
  // Always render in table order so the same outcome reads the same way twice.
  return Object.keys(QUALITY_DEFS)
    .filter((key) => key in effects && !QUALITY_DEFS[key].hidden)
    .map((key) => {
      const def = QUALITY_DEFS[key];
      const delta = effects[key];
      if (def.kind === 'credits') {
        const credits = delta * (def.rate ?? 1);
        return `¤${credits > 0 ? '+' : ''}${credits.toLocaleString()}`;
      }
      return `${def.label} ${delta > 0 ? '+' : ''}${delta}`;
    })
    .join(' · ');
}

/**
 * The system's politeness as a function of Attention. The number is never
 * shown; the tone is the tell.
 */
export function attentionTone(attention: number): string {
  const bands: [number, string][] = [
    [0, 'Polite'],
    [3, 'Courteous, and quicker to reply'],
    [5, 'Formal. Your name appears in full.'],
    [7, 'Apologetic. It keeps apologising.'],
    [9, 'Warm. It is being very kind to you.'],
  ];
  let tone = bands[0][1];
  for (const [floor, label] of bands) if (attention >= floor) tone = label;
  return tone;
}
