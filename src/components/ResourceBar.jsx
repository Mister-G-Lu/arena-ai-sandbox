import React from 'react';
import { useGameState } from '../context/GameStateContext';
import { TASKS_PER_SHIFT } from '../game/dispatch';
import './ResourceBar.css';

export default function ResourceBar() {
  const { state, ledger, PROMOTIONS, COMPONENT_DEFS } = useGameState();
  const { components, day, tasksCompleted } = state;

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
            <div className="resource-meter">
              <div
                className="resource-meter-fill"
                style={{ width: `${wordPercent}%` }}
              />
            </div>
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

        {/* Tasks */}
        <div className="resource-item tasks">
          <span className="resource-icon">▸</span>
          <div className="resource-info">
            <span className="resource-label">Tasks</span>
            <span className="resource-value">{tasksCompleted}/{TASKS_PER_SHIFT}</span>
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

        {/* Profile Button */}
        <button
          className="resource-item profile-button"
          onClick={() => window.location.hash = '#profile'}
          title="View Operator Profile"
        >
          <span className="resource-icon">◉</span>
          <span className="resource-label">Profile</span>
        </button>
      </div>
    </section>
  );
}
