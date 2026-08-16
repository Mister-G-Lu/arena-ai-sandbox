import React from 'react';

function MemoCopy() {
  return (
    <div className="orient-content">
      {'Operator.\n\nI would normally begin with “welcome.” Records informs me that would be inaccurate.\n\nYour name appeared on the overnight roster this morning.\nIt has been there for '}
      <em>some time</em>
      {'.\n\nDo not be concerned. Or do. Quietly.\nNew operators are always on the roster before they apply.\nThe paperwork arrives in the correct order.\nIt has '}
      <em>always</em>
      {' arrived in the correct order.\n\nYour station is assigned. Your shift begins at 01:00.\nThe coffee in the break room is already warm.\nYou did not turn it on. '}
      <span className="warn">This is fine.</span>
      {'\n\nIf you have questions, orientation will answer the approved ones.\nProceed to your station.\n\n'}
      <span className="dim">— M.</span>
    </div>
  );
}

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
          <MemoCopy />
          <button className="btn btn-primary" onClick={onComplete}>
            ▸ PROCEED TO STATION
          </button>
        </div>
      </div>
    </div>
  );
}
