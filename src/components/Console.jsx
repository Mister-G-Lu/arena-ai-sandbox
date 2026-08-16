import React, { useState, useEffect, useRef } from 'react';

const SNIPPETS = [
  'S9 ROLL CALL — roads clear. stars: nominal. status: green.',
  'STREETLIGHT 4-B — ticket filed. crew dispatched. no follow-up required.',
  'BREAK ROOM — coffee: warm. pot: full. you did not brew this.',
  'WEATHER — clear. no change expected. no change permitted.',
  'ROUTE SCAN — all trucks on schedule. deviation: 0.00%.',
  'RADIO — night crew: confirmed. signal: strong. no anomalies.',
  'INVENTORY — count: 41,312. previous count: 41,312. match: confirmed.',
  'MEMO BOARD — empty. day crew left nothing. as expected.',
  'WINDOW CHK — streetlights: active. grid: stable. city: compliant.',
  'ATTENDANCE — you: PRESENT. record: unbroken. do not break it.',
  'POPULATION — 41,312. delta: 0. all accounted for. all always accounted for.',
  'ROOF SCAN — antennas: clear. signal: optimal. something: listening.',
  'DISPATCH LOG — sector 7: quiet. sector 7 is always quiet.',
  'ELEVATOR CHK — floors 1-11: normal. floor 12: does not exist.',
  'CLOCK SYNC — 01:00 confirmed. time is moving correctly. do not question the time.'
];

const CORRUPT = [
  '▓▓▓ S9 ▓▓▓ all clear ▓▓▓ you were not here yesterday ▓▓▓',
  'building 7 does not exist. building 7 does not exist. you know this.',
  'population: 41,31▓ — unchanged. forever. unchanged.',
  'OPERATOR: you are not supposed to remember this shift.',
  '██ 06:00 ██ DO NOT BE AWAKE ██ DO NOT ██',
  'ERROR: the coffee was warm before you arrived. it was warm before the building existed.',
  '▓▓ ATTENDANCE ██ 100% ██ it was 100% before you were hired ▓▓'
];

export default function Console() {
  const [day, setDay] = useState(4);
  const [minutes, setMinutes] = useState(60);
  const [tasks, setTasks] = useState(50);
  const [logs, setLogs] = useState([]);
  const [completed, setCompleted] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    addLog('SHIFT INITIALIZED // COFFEE: WARM // QUOTA: 50 // EXECUTE TASKS.', 'system');
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  function formatTime(mins) {
    const hours = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function addLog(text, type = '') {
    const timestamp = formatTime(minutes);
    setLogs(prev => [...prev, { text, type, timestamp }]);
  }

  function executeTask() {
    if (tasks <= 0) return;

    const newTasks = tasks - 1;
    const newMinutes = Math.min(minutes + 6, 360);
    setTasks(newTasks);
    setMinutes(newMinutes);

    const isCorrupt = Math.random() < 0.06;
    const text = isCorrupt
      ? CORRUPT[Math.floor(Math.random() * CORRUPT.length)]
      : SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];

    const timestamp = formatTime(newMinutes);
    const type = isCorrupt ? 'corrupt' : '';

    if (isCorrupt) {
      setTimeout(() => {
        const cleanText = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
        setLogs(prev => [...prev, { text: cleanText, type: '', timestamp }]);
      }, 1500);
    }

    setLogs(prev => [...prev, { text, type, timestamp }]);

    if (newTasks === 0) {
      setMinutes(360);
      setCompleted(true);
      const finalTimestamp = formatTime(360);
      setLogs(prev => [...prev, {
        text: 'SHIFT COMPLETE // QUOTA MET // 06:00 REACHED. REPORT TO BREAK ROOM. DO NOT LOOK OUTSIDE.',
        type: 'system',
        timestamp: finalTimestamp
      }]);
    }
  }

  function nextShift() {
    setDay(day + 1);
    setTasks(50);
    setMinutes(60);
    setCompleted(false);
    setLogs([]);
    setTimeout(() => {
      addLog('SHIFT INITIALIZED // COFFEE: WARM // QUOTA: 50 // EXECUTE TASKS.', 'system');
    }, 100);
  }

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>OPERATOR CONSOLE</h2>
        <p className="section-lede">
          Build 0.41.312. You are logged in. You have always been logged in.
          Execute the tasks. Do not question the count.
        </p>

        <div className="console">
          <div className="console-head">
            <span className="dot"></span>
            CENTRAL DISPATCH // OPERATOR TERMINAL
            <span className="console-status">▣ LINKED</span>
          </div>
          <div className="readouts">
            <div className="readout">
              <label>SHIFT DAY</label>
              <span>{day}</span>
            </div>
            <div className="readout">
              <label>SHIFT CLOCK</label>
              <span>{formatTime(minutes)}</span>
            </div>
            <div className="readout">
              <label>TASKS REMAINING</label>
              <span>{tasks}</span>
            </div>
            <div className="readout">
              <label>STATUS</label>
              <span>CLEAR UNTIL 06:00</span>
            </div>
          </div>
          <div className="log" ref={logRef}>
            {logs.map((log, i) => (
              <div key={i} className={`log-line ${log.type}`}>
                <span className="ts">[{log.timestamp}]</span> {log.text}
              </div>
            ))}
          </div>
          <div className="console-actions">
            {!completed ? (
              <button className="btn btn-primary" onClick={executeTask}>
                ▸ EXECUTE TASK
              </button>
            ) : (
              <button className="btn btn-primary" onClick={nextShift}>
                ▸ BEGIN NEXT SHIFT
              </button>
            )}
          </div>
        </div>

        <p className="fine console-note">
          // TERMINAL PREVIEW — FULL BUILD: 50 ACTIONS/SHIFT, REAL CONSEQUENCES,
          NOTHING REPEATS. THIS DEMO: 50 CLICKS, WARM COFFEE, AND THE
          PERSISTENT FEELING THAT THE CONSOLE IS WATCHING BACK.
        </p>
      </div>
    </section>
  );
}
