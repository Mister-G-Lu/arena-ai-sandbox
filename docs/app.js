/* FALSE REALITY — operator console mock
   Reads state from FR.store and exposes FR.game so the dev terminal can drive the
   real code paths rather than duplicating them. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const store = window.FR.store;
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

  const CORRUPT = [
    '▓▓▓ sector ▓▓9▓▓▓ — all clear ▓▓',
    'there is no building 7. there is no building 7.',
    'population: 41,31▓ — unchan6ed. forever.',
    'you are not supposed to remember this',
    '██ 06:00 ██ — do not be awake ██'
  ];

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const clockStr = () => {
    const m = store.get('shift.minutes');
    return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
  };

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
    el.day.textContent = store.get('shift.day');
    el.clock.textContent = clockStr();
    el.tasks.textContent = store.get('shift.tasks');
    el.weather.textContent = 'Clear skies until 06:00';
    const done = store.get('shift.tasks') <= 0;
    el.taskBtn.hidden = done;
    el.taskBtn.disabled = done;
    el.nextBtn.hidden = !done;
  }

  function beginShift() {
    addLine('Tuesday. The coffee is already warm.', 'system');
  }

  function endShift() {
    store.patch({ shift: { tasks: 0, minutes: 360 } });
    addLine('SHIFT COMPLETE. The city thanks you. See you tomorrow, Operator.', 'system');
    updateReadouts();
  }

  function performTask(opts) {
    if (store.get('shift.tasks') <= 0) return;
    const step = store.get('toggles.fastClock') ? 30 : 6;
    store.patch({ shift: {
      tasks: store.get('shift.tasks') - 1,
      minutes: Math.min(store.get('shift.minutes') + step, 360)
    }});

    const text = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
    const rate = store.get('toggles.glitchRate');
    const glitch = (opts && opts.forceGlitch) ||
      (!REDUCED_MOTION && Math.random() < rate);
    const body = glitch
      ? addLine(CORRUPT[Math.floor(Math.random() * CORRUPT.length)], 'corrupt')
      : addLine(text);
    if (glitch) {
      setTimeout(() => {
        body.textContent = text;
        body.closest('.log-line').classList.remove('corrupt');
      }, 950);
    }
    updateReadouts();
    if (store.get('shift.tasks') === 0) endShift();
  }

  function nextShift() {
    store.patch({ shift: {
      day: store.get('shift.day') + 1,
      tasks: MAX_TASKS,
      minutes: 60
    }});
    updateReadouts();
    beginShift();
  }

  el.taskBtn.addEventListener('click', () => performTask());
  el.nextBtn.addEventListener('click', nextShift);
  updateReadouts();
  beginShift();

  /* ---------- ambient glitch engine ---------- */

  function flashFx(node) {
    if (!node) return;
    node.classList.add('fx-flicker');
    setTimeout(() => node.classList.remove('fx-flicker'), 400);
  }

  function weatherStaticFx() {
    const w = el.weather;
    w.textContent = '…static…';
    w.style.color = 'var(--red)';
    setTimeout(() => { w.textContent = 'Clear skies until 06:00'; w.style.color = ''; }, 420);
  }

  function hintFx() {
    const h = $('#hint');
    if (!h) return;
    const orig = h.textContent;
    h.textContent = 'you are not supposed to remember this.';
    setTimeout(() => { h.textContent = orig; }, 520);
  }

  function ambientFx() {
    const r = Math.random();
    if (r < 0.3) flashFx(document.querySelector('.brand'));
    else if (r < 0.5) weatherStaticFx();
    else if (r < 0.65) flashFx(document.querySelector('.stat .num'));
    else if (r < 0.8) hintFx();
    else flashFx(document.querySelector('.hero-art figcaption'));
  }

  function scheduleAmbientFx() {
    if (REDUCED_MOTION) return;
    const delay = 25000 + Math.random() * 25000;
    setTimeout(() => {
      if (store.get('toggles.ambientFx')) ambientFx();
      scheduleAmbientFx();
    }, delay);
  }
  scheduleAmbientFx();

  /* ---------- the surface the dev terminal drives ---------- */

  window.FR.game = {
    MAX_TASKS,
    performTask,
    nextShift,
    endShift,
    ambientFx,
    log: addLine,
    refresh: updateReadouts,
    skipTasks(n) { for (let i = 0; i < n && store.get('shift.tasks') > 0; i++) performTask(); },
    forceGlitch() { performTask({ forceGlitch: true }); }
  };

  // Any external state change (dev terminal, warp, import) re-renders the console.
  store.subscribe((s, reason) => { if (reason !== 'set:shift.tasks') updateReadouts(); });
})();
