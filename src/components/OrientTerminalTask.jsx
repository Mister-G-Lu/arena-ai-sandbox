import React, { useEffect, useRef, useState } from 'react';

const TASK_INTRO = `Your first task is waiting in the queue.

When you press EXECUTE:
  — the task will be <em>logged</em>
  — the clock will <em>advance</em>
  — the count will <em>decrease by one</em>

This is the job. This is all the job is.
Fifty small actions. None of them wrong.
<span class="warn">There cannot be wrong actions.
There is no option for wrong.</span>

You are ready. Execute your first task.`;

const TASK_RESULT = `<span class="warn">01:06</span> — ORIENTATION TASK: Verify terminal link.

> LINK VERIFIED. Signal: strong.
> The console knows you are here.
> <em>The console has always known you are here.</em>

Task logged. Record updated. Quota: 49 remaining.`;

export default function OrientTerminalTask({ onTaskLogged, onComplete }) {
  const [phase, setPhase] = useState('intro'); // intro, executing, result, confirming
  const executeTimer = useRef(null);
  const confirmTimer = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(executeTimer.current);
    window.clearTimeout(confirmTimer.current);
  }, []);

  const handleExecute = () => {
    setPhase('executing');
    // The first result is committed before the operator is allowed into the live queue.
    executeTimer.current = window.setTimeout(() => {
      onTaskLogged();
      setPhase('result');
    }, 1200);
  };

  const handleConfirm = () => {
    setPhase('confirming');
    confirmTimer.current = window.setTimeout(() => onComplete(), 600);
  };

  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        OPERATOR CONSOLE — TASK QUEUE
        <span className="orient-status">{phase === 'executing' ? 'PROCESSING' : 'QUEUED'}</span>
      </div>
      <div className="orient-screen">
        {phase === 'intro' && (
          <div className="orient-stage">
            <div className="orient-header">YOUR FIRST TASK</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <div className="orient-content" dangerouslySetInnerHTML={{ __html: TASK_INTRO }} />
            <button className="btn btn-primary" onClick={handleExecute}>
              ▸ EXECUTE FIRST TASK
            </button>
          </div>
        )}

        {phase === 'executing' && (
          <div className="orient-stage">
            <div className="orient-header">PROCESSING TASK...</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <div className="orient-content">
              <span className="blink-cursor">▌</span> <em>VERIFYING TERMINAL LINK</em>
              <div className="task-processing">
                <div className="processing-bar">
                  <div className="processing-fill"></div>
                </div>
                <div className="processing-lines">
                  <div className="processing-line">→ querying dispatch network...</div>
                  <div className="processing-line">→ verifying operator credentials...</div>
                  <div className="processing-line">→ logging task to permanent record...</div>
                  <div className="processing-line">→ confirming quota decrement...</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="orient-stage">
            <div className="orient-header">TASK EXECUTED — AWAITING CONFIRMATION</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <div className="orient-content" dangerouslySetInnerHTML={{ __html: TASK_RESULT }} />
            <div className="task-confirm-row">
              <div className="task-confirm-hint">
                <span className="dim">Confirm the task was logged. Then continue.</span>
              </div>
              <button className="btn btn-primary" onClick={handleConfirm}>
                ▸ CONFIRM RESULT
              </button>
            </div>
          </div>
        )}

        {phase === 'confirming' && (
          <div className="orient-stage">
            <div className="orient-content">
              <em>CONFIRMED. Logging next task...</em>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
