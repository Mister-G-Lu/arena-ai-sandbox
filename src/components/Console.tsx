import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { taskPayout } from '../game/payouts';
import { taskOrderFor } from '../game/dispatch';

import ConsoleWorkflow from './ConsoleWorkflow';
import {
  FILINGS,
  M_AMBIENT,
  M_PROD,
  SHIFT_ACTIONS,
  formatTime,
  shiftInitializationText,
  timeForActionsSpent,
  vistaForMoment,
  type LogEntry,
  type PendingTaskDisplay,
} from './consoleData';

export default function Console() {
  const { state, actions, actionTank } = useGameState();
  const savedPending = state.pendingDispatch;
  const pendingTask: PendingTaskDisplay | null = useMemo(
    () =>
      savedPending
        ? {
            ...savedPending,
            logId: savedPending.id,
            timestamp: timeForActionsSpent(savedPending.shiftAction),
          }
        : null,
    [savedPending],
  );
  const [phase, setPhase] = useState<'ready' | 'processing' | 'result'>(() =>
    pendingTask ? 'result' : 'ready',
  );
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const initial: LogEntry[] = [
      {
        id: 'shift-initialized',
        timestamp: timeForActionsSpent(state.actionsSpentThisShift),
        type: 'system',
        text: shiftInitializationText({
          day: state.day,
          tasksThisShift: state.tasksThisShift,
          annexOrderComplete: state.zones['annex-order'] === 'complete',
          handwritingOrderComplete: state.zones['handwritten-order'] === 'complete',
        }),
      },
    ];
    if (pendingTask)
      initial.push({
        id: pendingTask.logId,
        timestamp: pendingTask.timestamp,
        text: pendingTask.displayedResult,
        type: pendingTask.isCorrupt
          ? pendingTask.isPersonal
            ? 'corrupt personal'
            : 'corrupt'
          : '',
      });
    return initial;
  });
  const logRef = useRef<HTMLDivElement>(null);
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingTask = useRef(false);

  const minutes = Math.min(60 + state.actionsSpentThisShift * 6, 360);
  const shiftComplete = state.actionsSpentThisShift >= SHIFT_ACTIONS;
  const outOfActions = actionTank.empty;
  const annexOrderPending = state.day >= 2 && state.zones['annex-order'] !== 'complete';
  const handwritingOrderPending = state.day >= 3 && state.zones['handwritten-order'] !== 'complete';
  const nextAssignment = taskOrderFor(state.tasksCompleted);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, phase]);

  useEffect(() => () => {
    if (processingTimer.current) window.clearTimeout(processingTimer.current);
  }, []);

  useEffect(() => {
    if (phase !== 'processing') return undefined;
    if (!pendingTask) {
      startingTask.current = false;
      setPhase('ready');
      return undefined;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    processingTimer.current = window.setTimeout(() => {
      setLogs((prev) =>
        prev.some((entry) => entry.id === pendingTask.logId)
          ? prev
          : [
              ...prev,
              {
                id: pendingTask.logId,
                timestamp: pendingTask.timestamp,
                text: pendingTask.displayedResult,
                type: pendingTask.isCorrupt
                  ? pendingTask.isPersonal
                    ? 'corrupt personal'
                    : 'corrupt'
                  : '',
              },
            ],
      );
      startingTask.current = false;
      setPhase('result');
    }, reducedMotion ? 100 : 900);
    return () => {
      if (processingTimer.current) window.clearTimeout(processingTimer.current);
    };
  }, [pendingTask, phase]);

  function executeTask() {
    if (phase !== 'ready' || shiftComplete || outOfActions || pendingTask || startingTask.current) return;
    startingTask.current = true;
    setPhase('processing');
    actions.startDispatchTask({
      anomalyRoll: Math.random(),
      corruptionRoll: Math.random(),
    });
  }

  /**
   * File the pending result. `verb` is a key of FILINGS; everything else is
   * derived from data so the console never hardcodes a reward or a quality.
   */
  function fileResult(verb: string) {
    if (phase !== 'result' || !pendingTask) return;
    const filing = FILINGS[verb] ?? FILINGS.clean;
    const filedClean = verb !== 'discrepancy';

    const payout = taskPayout({
      tier: state.promotion.tier,
      corrupted: pendingTask.isCorrupt,
      filedClean,
      resultText: pendingTask.displayedResult,
    });

    actions.fileTaskResult({
      effects: filing.effects,
      payout: payout.amount,
      discrepancy: verb === 'discrepancy',
      anomaly: pendingTask.isCorrupt,
      logbookEntry: typeof filing.logbook === 'function' ? filing.logbook(pendingTask) : filing.logbook,
    });

    if (pendingTask.isCorrupt && filedClean) {
      setLogs((prev) =>
        prev.map((entry) =>
          entry.id === pendingTask.logId
            ? { ...entry, text: pendingTask.cleanResult ?? pendingTask.displayedResult, type: 'corrected' }
            : entry,
        ),
      );
    }

    if (payout.anomalous) {
      setLogs((prev) => [
        ...prev,
        {
          id: `${pendingTask.logId}-payroll`,
          timestamp: pendingTask.timestamp,
          type: 'system',
          text: `PAYROLL // +¤${payout.amount.toLocaleString()} — amount read from field. Field was damaged. Amount was paid.`,
        },
      ]);
    }

    if (state.actionsSpentThisShift >= SHIFT_ACTIONS) {
      setLogs((prev) => [
        ...prev,
        {
          id: `day-${state.day}-complete`,
          timestamp: '06:00',
          type: 'system',
          text: 'SHIFT COMPLETE // ACTION BUDGET SPENT // RESULT ACKNOWLEDGED. REPORT TO BREAK ROOM. DO NOT LOOK OUTSIDE.',
        },
      ]);
      actions.addLogEntry(
        `Day ${state.day}: shift budget spent. ${state.tasksThisShift + 1} results acknowledged.`,
      );
    }

    setPhase('ready');
  }

  function nextShift() {
    if (processingTimer.current) window.clearTimeout(processingTimer.current);
    actions.incrementDay();
    setPhase('ready');
    setLogs([
      {
        id: `day-${state.day + 1}-initialized`,
        timestamp: '01:00',
        type: 'system',
        text: shiftInitializationText({
          day: state.day + 1,
          tasksThisShift: 0,
          annexOrderComplete: state.zones['annex-order'] === 'complete',
          handwritingOrderComplete: state.zones['handwritten-order'] === 'complete',
        }),
      },
    ]);
  }

  const consoleStatus =
    phase === 'processing'
      ? 'PROCESSING'
      : phase === 'result'
        ? 'REVIEW REQUIRED'
        : shiftComplete
          ? 'BUDGET SPENT'
          : 'LINKED';

  const windowVista = vistaForMoment({ day: state.day, tasksThisShift: state.tasksThisShift, minutes });

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>OPERATOR CONSOLE</h2>
        <p className="section-lede">
          The live queue begins where orientation ended. Outside, the neon lanes keep moving. In here, you authorize them to have moved — one work order, one stamp, fifty times.
        </p>
        <p className="fine console-vista-lede">
          The window is still there. Use it. The city you dispatch is not the list you file.
        </p>

        <div className="console" aria-busy={phase === 'processing'}>
          <div className="console-head">
            <span className="dot"></span>
            CENTRAL DISPATCH // OPERATOR TERMINAL
            <span className="console-status">▣ {consoleStatus}</span>
          </div>
          <div className="readouts">
            <div className="readout">
              <label>SHIFT DAY</label>
              <span>{state.day}</span>
            </div>
            <div className="readout">
              <label>SHIFT CLOCK</label>
              <span>{formatTime(minutes)}</span>
            </div>
            <div className="readout">
              <label>ACTIONS</label>
              <span>{actionTank.display}</span>
            </div>
            <div className="readout">
              <label>STATUS</label>
              <span>
                {phase === 'result'
                  ? 'ACKNOWLEDGMENT DUE'
                  : shiftComplete
                    ? 'SHIFT COMPLETE'
                    : outOfActions
                      ? 'BUDGET EXHAUSTED'
                      : 'CLEAR UNTIL 06:00'}
              </span>
            </div>
          </div>

          <div className="console-vista" aria-live="polite" aria-label="Window view">
            <span className="console-vista-kicker">WINDOW // EXTERNAL FEED — {formatTime(minutes)}</span>
            <p className="console-vista-text">{windowVista}</p>
            <span className="console-vista-rule">You are not outside. You are at the desk that says outside is CLEAR.</span>
          </div>

          {annexOrderPending && (
            <aside className="secondary-order" aria-labelledby="annex-order-title">
              <div>
                <div className="secondary-order-kicker">SECONDARY ORDER // OUTSIDE THE LIVE QUEUE</div>
                <div className="secondary-order-title" id="annex-order-title">
                  ANNEX ELEVATOR // OUT-OF-RANGE STOP: FLOOR 12
                </div>
                <p>
                  Car 2 stopped above its listed service range at 00:59:57. The request
                  carries your terminal ID. Clearance determines how much of the attachment
                  the system will admit exists.
                </p>
                <p className="manager-aside">
                  M. // &quot;Elevators occasionally become ambitious. We do not reward initiative
                  here. File it and return to your actual job.&quot;
                </p>
              </div>
              <a className="btn btn-primary btn-compact" href="#investigations">
                ▸ INVESTIGATE
              </a>
            </aside>
          )}

          {handwritingOrderPending && (
            <aside className="secondary-order" aria-labelledby="handwritten-order-title">
              <div>
                <div className="secondary-order-kicker">NIGHT DESK // FILED 03:12 // IN YOUR HAND</div>
                <div className="secondary-order-title" id="handwritten-order-title">
                  WORK ORDER // STREETLIGHT 4-B, SECTOR 9
                </div>
                <p>
                  The order is signed with your name, in your handwriting. You were at the
                  terminal at 03:12. The queue has no memory of this order. The signature has
                  a very good memory.
                </p>
                <p className="manager-aside">
                  M. // &quot;I did not authorise this. Do not authorise it either. Return it to the
                  desk it came from — the one that is not there.&quot;
                </p>
              </div>
              <a className="btn btn-primary btn-compact" href="#investigations">
                ▸ INVESTIGATE
              </a>
            </aside>
          )}

          <div className="log" ref={logRef} aria-label="Dispatch log" aria-live="polite">
            {logs.map((log) => (
              <div key={log.id} className={`log-line ${log.type}`}>
                <span className="ts">[{log.timestamp}]</span> {log.text}
              </div>
            ))}
          </div>

          {state.day >= 3 && state.promotion.tier === 0 && (state.qualities.doubt ?? 0) <= 0 ? (
            <p className="manager-aside console-ambient">{M_PROD}</p>
          ) : state.day >= 4 ? (
            <p className="manager-aside console-ambient">
              {M_AMBIENT[(state.day - 4) % M_AMBIENT.length]}
            </p>
          ) : null}

          <ConsoleWorkflow
            phase={phase}
            state={state}
            actionTank={actionTank}
            pendingTask={pendingTask}
            nextAssignment={nextAssignment}
            shiftComplete={shiftComplete}
            outOfActions={outOfActions}
          />

          <div className="console-actions">
            {phase === 'ready' && !shiftComplete && !outOfActions && (
              <button className="btn btn-primary" onClick={executeTask}>
                ▸ EXECUTE TASK {state.tasksThisShift + 1}
              </button>
            )}
            {phase === 'ready' && !shiftComplete && outOfActions && (
              <button className="btn btn-primary" type="button" disabled>
                NO ACTIONS — +1 IN {actionTank.countdown}
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
                onClick={() => fileResult('clean')}
                autoFocus
              >
                {FILINGS.clean.label}
              </button>
            )}
            {phase === 'result' && pendingTask?.isCorrupt && (
              <>
                <button
                  className="btn btn-primary acknowledge-button"
                  onClick={() => fileResult('file-clean')}
                >
                  {FILINGS['file-clean'].label}
                </button>
                <button
                  className="btn btn-ghost acknowledge-button"
                  onClick={() => fileResult('discrepancy')}
                >
                  {FILINGS.discrepancy.label}
                </button>
              </>
            )}
            {phase === 'ready' && shiftComplete && (
              <button className="btn btn-primary" onClick={nextShift}>
                ▸ BEGIN NEXT SHIFT
              </button>
            )}
            <span className="console-action-note">
              {phase === 'result'
                ? pendingTask?.isCorrupt
                  ? 'Two ways to close this record. Only one of them is honest. Both are permitted.'
                  : 'The next work order will remain sealed until you confirm this record.'
                : `${state.tasksThisShift} results logged this shift · ${actionTank.display} actions.${
                    state.discrepanciesLogged > 0
                      ? ` ${state.discrepanciesLogged} discrepancies on your record.`
                      : ''
                  }`}
            </span>
          </div>
        </div>

        <div className="console-utility-row">
          <a className="btn btn-ghost btn-compact" href="#first-shift">
            ↻ REVIEW FIRST SHIFT
          </a>
        </div>
      </div>
    </section>
  );
}
