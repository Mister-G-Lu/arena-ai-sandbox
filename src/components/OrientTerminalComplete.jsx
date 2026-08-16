import React from 'react';

function completionCopy(reviewMode) {
  if (reviewMode) {
    return `ORIENTATION REVIEW COMPLETE.

The archived procedure has ended.

  — Your live shift is <em>unchanged</em>.
  — Your quota is <em>unchanged</em>.
  — Your coffee is probably still <em>warm</em>.

The active queue is waiting where you left it.
<span class="dim">It noticed you were gone.</span>`;
  }

  return `ORIENTATION COMPLETE.

You have been oriented, Operator.

  — Your shift is <em>active</em>.
  — Your quota is <em>loaded</em>.
  — Your coffee is <em>warm</em>.

The city is counting on you.
<span class="warn">The city has always been counting on you.</span>

Your first result is in the record. Forty-nine work orders remain in the live queue.
<span class="dim">They have always been waiting.</span>`;
}

export default function OrientTerminalComplete({ reviewMode = false, onContinue, onReplay }) {
  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        ORIENTATION SUBSYSTEM — STATUS REPORT
        <span className="orient-status">COMPLETE</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage">
          <div
            className="orient-content"
            dangerouslySetInnerHTML={{ __html: completionCopy(reviewMode) }}
          />
          <div className="orient-complete">
            <span className="orient-arrow">↓</span>
            <button className="btn btn-primary" type="button" onClick={onContinue}>
              {reviewMode ? '▸ RETURN TO LIVE QUEUE' : '▸ ENTER THE LIVE QUEUE'}
            </button>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onReplay}>
            ↻ {reviewMode ? 'REVIEW AGAIN' : 'REPLAY ORIENTATION'}
          </button>
        </div>
      </div>
    </div>
  );
}
