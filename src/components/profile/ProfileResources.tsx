import { useGameState } from '../../context/GameStateContext';

/** RESOURCES — the salary ledger and the discovered story Components. */
export default function ProfileResources() {
  const { state, ledger, COMPONENT_DEFS } = useGameState();
  const componentsCount = Object.values(state.components).filter(Boolean).length;

  return (
    <div className="profile-section">
      <h3>RESOURCES</h3>

      <div className="resource-display">
        <div className="resource-row">
          <div className="resource-name">
            <span className="resource-icon-large">¤</span>
            <div>
              <div className="resource-title">Credits</div>
              <div className="resource-subtitle">
                {ledger.unbound
                  ? 'The balance is no longer a number. Nobody has asked about it.'
                  : 'Currency from routine work. No ceiling is listed.'}
              </div>
            </div>
          </div>
          <div className="resource-details">
            <div className="resource-amount">¤ {ledger.display}</div>
            <progress
              className="resource-bar-container"
              max={100}
              value={Math.max(0.6, ledger.pressure * 100)}
              aria-label="Municipal ledger word usage"
            />
            <div className="resource-subtitle">
              LEDGER WORD: {ledger.limit.toLocaleString()}
              {ledger.unbound ? ' — EXCEEDED. FIELD ABANDONED.' : ''}
            </div>
          </div>
        </div>

        {/* Components stay off the books until the first one is found. */}
        {componentsCount > 0 && (
          <div className="resource-row">
            <div className="resource-name">
              <span className="resource-icon-large">⚙</span>
              <div>
                <div className="resource-title">Components</div>
                <div className="resource-subtitle">Story resources (one-time discovery)</div>
              </div>
            </div>
            <div className="resource-details">
              <div className="resource-amount">{componentsCount} / {COMPONENT_DEFS.length}</div>
              <div className="component-list">
                {Object.entries(state.components).map(([name, acquired]) => (
                  <div key={name} className={`component-item ${acquired ? 'acquired' : ''}`}>
                    <span className="component-check">{acquired ? '✓' : '□'}</span>
                    <span className="component-name">{name.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
