import React from 'react';

export default function OrientTerminalWaiver({ onAccept, onReturn }) {
  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        DIRECT CHANNEL — M.
        <span className="orient-status">UNSCHEDULED</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage manager-conversation">
          <div className="orient-header">M. IS TYPING...</div>
          <div className="orient-divider">────────────────────────────────────────</div>
          <div className="orient-content">
            {'“Oh, so you think you already know all of this?”\n\n'}
            <em>Three dots appear. Disappear. Return.</em>
            {'\n\n“Wonderful. I was worried orientation might be boring for both of us.”\n\n'}
            {'“We will waive the instructions. This also waives the part where you tell me nobody warned you.”\n\n'}
            <span className="warn">
              “Go on, then. Let’s see how smart you are when the terminal answers back.”
            </span>
            {'\n\n'}
            <span className="dim">— M.</span>
          </div>
          <div className="orient-choices manager-conversation-actions">
            <button className="btn btn-primary" type="button" onClick={onAccept}>
              ▸ I KNOW WHAT I’M DOING
            </button>
            <button className="btn btn-ghost" type="button" onClick={onReturn}>
              ON SECOND THOUGHT, BEGIN ORIENTATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
