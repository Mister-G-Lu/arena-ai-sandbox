import React from 'react';
import { useGameState } from '../context/GameStateContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const { state, PROMOTIONS } = useGameState();
  const {
    credits,
    maxCredits,
    components,
    qualities,
    day,
    tasksCompleted,
    deaths,
    logbook,
    discoveries,
    contacts
  } = state;

  const componentsCount = Object.values(components).filter(Boolean).length;
  const currentPromotion = PROMOTIONS[state.promotion.tier];
  const nextPromotion = PROMOTIONS[state.promotion.tier + 1];

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>OPERATOR PROFILE</h2>
        <p className="section-lede">
          Your file. Your record. Your history — or what the system allows you to remember.
        </p>

        {/* Basic Info */}
        <div className="profile-section">
          <div className="profile-header">
            <h3>OPERATOR INFORMATION</h3>
            <div className="profile-info-grid">
              <div className="info-item">
                <span className="info-label">Title:</span>
                <span className="info-value">{currentPromotion.title}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Days on Roster:</span>
                <span className="info-value">{day}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tasks This Shift:</span>
                <span className="info-value">{tasksCompleted} / 50</span>
              </div>
              <div className="info-item">
                <span className="info-label">Deaths:</span>
                <span className="info-value">{deaths}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">ACTIVE // FILE SYNCED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="profile-section">
          <h3>RESOURCES</h3>

          <div className="resource-display">
            <div className="resource-row">
              <div className="resource-name">
                <span className="resource-icon-large">¤</span>
                <div>
                  <div className="resource-title">Credits</div>
                  <div className="resource-subtitle">Currency from routine work</div>
                </div>
              </div>
              <div className="resource-details">
                <div className="resource-amount">{credits.toLocaleString()} / {maxCredits === Infinity ? '∞' : maxCredits.toLocaleString()}</div>
                <div className="resource-bar-container">
                  <div
                    className="resource-bar-fill"
                    style={{ width: `${maxCredits === Infinity ? 100 : (credits / maxCredits) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="resource-row">
              <div className="resource-name">
                <span className="resource-icon-large">⚙</span>
                <div>
                  <div className="resource-title">Components</div>
                  <div className="resource-subtitle">Story resources (one-time discovery)</div>
                </div>
              </div>
              <div className="resource-details">
                <div className="resource-amount">{componentsCount} / 6</div>
                <div className="component-list">
                  {Object.entries(components).map(([name, acquired]) => (
                    <div key={name} className={`component-item ${acquired ? 'acquired' : ''}`}>
                      <span className="component-check">{acquired ? '✓' : '□'}</span>
                      <span className="component-name">{name.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Qualities */}
        <div className="profile-section">
          <h3>QUALITIES</h3>

          <div className="qualities-display">
            <div className="quality-item">
              <div className="quality-header">
                <span className="quality-icon">?</span>
                <span className="quality-name">Doubt</span>
                <span className="quality-value">{qualities.doubt}/5</span>
              </div>
              <div className="quality-description">Understanding of the loop and the system</div>
              <div className="quality-bar-container">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`quality-segment ${i < qualities.doubt ? 'filled' : ''}`}
                  />
                ))}
              </div>
              <div className="quality-unlocks">
                {qualities.doubt >= 1 && <span className="unlock">✓ Notice storylets</span>}
                {qualities.doubt >= 2 && <span className="unlock">✓ Investigation actions</span>}
                {qualities.doubt >= 3 && <span className="unlock">✓ Operator 5's log</span>}
                {qualities.doubt >= 4 && <span className="unlock">✓ All secret zones</span>}
                {qualities.doubt >= 5 && <span className="unlock">✓ The Summons</span>}
              </div>
            </div>

            <div className="quality-item">
              <div className="quality-header">
                <span className="quality-icon">👁</span>
                <span className="quality-name">Perception</span>
                <span className="quality-value">{qualities.perception}/5</span>
              </div>
              <div className="quality-description">Ability to notice details and patterns</div>
              <div className="quality-bar-container">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`quality-segment ${i < qualities.perception ? 'filled' : ''}`}
                  />
                ))}
              </div>
              <div className="quality-unlocks">
                {qualities.perception >= 1 && <span className="unlock">✓ Basic notices</span>}
                {qualities.perception >= 2 && <span className="unlock">✓ Hidden memos</span>}
                {qualities.perception >= 3 && <span className="unlock">✓ Operator 5's clues</span>}
                {qualities.perception >= 4 && <span className="unlock">✓ VANTABLACK's nature</span>}
                {qualities.perception >= 5 && <span className="unlock">✓ The Cleaner's identity</span>}
              </div>
            </div>

            <div className="quality-item">
              <div className="quality-header">
                <span className="quality-icon">⚠</span>
                <span className="quality-name">Attention</span>
                <span className="quality-value">[HIDDEN]</span>
              </div>
              <div className="quality-description">How much the system notices you (death at 10)</div>
              <div className="quality-bar-container">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="quality-segment hidden"
                  />
                ))}
              </div>
              <div className="quality-unlocks">
                <span className="unlock dim">System tone: Polite</span>
              </div>
            </div>
          </div>
        </div>

        {/* Promotion */}
        <div className="profile-section">
          <h3>PROMOTION STATUS</h3>

          <div className="promotion-display">
            <div className="promotion-current">
              <div className="promotion-tier">TIER {currentPromotion.tier}</div>
              <div className="promotion-title">{currentPromotion.title}</div>
              <div className="promotion-unlocks">
                <div className="unlocks-label">Unlocked:</div>
                <div className="unlocks-list">
                  {currentPromotion.unlocks.map((unlock, i) => (
                    <span key={i} className="unlock-badge">{unlock}</span>
                  ))}
                </div>
              </div>
            </div>

            {nextPromotion && (
              <div className="promotion-next">
                <div className="next-label">Next Promotion:</div>
                <div className="next-tier">TIER {nextPromotion.tier}</div>
                <div className="next-title">{nextPromotion.title}</div>
                <div className="next-requirements">
                  {state.promotion.tier === 0 && <span>Doubt ≥ 1</span>}
                  {state.promotion.tier === 1 && <span>Doubt ≥ 2, Deaths ≥ 1</span>}
                  {state.promotion.tier === 2 && <span>Doubt ≥ 3, Components ≥ 3</span>}
                  {state.promotion.tier === 3 && <span>Doubt ≥ 4, Components ≥ 4</span>}
                  {state.promotion.tier === 4 && <span>Components = 6</span>}
                </div>
              </div>
            )}

            {!nextPromotion && (
              <div className="promotion-max">
                <div className="max-label">Maximum rank achieved</div>
                <div className="max-title">You have reached the end of the hierarchy.</div>
              </div>
            )}
          </div>
        </div>

        {/* Logbook */}
        <div className="profile-section">
          <h3>LOGBOOK (RESIDUE)</h3>

          {logbook.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <div className="empty-text">No entries yet. Your logbook is blank.</div>
              <div className="empty-subtitle">Make discoveries to fill these pages.</div>
            </div>
          ) : (
            <div className="logbook-entries">
              {logbook.slice(-5).reverse().map((entry, i) => (
                <div key={i} className="logbook-entry">
                  <div className="entry-day">Day {entry.day}</div>
                  <div className="entry-text">{entry.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contacts */}
        <div className="profile-section">
          <h3>CONTACTS</h3>

          {contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <div className="empty-text">No contacts yet.</div>
              <div className="empty-subtitle">You are alone in the building. For now.</div>
            </div>
          ) : (
            <div className="contacts-list">
              {contacts.map((contact, i) => (
                <div key={i} className="contact-item">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-role">{contact.role}</div>
                  <div className="contact-meta">
                    First met: Day {contact.firstMet} · Interactions: {contact.interactions}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button
            className="btn btn-ghost"
            onClick={() => window.location.hash = '#console'}
          >
            ▸ RETURN TO CONSOLE
          </button>
        </div>
      </div>
    </section>
  );
}
