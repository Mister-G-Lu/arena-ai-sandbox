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
    addLine(text);
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

  /* --- glitch engine: follow-up PR --- */
})();
