import React, { useState } from 'react';
import OrientTerminalBoot from './OrientTerminalBoot';
import OrientTerminalMemo from './OrientTerminalMemo';
import OrientTerminalStation from './OrientTerminalStation';
import OrientTerminalBreakRoom from './OrientTerminalBreakRoom';
import OrientTerminalTask from './OrientTerminalTask';
import OrientTerminalComplete from './OrientTerminalComplete';
import { useGameState } from '../context/GameStateContext';

export default function FirstShift() {
  const { state, actions } = useGameState();
  const [stage, setStage] = useState('idle');
  const [transitioning, setTransitioning] = useState(false);

  function transitionTo(nextStage) {
    setTransitioning(true);
    // Fade out current console
    setTimeout(() => {
      setStage(nextStage);
      setTransitioning(false);
    }, 300);
  }

  function restart() {
    setTransitioning(true);
    setTimeout(() => {
      setStage('idle');
      setTransitioning(false);
    }, 300);
  }

  function recordOrientationTask() {
    const alreadyRecorded = state.logbook.some(entry => entry.text.includes('Orientation link verified'));
    if (state.day !== 1 || state.tasksCompleted !== 0 || alreadyRecorded) return;

    actions.completeTask();
    actions.addCredits(10);
    actions.addLogEntry('Orientation link verified. The live queue opened with forty-nine tasks remaining.');
  }

  return (
    <section className="section section-orient page active">
      <div className="wrap">
        <h2>FIRST SHIFT</h2>
        <p className="section-lede">
          The terminal hums when you sit down. The screen is already on.
          Something on it says your name — or something like your name.
        </p>

        <div className={`orient-console-stack ${transitioning ? 'orient-exit' : 'orient-enter'}`}>
          {stage === 'idle' && (
            <div className="orient-terminal">
              <div className="orient-head">
                <span className="dot dot-amber"></span>
                MERIDIAN CENTRAL DISPATCH — ORIENTATION SUBSYSTEM
                <span className="orient-status">IDLE</span>
              </div>
              <div className="orient-screen">
                <div className="orient-placeholder">
                  <span className="blink-cursor">▌</span>
                  <p>TERMINAL STANDBY</p>
                  <p className="fine">Press INITIATE to begin orientation protocol.</p>
                </div>
              </div>
              <div className="orient-actions">
                <button className="btn btn-primary" onClick={() => transitionTo('boot')}>
                  ▸ INITIATE ORIENTATION
                </button>
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
              day={state.day}
              tasksRemaining={Math.max(0, 50 - state.tasksCompleted)}
              onComplete={() => transitionTo('breakroom')}
            />
          )}

          {stage === 'breakroom' && (
            <OrientTerminalBreakRoom onComplete={() => transitionTo('task')} />
          )}

          {stage === 'task' && (
            <OrientTerminalTask
              onTaskLogged={recordOrientationTask}
              onComplete={() => transitionTo('complete')}
            />
          )}

          {stage === 'complete' && (
            <OrientTerminalComplete onReplay={restart} />
          )}
        </div>
      </div>
    </section>
  );
}
