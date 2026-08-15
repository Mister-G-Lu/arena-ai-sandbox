import { describe, expect, it } from 'vitest';
import { clockStr, countdownStr, pad2 } from './clock';

describe('pad2', () => {
  it('pads single digits', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(9)).toBe('09');
  });
  it('leaves two-digit numbers', () => {
    expect(pad2(12)).toBe('12');
  });
  it('truncates fractions', () => {
    expect(pad2(3.9)).toBe('03');
  });
});

describe('clockStr', () => {
  it('formats 01:00', () => {
    expect(clockStr(60)).toBe('01:00');
  });
  it('formats 06:00', () => {
    expect(clockStr(360)).toBe('06:00');
  });
  it('wraps past midnight', () => {
    expect(clockStr(1440)).toBe('00:00');
    expect(clockStr(1441)).toBe('00:01');
  });
  it('handles negative minutes', () => {
    expect(clockStr(-1)).toBe('23:59');
  });
});

describe('countdownStr', () => {
  it('formats seconds under a minute', () => {
    expect(countdownStr(1000)).toBe('0:01');
    expect(countdownStr(0)).toBe('0:00');
  });
  it('ceils partial seconds', () => {
    expect(countdownStr(1)).toBe('0:01');
  });
  it('formats minutes', () => {
    expect(countdownStr(10 * 60 * 1000)).toBe('10:00');
  });
  it('formats hours', () => {
    expect(countdownStr(3661000)).toBe('1:01:01');
  });
  it('clamps negatives to zero', () => {
    expect(countdownStr(-500)).toBe('0:00');
  });
});
