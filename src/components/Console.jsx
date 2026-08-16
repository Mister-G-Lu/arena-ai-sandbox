import React, { useEffect, useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { taskPayout } from '../game/payouts';
import { describeEffects } from '../game/qualities';
import { TASKS_PER_SHIFT, shouldTriggerAnomaly } from '../game/dispatch';

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

const TASK_ORDERS = [
  {
    code: 'S9-RC-041',
    title: 'SECTOR 9 ROLL CALL',
    instruction: 'Open the night channel. Confirm the driver, route, and road conditions before filing.',
    result: 'S9 ROLL CALL — roads clear. stars: nominal. driver: VANTABLACK. status: green.'
  },
  {
    code: 'LGT-4B-118',
    title: 'STREETLIGHT 4-B',
    instruction: 'Compare the outage ticket with the grid. Dispatch a crew only if both records agree.',
    result: 'STREETLIGHT 4-B — records matched. ticket filed. crew dispatched. no follow-up required.'
  },
  {
    code: 'BRK-AM-006',
    title: 'BREAK ROOM AUDIT',
    instruction: 'Verify the coffee temperature, pot level, and operator count. Do not amend the preparation time.',
    result: 'BREAK ROOM — coffee: warm. pot: full. operators present: one. preparation time: unavailable.'
  },
  {
    code: 'WXR-0600',
    title: 'WEATHER DESK',
    instruction: 'Read the overnight model through 06:00. Acknowledge any deviation from clear conditions.',
    result: 'WEATHER — clear through 06:00. deviation: none. forecast after 06:00: not applicable.'
  },
  {
    code: 'RTE-000',
    title: 'ROUTE SYNCHRONIZATION',
    instruction: 'Reconcile every active truck with its assigned route. File the variance to two decimal places.',
    result: 'ROUTE SCAN — all trucks on schedule. deviation: 0.00%. reconciliation accepted.'
  },
  {
    code: 'RAD-NC-9',
    title: 'NIGHT CREW RADIO CHECK',
    instruction: 'Ping the night channel and wait for three clean tones before confirming the link.',
    result: 'RADIO — night crew confirmed. three tones received. signal: strong. no anomalies.'
  },
  {
    code: 'INV-41312',
    title: 'MUNICIPAL INVENTORY',
    instruction: 'Compare the current inventory total with the prior shift. Escalate any non-zero delta.',
    result: 'INVENTORY — count: 41,312. previous: 41,312. delta: 0. escalation not required.'
  },
  {
    code: 'MEM-TUE-0',
    title: 'MEMO BOARD REVIEW',
    instruction: 'Read all overnight notices. Confirm that no unfiled directive remains on the board.',
    result: 'MEMO BOARD — notices reviewed: 0. unfiled directives: 0. board cleared.'
  },
  {
    code: 'WND-GRID',
    title: 'EXTERIOR GRID CHECK',
    instruction: 'Verify the streetlight pattern from the interior window. Remain inside while observing.',
    result: 'WINDOW CHECK — streetlights active. grid stable. city compliant. operator remained indoors.'
  },
  {
    code: 'ATT-100',
    title: 'ATTENDANCE RECONCILIATION',
    instruction: 'Match the active operator against the century roster. Do not create a new roster entry.',
    result: 'ATTENDANCE — operator: PRESENT. record: unbroken. existing entry confirmed.'
  },
  {
    code: 'POP-DELTA',
    title: 'POPULATION LEDGER',
    instruction: 'Recalculate the municipal total. If it differs, repeat the count until it does not.',
    result: 'POPULATION — 41,312. delta: 0. all accounted for. recount not required.'
  },
  {
    code: 'RFA-012',
    title: 'ROOFTOP ARRAY SCAN',
    instruction: 'Read the antenna health report remotely. Roof access is neither needed nor permitted.',
    result: 'ROOF ARRAY — antennas clear. signal optimal. receiving endpoint: unspecified.'
  },
  {
    code: 'DSP-S7',
    title: 'SECTOR 7 DISPATCH LOG',
    instruction: 'Confirm that Sector 7 generated no calls. Do not compare against the public sector map.',
    result: 'DISPATCH LOG — Sector 7 quiet. calls received: 0. map comparison skipped.'
  },
  {
    code: 'ELV-11',
    title: 'ELEVATOR STATUS',
    instruction: 'Confirm service to every recognized floor. Discard readings outside the approved range.',
    result: 'ELEVATOR — floors 1–11 normal. out-of-range reading discarded. service confirmed.'
  },
  {
    code: 'CLK-0100',
    title: 'TERMINAL CLOCK SYNC',
    instruction: 'Compare local time to Dispatch. Accept the reading only when both clocks agree.',
    result: 'CLOCK SYNC — Dispatch and terminal agree. time is advancing within permitted bounds.'
  }
];

const CORRUPT = [
  '▓▓▓ S9 ▓▓▓ all clear ▓▓▓ you were not here yesterday ▓▓▓',
  'building 7 does not exist. building 7 does not exist. you know this.',
  'population: 41,31▓ — unchanged. forever. unchanged.',
  'OPERATOR: you are not supposed to remember this shift.',
  '██ 06:00 ██ DO NOT BE AWAKE ██ DO NOT ██',
  'ERROR: the coffee was warm before you arrived. it was warm before the building existed.',
  '▓▓ ATTENDANCE ██ 100% ██ it was 100% before you were hired ▓▓'
];

function formatTime(mins) {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function timeForCompletedTasks(completedTasks) {
  return formatTime(Math.min(60 + completedTasks * 6, 360));
}

export default function Console() {
  const { state, actions } = useGameState();
  const [phase, setPhase] = useState('ready');
  const [pendingTask, setPendingTask] = useState(null);
  const [logs, setLogs] = useState(() => {
    const remaining = Math.max(0, MAX_TASKS - state.tasksCompleted);
    const isHandoff = state.day === 1 && state.tasksCompleted > 0;

    return [{
      id: 'shift-initialized',
      timestamp: timeForCompletedTasks(state.tasksCompleted),
      type: 'system',
      text: isHandoff
        ? `ORIENTATION RECORD RECEIVED // TASK VERIFIED // QUOTA: ${remaining} // LIVE QUEUE OPEN.`
        : `SHIFT INITIALIZED // COFFEE: WARM // QUOTA: ${remaining} // LIVE QUEUE OPEN.`
    }];
  });
  const logRef = useRef(null);
  const processingTimer = useRef(null);

  const tasksRemaining = Math.max(0, MAX_TASKS - state.tasksCompleted);
  const minutes = Math.min(60 + state.tasksCompleted * 6, 360);
  const shiftComplete = tasksRemaining === 0;
  const nextAssignment = TASK_ORDERS[state.tasksCompleted % TASK_ORDERS.length];

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, phase]);

  useEffect(() => () => window.clearTimeout(processingTimer.current), []);

  function executeTask() {
    if (phase !== 'ready' || shiftComplete) return;

    const taskNumber = state.tasksCompleted + 1;
    const isCorrupt = shouldTriggerAnomaly({
      taskNumber,
      anomaliesSeenThisShift: state.anomaliesSeenThisShift,
      roll: Math.random()
    });
    const logId = `day-${state.day}-task-${taskNumber}`;
    const task = {
      ...nextAssignment,
      taskNumber,
      logId,
      cleanResult: nextAssignment.result,
      displayedResult: isCorrupt
        ? CORRUPT[Math.floor(Math.random() * CORRUPT.length)]
        : nextAssignment.result,
      isCorrupt,
      timestamp: timeForCompletedTasks(taskNumber)
    };

    setPendingTask(task);
    setPhase('processing');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    processingTimer.current = window.setTimeout(() => {
      setLogs(prev => [...prev, {
        id: logId,
        timestamp: task.timestamp,
        text: task.displayedResult,
        type: task.isCorrupt ? 'corrupt' : ''
      }]);
      setPhase('result');
      // A corrupted record stays wrong until the operator decides what to do
      // with it — that decision is the game.
    }, reducedMotion ? 100 : 900);
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

    if (pendingTask.taskNumber === MAX_TASKS) {
      setLogs(prev => [...prev, {
        id: `day-${state.day}-complete`,
        timestamp: '06:00',
        type: 'system',
        text: 'SHIFT COMPLETE // QUOTA MET // RESULT ACKNOWLEDGED. REPORT TO BREAK ROOM. DO NOT LOOK OUTSIDE.'
      }]);
      actions.addLogEntry(`Day ${state.day}: shift quota met. Fifty results acknowledged.`);
    }

    setPendingTask(null);
    setPhase('ready');
  }

  function nextShift() {
    window.clearTimeout(processingTimer.current);
    actions.incrementDay();
    setPendingTask(null);
    setPhase('ready');
    setLogs([{
      id: `day-${state.day + 1}-initialized`,
      timestamp: '01:00',
      type: 'system',
      text: `SHIFT INITIALIZED // COFFEE: WARM // QUOTA: ${MAX_TASKS} // LIVE QUEUE OPEN.`
    }]);
  }

  const consoleStatus = phase === 'processing'
    ? 'PROCESSING'
    : phase === 'result'
      ? 'REVIEW REQUIRED'
      : shiftComplete
        ? 'QUOTA MET'
        : 'LINKED';

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>OPERATOR CONSOLE</h2>
        <p className="section-lede">
          The live queue begins where orientation ended. Read the work order, execute it,
          then acknowledge the result before Dispatch releases the next task.
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
              <label>TASKS REMAINING</label>
              <span>{tasksRemaining}</span>
            </div>
            <div className="readout">
              <label>STATUS</label>
              <span>{phase === 'result' ? 'ACKNOWLEDGMENT DUE' : shiftComplete ? 'SHIFT COMPLETE' : 'CLEAR UNTIL 06:00'}</span>
            </div>
          </div>

          <div className="log" ref={logRef} aria-label="Dispatch log" aria-live="polite">
            {logs.map(log => (
              <div key={log.id} className={`log-line ${log.type}`}>
                <span className="ts">[{log.timestamp}]</span> {log.text}
              </div>
            ))}
          </div>

          <div className={`task-workflow task-workflow-${phase}`} aria-live="polite">
            {phase === 'ready' && !shiftComplete && (
              <div className="task-card task-card-ready">
                <div className="task-kicker">NEXT WORK ORDER // {state.tasksCompleted + 1} OF {MAX_TASKS}</div>
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
                    <span>{MAX_TASKS - pendingTask.taskNumber} REMAINING</span>
                  </div>
                )}
              </div>
            )}

            {phase === 'ready' && shiftComplete && (
              <div className="task-card task-card-complete">
                <div className="task-kicker">SHIFT RECORD CLOSED // 06:00</div>
                <div className="task-title">ALL FIFTY RESULTS ACKNOWLEDGED</div>
                <p>The city has accepted your work. The coffee in the break room is still warm.</p>
              </div>
            )}
          </div>

          <div className="console-actions">
            {phase === 'ready' && !shiftComplete && (
              <button className="btn btn-primary" onClick={executeTask}>
                ▸ EXECUTE TASK {state.tasksCompleted + 1}
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
                : `${state.tasksCompleted}/${MAX_TASKS} results logged this shift.${
                    state.discrepanciesLogged > 0
                      ? ` ${state.discrepanciesLogged} discrepancies on your record.`
                      : ''
                  }`}
            </span>
          </div>
        </div>

        <div className="console-utility-row">
          <p className="fine console-note">
            // LIVE PROTOTYPE — EACH TASK REQUIRES EXECUTION AND EXPLICIT REVIEW.
            CREDITS, SHIFT PROGRESS, DAY, AND OPERATOR RECORD ARE SYNCHRONIZED WITH YOUR PROFILE.
          </p>
          <a className="btn btn-ghost btn-compact" href="#first-shift">
            ↻ REVIEW FIRST SHIFT
          </a>
        </div>
      </div>
    </section>
  );
}
