import React, { useEffect, useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext';

const MAX_TASKS = 50;
const TASK_REWARD = 10;

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
  const correctionTimer = useRef(null);

  const tasksRemaining = Math.max(0, MAX_TASKS - state.tasksCompleted);
  const minutes = Math.min(60 + state.tasksCompleted * 6, 360);
  const shiftComplete = tasksRemaining === 0;
  const nextAssignment = TASK_ORDERS[state.tasksCompleted % TASK_ORDERS.length];

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, phase]);

  useEffect(() => () => {
    window.clearTimeout(processingTimer.current);
    window.clearTimeout(correctionTimer.current);
  }, []);

  function executeTask() {
    if (phase !== 'ready' || shiftComplete) return;

    const taskNumber = state.tasksCompleted + 1;
    const isCorrupt = Math.random() < 0.06;
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
      actions.completeTask();
      actions.addCredits(TASK_REWARD);
      setPhase('result');

      if (task.isCorrupt) {
        correctionTimer.current = window.setTimeout(() => {
          setPendingTask(prev => prev?.logId === logId
            ? { ...prev, displayedResult: prev.cleanResult, isCorrupt: false }
            : prev);
          setLogs(prev => prev.map(entry => entry.id === logId
            ? { ...entry, text: task.cleanResult, type: '' }
            : entry));
        }, reducedMotion ? 0 : 950);
      }
    }, reducedMotion ? 100 : 900);
  }

  function acknowledgeResult() {
    if (phase !== 'result' || !pendingTask) return;

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
    window.clearTimeout(correctionTimer.current);
    actions.incrementDay();
    setPendingTask(null);
    setPhase('ready');
    setLogs([{
      id: `day-${state.day + 1}-initialized`,
      timestamp: '01:00',
      type: 'system',
      text: 'SHIFT INITIALIZED // COFFEE: WARM // QUOTA: 50 // LIVE QUEUE OPEN.'
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
                <div className="task-kicker">RESULT RECEIVED // ACKNOWLEDGMENT REQUIRED</div>
                <div className="task-title">{pendingTask.code} // {pendingTask.title}</div>
                <p className={pendingTask.isCorrupt ? 'task-result corrupt' : 'task-result'}>
                  {pendingTask.displayedResult}
                </p>
                <div className="task-reward">
                  <span>RECORD UPDATED</span>
                  <span>+¤{TASK_REWARD} CREDITS</span>
                  <span>{MAX_TASKS - pendingTask.taskNumber} REMAINING</span>
                </div>
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
            {phase === 'result' && (
              <button className="btn btn-primary acknowledge-button" onClick={acknowledgeResult} autoFocus>
                ✓ ACKNOWLEDGE RESULT
              </button>
            )}
            {phase === 'ready' && shiftComplete && (
              <button className="btn btn-primary" onClick={nextShift}>
                ▸ BEGIN NEXT SHIFT
              </button>
            )}
            <span className="console-action-note">
              {phase === 'result'
                ? 'The next work order will remain sealed until you confirm this record.'
                : `${state.tasksCompleted}/${MAX_TASKS} results logged this shift.`}
            </span>
          </div>
        </div>

        <p className="fine console-note">
          // LIVE PROTOTYPE — EACH TASK NOW REQUIRES EXECUTION AND EXPLICIT REVIEW.
          CREDITS, SHIFT PROGRESS, DAY, AND OPERATOR RECORD ARE SYNCHRONIZED WITH YOUR PROFILE.
        </p>
      </div>
    </section>
  );
}
