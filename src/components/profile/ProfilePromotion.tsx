import { useGameState } from '../../context/GameStateContext';
import { requirementLabel, missingRequirements } from '../../game/progression';

/** PROMOTION STATUS — current rank, its unlocks, and the next hurdle. */
export default function ProfilePromotion() {
  const { state, requirementCtx, PROMOTIONS } = useGameState();
  const currentPromotion = PROMOTIONS[state.promotion.tier];
  const nextPromo = PROMOTIONS[state.promotion.tier + 1];

  return (
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

        {nextPromo ? (
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
        ) : (
          <div className="promotion-max">
            <div className="max-label">Maximum rank achieved</div>
            <div className="max-title">You have reached the end of the hierarchy.</div>
          </div>
        )}
      </div>
    </div>
  );
}
