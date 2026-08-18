import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DevPanel from '../components/DevPanel';

/**
 * Component-level coverage for the Maintenance Terminal capability gate.
 *
 * The E2E suite cannot exercise the "absent" path because every origin its
 * webServer can reach (localhost/127.0.0.1) auto-grants dev capability by
 * design (Tier 2, src/lib/devMode.ts). This test pins the component behavior
 * directly: with dev capability off the terminal must not render at all.
 */

const game = vi.hoisted(() => ({
  current: null as ReturnType<typeof contextFixture> | null,
}));

vi.mock('../context/GameStateContext', () => ({
  useGameState: () => game.current,
}));

function contextFixture(devMode: boolean) {
  return {
    devMode,
    actionTank: { display: '3', unbound: false, devTouched: false },
    actions: { setActionsUnbound: vi.fn(), grantActions: vi.fn() },
  };
}

describe('DevPanel (Maintenance Terminal) capability gate', () => {
  beforeEach(() => {
    game.current = contextFixture(false);
  });

  it('renders nothing when dev capability is off', () => {
    const { container } = render(<DevPanel />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/MAINTENANCE/)).not.toBeInTheDocument();
  });

  it('renders the terminal and its action-tank controls when dev capability is on', () => {
    game.current = contextFixture(true);
    render(<DevPanel />);
    expect(screen.getByText(/MAINTENANCE/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /REFILL TANK/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DETACH BUDGET FROM CLOCK/ })).toBeInTheDocument();
  });

  it('shows the detach control flipped when the tank is unbound', () => {
    game.current = {
      ...contextFixture(true),
      actionTank: { display: '∞', unbound: true, devTouched: false },
    };
    render(<DevPanel />);
    expect(screen.getByRole('button', { name: /REATTACH BUDGET TO CLOCK/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /REFILL TANK/ })).toBeDisabled();
  });
});
