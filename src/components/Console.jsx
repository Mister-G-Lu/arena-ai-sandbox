import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { taskPayout } from '../game/payouts';
import { describeEffects } from '../game/qualities';
import { TASKS_PER_SHIFT, taskOrderFor } from '../game/dispatch';

const MAX_TASKS = TASKS_PER_SHIFT;

/** Consequence table for filing a result: every verb carries its own effects,
 *  payout rule and residue line, so adding a filing verb is one entry here. */
const FILINGS = {
  clean: {
    id: 'clean',
    label: '✓ ACKNOWLEDGE RESULT',
    effects: null,
    logbook: null
  },
  'file-clean': {
    id: 'file-clean',
    label: '✓ FILE AS CLEAN',
    hint: 'The system will correct the record and pay the reading it took. Nothing further is required of you.',
    effects: { Routine: 1 },
    logbook: null
  },
  discrepancy: {
    id: 'discrepancy',
    label: '⚠ LOG THE DISCREPANCY',
    hint: 'The line stays in the log exactly as it arrived. Unreconciled work is unbilled work. The system will notice that you noticed.',
    effects: { Doubt: 1, Attention: 1 },
    logbook: (task) => `Day-log, ${task.timestamp} — ${task.code} returned: "${task.displayedResult}" ` +
      'I did not correct it. Ink does not forget.'
  }
};

/** What the window shows while you file — the city you never touch. Rotates with time and tasks so the outside feels alive while the queue feels identical. */
const WINDOW_VISTAS = [
  'Hoverlanes hum thirty stories up — six cars cut the limit at once, their taillights smearing amber across wet Sector 4. You initial a form.',
  'A police cutter holds altitude over the annex, searchlight painting floor 11 amber, lingering on the blank where 12 should be. You verify a light.',
  'Delivery drones stitch the dark between towers, quiet as paper. One manifest lists only STATIONERY in a hand that tried too hard.',
  'Neon rain. The city throws itself back at its own windows until you can’t tell which lights are real. The log says CLEAR.',
  'Through the glass: the rooftop array blinks once. The system says nominal. The blink says otherwise.',
  'Far out over Sector 9, a single set of tail-lights holds at the map’s edge — VANTABLACK, waiting for a name you haven’t said yet.',
  'The towers breathe. Thirty floors of wet glass inhaling amber, exhaling teal. On your screen: 0.00% variance.',
  'A drone convoy threads the gap between the municipal spires at 180 kph, obedient and bright. Below, a streetlight you cleared flickers and holds.',
  'Meridian at 02:47 — a cutter’s wail dopplers down the canyon between buildings and is answered by nothing. The coffee stays warm.',
];

/** Deterministic vista for a given shift moment — no extra state, just atmosphere that ticks forward. */
function vistaForMoment({ day, tasksThisShift, minutes }) {
  const idx = (tasksThisShift + day * 3 + Math.floor(minutes / 40)) % WINDOW_VISTAS.length;
  return WINDOW_VISTAS[idx];
}

function formatTime(mins) {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * The in-fiction clock runs on actions spent this shift, not on the career
 * task total: the night is 01:00–06:00 however the operator chooses to spend
 * it, and it advances whether an action went to the queue or to a notice.
 */
function timeForActionsSpent(actionsSpent) {
  return formatTime(Math.min(60 + actionsSpent * 6, 360));
}

function shiftInitializationText({ day, tasksThisShift, annexOrderComplete }) {
  if (day === 1 && tasksThisShift > 0) {
    return 'ORIENTATION RECORD RECEIVED // TASK VERIFIED // LIVE QUEUE OPEN.';
  }
  if (day >= 2 && !annexOrderComplete) {
    return 'SHIFT INITIALIZED // SECONDARY ORDER POSTED: ANNEX ELEVATOR, OUT-OF-RANGE STOP 12.';
  }
  return 'SHIFT INITIALIZED // COFFEE: WARM // LIVE QUEUE OPEN.';
}

export default function Console() {
  const { state, actions, actionTank } = useGameState();
  const savedPending = state.pendingDispatch;
  const pendingTask = useMemo(() => savedPending ? {
    ...savedPending,
    logId: savedPending.id,
    timestamp: timeForActionsSpent(savedPending.shiftAction)
  } : null, [savedPending]);
  const [phase, setPhase] = useState(() => pendingTask ? 'result' : 'ready');
  const [logs, setLogs] = useState(() => {
    const initial = [{
      id: 'shift-initialized',
      timestamp: timeForActionsSpent(state.actionsSpentThisShift),
      type: 'system',
      text: shiftInitializationText({
        day: state.day,
        tasksThisShift: state.tasksThisShift,
        annexOrderComplete: state.zones['annex-order'] === 'complete'
      })
    }];
    if (pendingTask) initial.push({
      id: pendingTask.logId,
      timestamp: pendingTask.timestamp,
      text: pendingTask.displayedResult,
      type: pendingTask.isCorrupt ? 'corrupt' : ''
    });
    return initial;
  });
  const logRef = useRef(null);
  const processingTimer = useRef(null);
  const startingTask = useRef(false);

  const minutes = Math.min(60 + state.actionsSpentThisShift * 6, 360);
  // The night ends when the shift's actions are gone, not when a quota is met.
  const shiftComplete = state.actionsSpentThisShift >= MAX_TASKS;
  // Out of budget: the clock, not the quota, is what stops the operator now.
  const outOfActions = actionTank.empty;
  const annexOrderPending = state.day >= 2 && state.zones['annex-order'] !== 'complete';
  const nextAssignment = taskOrderFor(state.tasksCompleted);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, phase]);

  useEffect(() => () => window.clearTimeout(processingTimer.current), []);

  useEffect(() => {
    if (phase !== 'processing' || !pendingTask) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    processingTimer.current = window.setTimeout(() => {
      setLogs(prev => prev.some((entry) => entry.id === pendingTask.logId) ? prev : [...prev, {
        id: pendingTask.logId,
        timestamp: pendingTask.timestamp,
        text: pendingTask.displayedResult,
        type: pendingTask.isCorrupt ? 'corrupt' : ''
      }]);
      startingTask.current = false;
      setPhase('result');
      // A corrupted record stays wrong until the operator decides what to do
      // with it — that decision is the game.
    }, reducedMotion ? 100 : 900);
    return () => window.clearTimeout(processingTimer.current);
  }, [pendingTask, phase]);

  function executeTask() {
    if (phase !== 'ready' || shiftComplete || outOfActions || pendingTask || startingTask.current) return;
    startingTask.current = true;
    setPhase('processing');
    actions.startDispatchTask({
      anomalyRoll: Math.random(),
      corruptionRoll: Math.random()
    });
  }

  /**
   * File the pending result. `verb` is a key of FILINGS; everything else is
   * derived from data so the console never hardcodes a reward or a quality.
   */  function fileResult(verb) {
    if (phase !== 'result' || !pendingTask) return;
    const filing = FILINGS[verb] ?? FILINGS.clean;
    const filedClean = verb !== 'discrepancy';

    const payout = taskPayout({
      tier: state.promotion.tier,
      corrupted: pendingTask.isCorrupt,
      filedClean,
      resultText: pendingTask.displayedResult
    });

    actions.fileTaskResult({
      effects: filing.effects,
      payout: payout.amount,
      discrepancy: verb === 'discrepancy',
      anomaly: pendingTask.isCorrupt,
      logbookEntry: typeof filing.logbook === 'function' ? filing.logbook(pendingTask) : filing.logbook
    });

    if (pendingTask.isCorrupt && filedClean) {
      // The system smooths its own error over — but only once you sign off.
      setLogs(prev => prev.map(entry => entry.id === pendingTask.logId
        ? { ...entry, text: pendingTask.cleanResult, type: 'corrected' }
        : entry));
    }

    if (payout.anomalous) {
      setLogs(prev => [...prev, {
        id: `${pendingTask.logId}-payroll`,
        timestamp: pendingTask.timestamp,
        type: 'system',
        text: `PAYROLL // +¤${payout.amount.toLocaleString()} — amount read from field. Field was damaged. Amount was paid.`
      }]);
    }

    if (state.actionsSpentThisShift >= MAX_TASKS) {
      setLogs(prev => [...prev, {
        id: `day-${state.day}-complete`,
        timestamp: '06:00',
        type: 'system',
        text: 'SHIFT COMPLETE // QUOTA MET // RESULT ACKNOWLEDGED. REPORT TO BREAK ROOM. DO NOT LOOK OUTSIDE.'
      }]);
      actions.addLogEntry(`Day ${state.day}: shift quota met. Fifty results acknowledged.`);
    }

    setPhase('ready');
  }

  function nextShift() {
    window.clearTimeout(processingTimer.current);
    actions.incrementDay();
    setPhase('ready');
    setLogs([{
      id: `day-${state.day + 1}-initialized`,
      timestamp: '01:00',
      type: 'system',
      text: shiftInitializationText({
        day: state.day + 1,
        tasksThisShift: 0,
        annexOrderComplete: state.zones['annex-order'] === 'complete'
      })
    }]);
  }

  const consoleStatus = phase === 'processing'
    ? 'PROCESSING'
    : phase === 'result'
      ? 'REVIEW REQUIRED'
      : shiftComplete
        ? 'QUOTA MET'
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
                <div className="secondary-order-kicker">SECONDARY ORDER // DOES NOT COUNT TOWARD QUOTA</div>
                <div className="secondary-order-title" id="annex-order-title">
                  ANNEX ELEVATOR // OUT-OF-RANGE STOP: FLOOR 12
                </div>
                <p>
                  Car 2 stopped above its listed service range at 00:59:57. The request
                  carries your terminal ID. Clearance determines how much of the attachment
                  the system will admit exists.
                </p>
                <p className="manager-aside">
                  M. // “Elevators occasionally become ambitious. We do not reward initiative
                  here. File it and return to your actual job.”
                </p>
              </div>
              <a className="btn btn-primary btn-compact" href="#investigations">
                ▸ INVESTIGATE
              </a>
            </aside>
          )}

          <div className="log" ref={logRef} aria-label="Dispatch log" aria-live="polite">
            {logs.map(log => (
              <div key={log.id} className={`log-line ${log.type}`}>
                <span className="ts">[{log.timestamp}]</span> {log.text}
              </div>
            ))}
          </div>

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
                  <div className="processing-bar" aria-hidden="true">
                    <div className="processing-fill"></div>
                  </div>
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
                    ? 'RESULT RECEIVED // RECORD DOES NOT RECONCILE'
                    : 'RESULT RECEIVED // ACKNOWLEDGMENT REQUIRED'}
                </div>
                <div className="task-title">{pendingTask.code} // {pendingTask.title}</div>
                <p className={pendingTask.isCorrupt ? 'task-result corrupt' : 'task-result'}>
                  {pendingTask.displayedResult}
                </p>
                {pendingTask.isCorrupt ? (
                  <div className="task-decision">
                    <p className="task-decision-lede">
                      The returned record does not match the work order. Dispatch is waiting for
                      you to decide what happened.
                    </p>
                    {['file-clean', 'discrepancy'].map((verb) => {
                      const filing = FILINGS[verb];
                      const preview = taskPayout({
                        tier: state.promotion.tier,
                        corrupted: true,
                        filedClean: verb !== 'discrepancy',
                        resultText: pendingTask.displayedResult
                      });
                      const consequences = describeEffects(filing.effects);
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
                  M. // “Rest is scheduled, the same as everything else. Come back when the
                  building says you may.”
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
