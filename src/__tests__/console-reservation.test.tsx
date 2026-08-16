/**
 * REGRESSION — a refused work-order reservation must not soft-lock the
 * console. executeTask() reports PROCESSING optimistically, before the
 * canonical reducer answers; if the reducer reserves nothing, the console
 * has to roll back to READY. Before the fix it waited on a timer that only
 * a pending reservation arms, leaving the queue button disabled forever.
 */
import { render, act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState } from '../lib/gameSave';

const startDispatchTask = vi.fn();
let contextValue: Record<string, unknown>;

vi.mock('../context/GameStateContext', () => ({
  useGameState: () => contextValue,
}));

import Console from '../components/Console';

function button(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(text),
  ) as HTMLButtonElement | undefined;
}

describe('console reservation rollback', () => {
  beforeEach(() => {
    startDispatchTask.mockReset();
    const state = createInitialGameState();
    state.orientation.completed = true;
    contextValue = {
      state,
      actionTank: {
        actions: 50,
        cap: 50,
        unbound: false,
        empty: false,
        display: '50/50',
        regenIntervalMs: 600_000,
        msUntilNext: null,
        msUntilFull: null,
        countdown: '--:--',
        spentThisShift: 0,
        devTouched: false,
      },
      actions: {
        startDispatchTask, // refuses: never reserves a pending dispatch
        fileTaskResult: vi.fn(),
        addLogEntry: vi.fn(),
        incrementDay: vi.fn(),
      },
    };
  });

  it('returns to READY when the reducer refuses the reservation', async () => {
    render(<Console />);

    const execute = button('▸ EXECUTE TASK 1');
    expect(execute).toBeDefined();
    await act(async () => { execute!.click(); });

    // The optimistic PROCESSING state resolves back to READY on its own —
    // no stuck "PROCESSING — QUEUE LOCKED", and EXECUTE can be offered again.
    expect(screen.queryByText('PROCESSING — QUEUE LOCKED')).toBeNull();
    expect(button('▸ EXECUTE TASK 1')).toBeDefined();
    expect(startDispatchTask).toHaveBeenCalledTimes(1);
  });
});
