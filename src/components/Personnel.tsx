import { useState } from 'react';
import type { OperatorIdentity } from '../utils/session';
import { fileView } from '../lib/merge';
import type { SaveEnvelope } from '../lib/saveFile';
import { HudFrame } from './HudFrame';

export type ConflictKind = 'none' | 'pending';

export function Personnel({
  identity,
  loading,
  error,
  status,
  conflict,
  file,
  onRequestToken,
  onSignOut,
  onKeepLocal,
  onTakeRecords,
  onMerge,
  onExport,
  onImport,
  onTerminate,
}: {
  identity: OperatorIdentity | null;
  loading: boolean;
  error: string | null;
  status: string | null;
  conflict: ConflictKind;
  file: SaveEnvelope | null;
  onRequestToken: (email: string) => Promise<boolean> | boolean;
  onSignOut: () => void;
  onKeepLocal: () => void;
  onTakeRecords: () => void;
  onMerge: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onTerminate: () => void;
}) {
  const [email, setEmail] = useState('');
  const [confirmKill, setConfirmKill] = useState(false);
  const view = file ? fileView(file) : null;

  return (
    <section id="personnel" className="section section-alt">
      <div className="wrap">
        <h2>Personnel</h2>
        <p className="section-lede">
          You do not log in. You request a reinstatement token. The Municipal Authority emails you
          a link. Attendance is recorded.
        </p>

        {loading ? <p className="fine">Checking the roster…</p> : null}
        {error ? <p className="personnel-error">{error}</p> : null}
        {status ? <p className="fine">{status}</p> : null}

        {!identity ? (
          <HudFrame className="personnel-card">
            <header>REINSTATEMENT TOKEN</header>
            <p>Email on the roster. No passwords. A password would imply you chose this job.</p>
            <form
              className="personnel-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onRequestToken(email);
              }}
            >
              <input
                type="email"
                required
                placeholder="operator@meridian.city"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                aria-label="Roster email"
              />
              <button className="btn btn-primary" type="submit">
                Request token
              </button>
            </form>
          </HudFrame>
        ) : (
          <HudFrame className="personnel-card">
            <header>ON DUTY · AUTHENTICATED</header>
            <p className="fine mono">{identity.email ?? identity.id}</p>
            <button className="btn btn-ghost" type="button" onClick={onSignOut}>
              End session
            </button>
          </HudFrame>
        )}

        {conflict === 'pending' ? (
          <HudFrame className="personnel-card">
            <header>WORK ORDER · FILE CONFLICT</header>
            <p>
              A file already exists in Records. Your local logbook does not match. Continuity is
              preferred.
            </p>
            <div className="personnel-actions">
              <button className="btn btn-primary" type="button" onClick={onMerge}>
                Merge (recommended)
              </button>
              <button className="btn btn-ghost" type="button" onClick={onKeepLocal}>
                Keep local
              </button>
              <button className="btn btn-ghost" type="button" onClick={onTakeRecords}>
                Take Records
              </button>
            </div>
          </HudFrame>
        ) : null}

        {view ? (
          <HudFrame className="personnel-card" data-testid="operator-file">
            <header>FILE · OPERATOR</header>
            <ul className="file-list">
              <li>Shift day {view.day}</li>
              <li>Tasks remaining {view.tasks}</li>
              <li>Actions {view.actions}</li>
              {view.qualities.map(([k, v]) => (
                <li key={k}>
                  {k} {v}
                </li>
              ))}
              {view.zones.map((z) => (
                <li key={z.id}>
                  {z.id} · {z.status}
                </li>
              ))}
            </ul>
          </HudFrame>
        ) : null}

        <div className="personnel-actions">
          <button className="btn btn-ghost" type="button" onClick={onExport}>
            Export logbook
          </button>
          <label className="btn btn-ghost file-btn">
            Import logbook
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                void f.text().then(onImport);
                ev.target.value = '';
              }}
            />
          </label>
          {!confirmKill ? (
            <button className="btn btn-ghost" type="button" onClick={() => setConfirmKill(true)}>
              Terminate
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={onTerminate}>
              The form is already signed
            </button>
          )}
        </div>
      </div>
    </section>
  );
}


