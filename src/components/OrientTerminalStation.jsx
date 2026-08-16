import React from 'react';

function stationCheck(day, tasksRemaining) {
  return `Your console is active. Four readouts. Read them.

<span class="warn">SHIFT DAY: ${day}</span>
  <span class="dim">The roster calls this your first shift.
  The calendar shows Tuesday. It always shows Tuesday.</span>

<span class="warn">SHIFT CLOCK: 01:00</span>
  <span class="dim">Counts forward to 06:00. You have until then.
  You have never once seen 06:00.
  No one has. This is not a concern.</span>

<span class="warn">TASKS REMAINING: ${tasksRemaining}</span>
  <span class="dim">Fifty results must be logged and acknowledged.
  Dispatch releases them one at a time.</span>

<span class="warn">STATUS: CLEAR</span>
  <span class="dim">It will stay clear. It always stays clear.</span>

Everything is as it should be.
Everything is as it has <em>always</em> been.`;
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
          <div className="orient-content" dangerouslySetInnerHTML={{ __html: stationCheck(day, tasksRemaining) }} />
          <button className="btn btn-primary" onClick={onComplete}>
            ▸ CHECK THE BREAK ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
