/* FALSE REALITY — operator console mock
   PR 3: happy-shift interactivity only. Glitch engine comes in the next PR. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const state = { day: 4, tasks: 50, minutes: 60 }; // shift starts 01:00
  const MAX_TASKS = 50;

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

  const el = {
    day: $('#day'),
    clock: $('#clock'),
    tasks: $('#tasks'),
    weather: $('#weather'),
    log: $('#log'),
    taskBtn: $('#task-btn'),
    nextBtn: $('#next-btn')
  };

  const pad = (n) => String(n).padStart(2, '0');
  const clockStr = () =>
    pad(Math.floor(state.minutes / 60) % 24) + ':' + pad(state.minutes % 60);

  function addLine(text, cls) {
    const line = document.createElement('div');
    line.className = 'log-line' + (cls ? ' ' + cls : '');
    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = clockStr();
    const body = document.createElement('span');
    body.textContent = text;
    line.append(ts, body);
    el.log.appendChild(line);
    el.log.scrollTop = el.log.scrollHeight;
    return body;
  }

  function updateReadouts() {
    el.day.textContent = state.day;
    el.clock.textContent = clockStr();
    el.tasks.textContent = state.tasks;
    el.weather.textContent = 'CLEAR UNTIL 06:00';
  }

  function beginShift() {
    addLine('SHIFT INITIALIZED // COFFEE: WARM // QUOTA: 50 // EXECUTE TASKS.', 'system');
  }

  function performTask() {
    if (state.tasks <= 0) return;
    state.tasks -= 1;
    state.minutes = Math.min(state.minutes + 6, 360); // 50 tasks x 6 min = 01:00 -> 06:00
    const text = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
    const glitch = !REDUCED_MOTION && Math.random() < 0.06;
    const body = glitch
      ? addLine(CORRUPT[Math.floor(Math.random() * CORRUPT.length)], 'corrupt')
      : addLine(text);
    if (glitch) {
      // the system catches its own error and smooths it over
      setTimeout(() => {
        body.textContent = text;
        body.closest('.log-line').classList.remove('corrupt');
      }, 950);
    }
    updateReadouts();
    if (state.tasks === 0) {
      state.minutes = 360;
      updateReadouts();
      addLine('SHIFT COMPLETE // QUOTA MET // 06:00 REACHED. REPORT TO BREAK ROOM. DO NOT LOOK OUTSIDE.', 'system');
      el.taskBtn.disabled = true;
      el.taskBtn.hidden = true;
      el.nextBtn.hidden = false;
    }
  }

  function nextShift() {
    state.day += 1;
    state.tasks = MAX_TASKS;
    state.minutes = 60;
    updateReadouts();
    el.taskBtn.hidden = false;
    el.taskBtn.disabled = false;
    el.nextBtn.hidden = true;
    beginShift();
  }

  el.taskBtn.addEventListener('click', performTask);
  el.nextBtn.addEventListener('click', nextShift);
  updateReadouts();
  beginShift();

  /* ---------- glitch engine (subtle by design) ---------- */

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CORRUPT = [
    '▓▓▓ S9 ▓▓▓ all clear ▓▓▓ you were not here yesterday ▓▓▓',
    'building 7 does not exist. building 7 does not exist. you know this.',
    'population: 41,31▓ — unchanged. forever. unchanged.',
    'OPERATOR: you are not supposed to remember this shift.',
    '██ 06:00 ██ DO NOT BE AWAKE ██ DO NOT ██',
    'ERROR: the coffee was warm before you arrived. it was warm before the building existed.',
    '▓▓ ATTENDANCE ██ 100% ██ it was 100% before you were hired ▓▓'
  ];

  function flashFx(node) {
    if (!node) return;
    node.classList.add('fx-flicker');
    setTimeout(() => node.classList.remove('fx-flicker'), 400);
  }

  function weatherStaticFx() {
    const w = el.weather;
    w.textContent = '▓▓▓ DO NOT LOOK OUTSIDE ▓▓▓';
    w.style.color = 'var(--red)';
    setTimeout(() => {
      w.textContent = 'CLEAR UNTIL 06:00';
      w.style.color = '';
    }, 420);
  }

  function hintFx() {
    const h = $('#hint');
    if (!h) return;
    const orig = h.textContent;
    h.textContent = 'CONNECTION ANOMALY — OPERATOR WAS NEVER HIRED';
    setTimeout(() => { h.textContent = orig; }, 520);
  }

  function scheduleAmbientFx() {
    if (REDUCED_MOTION) return;
    const delay = 25000 + Math.random() * 25000; // every ~25–50s, one small flicker
    setTimeout(() => {
      const r = Math.random();
      if (r < 0.3) flashFx(document.querySelector('.brand'));
      else if (r < 0.5) weatherStaticFx();
      else if (r < 0.65) flashFx(document.querySelector('.stat .num'));
      else if (r < 0.8) hintFx();
      else flashFx(document.querySelector('.hero-art figcaption'));
      scheduleAmbientFx();
    }, delay);
  }

  scheduleAmbientFx();
})();
