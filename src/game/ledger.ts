/**
 * Credits have no design cap — the only ceiling is the machine's signed
 * 32-bit word. Pushing past it wraps the ledger; the handler marks the
 * account UNBOUND. That is the OVERFLOW GLITCH (see design/core-design.md).
 */

/** Width of the municipal ledger word. The population chart uses the same one. */
export const LEDGER_WORD_BITS = 32;

/** Largest value the ledger word can hold: 2^31 - 1 = 2,147,483,647. */
export const CREDIT_LIMIT = creditLimit(LEDGER_WORD_BITS);

export function creditLimit(bits: number = LEDGER_WORD_BITS): number {
  return 2 ** (bits - 1) - 1;
}

export interface LedgerState {
  /** Current balance. `Infinity` once the ledger is unbound. */
  credits: number;
  /** True once the word has been broken and the handler stopped counting. */
  unbound: boolean;
}

export interface LedgerResult extends LedgerState {
  /** True only on the transaction that broke the word. */
  overflowed: boolean;
  /** The wrapped two's-complement value briefly displayed before the handler
   *  gave up. Negative, purely diegetic — the UI flashes it. */
  wrapped: number | null;
}

function isCountable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Two's-complement wrap of a value into a signed word of `bits` width. */
export function wrapSigned(value: number, bits: number = LEDGER_WORD_BITS): number {
  const span = 2n ** BigInt(bits);
  const half = span / 2n;
  const v = BigInt(Math.trunc(value));
  let wrapped = ((v % span) + span) % span;
  if (wrapped >= half) wrapped -= span;
  return Number(wrapped);
}

/** Credit an amount. An unbound ledger stays unbound; a deposit that would
 *  exceed the word overflows exactly once (wraps negative, handler refuses,
 *  account becomes unbound). */
export function deposit(
  state: LedgerState,
  amount: number,
  bits: number = LEDGER_WORD_BITS,
): LedgerResult {
  const limit = creditLimit(bits);

  if (state.unbound || state.credits === Infinity) {
    return { credits: Infinity, unbound: true, overflowed: false, wrapped: null };
  }
  // Only withdraw() debits; a negative credit is not a debit in disguise.
  if (!isCountable(amount) || amount <= 0) {
    // A non-finite payout is itself a broken word. Treat +Infinity as a break.
    if (amount === Infinity) {
      return { credits: Infinity, unbound: true, overflowed: true, wrapped: wrapSigned(limit + 1, bits) };
    }
    return { ...state, overflowed: false, wrapped: null };
  }

  const raw = state.credits + amount;

  if (raw > limit) {
    return {
      credits: Infinity,
      unbound: true,
      overflowed: true,
      wrapped: wrapSigned(raw, bits),
    };
  }

  return { credits: Math.max(0, Math.trunc(raw)), unbound: false, overflowed: false, wrapped: null };
}

/** Debit an amount. An unbound ledger can always pay. Returns `paid: false` if it cannot. */
export function withdraw(
  state: LedgerState,
  amount: number,
): LedgerState & { paid: boolean } {
  if (!isCountable(amount) || amount <= 0) return { ...state, paid: false };
  if (state.unbound || state.credits === Infinity) {
    return { credits: Infinity, unbound: true, paid: true };
  }
  if (state.credits < amount) return { ...state, paid: false };
  return { credits: state.credits - amount, unbound: false, paid: true };
}

/** Display string for a balance. No cap is ever shown — there isn't one. */
export function formatCredits(state: LedgerState): string {
  if (state.unbound || state.credits === Infinity) return '∞';
  return state.credits.toLocaleString();
}

/** How full the ledger word is, 0..1. The meter under the balance is a word
 *  size, not a progress bar — a flat sliver for almost the whole game. */
export function wordPressure(state: LedgerState, bits: number = LEDGER_WORD_BITS): number {
  if (state.unbound || state.credits === Infinity) return 1;
  const limit = creditLimit(bits);
  if (limit <= 0) return 0;
  return Math.min(1, Math.max(0, state.credits / limit));
}
