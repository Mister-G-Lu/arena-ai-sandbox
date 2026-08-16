import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createActionState } from '../game/actions';
import { createShift } from '../game/shift';
import { createProgress } from '../game/storylets';
import { makeEnvelope } from '../lib/saveFile';
import { Personnel } from './Personnel';

const file = makeEnvelope({
  progress: {
    ...createProgress(),
    qualities: { Attention: 8, Perception: 2, Doubt: 1, Salary: 4, Routine: 3 },
  },
  shift: createShift(),
  actions: createActionState(0, { current: 11 }),
});

const noop = {
  onRequestToken: vi.fn(),
  onSignOut: vi.fn(),
  onKeepLocal: vi.fn(),
  onTakeRecords: vi.fn(),
  onMerge: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn(),
  onTerminate: vi.fn(),
};

describe('Personnel', () => {
  it('requests a reinstatement token', async () => {
    const onRequestToken = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <Personnel
        identity={null}
        loading={false}
        error={null}
        status={null}
        conflict="none"
        file={null}
        {...noop}
        onRequestToken={onRequestToken}
      />,
    );
    await user.type(screen.getByLabelText(/roster email/i), 'op@meridian.city');
    await user.click(screen.getByRole('button', { name: /request token/i }));
    expect(onRequestToken).toHaveBeenCalledWith('op@meridian.city');
  });

  it('shows the File without Attention and the merge work order', async () => {
    const onMerge = vi.fn();
    const user = userEvent.setup();
    render(
      <Personnel
        identity={{ id: 'op-1', email: 'op@meridian.city' }}
        loading={false}
        error={null}
        status={null}
        conflict="pending"
        file={file}
        {...noop}
        onMerge={onMerge}
      />,
    );
    expect(screen.getByText(/on duty/i)).toBeInTheDocument();
    const dossier = screen.getByTestId('operator-file');
    expect(dossier).toHaveTextContent('Perception');
    expect(dossier).not.toHaveTextContent('Attention');
    expect(dossier).not.toHaveTextContent('8');
    await user.click(screen.getByRole('button', { name: /merge/i }));
    expect(onMerge).toHaveBeenCalled();
  });

  it('requires a second click to terminate', async () => {
    const onTerminate = vi.fn();
    const user = userEvent.setup();
    render(
      <Personnel
        identity={{ id: 'op-1' }}
        loading={false}
        error={null}
        status={null}
        conflict="none"
        file={file}
        {...noop}
        onTerminate={onTerminate}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^terminate$/i }));
    expect(onTerminate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /the form is already signed/i }));
    expect(onTerminate).toHaveBeenCalled();
  });
});
