import type { Choice, Storylet } from '../../game/storylets';

interface StoryletConsoleProps {
  card: Storylet;
  cardCosts: boolean;
  countdown: string;
  actionTankEmpty: boolean;
  effectsFor: (choice: Choice) => string | null;
  refusal: string | null;
  onChoose: (choice: Choice) => void;
  onStandDown: () => void;
}

/** The open storylet — the card body and its choice buttons. */
export default function StoryletConsole({
  card,
  cardCosts,
  countdown,
  actionTankEmpty,
  effectsFor,
  refusal,
  onChoose,
  onStandDown,
}: StoryletConsoleProps) {
  return (
    <div className="console storylet-console">
      <div className="console-head">
        <span className="dot"></span>
        {card.zone.toUpperCase()} // {card.id.toUpperCase()}
        <span className="console-status">▣ OPEN ORDER</span>
      </div>
      <div className="storylet-body">
        <h3>{card.title}</h3>
        <p>{card.body}</p>
      </div>
      <div className="storylet-choices">
        {card.choices.map((choice) => {
          const effects = effectsFor(choice);
          return (
            <button
              key={choice.id}
              className={`btn btn-ghost storylet-choice${choice.death ? ' storylet-choice-death' : ''}`}
              type="button"
              onClick={() => onChoose(choice)}
              disabled={cardCosts && actionTankEmpty}
            >
              <span className="storylet-choice-label">{choice.label}</span>
              <span className="storylet-choice-meta">
                {choice.death && (
                  <span className="storylet-choice-danger">LETHAL // THIS CHOICE KILLS</span>
                )}
                {effects && <span className="storylet-choice-effects">{effects}</span>}
                <span className="storylet-choice-cost">
                  {cardCosts ? '1 ACTION' : 'REREAD — FREE'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {cardCosts && actionTankEmpty && (
        <div className="storylet-refusal-stack">
          <p className="fine storylet-refusal">
            BUDGET EXHAUSTED // THE ORDER STAYS OPEN. NEXT ACTION IN {countdown}.
          </p>
          <button className="btn btn-ghost btn-compact" type="button" onClick={onStandDown}>
            ↩ STAND DOWN
          </button>
        </div>
      )}
      {refusal && <p className="fine storylet-refusal">{refusal}</p>}
    </div>
  );
}
