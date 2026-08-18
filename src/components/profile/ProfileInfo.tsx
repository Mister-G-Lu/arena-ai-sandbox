import { useGameState } from '../../context/GameStateContext';

/** OPERATOR INFORMATION — the header grid of identity and shift totals. */
export default function ProfileInfo() {
  const { state, actionTank, PROMOTIONS } = useGameState();
  const currentPromotion = PROMOTIONS[state.promotion.tier];

  return (
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
            <span className="info-value">{state.day}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Results Filed:</span>
            <span className="info-value">{state.tasksCompleted.toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">This Shift:</span>
            <span className="info-value">{state.tasksThisShift}</span>
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
            <span className="info-value">{state.deaths}</span>
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
  );
}
