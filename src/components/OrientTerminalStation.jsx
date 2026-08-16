import React from 'react';

function StationCheck({ day, tasksRemaining }) {
  return (
    <div className="orient-content">
      {'Your console is active. Four readouts. Read them.\n\n'}
      <span className="warn">SHIFT DAY: {day}</span>
      {'\n  '}
      <span className="dim">
        {'The roster calls this your first shift.\n  The calendar shows Tuesday. It always shows Tuesday.'}
      </span>
      {'\n\n'}
      <span className="warn">SHIFT CLOCK: 01:00</span>
      {'\n  '}
      <span className="dim">
        {'Counts forward to 06:00. You have until then.\n  You have never once seen 06:00.\n  No one has. This is not a concern.'}
      </span>
      {'\n\n'}
      <span className="warn">TASKS REMAINING: {tasksRemaining}</span>
      {'\n  '}
      <span className="dim">
        {'Fifty results must be logged and acknowledged.\n  Dispatch releases them one at a time.'}
      </span>
      {'\n\n'}
      <span className="warn">STATUS: CLEAR</span>
      {'\n  '}
      <span className="dim">It will stay clear. It always stays clear.</span>
      {'\n\nEverything is as it should be.\nEverything is as it has '}
      <em>always</em>
      {' been.'}
    </div>
  );
}

export default function OrientTerminalStation({ day, tasksRemaining, onComplete }) {
  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        STATION VERIFICATION — OPERATOR CONSOLE
        <span className="orient-status">VERIFIED</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage">
          <div className="orient-header">STATION VERIFICATION</div>
          <div className="orient-divider">────────────────────────────────────────</div>
          <StationCheck day={day} tasksRemaining={tasksRemaining} />
          <button className="btn btn-primary" onClick={onComplete}>
            ▸ CHECK THE BREAK ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
