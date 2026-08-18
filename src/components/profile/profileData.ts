/** Shared data + types for the Operator Profile page sections. */

export interface JournalEntry {
  day: number;
  text: string;
  timestamp: number;
}

export interface ContactRecord {
  name: string;
  role: string;
  firstMet: number;
  interactions: number;
}

/** Quality unlock teasers — promotions and zones are gated by declarative
 * `requires` maps; a quality alone unlocks nothing. Rendered dimmed and
 * checkmark-free so the profile never advertises a ✓ the data didn't open. */
export const QUALITY_UNLOCKS: Record<string, string[]> = {
  doubt: [
    'Notice storylets',
    'Investigation actions',
    "Operator 5's log",
    'All secret zones',
    'The Summons',
  ],
  perception: [
    'Basic notices',
    'Hidden memos',
    "Operator 5's clues",
    "VANTABLACK's nature",
    "The Cleaner's identity",
  ],
  routine: [],
};
