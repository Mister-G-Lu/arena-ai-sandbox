import React from 'react';
import './RequirementBadges.css';

/**
 * Compact glyph badges for a `requires` map. Each badge is one glyph + a short
 * label; hovering (or keyboard focus) reveals the full requirement. In
 * `skillChecks` mode the skill qualities (Doubt / Perception / Routine) show
 * their success chance instead of a hard bar.
 *
 * The badges are pure presentation — the authoritative breakdown comes from
 * `requirementBadges` in src/game/progression.ts, so the hint can never drift
 * from what the checker enforces.
 */
export default function RequirementBadges({ badges = [], skillChecks = false }) {
  if (!badges.length) return null;
  return (
    <span className="req-badges">
      {badges.map((badge) => {
        const isCheck = badge.skill && skillChecks && badge.chance != null;
        const tip = isCheck
          ? `${badge.name} check ${badge.chance}% — skill ${badge.current} vs difficulty ${badge.threshold}`
          : `${badge.name} ≥ ${badge.threshold} — you have ${badge.name} ${badge.current}${badge.met ? ' ✓' : ''}`;
        const cls = [
          'req-badge',
          isCheck ? 'req-badge-check' : '',
          badge.met ? 'req-badge-met' : 'req-badge-unmet',
        ].filter(Boolean).join(' ');
        return (
          <span key={badge.name} className={cls} tabIndex={0} aria-label={tip}>
            <span className="req-badge-glyph" aria-hidden="true">{badge.glyph}</span>
            <span className="req-badge-label">
              {isCheck ? `${badge.name} ${badge.chance}%` : badge.name}
            </span>
            <span className="req-badge-tip" role="tooltip">{tip}</span>
          </span>
        );
      })}
    </span>
  );
}
