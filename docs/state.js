/* FALSE REALITY — game state store
   Ships in production. The dev terminal reads its SCHEMA to build itself, so any
   quality added here shows up in the menu automatically. */
(() => {
  'use strict';

  const KEY = 'fr.save.v1';
  const SLOT_PREFIX = 'fr.slot.';

  /* ---------- schema ----------
     Each field: { path, label, type, min, max, step, options, hint, hidden }
     `hidden: true` = never shown to the player (Attention — Draft 04 §9.1),
     but always shown in the dev terminal. */

  const ZONE_STATES = ['locked', 'found', 'open', 'cleared', 'closed'];

  const SCHEMA = [
    { group: 'Shift', fields: [
      { path: 'shift.day',      label: 'Shift day',      type: 'int',  min: 1, max: 60 },
      { path: 'shift.arc',      label: 'Arc',            type: 'enum', options: [1, 2, 3] },
      { path: 'shift.tasks',    label: 'Tasks remaining',type: 'int',  min: 0, max: 50 },
      { path: 'shift.minutes',  label: 'Clock (minutes)',type: 'int',  min: 60, max: 360, step: 6,
        hint: '60 = 01:00, 360 = 06:00' }
    ]},
    { group: 'Qualities', fields: [
      { path: 'qualities.perception', label: 'Perception', type: 'int', min: 0, max: 10 },
      { path: 'qualities.doubt',      label: 'Doubt',      type: 'int', min: 0, max: 10 },
      { path: 'qualities.attention',  label: 'Attention',  type: 'int', min: 0, max: 10, hidden: true,
        hint: 'hidden from players — diegetic only' },
      { path: 'qualities.salary',     label: 'Salary',     type: 'int', min: 0, max: 9999, step: 10 }
    ]},
    { group: 'Components', fields: [
      { path: 'components.nullKey', label: 'NULL KEY', type: 'bool' },
      { path: 'components.lens',    label: 'LENS',     type: 'bool' },
      { path: 'components.wire',    label: 'WIRE',     type: 'bool' },
      { path: 'components.crystal', label: 'CRYSTAL',  type: 'bool' },
      { path: 'components.chip',    label: 'CHIP',     type: 'bool' },
      { path: 'components.sixth',   label: 'THE SIXTH',type: 'bool' }
    ]},
    { group: 'Zones', fields: [
      { path: 'zones.floor12',  label: 'Floor 12',        type: 'enum', options: ZONE_STATES },
      { path: 'zones.records',  label: 'Records Basement',type: 'enum', options: ZONE_STATES },
      { path: 'zones.vents',    label: 'Vent Network',    type: 'enum', options: ZONE_STATES },
      { path: 'zones.rooftop',  label: 'Rooftop Array',   type: 'enum', options: ZONE_STATES },
      { path: 'zones.offmap',   label: 'Off-Map Sectors', type: 'enum', options: ZONE_STATES },
      { path: 'zones.interim',  label: 'The Interim',     type: 'enum', options: ZONE_STATES }
    ]},
    { group: 'Checklist', fields: [
      { path: 'checklist.form',   label: 'The Form',   type: 'bool' },
      { path: 'checklist.name',   label: 'The Name',   type: 'bool' },
      { path: 'checklist.sixth',  label: 'The Sixth',  type: 'bool' },
      { path: 'checklist.signal', label: 'The Signal', type: 'bool' },
      { path: 'checklist.hour',   label: 'The Hour',   type: 'bool' }
    ]},
    { group: 'Death', fields: [
      { path: 'death.count',         label: 'Deaths',        type: 'int', min: 0, max: 4 },
      { path: 'death.scars',         label: 'Patch scars',   type: 'int', min: 0, max: 8 },
      { path: 'death.discrepancies', label: 'Next Reinstatement', type: 'int', min: 3, max: 9,
        hint: 'discrepancies to reconcile' }
    ]},
    { group: 'Toggles', fields: [
      { path: 'toggles.glitchRate', label: 'Glitch rate', type: 'float', min: 0, max: 1, step: 0.02,
        hint: 'chance per task (default 0.06)' },
      { path: 'toggles.ambientFx',  label: 'Ambient FX',  type: 'bool' },
      { path: 'toggles.godMode',    label: 'God mode',    type: 'bool', hint: 'refuse all deaths' },
      { path: 'toggles.fastClock',  label: 'Fast clock',  type: 'bool', hint: 'tasks burn 5x time' },
      { path: 'toggles.lensView',   label: 'Lens view',   type: 'bool', hint: 'show storylet metadata' }
    ]}
  ];

  const defaults = () => ({
    shift: { day: 4, arc: 1, tasks: 50, minutes: 60 },
    qualities: { perception: 1, doubt: 0, attention: 0, salary: 0 },
    components: { nullKey: false, lens: false, wire: false, crystal: false, chip: false, sixth: false },
    zones: { floor12: 'locked', records: 'locked', vents: 'locked',
             rooftop: 'locked', offmap: 'locked', interim: 'locked' },
    checklist: { form: false, name: false, sixth: false, signal: false, hour: false },
    death: { count: 0, scars: 0, discrepancies: 3 },
    toggles: { glitchRate: 0.06, ambientFx: true, godMode: false, fastClock: false, lensView: false },
    meta: { devTouched: false, version: 1 }
  });

  /* ---------- path helpers ---------- */

  const get = (obj, path) =>
    path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

  function set(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
    target[last] = value;
  }

  function deepMerge(base, patch) {
    for (const [k, v] of Object.entries(patch || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        base[k] = deepMerge(base[k] && typeof base[k] === 'object' ? base[k] : {}, v);
      } else {
        base[k] = v;
      }
    }
    return base;
  }

  /* ---------- store ---------- */

  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return deepMerge(defaults(), JSON.parse(raw));
    } catch (e) {
      return defaults();
    }
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function emit(reason) {
    persist();
    listeners.forEach((fn) => { try { fn(state, reason); } catch (e) { console.error(e); } });
  }

  const store = {
    SCHEMA,
    ZONE_STATES,
    get state() { return state; },
    get(path) { return get(state, path); },

    /** Set one field. `dev` marks the save as dev-touched forever. */
    set(path, value, dev) {
      set(state, path, value);
      if (dev) state.meta.devTouched = true;
      emit('set:' + path);
    },

    /** Apply a nested patch (used by warps). */
    patch(obj, dev) {
      deepMerge(state, obj);
      if (dev) state.meta.devTouched = true;
      emit('patch');
    },

    reset(dev) {
      state = defaults();
      if (dev) state.meta.devTouched = true;
      emit('reset');
    },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    export() { return JSON.stringify(state, null, 2); },
    import(json, dev) {
      const parsed = JSON.parse(json);
      state = deepMerge(defaults(), parsed);
      if (dev) state.meta.devTouched = true;
      emit('import');
      return state;
    },

    /* named local slots — these replace "test accounts" entirely */
    slots() {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(SLOT_PREFIX))
        .map((k) => k.slice(SLOT_PREFIX.length))
        .sort();
    },
    saveSlot(name) { localStorage.setItem(SLOT_PREFIX + name, JSON.stringify(state)); },
    loadSlot(name, dev) {
      const raw = localStorage.getItem(SLOT_PREFIX + name);
      if (raw) this.import(raw, dev);
    },
    deleteSlot(name) { localStorage.removeItem(SLOT_PREFIX + name); }
  };

  window.FR = window.FR || {};
  window.FR.store = store;
})();
