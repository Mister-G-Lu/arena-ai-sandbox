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

/* ---------- FIRST SHIFT — orientation / tutorial ---------- */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const screen = $('#orient-screen');
  const actions = $('#orient-actions');
  const btn = $('#orient-btn');
  const statusEl = $('#orient-status');
  if (!screen || !btn) return;

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TYPE_SPEED = REDUCED_MOTION ? 0 : 22; // ms per line in boot sequence
  const LINE_DELAY = REDUCED_MOTION ? 0 : 120;

  let currentStep = -1;

  /* ---------- helpers ---------- */

  function clearScreen() {
    screen.innerHTML = '';
  }

  function scrollScreen() {
    screen.scrollTop = screen.scrollHeight;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setBtn(label, handler) {
    btn.textContent = label;
    btn.hidden = false;
    btn.disabled = false;
    btn.onclick = handler;
  }

  function hideBtn() {
    btn.hidden = true;
  }

  function appendDivider() {
    const d = document.createElement('div');
    d.className = 'orient-divider';
    d.textContent = '─'.repeat(42);
    screen.appendChild(d);
    scrollScreen();
  }

  function appendText(text, cls) {
    const p = document.createElement('div');
    if (cls) p.className = cls;
    else p.className = 'orient-text';
    p.innerHTML = text;
    screen.appendChild(p);
    scrollScreen();
    return p;
  }

  function appendFrom(label) {
    const p = document.createElement('div');
    p.className = 'orient-from';
    p.textContent = label;
    screen.appendChild(p);
    scrollScreen();
  }

  function appendChoices(choices) {
    const wrap = document.createElement('div');
    wrap.className = 'orient-choices';
    choices.forEach(c => {
      const b = document.createElement('button');
      b.className = 'orient-choice';
      b.type = 'button';
      b.textContent = c.label;
      b.onclick = () => {
        // disable all
        wrap.querySelectorAll('.orient-choice').forEach(x => {
          x.disabled = true;
          x.style.opacity = x === b ? '1' : '0.3';
        });
        // show response
        const resp = document.createElement('div');
        resp.className = 'orient-response';
        resp.innerHTML = c.response;
        screen.appendChild(resp);
        scrollScreen();
        // show next button after a beat
        setTimeout(() => {
          c.onChoose();
        }, 400);
      };
      wrap.appendChild(b);
    });
    screen.appendChild(wrap);
    scrollScreen();
    return wrap;
  }

  /* ---------- boot sequence ---------- */

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

  function runBootSequence() {
    clearScreen();
    setStatus('BOOTING');
    hideBtn();

    let i = 0;
    function nextLine() {
      if (i >= BOOT_LINES.length) {
        setTimeout(() => goToStep(0), REDUCED_MOTION ? 0 : 600);
        return;
      }
      const line = document.createElement('div');
      line.className = 'orient-boot-line';
      line.innerHTML = BOOT_LINES[i];
      line.style.animationDelay = '0ms';
      screen.appendChild(line);
      scrollScreen();
      i++;
      setTimeout(nextLine, TYPE_SPEED + Math.random() * 60);
    }
    nextLine();
  }

  /* ---------- orientation steps ---------- */

  const STEPS = [
    /* STEP 0: Memo from M. */
    {
      status: 'MEMO RECEIVED',
      render() {
        appendDivider();
        appendFrom('▸ INCOMING MEMO — FROM: M. — RE: YOUR FIRST SHIFT');
        appendDivider();
        appendText(
`Operator.

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

<span class="dim">— M.</span>`
        );
        appendDivider();
        setBtn('▸ PROCEED TO STATION', () => goToStep(1));
      }
    },

    /* STEP 1: Station check — teaches the readouts */
    {
      status: 'STATION CHECK',
      render() {
        appendDivider();
        appendFrom('▸ ORIENTATION — STATION VERIFICATION');
        appendDivider();
        appendText(
`Your console is active. Four readouts. Read them.

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
Everything is as it has <em>always</em> been.`
        );
        appendDivider();
        setBtn('▸ CHECK THE BREAK ROOM', () => goToStep(2));
      }
    },

    /* STEP 2: The Break Room — first choice */
    {
      status: 'BREAK ROOM',
      render() {
        appendDivider();
        appendFrom('▸ ORIENTATION — BREAK ROOM STATUS');
        appendDivider();
        appendText(
`The break room is through the door behind your station.

The light is on. The coffee is warm. The pot is full.
There is no one else in the building.
There is never anyone else in the building.

You did not turn on the coffee maker.
The coffee maker was already on.
It was on when you arrived.
<span class="warn">It was on before you arrived.</span>

How do you feel about the coffee?`
        );

        appendChoices([
          {
            label: "IT'S FINE",
            response: `It is fine. It is always fine.\nThe system notes your comfort. <em>Comfort is compliance.</em>`,
            onChoose() { setBtn('▸ RETURN TO STATION', () => goToStep(3)); }
          },
          {
            label: "I DIDN'T MAKE THIS",
            response: `Correct. You did not.\nNo one did. It was warm before the shift.\n<span class="warn">It was warm before the building.</span>\nThe system has noted your observation.`,
            onChoose() { setBtn('▸ RETURN TO STATION', () => goToStep(3)); }
          },
          {
            label: "WHO MADE IT?",
            response: `<span class="dim">[NO DATA]</span>\nThe question has been filed. The file is empty.\nThe file has <em>always</em> been empty.\nThe system appreciates your curiosity.\nThe system does not appreciate it <em>enough</em> to answer.`,
            onChoose() { setBtn('▸ RETURN TO STATION', () => goToStep(3)); }
          }
        ]);
      }
    },

    /* STEP 3: First task — teaches the core mechanic */
    {
      status: 'FIRST TASK',
      render() {
        appendDivider();
        appendFrom('▸ ORIENTATION — YOUR FIRST TASK');
        appendDivider();
        appendText(
`Your first task is waiting in the queue.

When you press EXECUTE:
  — the task will be <em>logged</em>
  — the clock will <em>advance</em>
  — the count will <em>decrease by one</em>

This is the job. This is all the job is.
Fifty small actions. None of them wrong.
<span class="warn">There cannot be wrong actions.
There is no option for wrong.</span>

You are ready. Execute your first task.`
        );
        appendDivider();
        setBtn('▸ EXECUTE FIRST TASK', () => {
          // simulate a task executing
          appendText(
`\n<span class="warn">01:06</span> — ORIENTATION TASK: Verify terminal link.`, 'orient-text'
          );
          setTimeout(() => {
            appendText(
`> LINK VERIFIED. Signal: strong.
> The console knows you are here.
> <em>The console has always known you are here.</em>`, 'orient-text'
            );
            setTimeout(() => goToStep(4), REDUCED_MOTION ? 100 : 1200);
          }, REDUCED_MOTION ? 100 : 800);
          hideBtn();
          setStatus('EXECUTING');
        });
      }
    },

    /* STEP 4: Orientation complete — transition to console */
    {
      status: 'ORIENTED',
      render() {
        appendDivider();
        appendText(
`ORIENTATION COMPLETE.

You have been oriented, Operator.

  — Your shift is <em>active</em>.
  — Your quota is <em>loaded</em>.
  — Your coffee is <em>warm</em>.

The city is counting on you.
<span class="warn">The city has always been counting on you.</span>

Report to your console below.
Fifty tasks await.
<span class="dim">They have always been waiting.</span>`
        );

        const complete = document.createElement('div');
        complete.className = 'orient-complete';
        complete.innerHTML = `
          <span class="orient-arrow">↓</span>
          <a class="btn btn-primary" href="#shift" style="font-family:var(--font-mono);letter-spacing:0.1em;font-size:0.85rem;">▸ BEGIN YOUR SHIFT</a>
        `;
        screen.appendChild(complete);
        scrollScreen();
        hideBtn();

        // reset button for potential re-use
        setTimeout(() => {
          setBtn('▸ REPLAY ORIENTATION', () => {
            currentStep = -1;
            runBootSequence();
          });
        }, 500);
      }
    }
  ];

  function goToStep(n) {
    currentStep = n;
    if (n >= STEPS.length) return;
    const step = STEPS[n];
    setStatus(step.status);
    step.render();
  }

  /* ---------- init ---------- */

  btn.onclick = () => {
    runBootSequence();
  };
})();
