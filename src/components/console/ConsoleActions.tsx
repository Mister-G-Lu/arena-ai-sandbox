import type { PendingTaskDisplay } from '../consoleData';
import { FILINGS } from '../consoleData';

type ConsolePhase = 'ready' | 'processing' | 'result';

interface ConsoleActionsProps {
  phase: ConsolePhase;
  tasksThisShift: number;
  discrepanciesLogged: number;
  shiftComplete: boolean;
  outOfActions: boolean;
  countdown: string;
  actionsDisplay: string;
  pendingTask: PendingTaskDisplay | null;
  onExecute: () => void;
  onFile: (verb: string) => void;
  onNextShift: () => void;
}

/** The console's action button cluster plus its contextual note. The parent
 * owns the handlers; this only decides which buttons are visible for the phase. */
export default function ConsoleActions({
  phase,
  tasksThisShift,
  discrepanciesLogged,
  shiftComplete,
  outOfActions,
  countdown,
  actionsDisplay,
  pendingTask,
  onExecute,
  onFile,
  onNextShift,
}: ConsoleActionsProps) {
  return (
    <div className="console-actions">
      {phase === 'ready' && !shiftComplete && !outOfActions && (
        <button className="btn btn-primary" onClick={onExecute}>
          ▸ EXECUTE TASK {tasksThisShift + 1}
        </button>
      )}
      {phase === 'ready' && !shiftComplete && outOfActions && (
        <button className="btn btn-primary" type="button" disabled>
          NO ACTIONS — +1 IN {countdown}
        </button>
      )}
      {phase === 'processing' && (
        <button className="btn btn-primary" type="button" disabled>
          PROCESSING — QUEUE LOCKED
        </button>
      )}
      {phase === 'result' && !pendingTask?.isCorrupt && (
        <button
          className="btn btn-primary acknowledge-button"
          onClick={() => onFile('clean')}
          autoFocus
        >
          {FILINGS.clean.label}
        </button>
      )}
      {phase === 'result' && pendingTask?.isCorrupt && (
        <>
          <button
            className="btn btn-primary acknowledge-button"
            onClick={() => onFile('file-clean')}
          >
            {FILINGS['file-clean'].label}
          </button>
          <button
            className="btn btn-ghost acknowledge-button"
            onClick={() => onFile('discrepancy')}
          >
            {FILINGS.discrepancy.label}
          </button>
        </>
      )}
      {phase === 'ready' && shiftComplete && (
        <button className="btn btn-primary" onClick={onNextShift}>
          ▸ BEGIN NEXT SHIFT
        </button>
      )}
      <span className="console-action-note">
        {phase === 'result'
          ? pendingTask?.isCorrupt
            ? 'Two ways to close this record. Only one of them is honest. Both are permitted.'
            : 'The next work order will remain sealed until you confirm this record.'
          : `${tasksThisShift} results logged this shift · ${actionsDisplay} actions.${
              discrepanciesLogged > 0
                ? ` ${discrepanciesLogged} discrepancies on your record.`
                : ''
            }`}
      </span>
    </div>
  );
}
