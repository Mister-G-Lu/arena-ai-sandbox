import {
  ARENA_SIZE, START_LIFE, BASE_BY_ID, STYLE_BY_ID,
  combine, newGame, resolveTurn, hand, chooseAI,
} from '../src/engine.js';

let g, selBase = null, selStyle = null;

const $ = (id) => document.getElementById(id);

function start() {
  g = newGame({ seed: (Math.random() * 1e9) | 0, names: ['You', 'Rival'] });
  selBase = selStyle = null;
  $('log').innerHTML = '';
  render();
}

function render() {
  const [me, foe] = g.players;

  $('life0').textContent = Math.max(0, me.life);
  $('life1').textContent = Math.max(0, foe.life);
  $('life0-fill').style.width = `${Math.max(0, me.life) / START_LIFE * 100}%`;
  $('life1-fill').style.width = `${Math.max(0, foe.life) / START_LIFE * 100}%`;
  $('distance').textContent = `distance ${Math.abs(me.space - foe.space)}`;

  // board + threat range preview
  const atk = selBase && selStyle
    ? combine(BASE_BY_ID[selBase], STYLE_BY_ID[selStyle]) : null;
  const board = $('board');
  board.innerHTML = '';
  for (let i = 1; i <= ARENA_SIZE; i++) {
    const d = document.createElement('div');
    d.className = 'space';
    if (atk) {
      const dist = Math.abs(i - me.space);
      if (dist >= atk.range[0] && dist <= atk.range[1] && i !== me.space)
        d.classList.add('threat');
    }
    d.innerHTML = `<span class="idx">${i}</span>`;
    if (me.space === i) d.innerHTML += '<div class="token you">YOU</div>';
    if (foe.space === i) d.innerHTML += '<div class="token foe">RIV</div>';
    board.appendChild(d);
  }

  $('preview').innerHTML = atk
    ? `<b>${atk.name}</b> &nbsp; <span class="stat">Range ${atk.range[0]}~${atk.range[1]}</span>
       <span class="stat">Att ${atk.att}</span><span class="stat">Spd ${atk.spd}</span>
       ${atk.guard ? `<span class="stat">Guard ${atk.guard}</span>` : ''}
       <br>${atk.text}`
    : 'Select a base and a style.';

  const h = hand(me);
  drawRow('bases', h.bases.map((id) => BASE_BY_ID[id]), 'base');
  drawRow('styles', h.styles.map((id) => STYLE_BY_ID[id]), 'style');

  $('go').disabled = !(selBase && selStyle) || g.winner !== null;
}

function drawRow(elId, cards, kind) {
  const row = $(elId);
  row.innerHTML = '';
  for (const c of cards) {
    const sel = kind === 'base' ? selBase === c.id : selStyle === c.id;
    const el = document.createElement('div');
    el.className = 'card' + (sel ? ' sel' : '');
    const stats = kind === 'base'
      ? `Rng ${c.range[0]}~${c.range[1]} · Att ${c.att} · Spd ${c.spd}`
      : `Rng +${c.dRange[0]}~${c.dRange[1]} · Att ${fmt(c.dAtt)} · Spd ${fmt(c.dSpd)}`;
    el.innerHTML = `<div class="cname">${c.name}</div>
      <div class="cstats">${stats}</div><div class="ctext">${c.text}</div>`;
    el.onclick = () => {
      if (kind === 'base') selBase = sel ? null : c.id;
      else selStyle = sel ? null : c.id;
      render();
    };
    row.appendChild(el);
  }
}
const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

function paintLog(from) {
  const box = $('log');
  for (const line of g.log.slice(from)) {
    const d = document.createElement('div');
    if (line.startsWith('—')) d.className = 'turn';
    if (line.includes('wins') || line.includes('draw')) d.className = 'win';
    d.textContent = line;
    box.appendChild(d);
  }
  box.scrollTop = box.scrollHeight;
}

$('go').onclick = () => {
  const from = g.log.length;
  const ai = chooseAI(g, 1);
  resolveTurn(g, [{ baseId: selBase, styleId: selStyle }, ai]);
  selBase = selStyle = null;
  paintLog(from);
  render();
};
$('reset').onclick = start;

start();
