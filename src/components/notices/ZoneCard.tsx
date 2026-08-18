import { clearanceLabel, requirementLabel, type ZoneDef, type ZoneState } from '../../game/progression';

export type AvailableZone = ZoneDef & { status: ZoneState };

interface ZoneCardProps {
  zone: AvailableZone;
  status: ZoneState;
  remaining: number;
  clearanceHeld: boolean;
  blockers: string[];
  needsSupplies: boolean;
  componentAcquired: boolean;
  orderInProgress: boolean;
  onOpen: () => void;
}

/** One zone on a board — its status, its gates, and the OPEN action. */
export default function ZoneCard({
  zone,
  status,
  remaining,
  clearanceHeld,
  blockers,
  needsSupplies,
  componentAcquired,
  orderInProgress,
  onOpen,
}: ZoneCardProps) {
  return (
    <article className={`zone-card zone-${status}`}>
      <div className="zone-kicker">{zone.kicker}</div>
      <h3>{zone.title}</h3>
      <p>{zone.blurb}</p>
      <div className="zone-meta">
        <span className={`zone-status-pill zone-status-${status}`}>
          {status.toUpperCase()}
        </span>
        {zone.component && (
          <span className="zone-prize">
            {componentAcquired ? '✓ ' : '◇ '}
            {zone.componentLabel || zone.component.toUpperCase()}
          </span>
        )}
        {zone.onceEach && status !== 'complete' && (
          <span className="zone-remaining">{remaining} unread</span>
        )}
      </div>

      {status === 'locked' && (
        <div className="zone-requirement-stack">
          {!clearanceHeld && (
            <p className="fine zone-requirement">
              CLEARANCE REQUIRED: {zone.requiresUnlock ? clearanceLabel(zone.requiresUnlock) : 'UNKNOWN CLEARANCE'}
            </p>
          )}
          {zone.lockedNote && (
            <p className="fine zone-requirement">{zone.lockedNote}</p>
          )}
          <p className="fine zone-requirement">
            REQUIRES: {requirementLabel(zone.requires)}
            {blockers.length > 0 ? ` — you have ${blockers.join(', ')}` : ''}
          </p>
          {needsSupplies && (
            <a className="zone-supply-link" href="#shop">
              ▸ ORDER FROM SUPPLY
            </a>
          )}
        </div>
      )}

      {status === 'complete' && zone.closedNote && (
        <p className="fine zone-requirement">{zone.closedNote}</p>
      )}

      <button
        className="btn btn-primary btn-compact"
        type="button"
        aria-label={`Open ${zone.title}`}
        disabled={status !== 'open' || orderInProgress}
        onClick={onOpen}
      >
        {orderInProgress ? 'ORDER IN PROGRESS' : '▸ OPEN'}
      </button>
    </article>
  );
}
