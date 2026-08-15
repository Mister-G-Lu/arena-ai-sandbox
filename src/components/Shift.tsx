import { clockStr, countdownStr } from '../utils/clock';
import { WEATHER_CLEAR } from '../game/glitch';
import type { ShiftState } from '../game/shift';
import { HudFrame, flickerClass } from './HudFrame';

export function Shift({
  shift,
  remaining,
  cap,
  untilNext,
  canAct,
  weatherOverride,
  onTask,
  onTomorrow,
}: {
  shift: ShiftState;
  remaining: number;
  cap: number;
  untilNext: number | null;
  canAct: boolean;
  weatherOverride: string | null;
  onTask: () => void;
  onTomorrow: () => void;
}) {
  const weather = weatherOverride ?? WEATHER_CLEAR;
  const nextLabel =
    untilNext == null ? 'tank full' : `next in ${countdownStr(untilNext)}`;

  return (
    <section id="shift" className="section">
      <div className="wrap">
        <h2>Tonight&apos;s Shift</h2>
        <p className="section-lede">
          The operator console — pre-alpha build 0.41.312. Fifty tasks a night. One action every
          ten minutes. Never one more.
        </p>

        <HudFrame className="console">
          <div className="console-head">
            <span className="dot" />
            OPERATOR CONSOLE — MERIDIAN CENTRAL DISPATCH
            <span className="console-status">ON DUTY</span>
          </div>
          <div className="readouts readouts-5">
            <div className="readout">
              <label>Shift day</label>
              <span>{shift.day}</span>
            </div>
            <div className="readout">
              <label>Shift clock</label>
              <span>{clockStr(shift.minutes)}</span>
            </div>
            <div className="readout">
              <label>Tasks remaining</label>
              <span>{shift.tasks}</span>
            </div>
            <div className="readout">
              <label>Actions</label>
              <span>
                {remaining}/{cap}
              </span>
            </div>
            <div className="readout">
              <label>Weather</label>
              <span className={flickerClass(weatherOverride != null)}>{weather}</span>
            </div>
          </div>
          <div className="log" id="log" aria-live="polite">
            {shift.log.map((line) => (
              <div key={line.id} className={`log-line ${line.kind}`}>
                <span className="ts">{line.clock}</span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
          <div className="console-actions">
            {!shift.complete ? (
              <button
                className="btn btn-primary"
                type="button"
                disabled={!canAct}
                onClick={onTask}
              >
                Perform next task
              </button>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={onTomorrow}>
                Start tomorrow&apos;s shift
              </button>
            )}
            <span className="action-meta">{nextLabel}</span>
          </div>
        </HudFrame>

        <p className="fine console-note">
          Actions regenerate — one every ten minutes, cap fifty. A full tank is a full shift. The
          city kept counting while you were away.
        </p>
      </div>
    </section>
  );
}
