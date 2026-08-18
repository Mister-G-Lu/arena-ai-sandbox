import { useGameState } from '../context/GameStateContext';
import './ResourceBar.css';

export default function ResourceBar() {
  const { state, ledger, actionTank, PROMOTIONS, COMPONENT_DEFS } = useGameState();
  const { components, day } = state;

  const componentsCount = Object.values(components).filter(Boolean).length;
  // The meter is not a progress bar toward a cap — there is no cap. It shows how
  // much of the ledger's 32-bit word is in use, which is a flat sliver forever.
  const wordPercent = Math.max(0.6, ledger.pressure * 100);
  const currentPromotion = PROMOTIONS[state.promotion.tier];

  return (
    <section className="resource-bar" aria-label="Operator stats">
      <div className="resource-bar-inner" aria-live="polite">
        {/* Credits */}
        <div className={`resource-item credits${ledger.unbound ? ' ledger-unbound' : ''}`}>
          <span className="resource-icon">¤</span>
          <div className="resource-info">
            <span className="resource-label">Credits</span>
            <span
              className="resource-value"
              title={ledger.unbound
                ? 'The ledger stopped being a number.'
                : `Municipal ledger word: ${ledger.limit.toLocaleString()}`}
            >
              {ledger.display}
            </span>
            <progress
              className="resource-meter"
              max={100}
              value={wordPercent}
              aria-label="Municipal ledger word usage"
            />
          </div>
        </div>

        {/* Components — hidden until the first one is discovered.
            The counter appearing out of nowhere IS the reveal. */}
        {componentsCount > 0 && (
          <div className="resource-item components">
            <span className="resource-icon">⚙</span>
            <div className="resource-info">
              <span className="resource-label">Components</span>
              <span className="resource-value">{componentsCount}/{COMPONENT_DEFS.length}</span>
              <div className="component-dots">
                {Object.entries(components).map(([name, acquired]) => (
                  <div
                    key={name}
                    className={`component-dot ${acquired ? 'acquired' : ''}`}
                    title={`${name.toUpperCase()} ${acquired ? '(acquired)' : '(missing)'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Day */}
        <div className="resource-item day">
          <span className="resource-icon">◈</span>
          <div className="resource-info">
            <span className="resource-label">Day</span>
            <span className="resource-value">{day}</span>
          </div>
        </div>

        {/* Actions — the budget everything spends from. The countdown is the
            only clock in the building that tells the truth. */}
        <div
          className={`resource-item actions${actionTank.unbound ? ' actions-unbound' : ''}${
            actionTank.empty ? ' actions-empty' : ''
          }`}
        >
          <span className="resource-icon">◆</span>
          <div className="resource-info">
            <span className="resource-label">Actions</span>
            <span
              className="resource-value"
              title={actionTank.unbound
                ? 'MAINTENANCE OVERRIDE — the budget is detached from the clock.'
                : `One action returns every ${Math.round(actionTank.regenIntervalMs / 60000)} minutes.`}
            >
              {actionTank.display}
            </span>
            {!actionTank.unbound && (
              <span className="resource-regen">
                {actionTank.msUntilNext == null ? 'FULL' : `+1 IN ${actionTank.countdown}`}
              </span>
            )}
            <progress
              className="resource-meter actions-meter"
              max={actionTank.cap}
              value={actionTank.unbound ? actionTank.cap : Math.min(actionTank.actions, actionTank.cap)}
              aria-label="Actions remaining"
            />
          </div>
        </div>

        {/* Promotion */}
        <div className="resource-item promotion">
          <span className="resource-icon">⌬</span>
          <div className="resource-info">
            <span className="resource-label">Rank</span>
            <span className="resource-value">{currentPromotion.title}</span>
          </div>
        </div>

        {/* A file a dev tool has touched says so, permanently and visibly, so
            it can never be mistaken for an honest playthrough. */}
        {actionTank.devTouched && (
          <div className="resource-item dev-touched" title="This file has been altered by maintenance tooling.">
            <span className="resource-icon">⚑</span>
            <div className="resource-info">
              <span className="resource-label">File</span>
              <span className="resource-value">ALTERED</span>
            </div>
          </div>
        )}

        {/* Profile Button */}
        <button
          className="resource-item profile-button"
          onClick={() => { window.location.hash = '#profile'; }}
          title="View Operator Profile"
        >
          <span className="resource-icon">◉</span>
          <span className="resource-label">Profile</span>
        </button>
      </div>
    </section>
  );
}
