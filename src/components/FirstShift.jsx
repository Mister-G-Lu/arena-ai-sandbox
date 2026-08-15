import React, { useState, useEffect, useRef } from 'react';

const BOOT_LINES = [
  '> MERIDIAN CENTRAL DISPATCH',
  '> TERMINAL v0.41.312',
  '> ──────────────────────────────',
  '> HARDWARE CHECK ........... <em>OK</em>',
  '> NETWORK LINK ............. <em>ESTABLISHED</em>',
  '> ROSTER SYNC .............. <em>1 OPERATOR PENDING</em>',
  '> SHIFT WINDOW ............ 01:00–06:00',
  '> COFFEE STATUS ........... <em>WARM</em>',
  '> MEMORY INTEGRITY ......... <em>UNVERIFIED</em>',
  '> ──────────────────────────────',
  '> LOADING ORIENTATION PROTOCOL...',
];

const MEMO_CONTENT = `Operator.

Your name appeared on the overnight roster this morning.
It has been there for <em>some time</em>.

Do not be concerned. This is normal.
New operators are always on the roster before they apply.
The paperwork arrives in the correct order.
It has <em>always</em> arrived in the correct order.

Your station is assigned. Your shift begins at 01:00.
The coffee in the break room is already warm.
You did not turn it on. <span class="warn">This is fine.</span>

Proceed to your station.

<span class="dim">— M.</span>`;

const STATION_CHECK = `Your console is active. Four readouts. Read them.

<span class="warn">SHIFT DAY: 4</span>
  <span class="dim">It says 4. It has always said 4.
  The calendar shows Tuesday. It always shows Tuesday.</span>

<span class="warn">SHIFT CLOCK: 01:00</span>
  <span class="dim">Counts forward to 06:00. You have until then.
  You have never once seen 06:00.
  No one has. This is not a concern.</span>

<span class="warn">TASKS REMAINING: 50</span>
  <span class="dim">The same fifty. They will be the same fifty.
  There are no new tasks. There have never been new tasks.</span>

<span class="warn">STATUS: CLEAR</span>
  <span class="dim">It will stay clear. It always stays clear.</span>

Everything is as it should be.
Everything is as it has <em>always</em> been.`;

const BREAK_ROOM = `The break room is through the door behind your station.

The light is on. The coffee is warm. The pot is full.
There is no one else in the building.
There is never anyone else in the building.

You did not turn on the coffee maker.
The coffee maker was already on.
It was on when you arrived.
<span class="warn">It was on before you arrived.</span>

How do you feel about the coffee?`;

const FIRST_TASK = `Your first task is waiting in the queue.

When you press EXECUTE:
  — the task will be <em>logged</em>
  — the clock will <em>advance</em>
  — the count will <em>decrease by one</em>

This is the job. This is all the job is.
Fifty small actions. None of them wrong.
<span class="warn">There cannot be wrong actions.
There is no option for wrong.</span>

You are ready. Execute your first task.`;

const FIRST_TASK_EXECUTE = `
<span class="warn">01:06</span> — ORIENTATION TASK: Verify terminal link.
> LINK VERIFIED. Signal: strong.
> The console knows you are here.
> <em>The console has always known you are here.</em>`;

const ORIENTATION_COMPLETE = `ORIENTATION COMPLETE.

You have been oriented, Operator.

  — Your shift is <em>active</em>.
  — Your quota is <em>loaded</em>.
  — Your coffee is <em>warm</em>.

The city is counting on you.
<span class="warn">The city has always been counting on you.</span>

Report to your console below.
Fifty tasks await.
<span class="dim">They have always been waiting.</span>`;

export default function FirstShift() {
  const [stage, setStage] = useState('idle'); // idle, boot, memo, station, breakroom, task, complete
  const [bootLines, setBootLines] = useState([]);
  const [bootIndex, setBootIndex] = useState(0);
  const [breakroomChoice, setBreakroomChoice] = useState(null);
  const [taskExecuted, setTaskExecuted] = useState(false);
  const screenRef = useRef(null);

  // Boot sequence animation
  useEffect(() => {
    if (stage === 'boot' && bootIndex < BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setBootLines(prev => [...prev, BOOT_LINES[bootIndex]]);
        setBootIndex(bootIndex + 1);
      }, 100);
      return () => clearTimeout(timer);
    } else if (stage === 'boot' && bootIndex === BOOT_LINES.length) {
      setTimeout(() => setStage('memo'), 800);
    }
  }, [stage, bootIndex]);

  // Auto-scroll screen
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [bootLines, stage, breakroomChoice, taskExecuted]);

  function startBoot() {
    setStage('boot');
    setBootLines([]);
    setBootIndex(0);
  }

  function handleBreakroomChoice(choice) {
    setBreakroomChoice(choice);
  }

  function executeTask() {
    setTaskExecuted(true);
  }

  return (
    <section className="section section-orient page active">
      <div className="wrap">
        <h2>FIRST SHIFT</h2>
        <p className="section-lede">
          The terminal hums when you sit down. The screen is already on.
          Something on it says your name — or something like your name.
        </p>

        <div className="orient-terminal">
          <div className="orient-head">
            <span className="dot dot-amber"></span>
            MERIDIAN CENTRAL DISPATCH — ORIENTATION SUBSYSTEM
            <span className="orient-status">{stage.toUpperCase()}</span>
          </div>
          <div className="orient-screen" ref={screenRef}>
            {stage === 'idle' && (
              <div className="orient-placeholder">
                <span className="blink-cursor">▌</span>
                <p>TERMINAL STANDBY</p>
                <p className="fine">Press INITIATE to begin orientation protocol.</p>
              </div>
            )}

            {stage === 'boot' && (
              <div className="boot-sequence">
                {bootLines.map((line, i) => (
                  <div key={i} className="boot-line" dangerouslySetInnerHTML={{ __html: line }} />
                ))}
              </div>
            )}

            {stage === 'memo' && (
              <div className="orient-stage">
                <div className="orient-header">INCOMING MEMO — FROM: M.</div>
                <div className="orient-divider">────────────────────────────────────────</div>
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: MEMO_CONTENT }} />
                <button className="btn btn-primary" onClick={() => setStage('station')}>
                  ▸ PROCEED TO STATION
                </button>
              </div>
            )}

            {stage === 'station' && (
              <div className="orient-stage">
                <div className="orient-header">STATION VERIFICATION</div>
                <div className="orient-divider">────────────────────────────────────────</div>
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: STATION_CHECK }} />
                <button className="btn btn-primary" onClick={() => setStage('breakroom')}>
                  ▸ CHECK THE BREAK ROOM
                </button>
              </div>
            )}

            {stage === 'breakroom' && (
              <div className="orient-stage">
                <div className="orient-header">BREAK ROOM STATUS</div>
                <div className="orient-divider">────────────────────────────────────────</div>
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: BREAK_ROOM }} />

                {!breakroomChoice && (
                  <div className="orient-choices">
                    <button className="btn btn-ghost" onClick={() => handleBreakroomChoice('fine')}>
                      IT'S FINE
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleBreakroomChoice('didnt-make')}>
                      I DIDN'T MAKE THIS
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleBreakroomChoice('who')}>
                      WHO MADE IT?
                    </button>
                  </div>
                )}

                {breakroomChoice === 'fine' && (
                  <div className="orient-response">
                    <div className="response-text">It is fine. It is always fine.</div>
                    <div className="response-text"><em>Comfort is compliance.</em></div>
                    <button className="btn btn-primary" onClick={() => setStage('task')}>
                      ▸ RETURN TO STATION
                    </button>
                  </div>
                )}

                {breakroomChoice === 'didnt-make' && (
                  <div className="orient-response">
                    <div className="response-text">Correct. You did not.</div>
                    <div className="response-text">No one did. It was warm before the shift.</div>
                    <div className="response-text"><span class="warn">It was warm before the building.</span></div>
                    <div className="response-text">The system has noted your observation.</div>
                    <button className="btn btn-primary" onClick={() => setStage('task')}>
                      ▸ RETURN TO STATION
                    </button>
                  </div>
                )}

                {breakroomChoice === 'who' && (
                  <div className="orient-response">
                    <div className="response-text"><span class="dim">[NO DATA]</span></div>
                    <div className="response-text">The question has been filed. The file is empty.</div>
                    <div className="response-text">The file has <em>always</em> been empty.</div>
                    <div className="response-text">The system appreciates your curiosity.</div>
                    <div className="response-text">The system does not appreciate it <em>enough</em> to answer.</div>
                    <button className="btn btn-primary" onClick={() => setStage('task')}>
                      ▸ RETURN TO STATION
                    </button>
                  </div>
                )}
              </div>
            )}

            {stage === 'task' && !taskExecuted && (
              <div className="orient-stage">
                <div className="orient-header">YOUR FIRST TASK</div>
                <div className="orient-divider">────────────────────────────────────────</div>
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: FIRST_TASK }} />
                <button className="btn btn-primary" onClick={executeTask}>
                  ▸ EXECUTE FIRST TASK
                </button>
              </div>
            )}

            {stage === 'task' && taskExecuted && (
              <div className="orient-stage">
                <div className="orient-header">TASK EXECUTED</div>
                <div className="orient-divider">────────────────────────────────────────</div>
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: FIRST_TASK_EXECUTE }} />
                <button className="btn btn-primary" onClick={() => setStage('complete')}>
                  ▸ CONTINUE ORIENTATION
                </button>
              </div>
            )}

            {stage === 'complete' && (
              <div className="orient-stage">
                <div className="orient-content" dangerouslySetInnerHTML={{ __html: ORIENTATION_COMPLETE }} />
                <div className="orient-complete">
                  <span className="orient-arrow">↓</span>
                  <a href="#console" className="btn btn-primary">▸ BEGIN YOUR SHIFT</a>
                </div>
                <button className="btn btn-ghost" onClick={startBoot}>
                  ▸ REPLAY ORIENTATION
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
