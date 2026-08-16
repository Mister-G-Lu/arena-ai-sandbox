import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createProgress, type Storylet } from '../game/storylets';
import { WorkOrders } from './WorkOrders';

const card: Storylet = {
  id: 'tutorial-01',
  zone: 'tutorial',
  title: 'Clock in',
  body: 'The chair is already warm.',
  choices: [{ id: 'sit', label: 'Sit. Start the log.', outcome: { text: 'ok' } }],
};

describe('WorkOrders', () => {
  it('renders visible qualities and never Attention', () => {
    const progress = {
      ...createProgress(),
      qualities: { Attention: 7, Perception: 3, Doubt: 0, Salary: 1, Routine: 2 },
    };
    render(
      <WorkOrders
        progress={progress}
        currentCard={card}
        lastOutcome={null}
        canAct
        onChoose={() => undefined}
        onOpenZone={() => undefined}
      />,
    );
    const panel = screen.getByTestId('qualities');
    expect(panel).toHaveTextContent('Perception');
    expect(panel).toHaveTextContent('3');
    expect(panel).not.toHaveTextContent('Attention');
    expect(panel).not.toHaveTextContent('7');
  });

  it('fires onChoose and disables locked Floor 12', async () => {
    const onChoose = vi.fn();
    const onOpenZone = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkOrders
        progress={createProgress()}
        currentCard={card}
        lastOutcome="The pen writes."
        canAct
        onChoose={onChoose}
        onOpenZone={onOpenZone}
      />,
    );
    expect(screen.getByText('The pen writes.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /sit\. start the log/i }));
    expect(onChoose).toHaveBeenCalledWith('sit');
    expect(screen.getByRole('button', { name: /floor 12/i })).toBeDisabled();
  });

  it('shows the empty desk when there is no current card', () => {
    render(
      <WorkOrders
        progress={{ ...createProgress(), current: null }}
        lastOutcome={null}
        canAct={false}
        onChoose={() => undefined}
        onOpenZone={() => undefined}
      />,
    );
    expect(screen.getByText(/no active work order/i)).toBeInTheDocument();
  });
});
