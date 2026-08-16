import React, { useEffect, useRef, useState } from 'react';
import { TASKS_PER_SHIFT } from '../game/dispatch';

function taskIntro(reviewMode) {
  return `${reviewMode ? 'This is a training copy of your first task.' : 'Your first task is waiting in the queue.'}

When you press EXECUTE:
  — the task will be <em>${reviewMode ? 'simulated' : 'logged'}</em>
  — the clock will <em>${reviewMode ? 'remain unchanged' : 'advance'}</em>
  — the count will <em>${reviewMode ? 'remain unchanged' : 'decrease by one'}</em>

This is the job. This is all the job is.
Fifty small actions. None of them wrong.
<span class="warn">There cannot be wrong actions.
There is no option for wrong.</span>

You are ready. Execute ${reviewMode ? 'the training task' : 'your first task'}.`;
}

function taskResult(reviewMode, tasksRemaining) {
  if (reviewMode) {
    return `<span class="warn">TRAINING COPY</span> — ORIENTATION TASK: Verify terminal link.

> LINK VERIFIED. Signal: isolated.
> The console knows this is a review.
> <em>Your live queue has not moved.</em>

Simulation acknowledged. Record unchanged. Quota: ${tasksRemaining} remaining.`;
  }

  return `<span class="warn">01:06</span> — ORIENTATION TASK: Verify terminal link.

> LINK VERIFIED. Signal: strong.
> The console knows you are here.
> <em>The console has always known you are here.</em>

Task logged. Record updated. Quota: ${tasksRemaining} remaining.`;
}

export default function OrientTerminalTask({
  reviewMode = false,
  tasksRemaining = TASKS_PER_SHIFT,
  onTaskLogged,
  onComplete
}) {
  const [phase, setPhase] = useState('intro'); // intro, executing, result, confirming
  const executeTimer = useRef(null);
  const confirmTimer = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(executeTimer.current);
    window.clearTimeout(confirmTimer.current);
  }, []);

  const handleExecute = () => {
    setPhase('executing');
    executeTimer.current = window.setTimeout(() => {
      if (!reviewMode) onTaskLogged();
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
        OPERATOR CONSOLE — {reviewMode ? 'TRAINING QUEUE' : 'TASK QUEUE'}
        <span className="orient-status">
          {phase === 'executing' ? 'PROCESSING' : reviewMode ? 'SIMULATION' : 'QUEUED'}
        </span>
      </div>
      <div className="orient-screen">
        {phase === 'intro' && (
          <div className="orient-stage">
            <div className="orient-header">{reviewMode ? 'YOUR FIRST TASK // REVIEW' : 'YOUR FIRST TASK'}</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <div className="orient-content" dangerouslySetInnerHTML={{ __html: taskIntro(reviewMode) }} />
            <button className="btn btn-primary" onClick={handleExecute}>
              ▸ EXECUTE {reviewMode ? 'TRAINING TASK' : 'FIRST TASK'}
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
                  <div className="processing-line">→ {reviewMode ? 'isolating training record...' : 'logging task to permanent record...'}</div>
                  <div className="processing-line">→ {reviewMode ? 'preserving live quota...' : 'confirming quota decrement...'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="orient-stage">
            <div className="orient-header">TASK EXECUTED — AWAITING CONFIRMATION</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <div
              className="orient-content"
              dangerouslySetInnerHTML={{ __html: taskResult(reviewMode, tasksRemaining) }}
            />
            <div className="task-confirm-row">
              <div className="task-confirm-hint">
                <span className="dim">
                  {reviewMode ? 'Confirm the training result. Your live record will remain unchanged.' : 'Confirm the task was logged. Then continue.'}
                </span>
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
              <em>{reviewMode ? 'REVIEW CONFIRMED. Closing training copy...' : 'CONFIRMED. Opening live queue...'}</em>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
