import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { DEFAULT_HINT } from './components/Footer';

describe('App', () => {
  it('renders the holo-HUD chrome', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /false reality/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /the city runs because you answer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tonight's shift/i })).toBeInTheDocument();
    expect(screen.getByText(/MEMO 013/)).toBeInTheDocument();
    expect(screen.getByText(/MEMO 012/)).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_HINT)).toBeInTheDocument();
    expect(screen.getByLabelText(/holographic projection/i)).toBeInTheDocument();
    expect(screen.getByText(/work orders/i)).toBeInTheDocument();
    expect(screen.getByTestId('qualities')).not.toHaveTextContent('Attention');
  });

  it('performs a task and spends an action', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('50/50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /perform next task/i }));
    expect(screen.getByText('49/50')).toBeInTheDocument();
    expect(screen.getByText('49')).toBeInTheDocument();
  });

  it('shows the job cards and city stats', () => {
    render(<App />);
    expect(screen.getByText(/Perfectly paced shifts/)).toBeInTheDocument();
    expect(screen.getByText('41,312')).toBeInTheDocument();
    expect(screen.getByText(/100.0%/)).toBeInTheDocument();
  });

  it('does not perform a task when the tank is empty', async () => {
    localStorage.setItem(
      'fr:actions',
      JSON.stringify({ current: 0, cap: 50, regenMs: 600_000, lastTick: Date.now() }),
    );
    const user = userEvent.setup();
    render(<App />);
    const btn = screen.getByRole('button', { name: /perform next task/i });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(screen.getByText('0/50')).toBeInTheDocument();
  });
});
