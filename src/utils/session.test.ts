import { describe, expect, it } from 'vitest';
import { identityFrom, requireUserId } from './session';

describe('session', () => {
  it('requireUserId reads the operator id', () => {
    expect(requireUserId({ user: { id: 'op-1' } })).toBe('op-1');
  });
  it('requireUserId rejects fakes without user.id', () => {
    expect(() => requireUserId(null)).toThrow(/user.id/);
    expect(() => requireUserId({ user: {} })).toThrow(/user.id/);
  });
  it('identityFrom is null without an id', () => {
    expect(identityFrom(null)).toBeNull();
    expect(identityFrom({ user: { id: 'op-2', email: 'a@b.c' } })).toEqual({
      id: 'op-2',
      email: 'a@b.c',
    });
  });
});
