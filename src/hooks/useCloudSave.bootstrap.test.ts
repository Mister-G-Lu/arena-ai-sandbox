import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialGameState, createStoredSaveEnvelope } from '../lib/gameSave';
import { __setSupabaseForTests } from '../lib/supabase';
import { useCloudSave } from './useCloudSave';
import { mockClient, resetSupabaseForTests } from './useCloudSave.testUtils';

describe('useCloudSave — boot & first agreement', () => {
  beforeEach(() => {
    resetSupabaseForTests();
  });

  it('disables cloud cleanly when public configuration is absent', async () => {
    const state = createInitialGameState();
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: false, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('disabled'));
    expect(result.current.configured).toBe(false);
  });

  it('creates a remote file when Records is empty', async () => {
    const client = mockClient();
    __setSupabaseForTests(client as never);
    const state = createInitialGameState();
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(client.__insert).toHaveBeenCalledTimes(1);
    expect(client.__insert.mock.calls[0]?.[0].payload.version).toBe(2);
  });

  it('restores remote state only when the local terminal is genuinely fresh', async () => {
    const remoteState = createInitialGameState();
    remoteState.day = 4;
    const client = mockClient(
      createStoredSaveEnvelope(remoteState, new Date('2026-08-16T12:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const state = createInitialGameState();
    const { result } = renderHook(() =>
      useCloudSave({ state, hadLocalSaveAtBoot: false, replaceState }),
    );
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(replaceState).toHaveBeenCalledWith(expect.objectContaining({ day: 4 }));
    expect(client.__upsert).not.toHaveBeenCalled();
  });

  it('does not restore Records silently over an explicit fresh-file replacement', async () => {
    const remoteState = createInitialGameState();
    remoteState.day = 4;
    const client = mockClient(
      createStoredSaveEnvelope(remoteState, new Date('2026-08-16T12:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const fresh = createInitialGameState();
    const { result, rerender } = renderHook(
      ({ recheckToken }) =>
        useCloudSave({
          state: fresh,
          hadLocalSaveAtBoot: false,
          replaceState,
          recheckToken,
        }),
      { initialProps: { recheckToken: 0 } },
    );

    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(replaceState).toHaveBeenCalledOnce();

    // Reset/import can deliberately choose a byte-for-byte fresh file. The
    // recheck token makes that choice explicit, so Records must now be shown
    // as a conflict rather than restored over the user's reset.
    rerender({ recheckToken: 1 });
    await waitFor(() => expect(client.__pulls()).toBe(2));
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(replaceState).toHaveBeenCalledOnce();
    expect(result.current.conflict?.game.day).toBe(4);
  });

  it('treats offline regen at cold open as the same file, not a conflict', async () => {
    // Records holds the file as of 23:00 with five actions in the tank...
    const closedAtNight = createInitialGameState();
    closedAtNight.actions = 5;
    closedAtNight.actionsLastTick = Date.parse('2026-08-15T23:00:00Z');
    closedAtNight.credits = 210;

    // ...and this terminal reopens it in the morning, refilled by the clock.
    // Only the tank's clock fields have moved; the play record is identical.
    const reopened = {
      ...closedAtNight,
      actions: 50,
      actionsLastTick: Date.parse('2026-08-16T07:00:00Z'),
    };

    const client = mockClient(
      createStoredSaveEnvelope(closedAtNight, new Date('2026-08-15T23:00:00Z')),
    );
    __setSupabaseForTests(client as never);
    const replaceState = vi.fn();
    const { result } = renderHook(() =>
      useCloudSave({ state: reopened, hadLocalSaveAtBoot: true, replaceState, debounceMs: 0 }),
    );

    await waitFor(() => expect(result.current.status).toBe('synced'));
    // No conflict, and the remote copy is never adopted over the local one.
    expect(result.current.conflict).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
