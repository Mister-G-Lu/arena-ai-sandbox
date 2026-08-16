import React from 'react';

function CompletionCopy({ reviewMode }) {
  if (reviewMode) {
    return (
      <div className="orient-content">
        {'ORIENTATION REVIEW COMPLETE.\n\nThe archived procedure has ended.\n\n  — Your live shift is '}
        <em>unchanged</em>
        {'.\n  — Your quota is '}
        <em>unchanged</em>
        {'.\n  — Your coffee is probably still '}
        <em>warm</em>
        {'.\n\nThe active queue is waiting where you left it.\n'}
        <span className="dim">It noticed you were gone.</span>
      </div>
    );
  }

  return (
    <div className="orient-content">
      {'ORIENTATION COMPLETE.\n\nYou have been oriented, Operator.\n\n  — Your shift is '}
      <em>active</em>
      {'.\n  — Your quota is '}
      <em>loaded</em>
      {'.\n  — Your coffee is '}
      <em>warm</em>
      {'.\n\nThe city is counting on you.\n'}
      <span className="warn">The city has always been counting on you.</span>
      {'\n\nYour first result is in the record. Forty-nine work orders remain in the live queue.\n'}
      <span className="dim">They have always been waiting.</span>
    </div>
  );
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
          <CompletionCopy reviewMode={reviewMode} />
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
