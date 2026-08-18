interface ConsoleReadoutsProps {
  day: number;
  clock: string;
  actionsDisplay: string;
  statusLabel: string;
}

/** The four live readouts at the top of the console — day, clock, actions,
 * and status. Pure presentational; the values are computed by the container. */
export default function ConsoleReadouts({ day, clock, actionsDisplay, statusLabel }: ConsoleReadoutsProps) {
  return (
    <div className="readouts">
      <div className="readout">
        <label>SHIFT DAY</label>
        <span>{day}</span>
      </div>
      <div className="readout">
        <label>SHIFT CLOCK</label>
        <span>{clock}</span>
      </div>
      <div className="readout">
        <label>ACTIONS</label>
        <span>{actionsDisplay}</span>
      </div>
      <div className="readout">
        <label>STATUS</label>
        <span>{statusLabel}</span>
      </div>
    </div>
  );
}
