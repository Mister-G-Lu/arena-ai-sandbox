/** State-level coverage for the effects pipeline: clamping, once-only
 * consequences, promotion, and the task/dispatch flow. */
import { act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { api, mount } from './GameStateContext.testUtils';

describe('effects pipeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies storylet-cased effects and clamps them', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Doubt: 9, Attention: 3, Salary: 2 }); });
    expect(api.state.qualities.doubt).toBe(5);
    expect(api.state.attention).toBe(3);
    // Salary converts to credits at its declared rate.
    expect(api.state.credits).toBe(10);
  });

  it('ignores unknown qualities instead of writing junk into the save', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Nonsense: 5 }); });
    expect(api.state.qualities).not.toHaveProperty('nonsense');
  });

  it('files consequences once and rejects a stale card after transition', async () => {
    mount();
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.currentStorylet = { zone: 'floor12', storyletId: 'floor12-01' };
    saved.game.zones.floor12 = 'open';
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    const press = {
      id: 'press',
      outcome: { qualities: { Doubt: 1, Attention: 1 } },
      next: 'floor12-02',
    };
    const card = { id: 'floor12-01', zone: 'floor12', choices: [press] };

    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-02' });
    const actionsAfterFirstChoice = api.state.actions;

    // The old button closure cannot resolve the previous card again after the pointer moved.
    await act(async () => { api.actions.resolveStorylet(card, press); });
    expect(api.state.qualities.doubt).toBe(1);
    expect(api.state.attention).toBe(1);
    expect(api.state.actions).toBe(actionsAfterFirstChoice);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-02' });
    expect(api.state.seenStorylets.filter((id) => id === 'floor12-01')).toHaveLength(1);
  });

  it('records an explicitly lethal choice once and enters its aftermath', async () => {
    mount();
    await act(async () => { api.actions.applyEffects({ Attention: 8 }); });
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.currentStorylet = { zone: 'floor12', storyletId: 'floor12-05' };
    saved.game.zones.floor12 = 'open';
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    const forward = {
      id: 'forward',
      outcome: { qualities: { Attention: 3, Doubt: 1 } },
      next: 'floor12-06',
      death: true,
    };
    const card = { id: 'floor12-05', zone: 'floor12', choices: [forward] };
    await act(async () => { api.actions.resolveStorylet(card, forward); });

    expect(api.state.deaths).toBe(1);
    expect(api.state.attention).toBe(0);
    expect(api.state.currentStorylet).toEqual({ zone: 'floor12', storyletId: 'floor12-06' });
    expect(api.state.discoveries.some((entry) => entry.text.includes('THE INTERIM 1'))).toBe(true);
    expect(api.state.logbook.some((entry) => entry.text.includes('TERMINATION 1'))).toBe(true);

    await act(async () => { api.actions.resolveStorylet(card, forward); });
    expect(api.state.deaths).toBe(1);
  });

  it('promotes automatically — the player never asks for a promotion', async () => {
    mount();
    expect(api.state.promotion.tier).toBe(0);
    await act(async () => { api.actions.applyEffects({ Doubt: 1 }); });
    expect(api.state.promotion.tier).toBe(1);
    expect(api.state.promotion.unlocks).toContain('notice-storylets');
    expect(api.state.logbook.some((e) => e.text.includes('OPERATOR'))).toBe(true);
  });

  it('reserves a pending task and its action before the result is filed', async () => {
    mount();
    await act(async () => {
      api.actions.startDispatchTask({ anomalyRoll: 0.999, corruptionRoll: 0 });
    });

    expect(api.state.pendingDispatch).toMatchObject({
      id: 'dispatch-1-1',
      taskNumber: 1,
      shiftAction: 1,
      isCorrupt: false,
    });
    expect(api.state.actions).toBe(49);
    expect(api.state.actionsSpentThisShift).toBe(1);
    expect(JSON.parse(api.actions.exportGameSave()).game.pendingDispatch.id).toBe('dispatch-1-1');

    await act(async () => { api.actions.fileTaskResult({ payout: 10 }); });
    expect(api.state.pendingDispatch).toBeNull();
    expect(api.state.tasksCompleted).toBe(1);
    // Acknowledgement commits the result; it does not charge the reserved action twice.
    expect(api.state.actions).toBe(49);
  });

  it('tracks anomalies per shift and resets the guarantee counter tomorrow', async () => {
    mount();
    await act(async () => {
      api.actions.startDispatchTask({ anomalyRoll: 0, corruptionRoll: 0 });
      api.actions.fileTaskResult({ anomaly: true, payout: 10 });
    });
    expect(api.state.anomaliesSeenThisShift).toBe(1);
    await act(async () => { api.actions.incrementDay(); });
    expect(api.state.anomaliesSeenThisShift).toBe(0);
  });

  it('reserves the shift\'s first Day-2 anomaly as personal and files it like any other', async () => {
    mount();
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.day = 2;
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    await act(async () => {
      api.actions.startDispatchTask({ anomalyRoll: 0, corruptionRoll: 0.2 });
    });
    expect(api.state.pendingDispatch.isCorrupt).toBe(true);
    expect(api.state.pendingDispatch.isPersonal).toBe(true);

    // Filing follows the same pipeline: the personal line is a corrupt result.
    await act(async () => {
      api.actions.fileTaskResult({
        effects: { Doubt: 1, Attention: 1 },
        anomaly: true,
        discrepancy: true,
      });
    });
    expect(api.state.pendingDispatch).toBeNull();
    expect(api.state.anomaliesSeenThisShift).toBe(1);
    expect(api.state.discrepanciesLogged).toBe(1);
  });

  it('keeps the Day-3 coincidences out of reach without Perception and awards no component', async () => {
    mount();
    const saved = JSON.parse(api.actions.exportGameSave());
    saved.game.day = 3;
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });

    // Perception 0: the zones are listed but sealed — entering is refused.
    await act(async () => { api.actions.enterZone('handwritten-order', 'handwritten-01'); });
    await act(async () => { api.actions.enterZone('day-crew-notes', 'sticky-01'); });
    expect(api.state.currentStorylet).toBeNull();

    // With the eye for it, the case opens and completes without a Component —
    // these are coincidences, not expeditions.
    saved.game.qualities.perception = 1;
    await act(async () => { api.actions.importGameSave(JSON.stringify(saved)); });
    await act(async () => { api.actions.enterZone('handwritten-order', 'handwritten-01'); });
    expect(api.state.currentStorylet).toEqual({ zone: 'handwritten-order', storyletId: 'handwritten-01' });

    const compare = {
      id: 'compare',
      outcome: { qualities: { Perception: 1, Attention: 1 } },
      next: 'handwritten-02',
    };
    const keep = {
      id: 'keep',
      outcome: { qualities: { Doubt: 1, Perception: 1 } },
      completeZone: true,
    };
    await act(async () => {
      api.actions.resolveStorylet({ id: 'handwritten-01', zone: 'handwritten-order', choices: [compare] }, compare);
    });
    expect(api.state.currentStorylet).toEqual({ zone: 'handwritten-order', storyletId: 'handwritten-02' });
    await act(async () => {
      api.actions.resolveStorylet({ id: 'handwritten-02', zone: 'handwritten-order', choices: [keep] }, keep);
    });
    expect(api.state.zones['handwritten-order']).toBe('complete');
    expect(api.state.qualities.doubt).toBe(1);
    // compare (+1 Perception) then keep (+1 Perception) on top of the 1 in the file.
    expect(api.state.qualities.perception).toBe(3);
    expect(Object.values(api.state.components).filter(Boolean)).toHaveLength(0);
    expect(api.state.seenStorylets).toContain('handwritten-02');
  });
});
