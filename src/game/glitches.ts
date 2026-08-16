/**
 * GLITCHES — anomalies the operator managed to *keep*.
 *
 * Most glitches in Meridian self-correct within a second; the exception handler
 * is good at its job. A kept glitch is evidence that survived the correction,
 * and evidence is the only currency the endgame respects.
 *
 * Each entry is data so that awarding one is a one-line state change and the
 * profile can render any of them without knowing what they are.
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
