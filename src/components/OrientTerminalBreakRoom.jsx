import React, { useState } from 'react';

const BREAK_ROOM = `The break room is through the door behind your station.

The light is on. The coffee is warm. The pot is full.
There is no one else in the building.
There is never anyone else in the building.

You did not turn on the coffee maker.
The coffee maker was already on.
It was on when you arrived.
<span class="warn">It was on before you arrived.</span>

How do you feel about the coffee?`;

export default function OrientTerminalBreakRoom({ onComplete }) {
  const [choice, setChoice] = useState(null);
  const [showContinue, setShowContinue] = useState(false);

  const handleChoice = (c) => {
    setChoice(c);
    // Show continue button after a delay so they read the response
    setTimeout(() => setShowContinue(true), 600);
  };

  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        BREAK ROOM — AMBIENT SENSOR LOG
        <span className="orient-status">MONITORING</span>
      </div>
      <div className="orient-screen">
        <div className="orient-stage">
          <div className="orient-header">BREAK ROOM STATUS</div>
          <div className="orient-divider">────────────────────────────────────────</div>
          <div className="orient-content" dangerouslySetInnerHTML={{ __html: BREAK_ROOM }} />

          {!choice && (
            <div className="orient-choices">
              <button className="btn btn-ghost" onClick={() => handleChoice('fine')}>
                IT'S FINE
              </button>
              <button className="btn btn-ghost" onClick={() => handleChoice('didnt-make')}>
                I DIDN'T MAKE THIS
              </button>
              <button className="btn btn-ghost" onClick={() => handleChoice('who')}>
                WHO MADE IT?
              </button>
            </div>
          )}

          {choice === 'fine' && (
            <div className="orient-response">
              <div className="response-text">It is fine. It is always fine.</div>
              <div className="response-text"><em>Comfort is compliance.</em></div>
              {showContinue && (
                <button className="btn btn-primary" onClick={onComplete}>
                  ▸ RETURN TO STATION
                </button>
              )}
            </div>
          )}

          {choice === 'didnt-make' && (
            <div className="orient-response">
              <div className="response-text">Correct. You did not.</div>
              <div className="response-text">No one did. It was warm before the shift.</div>
              <div className="response-text"><span className="warn">It was warm before the building.</span></div>
              <div className="response-text">The system has noted your observation.</div>
              {showContinue && (
                <button className="btn btn-primary" onClick={onComplete}>
                  ▸ RETURN TO STATION
                </button>
              )}
            </div>
          )}

          {choice === 'who' && (
            <div className="orient-response">
              <div className="response-text"><span className="dim">[NO DATA]</span></div>
              <div className="response-text">The question has been filed. The file is empty.</div>
              <div className="response-text">The file has <em>always</em> been empty.</div>
              <div className="response-text">The system appreciates your curiosity.</div>
              <div className="response-text">The system does not appreciate it <em>enough</em> to answer.</div>
              {showContinue && (
                <button className="btn btn-primary" onClick={onComplete}>
                  ▸ RETURN TO STATION
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
