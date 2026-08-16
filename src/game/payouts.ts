/**
 * PAYOUTS — what a filed result is worth.
 *
 * Nothing here is a magic constant sitting in a component. The base rate scales
 * with rank, and corrupted results pay *whatever number the corruption
 * contained* — because the handler reads the damaged field as currency without
 * checking it first. That is a bug in Meridian, not in this file, and it is the
 * documented on-ramp to the ledger overflow (see src/game/ledger.ts and
 * design/adversarial-review-01.md).
 */

export const BASE_TASK_REWARD = 10;

/** Rank multiplier: each promotion tier is worth another half-rate. */
export function rankMultiplier(tier: number): number {
  return 1 + Math.max(0, tier) * 0.5;
}

/**
 * Pull the largest number out of a string, ignoring thousands separators and
 * the block characters the corruption uses to eat digits.
 * "population: 41,31▓ — unchanged" -> 4131
 */
export function extractAnomalousAmount(text: string): number | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/[,\s](?=\d)/g, '');
  const tokens = cleaned.match(/\d+/g);
  if (!tokens || tokens.length === 0) return null;
  const largest = tokens.reduce((best, t) => {
    const n = Number(t);
    return Number.isFinite(n) && n > best ? n : best;
  }, 0);
  return largest > 0 ? largest : null;
}

export interface PayoutInput {
  /** Promotion tier at the time of filing. */
  tier?: number;
  /** Was the returned result corrupted? */
  corrupted?: boolean;
  /** Did the operator file it as clean (true) or log the discrepancy (false)? */
  filedClean?: boolean;
  /** The text that was actually displayed, corruption included. */
  resultText?: string;
}

export interface Payout {
  amount: number;
  /** True when the amount came out of a corrupted field. */
  anomalous: boolean;
  note: string;
}

/**
 * Filing a clean result pays the rank rate.
 * Filing a *corrupted* result as clean pays the corrupted number — the system
 * pays what it read.
 * Logging a discrepancy pays nothing: unreconciled work is unbilled work.
 */
export function taskPayout(input: PayoutInput = {}): Payout {
  const { tier = 0, corrupted = false, filedClean = true, resultText = '' } = input;
  const base = Math.round(BASE_TASK_REWARD * rankMultiplier(tier));

  if (corrupted && !filedClean) {
    return {
      amount: 0,
      anomalous: false,
      note: 'DISCREPANCY LOGGED // RESULT UNBILLED',
    };
  }

  if (corrupted && filedClean) {
    const anomalous = extractAnomalousAmount(resultText);
    // Payroll pays the damaged field, but never less than the work was worth:
    // the standard rate is a floor, so complicity is never a pay cut.
    if (anomalous !== null && anomalous > base) {
      return {
        amount: anomalous,
        anomalous: true,
        note: 'RESULT FILED AS CLEAN // PAYROLL READ THE DAMAGED FIELD',
      };
    }
  }

  return { amount: base, anomalous: false, note: 'RESULT FILED // STANDARD RATE' };
}
