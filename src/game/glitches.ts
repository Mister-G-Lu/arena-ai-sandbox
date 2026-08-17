/**
 * Glitches — kept evidence of simulation flaws.
 *
 * DESIGN INTENT (see design/glitches.md):
 *
 * Glitches are the game's secret resource. They are not bugs — they are
 * *intentional flaws in the simulation* that the operator can discover,
 * preserve, and ultimately use to escape Meridian.
 *
 * The relationship between glitches and the endgame:
 *   - Components (6 secret zones) are the physical pieces of the Seam Ripper.
 *   - Glitches are the *knowledge* that the Seam Ripper needs to work.
 *   - A player with all 6 Components but no Glitches has built a tool but
 *     does not know what reality it cuts. A player with Glitches but no
 *     Components has the knowledge but not the means.
 *   - The true ending (SEAM RIPPED) requires both: Components authorize the
 *     tool, Glitches authorize the *use* of it.
 *
 * Glitches are discovered, not farmed:
 *   - Each glitch has exactly one trigger condition.
 *   - Most are missable — they require the operator to notice something the
 *     system would prefer they did not.
 *   - A "perfectly compliant" operator (all Routine, no Doubt) will finish
 *     the game with zero Glitches and reach the KEEP LOGGING ending.
 *   - A curious, skeptical operator who notices discrepancies and asks
 *     uncomfortable questions accumulates Glitches naturally.
 *
 * The `reveals` field tags what each glitch is evidence *of* — used for
 * endgame gating and for the Profile page's "ANOMALIES ON FILE" section.
 * Valid tags: 'simulation', 'identity', 'architecture', 'history', 'agency'.
 *
 * Keeping a glitch is always a choice. The system offers the operator a
 * chance to file it clean (erase it for a Routine/credit reward) or keep it
 * (preserve the evidence, gain Doubt, and unlock endgame progress). The
 * choice is the game.
 */

export interface GlitchDef {
  id: string;
  title: string;
  description: string;
  /**
   * What the discovery is *evidence of*. Used for:
   * 1. Endgame gating — the Seam Ripper needs evidence across categories.
   * 2. Profile display — grouped by what the operator has proven.
   * 3. Story branching — some NPCs react differently to operators who
   *    carry specific evidence.
   */
  reveals: 'simulation' | 'identity' | 'architecture' | 'history' | 'agency';
}

export const GLITCH_DEFS: Record<string, GlitchDef> = {
  'ledger-overflow': {
    id: 'ledger-overflow',
    title: 'THE WORD',
    reveals: 'simulation',
    description:
      'You pushed the municipal ledger past 2,147,483,647 and watched the ' +
      'balance turn negative for one frame before the field gave up and ' +
      'stopped being a number. Cities do not have word sizes. Programs do.',
  },
  'phantom-floor': {
    id: 'phantom-floor',
    title: 'THE FLOOR THAT IS NOT',
    reveals: 'architecture',
    description:
      'Floor 12 exists. The elevator knows. The roster knows. The floor ' +
      'plan says there are eleven floors. A building that lies about its ' +
      'own height is a building that was told to.',
  },
  'self-authored-order': {
    id: 'self-authored-order',
    title: 'YOUR HANDWRITING',
    reveals: 'identity',
    description:
      'A work order appeared at 03:12, signed in your hand, filed from ' +
      'your terminal. You were at the desk. You did not write it. The ' +
      'signature is flawless. The queue has no memory of this order. ' +
      'Something that writes like you is not you — unless it is.',
  },
  'operator-five': {
    id: 'operator-five',
    title: 'OPERATOR 5',
    reveals: 'history',
    description:
      'There was an Operator 5. The roster does not list them. The vent ' +
      'network remembers their route. The break room has a coffee cup ' +
      'with a name that is not on any shift record. The system says ' +
      'there have always been four operators. The cup says otherwise.',
  },
  'the-gap': {
    id: 'the-gap',
    title: 'THE GAP AT 06:00',
    reveals: 'agency',
    description:
      'At 06:00, the city reboots. Everyone forgets. Everyone except the ' +
      'error handler — which is you. The gap between frames is visible ' +
      'if you know where to look. The Seam Ripper holds that gap open. ' +
      'You are building a tool to step between the stitches.',
  },
};

/**
 * All glitch categories required for the true ending.
 * The Seam Ripper needs evidence across every category to function.
 */
export const REQUIRED_GLITCH_CATEGORIES: GlitchDef['reveals'][] = [
  'simulation',
  'architecture',
  'identity',
  'history',
  'agency',
];

/** Number of distinct categories the operator has proven. */
export function glitchCategoriesHeld(glitches: string[]): number {
  const categories = new Set(
    glitches
      .map((id) => GLITCH_DEFS[id]?.reveals)
      .filter(Boolean),
  );
  return categories.size;
}

/** Whether the operator has enough evidence categories for the true ending. */
export function canUseSeamRipper(glitches: string[]): boolean {
  return glitchCategoriesHeld(glitches) >= REQUIRED_GLITCH_CATEGORIES.length;
}

export function glitchDef(id: string): GlitchDef | undefined {
  return GLITCH_DEFS[id];
}

export function hasGlitch(glitches: string[] | undefined, id: string): boolean {
  return Array.isArray(glitches) && glitches.includes(id);
}
