/**
 * Anomalies the operator managed to keep. Most glitches self-correct; a kept
 * glitch is evidence that survived correction — the currency the endgame
 * respects. Each entry is data so awarding one is a one-line state change.
 */

export interface GlitchDef {
  id: string;
  title: string;
  description: string;
  /** What the discovery is *evidence of*, for later story gating. */
  reveals: string;
}

export const GLITCH_DEFS: Record<string, GlitchDef> = {
  'ledger-overflow': {
    id: 'ledger-overflow',
    title: 'THE WORD',
    description:
      'You pushed the municipal ledger past 2,147,483,647 and watched the balance turn negative for one frame before the field gave up and stopped being a number. Cities do not have word sizes. Programs do.',
    reveals: 'simulation'
  }
};

export function glitchDef(id: string): GlitchDef | undefined {
  return GLITCH_DEFS[id];
}

export function hasGlitch(glitches: string[] | undefined, id: string): boolean {
  return Array.isArray(glitches) && glitches.includes(id);
}
