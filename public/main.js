import { BASE_BY_ID, STYLE_BY_ID } from '../src/cards.js';
import {
  ARENA_SIZE, startEncounter, resolveTurn, playerAttack,
  threatSpaces, intentThreatens, nearestEnemy,
} from '../src/combat.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
  rewardOptions, takeReward, advance, loseRun, ENCOUNTERS,
} from '../src/run.js';

const $ = (id) => document.getElementById(id);
const screens = ['title', 'combat', 'reward', 'end'];
const show = (name) => screens.forEach((s) =>
  $(`screen-${s}`).classList.toggle('hidden', s !== name));

let run, state, selBase = null, selStyle = null, targetUid = null, logMark = 0;

// ------------------------------------------------------------- run control

function beginRun() {
  run = newRun();
  startNode();
}

function startNode() {
  const enc = currentEncounter(run);
  resetPiles(run);
  state = startEncounter(run, enc);
  selBase = selStyle = null;
  targetUid = null;
  logMark = 0;
  $('log').innerHTML = '';
  $('enc-name').textContent = enc.name;
  $('enc-blurb').textContent = enc.blurb;
  show('combat');
  paintLog();
  render();
}

// --------------------------------------------------------------- rendering

function render() {
  const p = state.player;
  $('life-fill').style.width = `${Math.max(0, p.life) / p.maxLife * 100}%`;
  $('life-num').textContent = `${Math.max(0, p.life)}/${p.maxLife}`;

  const pips = ENCOUNTERS.map((_, i) =>
    `<span class="pip ${i < run.node ? 'done' : i === run.node ? 'now' : ''}"></span>`).join('');
  $('node-pips').innerHTML = pips;

  renderIntents();
  renderBoard();
  renderPreview();
  renderHand();
  renderTargets();

  $('btn-resolve').disabled = !(selBase && selStyle) || state.over;
}

function renderIntents() {
  const box = $('intents');
  box.innerHTML = '';
  for (const e of state.enemies) {
    const dead = e.life <= 0;
    const inc = !dead && intentThreatens(state, e);
    const i = e.intent;
    const div = document.createElement('div');
    div.className = `intent ${dead ? 'dead' : ''} ${inc ? 'incoming' : ''}`;
    const fx = [...i.before, ...i.hit, ...i.after].length ? i.text : '';
    div.innerHTML = `
      <span class="who">${e.name} <span class="hp">${Math.max(0, e.life)}/${e.maxLife}</span></span>
      ${dead ? '<span class="fx">destroyed</span>' : `
        <span class="move">${i.name}</span>
        <span class="nums">R <b>${i.range[0]}~${i.range[1]}</b> &nbsp; ATT <b>${i.att}</b> &nbsp; SPD <b>${i.spd}</b>${i.guard ? ` &nbsp; GRD <b>${i.guard}</b>` : ''}</span>
        <span class="fx">${fx}</span>
        <span class="${inc ? 'warn' : 'safe'}">${inc ? '⚠ WILL HIT YOU' : 'out of reach'}</span>
      `}`;
    box.appendChild(div);
  }
}

function renderBoard() {
  const board = $('board');
  board.innerHTML = '';
  const atk = selBase && selStyle ? playerAttack(selBase, selStyle) : null;
  const mine = atk ? threatSpaces(state.player.space, atk) : [];
  // spaces enemies will threaten, accounting for their telegraphed movement
  const theirs = new Set();
  for (const e of state.enemies) {
    if (e.life <= 0) continue;
    let from = e.space;
    for (const eff of e.intent.before) {
      const dir = state.player.space > from ? 1 : -1;
      if (eff.k === 'advance' || eff.k === 'close') from += dir * eff.max;
      if (eff.k === 'retreat') from -= dir * eff.max;
    }
    from = Math.max(1, Math.min(ARENA_SIZE, from));
    for (const sp of threatSpaces(from, e.intent)) theirs.add(sp);
  }

  for (let i = 1; i <= ARENA_SIZE; i++) {
    const d = document.createElement('div');
    const t = mine.includes(i), dg = theirs.has(i);
    d.className = 'space' + (t && dg ? ' both' : t ? ' threat' : dg ? ' danger' : '');
    d.innerHTML = `<span class="idx">${i}</span>`;
    if (state.player.space === i) {
      d.innerHTML += `<div class="token you">YOU</div>`;
    }
    const e = state.enemies.find((x) => x.life > 0 && x.space === i);
    if (e) {
      const sel = targetUid === e.uid ? ' target' : '';
      const el = document.createElement('div');
      el.className = `token foe${sel}`;
      el.textContent = e.glyph;
      el.innerHTML += `<span class="mini">${Math.max(0, e.life)}</span>`;
      el.onclick = () => { targetUid = e.uid; render(); };
      d.appendChild(el);
    }
    board.appendChild(d);
  }
}

function renderPreview() {
  if (!(selBase && selStyle)) {
    $('preview').innerHTML = 'Choose a Base and a Style.';
    return;
  }
  const a = playerAttack(selBase, selStyle);
  const tgt = state.enemies.find((e) => e.uid === targetUid && e.life > 0) || nearestEnemy(state);
  // will it connect, after my own telegraphed movement?
  let from = state.player.space;
  if (tgt) {
    for (const eff of a.before) {
      const dir = tgt.space > from ? 1 : -1;
      if (eff.k === 'advance' || eff.k === 'close') from += dir * eff.max;
      if (eff.k === 'retreat') from -= dir * eff.max;
    }
    from = Math.max(1, Math.min(ARENA_SIZE, from));
  }
  const dist = tgt ? Math.abs(from - tgt.space) : null;
  const hits = dist !== null && dist >= a.range[0] && dist <= a.range[1];
  const faster = state.enemies
    .filter((e) => e.life > 0)
    .filter((e) => e.intent.spd > a.spd).length;

  $('preview').innerHTML = `
    <span class="pname">${a.name}</span>
    <span class="stat"><i>RANGE</i> ${a.range[0]}~${a.range[1]}</span>
    <span class="stat"><i>ATT</i> ${a.att}</span>
    <span class="stat"><i>SPD</i> ${a.spd}</span>
    ${a.guard ? `<span class="stat"><i>GUARD</i> ${a.guard}</span>` : ''}
    <div class="verdict ${hits ? 'good' : 'bad'}">
      ${tgt ? (hits
        ? `Connects with ${tgt.name} at distance ${dist}.`
        : `Will NOT reach ${tgt.name} (distance ${dist}).`) : 'No target.'}
      ${faster ? ` ${faster} enemy attack${faster > 1 ? 's' : ''} resolve${faster > 1 ? '' : 's'} before yours.` : ' You strike first.'}
    </div>
    <div class="verdict" style="color:var(--dim2)">${a.text}</div>`;
}

function renderHand() {
  const h = currentHand(run);
  drawRow('hand-bases', h.bases.map((id) => BASE_BY_ID[id]), 'base');
  drawRow('hand-styles', h.styles.map((id) => STYLE_BY_ID[id]), 'style');
}

const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

function drawRow(elId, cards, kind) {
  const row = $(elId);
  row.innerHTML = '';
  for (const c of cards) {
    const sel = kind === 'base' ? selBase === c.id : selStyle === c.id;
    const el = document.createElement('div');
    el.className = 'card' + (sel ? ' sel' : '');
    const stats = kind === 'base'
      ? `R ${c.range[0]}~${c.range[1]} · ATT ${c.att} · SPD ${c.spd}${c.guard ? ` · GRD ${c.guard}` : ''}`
      : `R +${c.dRange[0]}~${c.dRange[1]} · ATT ${fmt(c.dAtt)} · SPD ${fmt(c.dSpd)}${c.dGuard ? ` · GRD ${fmt(c.dGuard)}` : ''}`;
    el.innerHTML = `<div class="cname">${c.name}</div>
      <div class="cstats">${stats}</div>
      <div class="ctext">${c.text}</div>`;
    el.onclick = () => {
      if (kind === 'base') selBase = sel ? null : c.id;
      else selStyle = sel ? null : c.id;
      render();
    };
    row.appendChild(el);
  }
}

function renderTargets() {
  const alive = state.enemies.filter((e) => e.life > 0);
  if (alive.length <= 1) { $('targetsel').innerHTML = ''; return; }
  const t = alive.find((e) => e.uid === targetUid) || nearestEnemy(state);
  $('targetsel').innerHTML = `Target: <b>${t ? t.name : '—'}</b> · click an enemy on the board to switch`;
}

function paintLog() {
  const box = $('log');
  for (const line of state.log.slice(logMark)) {
    const d = document.createElement('div');
    if (line.startsWith('—')) d.className = 'turn';
    if (/cleared|falls?|fall\b|destroyed/i.test(line)) d.className = 'big';
    d.textContent = line;
    box.appendChild(d);
  }
  logMark = state.log.length;
  box.scrollTop = box.scrollHeight;
}

// ---------------------------------------------------------------- actions

$('btn-resolve').onclick = () => {
  if (!(selBase && selStyle) || state.over) return;
  const b = selBase, s = selStyle;
  resolveTurn(state, { baseId: b, styleId: s, targetUid });
  cyclePlay(run, b, s);
  selBase = selStyle = null;
  if (state.enemies.every((e) => e.uid !== targetUid || e.life <= 0)) targetUid = null;
  paintLog();
  render();
  if (state.over) setTimeout(() => finishEncounter(), 550);
};

function finishEncounter() {
  if (!state.victory) {
    loseRun(run);
    return endScreen();
  }
  advance(run, state.player.life);
  if (run.over) return endScreen();
  showRewards();
}

function showRewards() {
  const box = $('rewards');
  box.innerHTML = '';
  $('reward-sub').textContent =
    `${run.cleared} of ${ENCOUNTERS.length} cleared · ${run.life} life · next: ${currentEncounter(run).name}`;
  for (const opt of rewardOptions(run)) {
    const el = document.createElement('div');
    el.className = 'reward';
    if (opt.kind === 'heal') {
      el.innerHTML = `<div class="rkind">Recover</div>
        <div class="rname">Bind your wounds</div>
        <div class="rstats">Heal ${opt.amount} (currently ${run.life}/${run.maxLife})</div>`;
    } else {
      const c = opt.card;
      const stats = opt.kind === 'base'
        ? `R ${c.range[0]}~${c.range[1]} · ATT ${c.att} · SPD ${c.spd}`
        : `R +${c.dRange[0]}~${c.dRange[1]} · ATT ${fmt(c.dAtt)} · SPD ${fmt(c.dSpd)}`;
      el.innerHTML = `<div class="rkind">New ${opt.kind}</div>
        <div class="rname">${c.name}</div>
        <div class="rstats">${stats}</div>
        <div class="rtext">${c.text}</div>`;
    }
    el.onclick = () => { takeReward(run, opt); startNode(); };
    box.appendChild(el);
  }
  show('reward');
}

function endScreen() {
  $('end-title').textContent = run.won ? 'The Warden falls' : 'The run ends';
  $('end-title').className = run.won ? 'won' : '';
  $('end-sub').textContent = run.won
    ? `You cleared all ${ENCOUNTERS.length} encounters with ${run.life} life remaining.`
    : `You cleared ${run.cleared} of ${ENCOUNTERS.length} encounters.`;
  $('end-deck').innerHTML =
    `<b>Bases:</b> ${run.deck.bases.map((b) => BASE_BY_ID[b].name).join(', ')}<br>
     <b>Styles:</b> ${run.deck.styles.map((s) => STYLE_BY_ID[s].name).join(', ')}<br>
     <b>Seed:</b> ${run.seed}`;
  show('end');
}

$('btn-start').onclick = beginRun;
$('btn-again').onclick = beginRun;

show('title');
