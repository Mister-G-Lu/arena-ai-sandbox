/* FALSE REALITY — the MAINTENANCE TERMINAL (dev only)
   ===================================================================
   THIS FILE MUST NOT SHIP TO PRODUCTION. It is loaded conditionally by
   index.html (see the dev gate there) and should be deleted by any real
   deploy step. See design/dev-tools.md §3.

   Access:
     ` (backtick)  toggle the terminal
     ?dev=1        opt in on a shared build (persists per browser)
     ?dev=0        opt out
   =================================================================== */
(() => {
  'use strict';

  const store = window.FR && window.FR.store;
  if (!store) return console.warn('[devtools] state.js must load first');

  const game = () => window.FR.game || {};

  /* ---------- warps: named, declarative, coherent state patches ----------
     These are CONTENT. Add one for every beat that has ever had a bug. */

  const ALL_ZONES_CLEARED = {
    floor12: 'cleared', records: 'cleared', vents: 'cleared',
    rooftop: 'cleared', offmap: 'cleared', interim: 'found'
  };

  const WARPS = [
    { id: 'coldopen', arc: 'I', label: 'Day 1 — cold open',
      patch: { shift: { day: 1, arc: 1, tasks: 50, minutes: 60 },
               qualities: { perception: 0, doubt: 0, attention: 0, salary: 0 } } },

    { id: 'notice', arc: 'I', label: 'Day 5 — first Notice storylet',
      patch: { shift: { day: 5, arc: 1, tasks: 42, minutes: 108 },
               qualities: { perception: 2, doubt: 1, attention: 1, salary: 120 } } },

    { id: 'floor12', arc: 'I', label: 'Day 9 — Floor 12 expedition',
      patch: { shift: { day: 9, arc: 1, tasks: 30, minutes: 180 },
               qualities: { perception: 4, doubt: 3, attention: 4, salary: 260 },
               zones: { floor12: 'open' } } },

    { id: 'interim', arc: 'I', label: 'The Interim — first Reinstatement',
      patch: { shift: { day: 9, arc: 1, tasks: 0, minutes: 360 },
               qualities: { perception: 4, doubt: 4, attention: 5 },
               zones: { floor12: 'cleared', interim: 'open' },
               components: { nullKey: true },
               death: { count: 1, scars: 1, discrepancies: 3 } } },

    { id: 'midarc2', arc: 'II', label: 'Day 26 — mid Arc II (3 components)',
      patch: { shift: { day: 26, arc: 2, tasks: 50, minutes: 60 },
               qualities: { perception: 6, doubt: 6, attention: 4, salary: 890 },
               components: { nullKey: true, lens: true, wire: true },
               zones: { floor12: 'cleared', records: 'cleared', vents: 'cleared',
                        rooftop: 'found', interim: 'found' },
               death: { count: 1, scars: 1, discrepancies: 5 } } },

    { id: 'truth', arc: 'II', label: 'Day 40 — The Truth (5 components)',
      patch: { shift: { day: 40, arc: 2, tasks: 50, minutes: 60 },
               qualities: { perception: 8, doubt: 9, attention: 7, salary: 1400 },
               components: { nullKey: true, lens: true, wire: true, crystal: true, chip: true },
               zones: ALL_ZONES_CLEARED,
               checklist: { signal: true, hour: true },
               death: { count: 2, scars: 2, discrepancies: 7 } } },

    { id: 'summons', arc: 'III', label: 'Day 43 — The Summons',
      patch: { shift: { day: 43, arc: 3, tasks: 50, minutes: 60 },
               qualities: { perception: 9, doubt: 10, attention: 9, salary: 1500 },
               components: { nullKey: true, lens: true, wire: true, crystal: true, chip: true },
               zones: ALL_ZONES_CLEARED,
               checklist: { form: true, signal: true, hour: true },
               death: { count: 2, scars: 2, discrepancies: 9 } } },

    { id: 'lastshift', arc: 'III', label: 'Day 47 — The Last Shift',
      patch: { shift: { day: 47, arc: 3, tasks: 20, minutes: 180 },
               qualities: { perception: 10, doubt: 10, attention: 10 },
               components: { nullKey: true, lens: true, wire: true, crystal: true,
                             chip: true, sixth: true },
               zones: ALL_ZONES_CLEARED,
               checklist: { form: true, name: true, sixth: true, signal: true, hour: true },
               death: { count: 3, scars: 3, discrepancies: 9 } } },

    { id: 'descent', arc: 'III', label: '05:59 — the descent to the Loom',
      patch: { shift: { day: 48, arc: 3, tasks: 1, minutes: 354 },
               qualities: { perception: 10, doubt: 10, attention: 10 },
               components: { nullKey: true, lens: true, wire: true, crystal: true,
                             chip: true, sixth: true },
               zones: ALL_ZONES_CLEARED,
               checklist: { form: true, name: true, sixth: true, signal: true, hour: true },
               death: { count: 3, scars: 3, discrepancies: 9 } } },

    { id: 'patched', arc: 'END', label: 'PATCHED — failure state (5 scars)',
      patch: { shift: { day: 48, arc: 3, tasks: 1, minutes: 354 },
               checklist: { form: true, name: false, sixth: true, signal: true, hour: true },
               death: { count: 3, scars: 5, discrepancies: 9 } } }
  ];

  /* ---------- the dev gate (three tiers — design/dev-tools.md §3) ---------- */

  const FLAG = 'fr.dev';
  const params = new URLSearchParams(location.search);
  if (params.get('dev') === '1') localStorage.setItem(FLAG, '1');
  if (params.get('dev') === '0') localStorage.removeItem(FLAG);

  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
    location.hostname.endsWith('.local') ||
    location.hostname.endsWith('.e2b.app') ||
    location.protocol === 'file:';

  const enabled = localHost || localStorage.getItem(FLAG) === '1';
  if (!enabled) return;

  /* ---------- DOM ---------- */

  const h = (tag, props = {}, kids = []) => {
    const n = Object.assign(document.createElement(tag), props);
    (Array.isArray(kids) ? kids : [kids]).forEach((k) =>
      n.append(typeof k === 'string' ? document.createTextNode(k) : k));
    return n;
  };

  const panel = h('aside', { className: 'devt', id: 'devt' });
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Maintenance Terminal');

  const ribbon = h('button', {
    className: 'devt-ribbon',
    type: 'button',
    title: 'Maintenance Terminal (`)'
  }, 'DEV');
  ribbon.addEventListener('click', () => toggle());

  const body = h('div', { className: 'devt-body' });
  const status = h('div', { className: 'devt-status' });

  panel.append(
    h('header', { className: 'devt-head' }, [
      h('span', { className: 'devt-title' }, 'MAINTENANCE TERMINAL'),
      h('span', { className: 'devt-sub' }, 'MERIDIAN MUNICIPAL AUTHORITY — INTERNAL'),
      h('button', { className: 'devt-x', type: 'button', title: 'Close (`)',
        onclick: () => toggle(false) }, '×')
    ]),
    body,
    status
  );

  /* ---------- sections ---------- */

  function section(title, note) {
    const s = h('section', { className: 'devt-sec' }, [
      h('h4', {}, title)
    ]);
    if (note) s.append(h('p', { className: 'devt-note' }, note));
    body.append(s);
    return s;
  }

  /* --- warps --- */
  const warpSec = section('Reassignment', 'File a transfer. State is patched to a coherent beat.');
  const warpGrid = h('div', { className: 'devt-warps' });
  WARPS.forEach((w) => {
    const btn = h('button', { className: 'devt-warp', type: 'button' }, [
      h('span', { className: 'devt-warp-arc' }, w.arc),
      h('span', {}, w.label)
    ]);
    btn.addEventListener('click', () => {
      store.patch(JSON.parse(JSON.stringify(w.patch)), true);
      game().refresh && game().refresh();
      game().log && game().log('REASSIGNED — ' + w.label.toUpperCase() + '. — M.', 'system');
      render();
      say('Warped: ' + w.label);
    });
    warpGrid.append(btn);
  });
  warpSec.append(warpGrid);

  /* --- actions --- */
  const actSec = section('Shift controls');
  const actGrid = h('div', { className: 'devt-acts' });
  [
    ['+1 task',    () => game().skipTasks(1)],
    ['+10 tasks',  () => game().skipTasks(10)],
    ['End shift',  () => game().endShift()],
    ['Next shift', () => game().nextShift()],
    ['Force glitch', () => game().forceGlitch()],
    ['Ambient FX now', () => game().ambientFx()]
  ].forEach(([label, fn]) => {
    const b = h('button', { className: 'devt-btn', type: 'button' }, label);
    b.addEventListener('click', () => {
      store.set('meta.devTouched', true, true);
      fn(); render();
    });
    actGrid.append(b);
  });
  actSec.append(actGrid);

  /* --- schema-driven fields (auto-generated: new qualities appear for free) --- */
  const inputs = [];

  store.SCHEMA.forEach((grp) => {
    const s = section(grp.group);
    const list = h('div', { className: 'devt-fields' });
    grp.fields.forEach((f) => list.append(fieldRow(f)));
    s.append(list);
  });

  function fieldRow(f) {
    const row = h('label', { className: 'devt-row' + (f.hidden ? ' is-hidden-stat' : '') });
    const name = h('span', { className: 'devt-label' }, f.label);
    if (f.hidden) name.append(h('span', { className: 'devt-eye', title: 'hidden from players' }, '◉'));
    row.append(name);

    let input;
    if (f.type === 'bool') {
      input = h('input', { type: 'checkbox' });
      input.addEventListener('change', () => commit(f, input.checked));
    } else if (f.type === 'enum') {
      input = h('select', {});
      f.options.forEach((o) => input.append(h('option', { value: String(o) }, String(o))));
      input.addEventListener('change', () => {
        const v = f.options.find((o) => String(o) === input.value);
        commit(f, v);
      });
    } else {
      input = h('input', {
        type: 'number',
        min: f.min, max: f.max,
        step: f.step || (f.type === 'float' ? 0.01 : 1)
      });
      input.addEventListener('change', () => {
        let v = f.type === 'float' ? parseFloat(input.value) : parseInt(input.value, 10);
        if (Number.isNaN(v)) v = f.min || 0;
        if (f.min != null) v = Math.max(f.min, v);
        if (f.max != null) v = Math.min(f.max, v);
        commit(f, v);
      });
    }
    input.className = 'devt-input';
    row.append(input);
    if (f.hint) row.append(h('small', { className: 'devt-hint' }, f.hint));
    inputs.push({ f, input });
    return row;
  }

  function commit(f, value) {
    store.set(f.path, value, true);
    game().refresh && game().refresh();
    render();
    say('Set ' + f.path + ' = ' + value);
  }

  /* --- slots + import/export (this is what replaces "test accounts") --- */
  const saveSec = section('Save slots', 'Named local states. Share a save by pasting its JSON.');
  const slotRow = h('div', { className: 'devt-acts' });
  const slotName = h('input', { className: 'devt-input devt-slotname', type: 'text',
    placeholder: 'slot name' });
  const slotPick = h('select', { className: 'devt-input' });
  const saveBtn = h('button', { className: 'devt-btn', type: 'button' }, 'Save');
  const loadBtn = h('button', { className: 'devt-btn', type: 'button' }, 'Load');
  const delBtn  = h('button', { className: 'devt-btn', type: 'button' }, 'Delete');

  saveBtn.addEventListener('click', () => {
    const n = slotName.value.trim();
    if (!n) return say('Name the slot first.');
    store.saveSlot(n); renderSlots(); say('Saved slot "' + n + '"');
  });
  loadBtn.addEventListener('click', () => {
    if (!slotPick.value) return;
    store.loadSlot(slotPick.value, true);
    game().refresh && game().refresh(); render();
    say('Loaded slot "' + slotPick.value + '"');
  });
  delBtn.addEventListener('click', () => {
    if (!slotPick.value) return;
    const n = slotPick.value;
    store.deleteSlot(n); renderSlots(); say('Deleted slot "' + n + '"');
  });
  slotRow.append(slotName, saveBtn, slotPick, loadBtn, delBtn);
  saveSec.append(slotRow);

  const json = h('textarea', { className: 'devt-json', spellcheck: false, rows: 6 });
  const jsonRow = h('div', { className: 'devt-acts' });
  const dumpBtn = h('button', { className: 'devt-btn', type: 'button' }, 'Export →');
  const loadJsonBtn = h('button', { className: 'devt-btn', type: 'button' }, '← Import');
  const copyBtn = h('button', { className: 'devt-btn', type: 'button' }, 'Copy');
  const resetBtn = h('button', { className: 'devt-btn devt-danger', type: 'button' }, 'Reset save');

  dumpBtn.addEventListener('click', () => { json.value = store.export(); say('Exported.'); });
  loadJsonBtn.addEventListener('click', () => {
    try {
      store.import(json.value, true);
      game().refresh && game().refresh(); render();
      say('Imported.');
    } catch (e) { say('Bad JSON: ' + e.message); }
  });
  copyBtn.addEventListener('click', async () => {
    json.value = store.export();
    try { await navigator.clipboard.writeText(json.value); say('Copied to clipboard.'); }
    catch (e) { json.select(); say('Select + copy manually.'); }
  });
  resetBtn.addEventListener('click', () => {
    store.reset(true); game().refresh && game().refresh(); render(); say('Save reset to defaults.');
  });
  jsonRow.append(dumpBtn, loadJsonBtn, copyBtn, resetBtn);
  saveSec.append(jsonRow, json);

  /* ---------- render ---------- */

  function renderSlots() {
    const cur = slotPick.value;
    slotPick.textContent = '';
    const names = store.slots();
    if (!names.length) slotPick.append(h('option', { value: '' }, '— no slots —'));
    names.forEach((n) => slotPick.append(h('option', { value: n }, n)));
    if (names.includes(cur)) slotPick.value = cur;
  }

  function render() {
    inputs.forEach(({ f, input }) => {
      const v = store.get(f.path);
      if (f.type === 'bool') input.checked = !!v;
      else input.value = v == null ? '' : String(v);
    });
    ribbon.classList.toggle('is-touched', !!store.get('meta.devTouched'));
    panel.classList.toggle('is-touched', !!store.get('meta.devTouched'));
  }

  let sayTimer;
  function say(msg) {
    status.textContent = msg + (store.get('meta.devTouched') ? '  ·  SAVE IS DEV-TOUCHED' : '');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      status.textContent = store.get('meta.devTouched')
        ? 'SAVE IS DEV-TOUCHED — exclude from balance data'
        : 'Clean save.';
    }, 2600);
  }

  function toggle(force) {
    panel.hidden = force == null ? !panel.hidden : !force;
    if (!panel.hidden) { render(); renderSlots(); }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '`' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      e.preventDefault();
      toggle();
    }
    if (e.key === 'Escape' && !panel.hidden) toggle(false);
  });

  document.body.append(ribbon, panel);
  renderSlots();
  render();
  say(store.get('meta.devTouched') ? 'SAVE IS DEV-TOUCHED' : 'Clean save.');

  window.FR.dev = { store, warps: WARPS, toggle, panel };
  console.info('%c[FALSE REALITY] Maintenance Terminal loaded — press ` to open.',
    'color:#ffc66b');
})();
