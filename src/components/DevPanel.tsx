import { useRef } from 'react';
import { useGameState } from '../context/GameStateContext';
import { setDevOptIn } from '../lib/devMode';
import './DevPanel.css';

/**
 * The Maintenance Terminal — the small, honest version.
 *
 * design/dev-tools.md's model: dev access is a *capability* the client works
 * out from the build and the device, never an account and never a database
 * role. This panel only renders when that capability is present, and it only
 * touches client state, so it works signed out, offline, and on a first run.
 *
 * Everything here latches `devTouched`, which the header then advertises for
 * the life of the file. A cheat that hides itself is a cheat that eventually
 * gets mistaken for a bug report.
 *
 * The collapsible body uses the native `<details>`/`<summary>` disclosure
 * element instead of a hand-rolled `useState` toggle, so the open/close
 * behavior, keyboard support, and accessible name come from the browser.
 */
export default function DevPanel() {
  const { devMode, actionTank, actions } = useGameState();
  const panelRef = useRef<HTMLDetailsElement>(null);

  if (!devMode) return null;

  return (
    <details className="dev-panel" ref={panelRef}>
      <summary className="dev-panel-toggle">⚑ MAINTENANCE</summary>

      <div className="dev-panel-body">
          <p className="dev-panel-note">
            Capability granted by this build and this device. Not an account. Every change
            below marks the operator file permanently.
          </p>

          <div className="dev-panel-row">
            <span className="dev-panel-label">ACTIONS</span>
            <span className="dev-panel-value">{actionTank.display}</span>
          </div>

          <div className="dev-panel-controls">
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => actions.setActionsUnbound(!actionTank.unbound)}
            >
              {actionTank.unbound ? '▸ REATTACH BUDGET TO CLOCK' : '▸ DETACH BUDGET FROM CLOCK'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => actions.grantActions()}
              disabled={actionTank.unbound}
            >
              ▸ REFILL TANK
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => {
                setDevOptIn(false);
                if (panelRef.current) panelRef.current.open = false;
              }}
            >
              ▸ DROP DEV OPT-IN (?dev=0)
            </button>
          </div>

          {actionTank.devTouched && (
            <p className="dev-panel-warn">
              This file is flagged ALTERED. That flag does not clear.
            </p>
          )}
      </div>
    </details>
  );
}
