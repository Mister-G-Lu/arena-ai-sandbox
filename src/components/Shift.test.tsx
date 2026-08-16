import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createShift } from '../game/shift';
import { Shift } from './Shift';

describe('Shift', () => {
  it('disables the task button when the tank is empty', () => {
    render(
      <Shift
        shift={createShift()}
        remaining={0}
        cap={50}
        untilNext={1000}
        canAct={false}
        weatherOverride={null}
        onTask={() => undefined}
        onTomorrow={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /perform next task/i })).toBeDisabled();
    expect(screen.getByText(/next in/i)).toBeInTheDocument();
  });

  it('shows the tomorrow button when the shift is complete', async () => {
    const onTomorrow = vi.fn();
    const user = userEvent.setup();
    render(
      <Shift
        shift={{ ...createShift(), complete: true, tasks: 0 }}
        remaining={12}
        cap={50}
        untilNext={null}
        canAct={false}
        weatherOverride="…static…"
        onTask={() => undefined}
        onTomorrow={onTomorrow}
      />,
    );
    expect(screen.getByText('tank full')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start tomorrow/i }));
    expect(onTomorrow).toHaveBeenCalled();
  });
});
