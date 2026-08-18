import React, { useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { MAX_SAVE_BYTES, parseSaveJson } from '../lib/gameSave';
import FileSummary from './save/FileSummary';
import SaveConflictPanel from './save/SaveConflictPanel';
import type { FileSummaryGame } from './save/FileSummary';

export default function SaveManagement() {
  const { state, persistence, cloud, actions } = useGameState();
  const [email, setEmail] = useState('');
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ text: string; game: FileSummaryGame; savedAt: string | null } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function requestToken(event: React.FormEvent) {
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

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_SAVE_BYTES) {
        throw new Error(
          `Import refused: file is ${(file.size / 1024 / 1024).toFixed(1)} MB; ` +
          `operator files are capped at ${MAX_SAVE_BYTES / 1024 / 1024} MB.`,
        );
      }
      const text = await file.text();
      const loaded = parseSaveJson(text);
      setConfirmingReset(false);
      setPendingImport({ text, ...loaded });
      setLocalMessage('Operator file validated. Confirm which terminal file should remain.');
    } catch (error) {
      setPendingImport(null);
      setLocalMessage(error instanceof Error ? error.message : 'Import refused.');
    } finally {
      event.target.value = '';
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    try {
      actions.importGameSave(pendingImport.text);
      setPendingImport(null);
      setLocalMessage('Operator file imported. Records will be checked before cloud saving resumes.');
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Import refused.');
    }
  }

  function cancelImport() {
    setPendingImport(null);
    setLocalMessage('Import cancelled. This terminal file was not changed.');
  }

  function resetFile() {
    actions.resetGame();
    setPendingImport(null);
    setConfirmingReset(false);
    setLocalMessage('Local operator file erased. Records will be checked before cloud saving resumes.');
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

      {persistence.remoteReset && !persistence.tabConflict && (
        <SaveConflictPanel
          message="Another browser tab erased this operator file."
          summaries={
            <FileSummary label="THIS TAB" game={state} savedAt={persistence.lastSavedAt} />
          }
          actions={
            <button
              className="btn btn-primary btn-compact"
              type="button"
              onClick={actions.keepThisTabSave}
            >
              KEEP THIS TAB&apos;S COPY
            </button>
          }
        />
      )}

      {persistence.tabConflict && (
        <SaveConflictPanel
          message="Another browser tab changed this operator file."
          summaries={
            <>
              <FileSummary label="THIS TAB" game={state} savedAt={persistence.lastSavedAt} />
              <FileSummary
                label="OTHER TAB"
                game={persistence.tabConflict.game}
                savedAt={persistence.tabConflict.savedAt}
              />
            </>
          }
          actions={
            <>
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
            </>
          }
        />
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
        <SaveConflictPanel
          message="Two valid files disagree. Nothing will be overwritten until you choose."
          summaries={
            <>
              <FileSummary label="THIS TERMINAL" game={state} savedAt={persistence.lastSavedAt} />
              <FileSummary
                label="RECORDS COPY"
                game={cloud.conflict.game}
                savedAt={cloud.conflict.envelope.savedAt}
              />
            </>
          }
          actions={
            <>
              <button className="btn btn-primary btn-compact" type="button" onClick={cloud.keepLocal}>
                KEEP THIS TERMINAL
              </button>
              <button className="btn btn-ghost btn-compact" type="button" onClick={cloud.useCloud}>
                USE RECORDS COPY
              </button>
            </>
          }
        />
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

      {pendingImport && (
        <SaveConflictPanel
          message="Replace this terminal&apos;s operator file? Importing changes the whole local file. If signed in, Records will be checked again before either copy can overwrite the other."
          summaries={
            <>
              <FileSummary label="THIS TERMINAL" game={state} savedAt={persistence.lastSavedAt} />
              <FileSummary
                label="IMPORT FILE"
                game={pendingImport.game}
                savedAt={pendingImport.savedAt}
              />
            </>
          }
          actions={
            <>
              <button className="btn btn-primary btn-compact" type="button" onClick={confirmImport}>
                CONFIRM REPLACE
              </button>
              <button className="btn btn-ghost btn-compact" type="button" onClick={cancelImport}>
                CANCEL IMPORT
              </button>
            </>
          }
        />
      )}

      {confirmingReset && (
        <SaveConflictPanel
          className="save-reset-confirmation"
          message="Erase this terminal&apos;s operator file? Local progress will be replaced by a new Day 1 file. This cannot be undone without an export or a Records copy. Records is never erased automatically; if signed in, you will choose which copy remains."
          actions={
            <>
              <button className="btn btn-primary btn-compact" type="button" onClick={resetFile}>
                ERASE AND START OVER
              </button>
              <button
                className="btn btn-ghost btn-compact"
                type="button"
                onClick={() => setConfirmingReset(false)}
              >
                CANCEL RESET
              </button>
            </>
          }
        />
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
        <button
          className="btn btn-ghost btn-compact save-reset-button"
          type="button"
          onClick={() => {
            setPendingImport(null);
            setConfirmingReset(true);
          }}
          disabled={confirmingReset}
        >
          ERASE LOCAL FILE
        </button>
      </div>
      {localMessage && <p className="fine" role="status">{localMessage}</p>}
    </div>
  );
}
