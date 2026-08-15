import { visibleQualities, type Progress, type Storylet, type ZoneId } from '../game/storylets';
import { HudFrame } from './HudFrame';

const ZONE_META: Record<ZoneId, { title: string; blurb: string }> = {
  tutorial: { title: 'Orientation', blurb: 'Day one. The chair is already warm.' },
  routine: { title: 'Routine pool', blurb: 'The job. Optional. The system likes it.' },
  floor12: { title: 'Floor 12', blurb: 'The floor that does not exist.' },
};

export function WorkOrders({
  progress,
  currentCard,
  lastOutcome,
  canAct,
  onChoose,
  onOpenZone,
}: {
  progress: Progress;
  currentCard?: Storylet;
  lastOutcome: string | null;
  canAct: boolean;
  onChoose: (id: string) => void;
  onOpenZone: (zone: ZoneId) => void;
}) {
  const shown = visibleQualities(progress.qualities);

  return (
    <section id="orders" className="section">
      <div className="wrap">
        <h2>Work orders</h2>
        <p className="section-lede">
          Every action is a card. Transition flags live on the choice. Attention is in the file.
          Attention is not on this screen.
        </p>

        <div className="qualities" data-testid="qualities">
          {shown.map(([name, value]) => (
            <div className="quality" key={name}>
              <label>{name}</label>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className="zone-tabs">
          {(Object.keys(ZONE_META) as ZoneId[]).map((zone) => {
            const status = progress.zones[zone];
            return (
              <button
                key={zone}
                type="button"
                className={`zone-tab zone-${status}`}
                disabled={status === 'locked'}
                onClick={() => onOpenZone(zone)}
              >
                <strong>{ZONE_META[zone].title}</strong>
                <span>{status}</span>
              </button>
            );
          })}
        </div>

        {currentCard ? (
          <HudFrame className="storylet">
            <p className="storylet-zone">{ZONE_META[currentCard.zone].title}</p>
            <h3>{currentCard.title}</h3>
            <p className="storylet-body">{currentCard.body}</p>
            <div className="storylet-choices">
              {currentCard.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn btn-ghost"
                  disabled={!canAct}
                  onClick={() => onChoose(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </HudFrame>
        ) : (
          <p className="fine">
            No active work order. Pick a zone. {ZONE_META.tutorial.blurb}
          </p>
        )}

        {lastOutcome ? (
          <HudFrame className="outcome">
            <header>RESULT</header>
            <p>{lastOutcome}</p>
          </HudFrame>
        ) : null}
      </div>
    </section>
  );
}
