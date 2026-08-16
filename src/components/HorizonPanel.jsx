import React from 'react';
import { useGameState } from '../context/GameStateContext';
import {
  PROMOTIONS,
  clearanceLabel,
  missingRequirements,
  requirementBadges,
  unlockLabel,
} from '../game/progression';
import RequirementBadges from './RequirementBadges';

/**
 * The clearance forecast — the game's own "what's next". Next promotion with
 * live progress, what it adds, and the locked content waiting on file. Every
 * line is derived from the PROMOTIONS and ZONES data tables; the panel is a
 * lens on the same gates the checker enforces, so the hint can never lie.
 */
export default function HorizonPanel() {
  const { state, requirementCtx, availableZones } = useGameState();
  const next = PROMOTIONS[state.promotion.tier + 1];
  // Sealed content includes both hard-locked zones and challengeable ones —
  // a zone waiting on a roll is still not open yet.
  const locked = availableZones.filter(
    (zone) => zone.status === 'locked' || zone.status === 'challengeable',
  );

  if (!next && locked.length === 0) return null;

  const missing = next ? missingRequirements(next.requires, requirementCtx) : [];

  return (
    <aside className="horizon-panel" aria-labelledby="horizon-title">
      <div className="console-head horizon-head">
        <span className="dot"></span>
        <span id="horizon-title">CLEARANCE FORECAST // ON FILE</span>
        <span className="console-status">▣ PROJECTED</span>
      </div>

      {next ? (
        <div className="horizon-row">
          <div className="horizon-cell">
            <span className="horizon-label">NEXT RANK</span>
            <span className="horizon-value">{next.title.toUpperCase()}</span>
          </div>
          <div className="horizon-cell">
            <span className="horizon-label">REQUIRES</span>
            <span className="horizon-value">
              <RequirementBadges badges={requirementBadges(next.requires, requirementCtx)} />
              {missing.length > 0 && (
                <span className="horizon-missing">{` — ${missing.join(' · ')}`}</span>
              )}
            </span>
          </div>
          <div className="horizon-cell">
            <span className="horizon-label">ADDS</span>
            <span className="horizon-value">{next.unlocks.map(unlockLabel).join(' · ')}</span>
          </div>
        </div>
      ) : (
        <div className="horizon-row">
          <div className="horizon-cell">
            <span className="horizon-label">MAXIMUM RANK</span>
            <span className="horizon-value">THERE IS NOTHING ABOVE MANAGER</span>
          </div>
          <div className="horizon-cell">
            <span className="horizon-label">AFTER THAT</span>
            <span className="horizon-value">THE SYSTEM IS QUIET ABOUT WHAT COMES AFTER</span>
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div className="horizon-row">
          <div className="horizon-cell horizon-locked-cell">
            <span className="horizon-label">LOCKED CONTENT ON FILE</span>
            <span className="horizon-locked-list">
              {locked.map((zone) => (
                <span key={zone.id} className="horizon-locked-item">
                  <span className="horizon-locked-title">{zone.title.toUpperCase()}</span>
                  <RequirementBadges
                    badges={requirementBadges(zone.requires, requirementCtx, { skillChecks: true })}
                    skillChecks
                  />
                  {zone.requiresUnlock && (
                    <span className="horizon-locked-req">{clearanceLabel(zone.requiresUnlock)}</span>
                  )}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      <p className="fine horizon-note">
        THE FORECAST IS ESTIMATED. THE SYSTEM DOES NOT CONFIRM PROMOTIONS IN ADVANCE.
      </p>
    </aside>
  );
}
