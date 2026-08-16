import React from 'react';

const ORIENTATION_COMPLETE = `ORIENTATION COMPLETE.

You have been oriented, Operator.

  — Your shift is <em>active</em>.
  — Your quota is <em>loaded</em>.
  — Your coffee is <em>warm</em>.

The city is counting on you.
<span class="warn">The city has always been counting on you.</span>

Your first result is in the record. Forty-nine work orders remain in the live queue.
<span class="dim">They have always been waiting.</span>`;

export default function OrientTerminalComplete({ onReplay }) {
  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        ORIENTATION SUBSYSTEM — STATUS REPORT
        <span className="orient-status">COMPLETE</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage">
          <div className="orient-content" dangerouslySetInnerHTML={{ __html: ORIENTATION_COMPLETE }} />
          <div className="orient-complete">
            <span className="orient-arrow">↓</span>
            <a href="#console" className="btn btn-primary">▸ ENTER THE LIVE QUEUE</a>
          </div>
          <button className="btn btn-ghost" onClick={onReplay}>
            ▸ REPLAY ORIENTATION
          </button>
        </div>
      </div>
    </div>
  );
}
