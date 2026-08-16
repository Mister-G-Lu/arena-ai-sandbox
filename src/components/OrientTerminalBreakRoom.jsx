import React, { useEffect, useRef, useState } from 'react';
import { describeEffects } from '../game/qualities';

function BreakRoomCopy() {
  return (
    <div className="orient-content">
      {'The break room is through the door behind your station.\n\nThe light is on. The coffee is warm. The pot is full.\nThere is no one else in the building.\nThere is never anyone else in the building.\n\nThrough the narrow window, the hoverlanes are still moving — a silent river of light thirty stories up, threatening the limit. A cutter wails somewhere beyond the annex, far enough to be weather. In here, the pot keeps steaming without a heater you can find.\n\nYou did not turn on the coffee maker.\nThe coffee maker was already on.\nIt was on when you arrived.\n'}
      <span className="warn">It was on before you arrived.</span>
      {'\n\nHow do you feel about the coffee?'}
    </div>
  );
}

/**
 * The first real choice. Each option is data: label, response lines, effects,
 * residue. "The system has noted your observation" — and now it actually does.
 */
const CHOICES = [
  {
    id: 'fine',
    label: "IT'S FINE",
    effects: { Routine: 1 },
    lines: [
      { text: 'It is fine. It is always fine.' },
      { text: 'Comfort is compliance.', em: true }
    ],
    logbook: null
  },
  {
    id: 'didnt-make',
    label: "I DIDN'T MAKE THIS",
    effects: { Perception: 1, Attention: 1 },
    lines: [
      { text: 'Correct. You did not.' },
      { text: 'No one did. It was warm before the shift.' },
      { text: 'It was warm before the building.', warn: true },
      { text: 'The system has noted your observation.' }
    ],
    logbook: 'Night one: the coffee was warm before I arrived. Nobody made it. Noted, by me and by something else.'
  },
  {
    id: 'who',
    label: 'WHO MADE IT?',
    effects: { Doubt: 1, Attention: 1 },
    lines: [
      { text: '[NO DATA]', dim: true },
      { text: 'The question has been filed. The file is empty.' },
      { text: 'The file has always been empty.', em: true },
      { text: 'The system appreciates your curiosity.' },
      { text: 'The system does not appreciate it enough to answer.' }
    ],
    logbook: 'Night one: asked who makes the coffee. The answer field exists. It is empty. An empty field is still a field.'
  }
];

function LineText({ line }) {
  if (line.em) return <em>{line.text}</em>;
  if (line.warn) return <span className="warn">{line.text}</span>;
  if (line.dim) return <span className="dim">{line.text}</span>;
  return line.text;
}

export default function OrientTerminalBreakRoom({ onComplete, onChoose, reviewMode = false }) {
  const [choiceId, setChoiceId] = useState(null);
  const [showContinue, setShowContinue] = useState(false);
  const continueTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(continueTimer.current), []);

  const choice = CHOICES.find((c) => c.id === choiceId);

  const handleChoice = (selected) => {
    setChoiceId(selected.id);
    // A replayed orientation is an archived record: it must not re-file effects.
    if (!reviewMode && typeof onChoose === 'function') {
      onChoose({ effects: selected.effects, logbook: selected.logbook });
    }
    // Show continue after a delay so the response can be read.
    continueTimer.current = window.setTimeout(() => setShowContinue(true), 600);
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
          <BreakRoomCopy />

          {!choice && (
            <div className="orient-choices">
              {CHOICES.map((option) => (
                <button
                  key={option.id}
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => handleChoice(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {choice && (
            <div className="orient-response">
              {choice.lines.map((line, i) => (
                <div className="response-text" key={i}><LineText line={line} /></div>
              ))}
              {!reviewMode && describeEffects(choice.effects) && (
                <div className="response-text dim">
                  FILED TO YOUR RECORD: {describeEffects(choice.effects)}
                </div>
              )}
              {showContinue && (
                <button className="btn btn-primary" type="button" onClick={onComplete}>
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
