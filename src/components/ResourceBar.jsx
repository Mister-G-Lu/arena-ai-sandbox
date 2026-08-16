import React from 'react';
import { useGameState } from '../context/GameStateContext';
import './ResourceBar.css';

export default function ResourceBar() {
  const { state, PROMOTIONS } = useGameState();
  const { credits, maxCredits, components, day, tasksCompleted } = state;

  const componentsCount = Object.values(components).filter(Boolean).length;
  const creditPercent = maxCredits === Infinity ? 100 : (credits / maxCredits) * 100;
  const currentPromotion = PROMOTIONS[state.promotion.tier];

  return (
    <section className="resource-bar" aria-label="Operator stats">
      <div className="resource-bar-inner" aria-live="polite">
        {/* Credits */}
        <div className="resource-item credits">
          <span className="resource-icon">¤</span>
          <div className="resource-info">
            <span className="resource-label">Credits</span>
            <span className="resource-value">{credits.toLocaleString()}</span>
            <div className="resource-meter">
              <div
                className="resource-meter-fill"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="resource-item components">
          <span className="resource-icon">⚙</span>
          <div className="resource-info">
            <span className="resource-label">Components</span>
            <span className="resource-value">{componentsCount}/6</span>
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
            <span className="resource-value">{tasksCompleted}/50</span>
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
