/**
 * The municipal supply terminal — where Salary becomes something you can hold.
 *
 * The two economies (design/core-design.md P2): Salary is mundane, uncapped,
 * and meant for small useful things. Supplies are those things: bought once
 * with credits, carried in the operator file, and each one opens a small
 * storylet zone on the Notices board. Zone gating is declarative
 * (`requires: { coffee: 1 }`) and evaluated by the one checker in
 * src/game/progression.ts — a supply is just another requirement metric.
 *
 * Adding a supply is one data edit: the save schema, the shop UI, and the
 * requirement labels all derive from SUPPLY_DEFS.
 */

export interface SupplyDef {
  id: string;
  name: string;
  /** Purchase price in credits. Salary has no cap; goods have prices. */
  price: number;
  category: string;
  blurb: string;
  /** What the operator is buying towards, shown on the card. */
  hint?: string;
  /** Zone this supply opens once owned. */
  unlocksZone?: string;
  /** Logbook line filed when the order lands. */
  arrivalNote?: string;
  /** A teaser item that is never in stock yet — a hint of future stock. */
  locked?: boolean;
  lockedNote?: string;
}

export const SUPPLY_DEFS: SupplyDef[] = [
  {
    id: 'coffee',
    name: 'GROUND COFFEE',
    price: 30,
    category: 'CONSUMABLE',
    blurb:
      'The break-room brew is already warm. It is warm because the building wants it warm. Your own grounds are warm for a better reason.',
    hint: 'UNLOCKS: THE COFFEE MACHINE — a cup you made yourself.',
    unlocksZone: 'breakroom',
    arrivalNote: 'The grounds arrived. The machine accepted them without comment.'
  },
  {
    id: 'radio-permit',
    name: 'NIGHT RADIO PERMIT',
    price: 45,
    category: 'PERMIT',
    blurb: "Dispatch's license covers the day crew. The night channel is quieter, and its fine print is longer.",
    hint: 'UNLOCKS: THE NIGHT RADIO — a channel that is not empty after 03:00.',
    unlocksZone: 'night-radio',
    arrivalNote: 'Permit issued. Receiving hours extended to 06:00. Fine print: receiving is not authorised.'
  },
  {
    id: 'torch',
    name: 'POCKET TORCH',
    price: 25,
    category: 'TOOL',
    blurb: "The annex's emergency lighting is decorative. Carry light the building did not install.",
    hint: 'UNLOCKS: THE UTILITY CLOSET — what the dark is hiding.',
    unlocksZone: 'utility-closet',
    arrivalNote: 'Torch delivered. Batteries: included. Batteries: warm.'
  },
  {
    id: 'bolt-cutters',
    name: 'BOLT CUTTERS',
    price: 60,
    category: 'TOOL',
    blurb: 'Custodial says they are out. Custodial is not wrong, precisely; they were never in.',
    hint: 'UNLOCKS: CUSTODIAL STORES — the memo about the fence that is not there.',
    unlocksZone: 'custodial-stores',
    arrivalNote: 'Bolt cutters received. Heavy, patient, older than the building. Custodial ledger remains balanced.'
  },
  {
    id: 'thermos',
    name: 'THERMOS',
    price: 20,
    category: 'CONSUMABLE',
    blurb: 'Coffee that stays warm somewhere the building is not. The ledge is optional. Recommended.',
    hint: 'UNLOCKS: THE WINDOW LEDGE — the courtyard, from the only comfortable angle.',
    unlocksZone: 'window-ledge',
    arrivalNote: 'Thermos received. It keeps heat. It keeps other things too.'
  },
  {
    id: 'doorman-smokes',
    name: 'MORNING SMOKES, DOORMAN',
    price: 50,
    category: 'CONSUMABLE',
    blurb:
      'A bribe is an expense with a better name. The doorman remembers faces. The memo says he does not exist.',
    hint: 'UNLOCKS: THE DOORMAN — the lobby\u2019s only permanent resident.',
    unlocksZone: 'doorman',
    arrivalNote: 'Box delivered to the Annex lobby. Receipt not required. Not accepted. Not needed.'
  },
  {
    id: 'machine-favor',
    name: 'THE MACHINE\u2019S FAVOR',
    price: 0,
    category: 'CLASSIFIED',
    blurb:
      'The third-floor vending machine has been redesignated. It still accepts orders. It remembers every one of them.',
    locked: true,
    lockedNote:
      'UNAVAILABLE // the machine will name its price when it is ready. It is not ready.'
  }
];

export function supplyById(id: string): SupplyDef | undefined {
  return SUPPLY_DEFS.find((s) => s.id === id);
}

/** Purchaseable supplies the operator owns, in table order. */
export function ownedSupplyIds(supplies: Record<string, boolean> | undefined): string[] {
  return SUPPLY_DEFS.filter((s) => !s.locked && supplies?.[s.id]).map((s) => s.id);
}

export function supplyCount(supplies: Record<string, boolean> | undefined): number {
  return ownedSupplyIds(supplies).length;
}

/** A supply is a real purchase only if the terminal sells it and it is not a teaser. */
export function isPurchaseable(id: string): boolean {
  const def = supplyById(id);
  return Boolean(def && !def.locked && Number.isFinite(def.price) && def.price > 0);
}
