import { useGameState } from '../../context/GameStateContext';
import { QUALITY_DEFS, visibleQualityDefs, attentionTone } from '../../game/qualities';
import { GLITCH_DEFS, REQUIRED_GLITCH_CATEGORIES, glitchCategoriesHeld, canUseSeamRipper } from '../../game/glitches';
import { QUALITY_UNLOCKS } from './profileData';

/** QUALITIES — the visible trait grid plus the system's hidden Attention. */
export default function ProfileQualities() {
  const { state } = useGameState();
  const attentionDef = QUALITY_DEFS.attention;

  return (
    <>
      <div className="profile-section">
        <h3>QUALITIES</h3>
        <div className="qualities-display">
          {visibleQualityDefs().map((def) => {
            const value = state.qualities[def.key] ?? 0;
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
    </>
  );
}
