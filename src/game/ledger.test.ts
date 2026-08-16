import { describe, expect, it } from 'vitest';
import {
  CREDIT_LIMIT,
  creditLimit,
  deposit,
  withdraw,
  formatCredits,
  wordPressure,
  wrapSigned,
} from './ledger';

const fresh = { credits: 0, unbound: false };

describe('ledger', () => {
  it('has no design cap — the old 500 ceiling is gone', () => {
    let state = { ...fresh };
    for (let i = 0; i < 200; i++) {
      const r = deposit(state, 10);
      state = { credits: r.credits, unbound: r.unbound };
    }
    expect(state.credits).toBe(2000);
    expect(state.unbound).toBe(false);
  });

  it('exposes the machine ceiling as a 32-bit signed word', () => {
    expect(CREDIT_LIMIT).toBe(2147483647);
    expect(creditLimit(16)).toBe(32767);
  });

  it('accepts a deposit that lands exactly on the limit', () => {
    const r = deposit(fresh, CREDIT_LIMIT);
    expect(r.credits).toBe(CREDIT_LIMIT);
    expect(r.overflowed).toBe(false);
    expect(r.unbound).toBe(false);
  });

  it('overflows one credit past the word and becomes unbound', () => {
    const r = deposit({ credits: CREDIT_LIMIT, unbound: false }, 1);
    expect(r.overflowed).toBe(true);
    expect(r.unbound).toBe(true);
    expect(r.credits).toBe(Infinity);
    expect(r.wrapped).toBe(-2147483648);
  });

  it('wraps two\u2019s-complement style for the diegetic flash', () => {
    expect(wrapSigned(2147483648)).toBe(-2147483648);
    expect(wrapSigned(2147483649)).toBe(-2147483647);
    expect(wrapSigned(5)).toBe(5);
    expect(wrapSigned(40000, 16)).toBe(-25536);
  });

  it('only awards the overflow once — an unbound ledger stays quiet', () => {
    const first = deposit({ credits: CREDIT_LIMIT, unbound: false }, 1);
    const second = deposit({ credits: first.credits, unbound: first.unbound }, 999);
    expect(second.overflowed).toBe(false);
    expect(second.credits).toBe(Infinity);
    expect(second.unbound).toBe(true);
  });

  it('treats an infinite payout as a broken word', () => {
    const r = deposit(fresh, Infinity);
    expect(r.overflowed).toBe(true);
    expect(r.unbound).toBe(true);
  });

  it('ignores non-finite and zero deposits', () => {
    expect(deposit(fresh, Number.NaN).credits).toBe(0);
    expect(deposit(fresh, 0).credits).toBe(0);
  });

  it('withdraws only what is there, and an unbound ledger always pays', () => {
    expect(withdraw({ credits: 10, unbound: false }, 20).paid).toBe(false);
    expect(withdraw({ credits: 30, unbound: false }, 20)).toMatchObject({ credits: 10, paid: true });
    expect(withdraw({ credits: Infinity, unbound: true }, 10 ** 12)).toMatchObject({ paid: true });
    expect(withdraw({ credits: 10, unbound: false }, -5).paid).toBe(false);
  });

  it('formats an unbound balance as infinity, never as a fraction of a cap', () => {
    expect(formatCredits({ credits: 1234, unbound: false })).toBe('1,234');
    expect(formatCredits({ credits: Infinity, unbound: true })).toBe('∞');
  });

  it('reports word pressure, not progress toward a goal', () => {
    expect(wordPressure({ credits: 0, unbound: false })).toBe(0);
    expect(wordPressure({ credits: CREDIT_LIMIT, unbound: false })).toBe(1);
    expect(wordPressure({ credits: Infinity, unbound: true })).toBe(1);
    expect(wordPressure({ credits: 500, unbound: false })).toBeLessThan(0.000001);
  });
});
