import { describeEffects } from '../game/qualities';
import { taskPayout } from '../game/payouts';
import type { DispatchOrder } from '../game/dispatch';
import { FILINGS, type PendingTaskDisplay } from './consoleData';

interface WorkflowState {
  day: number;
  tasksThisShift: number;
  discrepanciesLogged: number;
  promotion: { tier: number };
  qualities: Record<string, number>;
  attention: number;
}

interface WorkflowTank {
  display: string;
  countdown: string;
}

type ConsolePhase = 'ready' | 'processing' | 'result';

interface ConsoleWorkflowProps {
  phase: ConsolePhase;
  state: WorkflowState;
  actionTank: WorkflowTank;
  pendingTask: PendingTaskDisplay | null;
  nextAssignment: DispatchOrder;
  shiftComplete: boolean;
  outOfActions: boolean;
}

export default function ConsoleWorkflow({
  phase,
  state,
  actionTank,
  pendingTask,
  nextAssignment,
  shiftComplete,
  outOfActions,
}: ConsoleWorkflowProps) {
  return (
          <div className={`task-workflow task-workflow-${phase}`} aria-live="polite">
            {phase === 'ready' && !shiftComplete && !outOfActions && (
              <div className="task-card task-card-ready">
                <div className="task-kicker">NEXT WORK ORDER // ONE ACTION</div>
                <div className="task-title">{nextAssignment.code} // {nextAssignment.title}</div>
                <p>{nextAssignment.instruction}</p>
                <span className="task-rule">Execution locks the queue until its result is acknowledged.</span>
              </div>
            )}

            {phase === 'processing' && pendingTask && (
              <div className="task-card task-card-processing">
                <div className="task-kicker">EXECUTING // {pendingTask.code}</div>
                <div className="task-title">{pendingTask.title}</div>
                <div className="task-processing">
                  <progress className="processing-bar" aria-hidden="true" />
                  <div className="processing-lines">
                    <div className="processing-line">→ validating work order...</div>
                    <div className="processing-line">→ contacting dispatch network...</div>
                    <div className="processing-line">→ committing result to the ledger...</div>
                    <div className="processing-line">→ holding queue for operator review...</div>
                  </div>
                </div>
              </div>
            )}

            {phase === 'result' && pendingTask && (
              <div className="task-card task-card-result">
                <div className="task-kicker">
                  {pendingTask.isCorrupt
                    ? pendingTask.isPersonal
                      ? 'RESULT RECEIVED // IT IS YOUR HANDWRITING'
                      : 'RESULT RECEIVED // RECORD DOES NOT RECONCILE'
                    : 'RESULT RECEIVED // ACKNOWLEDGMENT REQUIRED'}
                </div>
                <div className="task-title">{pendingTask.code} // {pendingTask.title}</div>
                <p
                  className={
                    pendingTask.isCorrupt
                      ? `task-result corrupt${pendingTask.isPersonal ? ' personal' : ''}`
                      : 'task-result'
                  }
                >
                  {pendingTask.displayedResult}
                </p>
                {pendingTask.isCorrupt ? (
                  <div className="task-decision">
                    <p className="task-decision-lede">
                      {pendingTask.isPersonal
                        ? 'The returned record is written in a hand you know — the same hand that signs your logbook. Dispatch is waiting for you to decide what happened.'
                        : 'The returned record does not match the work order. Dispatch is waiting for you to decide what happened.'}
                    </p>
                    {(['file-clean', 'discrepancy'] as const).map((verb) => {
                      const filing = FILINGS[verb];
                      const preview = taskPayout({
                        tier: state.promotion.tier,
                        corrupted: true,
                        filedClean: verb !== 'discrepancy',
                        resultText: pendingTask.displayedResult,
                      });
                      const consequences = describeEffects(filing.effects, {
                        qualities: state.qualities,
                        attention: state.attention,
                      });
                      return (
                        <div key={verb} className="task-decision-option">
                          <span className="task-decision-label">{filing.label}</span>
                          <span className="task-decision-hint">{filing.hint}</span>
                          <span className="task-decision-cost">
                            {preview.amount > 0 ? `+¤${preview.amount.toLocaleString()}` : 'NO PAYMENT'}
                            {consequences ? ` · ${consequences}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="task-reward">
                    <span>RECORD UPDATED</span>
                    <span>
                      +¤{taskPayout({ tier: state.promotion.tier }).amount.toLocaleString()} CREDITS
                    </span>
                    <span>{actionTank.display} ACTIONS</span>
                  </div>
                )}
              </div>
            )}

            {phase === 'ready' && !shiftComplete && outOfActions && (
              <div className="task-card task-card-complete">
                <div className="task-kicker">BUDGET EXHAUSTED // QUEUE HELD</div>
                <div className="task-title">NO ACTIONS REMAINING</div>
                <p>
                  Dispatch has stopped releasing work orders. The queue is not closed — it is
                  waiting. The next action clears in {actionTank.countdown}.
                </p>
                <p className="manager-aside">
                  M. // &quot;Rest is scheduled, the same as everything else. Come back when the
                  building says you may.&quot;
                </p>
              </div>
            )}

            {phase === 'ready' && shiftComplete && (
              <div className="task-card task-card-complete">
                <div className="task-kicker">SHIFT RECORD CLOSED // 06:00 — THE CITY EXHALES</div>
                <div className="task-title">THE NIGHT IS SPENT</div>
                <p>Outside, the hoverlanes thin to a single amber thread. The cutters are gone. The drones have stopped stitching the dark. Meridian holds its breath for the hour nobody sees.</p>
                <p className="dim">The city has accepted your work. The coffee in the break room is still warm. It was warm before the building — you know that now, but the log does not.</p>
              </div>
            )}
          </div>
  );
}
