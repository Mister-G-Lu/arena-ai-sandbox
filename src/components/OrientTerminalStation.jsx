import React from 'react';

function StationCheck({ day, actionsRemaining }) {
  return (
    <div className="orient-content">
      {'The window is still there. You are still at the desk.\nThe feed is not the city — it is the city after it has been made listable.\n\n'}
      <span className="warn">YOUR ROLE: DISPATCHER — NOT DRIVER, NOT PATROL</span>
      {'\n  '}
      <span className="dim">
        {'You do not carry. You clear. You verify. You file.\n  Trucks, lights, radios, rain — they become lines. Lines become “CLEAR.”'}
      </span>
      {'\n\nYour console is active. Four readouts. Read them.\n\n'}
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
      <span className="warn">ACTIONS REMAINING: {actionsRemaining}</span>
      {'\n  '}
      <span className="dim">
        {'Fifty results must be logged and acknowledged.\n  Dispatch releases them one at a time.\n  That is the whole job. The city is the receipt.'}
      </span>
      {'\n\n'}
      <span className="warn">STATUS: CLEAR</span>
      {'\n  '}
      <span className="dim">It will stay clear. It always stays clear.</span>
      {'\n\nOutside, the lanes keep moving. In here, you keep authorizing them to have moved.\nEverything is as it should be.\nEverything is as it has '}
      <em>always</em>
      {' been.'}
    </div>
  );
}

export default function OrientTerminalStation({ day, actionsRemaining, onComplete }) {
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
          <StationCheck day={day} actionsRemaining={actionsRemaining} />
          <button className="btn btn-primary" onClick={onComplete}>
            ▸ CHECK THE BREAK ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
