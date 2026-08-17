import { useGameState } from '../context/GameStateContext';
import { QUALITY_DEFS, visibleQualityDefs, attentionTone } from '../game/qualities';
import { requirementLabel, missingRequirements } from '../game/progression';
import { GLITCH_DEFS, REQUIRED_GLITCH_CATEGORIES, glitchCategoriesHeld, canUseSeamRipper } from '../game/glitches';
import SaveManagement from './SaveManagement';
import './ProfilePage.css';

/**
 * Quality unlock teasers — promotions and zones are gated by declarative
 * `requires` maps; a quality alone unlocks nothing. Rendered dimmed and
 * checkmark-free so the profile never advertises a ✓ the data didn't open.
 */
interface JournalEntry {
  day: number;
  text: string;
  timestamp: number;
}

interface ContactRecord {
  name: string;
  role: string;
  firstMet: number;
  interactions: number;
}

const QUALITY_UNLOCKS: Record<string, string[]> = {
  doubt: [
    'Notice storylets',
    'Investigation actions',
    "Operator 5's log",
    'All secret zones',
    'The Summons',
  ],
  perception: [
    'Basic notices',
    'Hidden memos',
    "Operator 5's clues",
    "VANTABLACK's nature",
    "The Cleaner's identity",
  ],
  routine: [],
};

export default function ProfilePage() {
  const { state, ledger, actionTank, requirementCtx, PROMOTIONS, COMPONENT_DEFS } = useGameState();
  const {
    components,
    qualities,
    day,
    tasksCompleted,
    tasksThisShift,
    deaths,
    logbook,
    discoveries,
    contacts,
  } = state;

  const componentsCount = Object.values(components).filter(Boolean).length;
  const currentPromotion = PROMOTIONS[state.promotion.tier];
  const nextPromo = PROMOTIONS[state.promotion.tier + 1];
  const attentionDef = QUALITY_DEFS.attention;

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
                <span className="info-label">Results Filed:</span>
                <span className="info-value">{tasksCompleted.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">This Shift:</span>
                <span className="info-value">{tasksThisShift}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Discrepancies Logged:</span>
                <span className="info-value">{state.discrepanciesLogged.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Actions:</span>
                <span className="info-value">
                  {actionTank.display}
                  {actionTank.unbound
                    ? ' // OVERRIDE'
                    : actionTank.msUntilNext == null
                      ? ' // FULL'
                      : ` // +1 IN ${actionTank.countdown}`}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Deaths:</span>
                <span className="info-value">{deaths}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  {state.orientation.completed ? 'ACTIVE // FILE SYNCED' : 'PENDING // ORIENTATION REQUIRED'}
                </span>
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
                  <div className="resource-subtitle">
                    {ledger.unbound
                      ? 'The balance is no longer a number. Nobody has asked about it.'
                      : 'Currency from routine work. No ceiling is listed.'}
                  </div>
                </div>
              </div>
              <div className="resource-details">
                <div className="resource-amount">¤ {ledger.display}</div>
                <div className="resource-bar-container">
                  <div
                    className="resource-bar-fill"
                    style={{ width: `${Math.max(0.6, ledger.pressure * 100)}%` }}
                  />
                </div>
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
                    {Object.entries(components).map(([name, acquired]) => (
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

        {/* Qualities */}
        <div className="profile-section">
          <h3>QUALITIES</h3>

          <div className="qualities-display">
            {visibleQualityDefs().map((def) => {
              const value = qualities[def.key] ?? 0;
              const captions = QUALITY_UNLOCKS[def.key] ?? [];
              const segments = Number.isFinite(def.max) ? def.max : 5;
              return (
                <div className="quality-item" key={def.key}>
                  <div className="quality-header">
                    <span className="quality-icon">{def.key === 'doubt' ? '?' : def.key === 'perception' ? '👁' : '▤'}</span>
                    <span className="quality-name">{def.label}</span>
                    <span className="quality-value">{value}{Number.isFinite(def.max) ? `/${def.max}` : ''}</span>
                  </div>
                  <div className="quality-description">{def.description}</div>
                  <div className="quality-bar-container">
                    {[...Array(Math.min(segments, 10))].map((_: unknown, i: number) => (
                      <div key={i} className={`quality-segment ${i < value ? 'filled' : ''}`} />
                    ))}
                  </div>
                  {captions.length > 0 && (
                    <div className="quality-unlocks">
                      <span className="unlock-hint">AT HIGHER LEVELS:</span>
                      {captions.slice(0, value).map((caption, i) => (
                        <span className="unlock dim" key={i}>◇ {caption}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="quality-item">
              <div className="quality-header">
                <span className="quality-icon">⚠</span>
                <span className="quality-name">{attentionDef.label}</span>
                <span className="quality-value">[HIDDEN]</span>
              </div>
              <div className="quality-description">{attentionDef.description}</div>
              <div className="quality-bar-container">
                {[...Array(attentionDef.max)].map((_: unknown, i: number) => (
                  <div key={i} className="quality-segment hidden" />
                ))}
              </div>
              <div className="quality-unlocks">
                <span className="unlock dim">System tone: {attentionTone(state.attention)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Glitches — kept evidence */}
        {state.glitches.length > 0 && (
          <div className="profile-section">
            <h3>ANOMALIES ON FILE</h3>
            <div className="qualities-display">
              {state.glitches.map((id: string) => {
                const glitch = GLITCH_DEFS[id];
                if (!glitch) return null;
                return (
                  <div className="quality-item" key={id}>
                    <div className="quality-header">
                      <span className="quality-icon">✖</span>
                      <span className="quality-name">{glitch.title}</span>
                      <span className="quality-value">KEPT</span>
                    </div>
                    <div className="quality-description">{glitch.description}</div>
                    <div className="quality-unlocks">
                      <span className="unlock dim">EVIDENCE OF: {glitch.reveals.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="glitch-categories">
              <span className="fine">
                EVIDENCE CATEGORIES: {glitchCategoriesHeld(state.glitches)} / {REQUIRED_GLITCH_CATEGORIES.length}
                {canUseSeamRipper(state.glitches) ? ' — THE SEAM RIPPER CAN READ THIS.' : ''}
              </span>
              <div className="component-dots">
                {REQUIRED_GLITCH_CATEGORIES.map((cat) => {
                  const held = state.glitches.some((id: string) => GLITCH_DEFS[id]?.reveals === cat);
                  return (
                    <div
                      key={cat}
                      className={`component-dot ${held ? 'acquired' : ''}`}
                      title={`${cat.toUpperCase()} ${held ? '(proven)' : '(unproven)'}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
                  {state.promotion.unlocks.map((unlock: string, i: number) => (
                    <span key={i} className="unlock-badge">{unlock}</span>
                  ))}
                </div>
              </div>
            </div>

            {nextPromo && (
              <div className="promotion-next">
                <div className="next-label">Next Promotion:</div>
                <div className="next-tier">TIER {nextPromo.tier}</div>
                <div className="next-title">{nextPromo.title}</div>
                <div className="next-requirements">
                  <span>{requirementLabel(nextPromo.requires)}</span>
                  {missingRequirements(nextPromo.requires, requirementCtx).length > 0 && (
                    <span className="dim">
                      {' '}— currently {missingRequirements(nextPromo.requires, requirementCtx).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {!nextPromo && (
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
              {logbook.slice(-5).reverse().map((entry: JournalEntry, i: number) => (
                <div key={i} className="logbook-entry">
                  <div className="entry-day">Day {entry.day}</div>
                  <div className="entry-text">{entry.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discoveries */}
        {discoveries.length > 0 && (
          <div className="profile-section">
            <h3>DISCOVERIES</h3>
            <div className="logbook-entries">
              {discoveries.slice(-5).reverse().map((entry: JournalEntry, i: number) => (
                <div key={i} className="logbook-entry">
                  <div className="entry-day">Day {entry.day}</div>
                  <div className="entry-text">{entry.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {contacts.map((contact: ContactRecord, i: number) => (
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

        <SaveManagement />

        {/* Actions */}
        <div className="profile-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              window.location.hash = state.orientation.completed ? '#console' : '#first-shift';
            }}
          >
            {state.orientation.completed ? '▸ RETURN TO CONSOLE' : '▸ REPORT FOR FIRST SHIFT'}
          </button>
        </div>
      </div>
    </section>
  );
}
