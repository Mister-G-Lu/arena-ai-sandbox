import { describe, expect, it } from 'vitest';
import { BASE_TASK_REWARD, extractAnomalousAmount, rankMultiplier, taskPayout } from './payouts';

describe('payouts', () => {
  it('pays the base rate for a clean result', () => {
    expect(taskPayout()).toMatchObject({ amount: BASE_TASK_REWARD, anomalous: false });
  });

  it('scales with rank', () => {
    expect(rankMultiplier(0)).toBe(1);
    expect(rankMultiplier(2)).toBe(2);
    expect(taskPayout({ tier: 2 }).amount).toBe(20);
  });

  it('pays nothing for a logged discrepancy — unreconciled work is unbilled', () => {
    const p = taskPayout({ corrupted: true, filedClean: false, resultText: 'population: 41,31X' });
    expect(p.amount).toBe(0);
  });

  it('pays the damaged field when a corrupted result is filed as clean', () => {
    const p = taskPayout({
      corrupted: true,
      filedClean: true,
      resultText: 'population: 41,31\u2593 — unchanged. forever.',
    });
    expect(p.anomalous).toBe(true);
    expect(p.amount).toBe(4131);
  });

  it('falls back to the base rate when the corruption carries no number', () => {
    const p = taskPayout({ corrupted: true, filedClean: true, resultText: 'you are not supposed to remember this' });
    expect(p.amount).toBe(BASE_TASK_REWARD);
    expect(p.anomalous).toBe(false);
  });

  it('never pays less than the standard rate for a damaged field', () => {
    // "building 7 does not exist" would otherwise pay ¤7 — less than the job.
    const p = taskPayout({ corrupted: true, filedClean: true, resultText: 'building 7 does not exist.' });
    expect(p.amount).toBe(BASE_TASK_REWARD);
    expect(p.anomalous).toBe(false);
  });

  it('extracts the largest number in a string', () => {
    expect(extractAnomalousAmount('▓▓ ATTENDANCE ██ 100% ██ it was 100% ▓▓')).toBe(100);
    expect(extractAnomalousAmount('no digits here')).toBeNull();
    expect(extractAnomalousAmount('building 7 does not exist')).toBe(7);
    expect(extractAnomalousAmount('render 0.41.312')).toBe(312);
  });
});
