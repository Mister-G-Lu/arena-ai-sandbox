/** State-level coverage for supply purchases and their requirement metrics. */
import { act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { api, mount } from './GameStateContext.testUtils';

describe('supply purchases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('buys a supply, debits the ledger, and files the order in the logbook', async () => {
    mount();
    await act(async () => { api.actions.addCredits(100); });
    await act(async () => { api.actions.purchaseSupply('coffee'); });

    expect(api.state.supplies.coffee).toBe(true);
    expect(api.state.credits).toBe(70);
    expect(api.state.logbook.some((e) => e.text.includes('GROUND COFFEE'))).toBe(true);
  });

  it('refuses a purchase the operator cannot afford', async () => {
    mount();
    await act(async () => { api.actions.purchaseSupply('bolt-cutters'); });
    expect(api.state.supplies['bolt-cutters']).toBe(false);
    expect(api.state.credits).toBe(0);
  });

  it('never sells the same supply twice', async () => {
    mount();
    await act(async () => { api.actions.addCredits(1000); });
    await act(async () => { api.actions.purchaseSupply('thermos'); });
    const logLength = api.state.logbook.length;
    await act(async () => { api.actions.purchaseSupply('thermos'); });
    expect(api.state.supplies.thermos).toBe(true);
    expect(api.state.logbook).toHaveLength(logLength);
  });

  it('ignores unknown ids and classified teaser stock', async () => {
    mount();
    await act(async () => { api.actions.addCredits(1000); });
    await act(async () => { api.actions.purchaseSupply('no-such-supply'); });
    await act(async () => { api.actions.purchaseSupply('machine-favor'); });
    expect(api.state.supplies).not.toHaveProperty('no-such-supply');
    expect(api.state.supplies['machine-favor']).toBe(false);
    expect(api.state.credits).toBe(1000);
  });

  it('an unbound ledger can always pay', async () => {
    mount();
    await act(async () => { api.actions.addCredits(Infinity); });
    await act(async () => { api.actions.purchaseSupply('doorman-smokes'); });
    expect(api.ledger.unbound).toBe(true);
    expect(api.state.supplies['doorman-smokes']).toBe(true);
  });

  it('feeds the requirement context so supply-gated zones can open', async () => {
    mount();
    await act(async () => { api.actions.addCredits(500); });
    await act(async () => { api.actions.purchaseSupply('coffee'); });
    expect(api.requirementCtx.supplies.coffee).toBe(true);
    expect(api.requirementCtx.tier).toBe(0);
  });
});
