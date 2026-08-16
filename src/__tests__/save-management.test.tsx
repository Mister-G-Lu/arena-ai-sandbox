import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SaveManagement from '../components/SaveManagement';
import {
  createInitialGameState,
  createStoredSaveEnvelope,
  serializeSaveEnvelope,
} from '../lib/gameSave';

const game = vi.hoisted(() => ({ current: null as ReturnType<typeof contextFixture> | null }));

vi.mock('../context/GameStateContext', () => ({
  useGameState: () => game.current,
}));

function contextFixture() {
  return {
    state: createInitialGameState(),
    persistence: {
      status: 'ready',
      error: null,
      recoveryError: null,
      lastSavedAt: '2026-08-16T20:00:00.000Z',
      tabConflict: null,
      remoteReset: false,
    },
    cloud: {
      configured: false,
      identity: null,
      loading: false,
      error: null,
      status: 'disabled',
      message: null,
      conflict: null,
      requestToken: vi.fn(),
      signOut: vi.fn(),
      keepLocal: vi.fn(),
      useCloud: vi.fn(),
      retry: vi.fn(),
    },
    actions: {
      exportGameSave: vi.fn(() => '{}'),
      importGameSave: vi.fn(),
      keepThisTabSave: vi.fn(),
      useOtherTabSave: vi.fn(),
    },
  };
}

function upload(text: string) {
  const file = new File([text], 'operator-file.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: vi.fn(async () => text) });
  fireEvent.change(screen.getByLabelText('Import operator save file'), {
    target: { files: [file] },
  });
}

describe('operator-file import', () => {
  beforeEach(() => {
    game.current = contextFixture();
  });

  it('validates and previews a file before replacing the active save', async () => {
    const imported = createInitialGameState();
    imported.day = 7;
    imported.tasksCompleted = 1234;
    imported.promotion.tier = 2;
    const raw = serializeSaveEnvelope(
      createStoredSaveEnvelope(imported, new Date('2026-08-15T03:00:00.000Z')),
    );

    render(<SaveManagement />);
    upload(raw);

    expect(await screen.findByText('CONFIRM REPLACE')).toBeInTheDocument();
    expect(screen.getByText(/Day 7 · 1,234 results filed · Tier 2/)).toBeInTheDocument();
    expect(game.current?.actions.importGameSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('CANCEL IMPORT'));
    expect(screen.queryByText('CONFIRM REPLACE')).not.toBeInTheDocument();
    expect(game.current?.actions.importGameSave).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Import cancelled');

    upload(raw);
    fireEvent.click(await screen.findByText('CONFIRM REPLACE'));
    expect(game.current?.actions.importGameSave).toHaveBeenCalledOnce();
    expect(game.current?.actions.importGameSave).toHaveBeenCalledWith(raw);
    expect(screen.queryByText('CONFIRM REPLACE')).not.toBeInTheDocument();
  });

  it('refuses invalid JSON without offering a destructive confirmation', async () => {
    render(<SaveManagement />);
    upload('{not-json');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Save is not valid JSON');
    });
    expect(screen.queryByText('CONFIRM REPLACE')).not.toBeInTheDocument();
    expect(game.current?.actions.importGameSave).not.toHaveBeenCalled();
  });
});
