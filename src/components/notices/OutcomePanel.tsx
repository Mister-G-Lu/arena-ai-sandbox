interface Outcome {
  title: string;
  text: string;
  effects: string | null;
  revisit: boolean;
}

interface OutcomePanelProps {
  outcome: Outcome;
  showStandDown: boolean;
  onStandDown: () => void;
}

/** The filed result of a storylet choice. */
export default function OutcomePanel({ outcome, showStandDown, onStandDown }: OutcomePanelProps) {
  return (
    <div className="console storylet-outcome">
      <div className="console-head">
        <span className="dot"></span>
        RESULT // {outcome.title.toUpperCase()}
        <span className="console-status">▣ FILED</span>
      </div>
      <p className="storylet-outcome-text">{outcome.text}</p>
      {outcome.effects && (
        <p className="fine">FILED TO YOUR RECORD: {outcome.effects}</p>
      )}
      {outcome.revisit && (
        <p className="fine">REREAD // RECORD UNCHANGED — CONSEQUENCES FILE ONCE PER CARD.</p>
      )}
      {showStandDown && (
        <button className="btn btn-ghost btn-compact" type="button" onClick={onStandDown}>
          ↩ BACK TO THE DESK
        </button>
      )}
    </div>
  );
}
