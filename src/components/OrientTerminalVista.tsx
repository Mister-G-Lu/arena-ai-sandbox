
function VistaCopy() {
  return (
    <div className="orient-content vista-copy">
      <p className="vista-lead">
        You look up — or the terminal lets you.
      </p>
      <p>
        {'The neon city skylines are filled with hovercars threatening to break past the speed limit. '}
        {'They ride the hoverlanes thirty stories up, a river of amber and teal that never quite obeys the signs. '}
        {'The wail of police cutters overhead follows the delivery drones stitching the air in silent, obedient lines — '}
        {'quiet as paper, precise as paperwork.'}
      </p>
      <p>
        {'Thirty floors below, Meridian throws its own light back at itself. '}
        {'Rain-slick streets in Sector 4. The annex roof still wet from a rain that isn\'t on the weather desk. '}
        {'Neon bleeding into puddles until the whole grid looks like a circuit board left out in the weather. '}
        {'A cutter holds altitude over the municipal tower, searchlight painting the eleventh floor amber and holding there, like it forgot what it was looking for.'}
      </p>
      <p className="vista-pivot">
        <span className="warn">None of that is your jurisdiction.</span>
      </p>
      <p>
        {'You are not in a cutter. You are not on a bike. You are not on Sector 9\'s night asphalt with VANTABLACK, watching the stars get the order wrong. '}
        {'You are in here — under a fluorescent bar that hums a little too evenly, at a desk the roster already assigned to you, in front of a terminal that knew your name before you applied.'}
      </p>
      <p>
        {'This is dispatch. You don\'t move. You authorize movement. '}
        <em>Fifty work orders. One live feed. One stamp.</em>
        {' You keep the lines moving so the city outside can pretend it wasn\'t written the night before. '}
        <span className="dim">The city is counting on you. The city has always been counting on you — that part was not exaggeration.</span>
      </p>
    </div>
  );
}

interface OrientTerminalVistaProps {
  onComplete: () => void;
}

export default function OrientTerminalVista({ onComplete }: OrientTerminalVistaProps) {
  return (
    <div className="orient-terminal orient-terminal-vista">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        EXTERNAL FEED — MERIDIAN // 01:00
        <span className="orient-status">VISUAL</span>
      </div>
      <div className="orient-screen vista-screen">
        <div className="orient-stage">
          <div className="orient-header">THE CITY YOU DISPATCH</div>
          <div className="orient-divider">────────────────────────────────────────</div>
          <VistaCopy />
          <div className="vista-actions">
            <button className="btn btn-primary" type="button" onClick={onComplete}>
              ▸ ACKNOWLEDGE — RETURN TO CONSOLE
            </button>
            <span className="fine vista-hint">The view stays. Your job is still the desk.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
