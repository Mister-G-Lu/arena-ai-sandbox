/* FALSE REALITY — operator console mock
   PR 3: happy-shift interactivity only. Glitch engine comes in the next PR. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const state = { day: 4, tasks: 50, minutes: 60 }; // shift starts 01:00
  const MAX_TASKS = 50;

  const SNIPPETS = [
    'Roll call — VANTABLACK, Sector 9: roads quiet, stars out, all clear.',
    'Ticket filed — streetlight 4-B, Building 4. Crew already en route. Everyone\u2019s friendly tonight.',
    'Break room — coffee fresh. As always. You didn\u2019t even have to brew it.',
    'Weather desk — clear skies until 06:00. Not a cloud in the world.',
    'Route check — all trucks on schedule. On-time performance: 100.0%.',
    'Radio check — night crew confirmed. The city is in good hands.',
    'Inventory — pens counted: 41,312. A nice, even number.',
    'Memo board — nothing new. The day crew sends their regards.',
    'Window check — streetlights all on. The city glows like it\u2019s glad you\u2019re here.',
    'Attendance log — you: present. As always.',
    'Population chart — 41,312, holding steady. Everyone accounted for.',
    'Roof report — antennas clear. Reception: perfect.'
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
    el.weather.textContent = 'Clear skies until 06:00';
  }

  function beginShift() {
    addLine('Tuesday. The coffee is already warm.', 'system');
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
      addLine('SHIFT COMPLETE. The city thanks you. See you tomorrow, Operator.', 'system');
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
    '▓▓▓ sector ▓▓9▓▓▓ — all clear ▓▓',
    'there is no building 7. there is no building 7.',
    'population: 41,31▓ — unchan6ed. forever.',
    'you are not supposed to remember this',
    '██ 06:00 ██ — do not be awake ██'
  ];

  function flashFx(node) {
    if (!node) return;
    node.classList.add('fx-flicker');
    setTimeout(() => node.classList.remove('fx-flicker'), 400);
  }

  function weatherStaticFx() {
    const w = el.weather;
    const orig = w.textContent;
    w.textContent = '…static…';
    w.style.color = 'var(--red)';
    setTimeout(() => {
      w.textContent = 'Clear skies until 06:00';
      w.style.color = '';
    }, 420);
  }

  function hintFx() {
    const h = $('#hint');
    if (!h) return;
    const orig = h.textContent;
    h.textContent = 'you are not supposed to remember this.';
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
