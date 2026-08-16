import React, { useEffect, useRef, useState } from 'react';
import OrientTerminalBoot from './OrientTerminalBoot';
import OrientTerminalMemo from './OrientTerminalMemo';
import OrientTerminalStation from './OrientTerminalStation';
import OrientTerminalBreakRoom from './OrientTerminalBreakRoom';
import OrientTerminalTask from './OrientTerminalTask';
import OrientTerminalComplete from './OrientTerminalComplete';
import { useGameState } from '../context/GameStateContext';

export default function FirstShift() {
  const { state, actions } = useGameState();
  // Capture this once: completing orientation should not turn the final screen into review mode.
  const [reviewMode] = useState(state.orientation.completed);
  const [stage, setStage] = useState('idle');
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  function transitionTo(nextStage) {
    setTransitioning(true);
    transitionTimer.current = window.setTimeout(() => {
      setStage(nextStage);
      setTransitioning(false);
    }, 300);
  }

  function restart() {
    transitionTo('idle');
  }

  function skipOrientation() {
    actions.completeOrientation(true);
    window.location.hash = '#console';
  }

  function finishOrientation() {
    if (!reviewMode) actions.completeOrientation(false);
    transitionTo('complete');
  }

  function returnToConsole() {
    window.location.hash = '#console';
  }

  return (
    <section className="section section-orient page active">
      <div className="wrap">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{reviewMode ? '// ARCHIVED TRAINING RECORD //' : '// PERSONNEL INTAKE // REQUIRED ONCE //'}</p>
            <h2>{reviewMode ? 'REVIEW FIRST SHIFT' : 'FIRST SHIFT'}</h2>
            <p className="section-lede">
              {reviewMode
                ? 'A safe replay of your original orientation. Live progress and the task queue will not change.'
                : 'The terminal hums when you sit down. The screen is already on. Something on it says your name — or something like your name.'}
            </p>
          </div>
          {reviewMode && (
            <button className="btn btn-ghost" type="button" onClick={returnToConsole}>
              ← RETURN TO CONSOLE
            </button>
          )}
        </div>

        <div className={`orient-console-stack ${transitioning ? 'orient-exit' : 'orient-enter'}`}>
          {stage === 'idle' && (
            <div className="orient-terminal">
              <div className="orient-head">
                <span className="dot dot-amber"></span>
                MERIDIAN CENTRAL DISPATCH — ORIENTATION SUBSYSTEM
                <span className="orient-status">{reviewMode ? 'ARCHIVED' : 'IDLE'}</span>
              </div>
              <div className="orient-screen">
                <div className="orient-placeholder">
                  <span className="blink-cursor">▌</span>
                  <p>{reviewMode ? 'TRAINING RECORD READY' : 'TERMINAL STANDBY'}</p>
                  <p className="fine">
                    {reviewMode
                      ? 'Replay mode is isolated from your active operator file.'
                      : 'Complete orientation, or waive it if these systems are already familiar.'}
                  </p>
                </div>
              </div>
              <div className="orient-actions">
                <button className="btn btn-primary" type="button" onClick={() => transitionTo('boot')}>
                  {reviewMode ? '↻ REVIEW ORIENTATION' : '▸ INITIATE ORIENTATION'}
                </button>
                {!reviewMode && (
                  <button className="btn btn-ghost" type="button" onClick={skipOrientation}>
                    I ALREADY KNOW ALL OF THIS
                  </button>
                )}
                {reviewMode && (
                  <button className="btn btn-ghost" type="button" onClick={returnToConsole}>
                    CANCEL REVIEW
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === 'boot' && (
            <OrientTerminalBoot onComplete={() => transitionTo('memo')} />
          )}

          {stage === 'memo' && (
            <OrientTerminalMemo onComplete={() => transitionTo('station')} />
          )}

          {stage === 'station' && (
            <OrientTerminalStation
              day={reviewMode ? 1 : state.day}
              tasksRemaining={reviewMode ? 50 : Math.max(0, 50 - state.tasksCompleted)}
              onComplete={() => transitionTo('breakroom')}
            />
          )}

          {stage === 'breakroom' && (
            <OrientTerminalBreakRoom onComplete={() => transitionTo('task')} />
          )}

          {stage === 'task' && (
            <OrientTerminalTask
              reviewMode={reviewMode}
              tasksRemaining={Math.max(0, 50 - state.tasksCompleted)}
              onTaskLogged={actions.recordOrientationTask}
              onComplete={finishOrientation}
            />
          )}

          {stage === 'complete' && (
            <OrientTerminalComplete
              reviewMode={reviewMode}
              onContinue={returnToConsole}
              onReplay={restart}
            />
          )}
        </div>
      </div>
    </section>
  );
}
