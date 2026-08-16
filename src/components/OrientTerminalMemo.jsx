import React from 'react';

const MEMO_CONTENT = `Operator.

Your name appeared on the overnight roster this morning.
It has been there for <em>some time</em>.

Do not be concerned. This is normal.
New operators are always on the roster before they apply.
The paperwork arrives in the correct order.
It has <em>always</em> arrived in the correct order.

Your station is assigned. Your shift begins at 01:00.
The coffee in the break room is already warm.
You did not turn it on. <span class="warn">This is fine.</span>

Proceed to your station.

<span class="dim">— M.</span>`;

export default function OrientTerminalMemo({ onComplete }) {
  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        INCOMING TRANSMISSION — PRIORITY: ROUTINE
        <span className="orient-status">MEMO</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage">
          <div className="orient-header">FROM: M. — RE: YOUR FIRST SHIFT</div>
          <div className="orient-divider">────────────────────────────────────────</div>
          <div className="orient-content" dangerouslySetInnerHTML={{ __html: MEMO_CONTENT }} />
          <button className="btn btn-primary" onClick={onComplete}>
            ▸ PROCEED TO STATION
          </button>
        </div>
      </div>
    </div>
  );
}
