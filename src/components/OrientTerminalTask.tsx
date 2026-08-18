import { useEffect, useRef, useState } from 'react';
import { ACTION_CAP } from '../game/actions';

interface TaskIntroProps {
  reviewMode: boolean;
}

function TaskIntro({ reviewMode }: TaskIntroProps) {
  return (
    <div className="orient-content">
      {reviewMode ? 'This is a training copy of your first task.' : 'Your first task is waiting in the queue.'}
      {'\n\nWhen you press EXECUTE:\n  — the task will be '}
      <em>{reviewMode ? 'simulated' : 'logged'}</em>
      {'\n  — the clock will '}
      <em>{reviewMode ? 'remain unchanged' : 'advance'}</em>
      {'\n  — your action budget will '}
      <em>remain unchanged</em>
      {reviewMode ? '' : ' — orientation is not billed'}
      {'\n\nThis is the job. This is all the job is.\nFifty small decisions. None of them wrong.\n'}
      <span className="warn">{'There cannot be wrong actions.\nThere is no option for wrong.'}</span>
      {'\n\nYou are ready. Execute '}
      {reviewMode ? 'the training task' : 'your first task'}.
    </div>
  );
}

interface TaskResultProps {
  reviewMode: boolean;
  actionsRemaining: number;
}

function TaskResult({ reviewMode, actionsRemaining }: TaskResultProps) {
  return (
    <div className="orient-content">
      <span className="warn">{reviewMode ? 'TRAINING COPY' : '01:06'}</span>
      {' — ORIENTATION TASK: Verify terminal link.\n\n'}
      {reviewMode
        ? '> LINK VERIFIED. Signal: isolated.\n> The console knows this is a review.\n> '
        : '> LINK VERIFIED. Signal: strong.\n> The console knows you are here.\n> '}
      <em>
        {reviewMode
          ? 'Your live queue has not moved.'
          : 'The console has always known you are here.'}
      </em>
      {'\n\n'}
      {reviewMode ? 'Simulation acknowledged. Record unchanged.' : 'Task logged. Record updated.'}
      {' Actions remaining: '}{actionsRemaining}{'.'}
    </div>
  );
}

interface OrientTerminalTaskProps {
  reviewMode?: boolean;
  actionsRemaining?: number;
  onTaskLogged: () => void;
  onComplete: () => void;
}

export default function OrientTerminalTask({
  reviewMode = false,
  actionsRemaining = ACTION_CAP,
  onTaskLogged,
  onComplete,
}: OrientTerminalTaskProps) {
  const [phase, setPhase] = useState<'intro' | 'executing' | 'result' | 'confirming'>('intro');
  const executeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (executeTimer.current) window.clearTimeout(executeTimer.current);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
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
            <TaskIntro reviewMode={reviewMode} />
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
                <progress className="processing-bar" aria-hidden="true" />
                <div className="processing-lines">
                  <div className="processing-line">→ querying dispatch network...</div>
                  <div className="processing-line">→ verifying operator credentials...</div>
                  <div className="processing-line">→ {reviewMode ? 'isolating training record...' : 'logging task to permanent record...'}</div>
                  <div className="processing-line">→ {reviewMode ? 'preserving live action budget...' : 'filing orientation budget exception...'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="orient-stage">
            <div className="orient-header">TASK EXECUTED — AWAITING CONFIRMATION</div>
            <div className="orient-divider">────────────────────────────────────────</div>
            <TaskResult reviewMode={reviewMode} actionsRemaining={actionsRemaining} />
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
