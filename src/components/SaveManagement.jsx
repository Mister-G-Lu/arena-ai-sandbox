import React, { useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { TASKS_PER_SHIFT } from '../game/dispatch';

/** Hard ceiling for an imported operator file, checked before any parsing. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function FileSummary({ label, game, savedAt }) {
  return (
    <div className="save-summary">
      <strong>{label}</strong>
      <span>
        Day {game.day} · {game.tasksCompleted}/{TASKS_PER_SHIFT} tasks · Tier {game.promotion.tier}
      </span>
      {savedAt && <span>Saved {new Date(savedAt).toLocaleString()}</span>}
    </div>
  );
}

export default function SaveManagement() {
  const { state, persistence, cloud, actions } = useGameState();
  const [email, setEmail] = useState('');
  const [localMessage, setLocalMessage] = useState(null);
  const fileInput = useRef(null);

  async function requestToken(event) {
    event.preventDefault();
    if (!email.trim()) return;
    await cloud.requestToken(email.trim());
  }

  function exportFile() {
    const blob = new Blob([actions.exportGameSave()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `false-reality-day-${state.day}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setLocalMessage('Operator file exported.');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      // A real operator file is a few hundred KB; anything near the browser
      // string limit is a hostile payload. Refuse it before JSON.parse freezes
      // the terminal.
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error(
          `Import refused: file is ${(file.size / 1024 / 1024).toFixed(1)} MB; ` +
          `operator files are capped at ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
        );
      }
      actions.importGameSave(await file.text());
      setLocalMessage('Operator file validated and imported.');
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Import refused.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="profile-section save-management">
      <h3>OPERATOR FILE</h3>

      <div className="save-status-grid">
        <div className="save-status-card">
          <span className="info-label">Local terminal</span>
          <strong>
            {persistence.status === 'error'
              ? 'SAVE ERROR'
              : persistence.status === 'conflict'
                ? 'TAB CONFLICT'
                : 'SAVED LOCALLY'}
          </strong>
          <span className="dim">
            {persistence.error ??
              (persistence.lastSavedAt
                ? new Date(persistence.lastSavedAt).toLocaleString()
                : 'Awaiting first write')}
          </span>
        </div>
        <div className="save-status-card">
          <span className="info-label">Records</span>
          <strong>{cloud.status.toUpperCase().replace('-', ' ')}</strong>
          <span className="dim">{cloud.message ?? cloud.error ?? 'No cloud activity.'}</span>
        </div>
      </div>

      {persistence.recoveryError && (
        <p className="save-warning" role="alert">
          The previous local file failed validation and was preserved under the recovery key.
          A clean file is active. Details: {persistence.recoveryError}
        </p>
      )}

      {persistence.tabConflict && (
        <div className="save-conflict" role="alert">
          <p>
            <strong>Another browser tab changed this operator file.</strong> Local saving is paused
            here so neither tab can silently erase the other.
          </p>
          <div className="save-summary-grid">
            <FileSummary label="THIS TAB" game={state} savedAt={persistence.lastSavedAt} />
            <FileSummary
              label="OTHER TAB"
              game={persistence.tabConflict.game}
              savedAt={persistence.tabConflict.savedAt}
            />
          </div>
          <div className="save-action-row">
            <button
              className="btn btn-primary btn-compact"
              type="button"
              onClick={actions.keepThisTabSave}
            >
              KEEP THIS TAB
            </button>
            <button
              className="btn btn-ghost btn-compact"
              type="button"
              onClick={actions.useOtherTabSave}
            >
              USE OTHER TAB
            </button>
          </div>
        </div>
      )}

      {!cloud.configured && (
        <p className="fine">
          Cloud saves are disabled in this build. Local saves and file export remain available.
        </p>
      )}

      {cloud.configured && !cloud.identity && !cloud.loading && (
        <form className="save-auth-form" onSubmit={requestToken}>
          <label htmlFor="records-email">Email for a one-time sign-in link</label>
          <div className="save-action-row">
            <input
              id="records-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="btn btn-primary btn-compact" type="submit">
              SEND SIGN-IN LINK
            </button>
          </div>
        </form>
      )}

      {cloud.identity && (
        <div className="save-signed-in">
          <p className="fine">SIGNED IN: {cloud.identity.email ?? cloud.identity.id}</p>
          <button className="btn btn-ghost btn-compact" type="button" onClick={cloud.signOut}>
            SIGN OUT
          </button>
        </div>
      )}

      {cloud.conflict && (
        <div className="save-conflict" role="alert">
          <p><strong>Two valid files disagree.</strong> Nothing will be overwritten until you choose.</p>
          <div className="save-summary-grid">
            <FileSummary label="THIS TERMINAL" game={state} savedAt={persistence.lastSavedAt} />
            <FileSummary
              label="RECORDS COPY"
              game={cloud.conflict.game}
              savedAt={cloud.conflict.envelope.savedAt}
            />
          </div>
          <div className="save-action-row">
            <button className="btn btn-primary btn-compact" type="button" onClick={cloud.keepLocal}>
              KEEP THIS TERMINAL
            </button>
            <button className="btn btn-ghost btn-compact" type="button" onClick={cloud.useCloud}>
              USE RECORDS COPY
            </button>
          </div>
        </div>
      )}

      {cloud.configured && cloud.identity && cloud.status === 'error' && (
        <div className="save-action-row">
          <button className="btn btn-ghost btn-compact" type="button" onClick={cloud.retry}>
            RETRY RECORDS
          </button>
          <button className="btn btn-primary btn-compact" type="button" onClick={cloud.keepLocal}>
            OVERWRITE RECORDS WITH LOCAL
          </button>
        </div>
      )}

      <div className="save-action-row save-file-actions">
        <button className="btn btn-ghost btn-compact" type="button" onClick={exportFile}>
          EXPORT FILE
        </button>
        <button
          className="btn btn-ghost btn-compact"
          type="button"
          onClick={() => fileInput.current?.click()}
        >
          IMPORT FILE
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          aria-label="Import operator save file"
        />
      </div>
      {localMessage && <p className="fine" role="status">{localMessage}</p>}
    </div>
  );
}
