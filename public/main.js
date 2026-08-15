import { CHARACTERS, baseLibrary, styleLibrary } from '../src/characters.js';
import {
  ARENA_SIZE, MAX_FORCE, startEncounter, resolveBeat, playerAttack,
  threatSpaces, intentThreatens, nearestEnemy, canUseFinisher, projectedSpace,
} from '../src/combat.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, currentEncounter,
  rewardOptions, takeReward, advance, loseRun, ENCOUNTERS,
} from '../src/run.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['select', 'combat', 'reward', 'end'];
const show = (n) => SCREENS.forEach((s) => $(`screen-${s}`).classList.toggle('hidden', s !== n));

let run, state, sel = { base: null, style: null, finisher: null },
    targetUid = null, ante = false, logMark = 0, shieldPolicy = 'ask';

// ============================================================ character select

function renderSelect() {
  const box = $('charpick');
  box.innerHTML = '';
  for (const c of CHARACTERS) {
    const el = document.createElement('div');
    el.className = 'charcard';
    el.innerHTML = `
      <div class="charhead">
        <span class="charname">${c.name}</span>
        <span class="charepi">${c.epithet}</span>
        <span class="chardiff ${c.difficulty.toLowerCase()}">${c.difficulty}</span>
      </div>
      <div class="charstats">Life ${c.life}${c.tokens ? ` · ${c.tokens.max} ${c.tokens.name} tokens` : ' · no tokens'}</div>
      <div class="charblurb">${c.blurb}</div>
      <ul class="charprimer">${c.primer.map((p) => `<li>${p}</li>`).join('')}</ul>`;
    el.onclick = () => beginRun(c.id);
    box.appendChild(el);
  }
  show('select');
}

// ============================================================ run flow

function beginRun(charId) {
  run = newRun(charId);
  startNode();
}

function startNode() {
  const enc = currentEncounter(run);
  resetPiles(run);
  state = startEncounter(run, enc);
  state.force = run.force || 0;
  sel = { base: null, style: null, finisher: null };
  targetUid = null; ante = false; logMark = 0;
  $('log').innerHTML = '';
  $('enc-name').textContent = enc.name;
  $('enc-blurb').textContent = enc.blurb;
  show('combat');
  paintLog();
  render();
}

// ============================================================ render

function chosenAttack() {
  if (sel.finisher) return playerAttack(state.char, sel.finisher, null);
  if (sel.base) return playerAttack(state.char, sel.base, sel.style);
  return null;
}
const ready = () => !!(sel.finisher || (sel.base && sel.style));

function render() {
  const p = state.player;
  $('life-fill').style.width = `${Math.max(0, p.life) / p.maxLife * 100}%`;
  $('life-num').textContent = `${Math.max(0, p.life)}/${p.maxLife}`;
  $('force-fill').style.width = `${state.force / MAX_FORCE * 100}%`;
  $('force-num').textContent = `${state.force}/${MAX_FORCE}`;

  $('node-pips').innerHTML = ENCOUNTERS.map((_, i) =>
    `<span class="pip ${i < run.node ? 'done' : i === run.node ? 'now' : ''}"></span>`).join('');

  renderTokens();
  renderAnte();
  renderIntents();
  renderBoard();
  renderPreview();
  renderHand();
  renderTargets();
  $('btn-resolve').disabled = !ready() || state.over;
}

function renderTokens() {
  const box = $('tokens');
  const t = state.char.tokens;
  if (!t) { box.innerHTML = ''; return; }
  let html = `<span class="tlabel">${t.name.toUpperCase()}</span>`;
  for (let i = 0; i < t.max; i++)
    html += `<span class="shield ${i < state.player.tokens ? '' : 'spent'}"></span>`;
  box.innerHTML = html;
}

function renderAnte() {
  const row = $('anterow');
  const t = state.char.tokens;
  if (!t) { row.innerHTML = ''; row.className = 'anterow'; return; }
  const have = state.player.tokens;
  row.className = 'anterow' + (ante ? ' on' : '');
  row.innerHTML = `
    <button class="antebtn ${ante ? 'on' : ''}" id="btn-ante" ${have ? '' : 'disabled'}>
      ${ante ? '✓ Shield anted' : 'Ante a Shield'}
    </button>
    <span class="antenote">
      ${ante
        ? '<b>Stun Immunity this beat</b> — nothing can cancel your attack.'
        : have
          ? `Spend 1 of ${have} for <b>Stun Immunity</b>, or hold it to negate a hit reactively.`
          : 'No Shields left — you are relying on Soak now.'}
    </span>`;
  const b = $('btn-ante');
  if (b) b.onclick = () => { ante = !ante; render(); };
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
    if (dead) {
      div.innerHTML = `<span class="who">${e.name}</span><span class="fx">destroyed</span>`;
    } else {
      const pills =
        (i.soak ? `<span class="soakpill">SOAK ${i.soak}</span>` : '') +
        (i.stunGuard ? `<span class="sgpill">SG ${i.stunGuard}</span>` : '') +
        (i.stunImmune ? `<span class="immpill">STUN IMMUNE</span>` : '');
      div.innerHTML = `
        <span class="who">${e.name} <span class="hp">${Math.max(0, e.life)}/${e.maxLife}</span></span>
        <span class="move">${i.name}</span>
        <span class="nums">R <b>${i.range[0]}~${i.range[1]}</b> · POW <b>${i.power}</b> · PRI <b>${i.priority}</b></span>
        ${pills}
        <span class="fx">${i.text || ''}</span>
        <span class="${inc ? 'warn' : 'safe'}">${inc ? '⚠ WILL HIT YOU' : 'out of reach'}</span>`;
    }
    box.appendChild(div);
  }
}

function renderBoard() {
  const board = $('board');
  board.innerHTML = '';
  const atk = chosenAttack();
  const tgt = state.enemies.find((e) => e.uid === targetUid && e.life > 0) || nearestEnemy(state);
  const myFrom = atk && tgt ? projectedSpace(state, state.player, atk, tgt.space) : state.player.space;
  const mine = atk ? threatSpaces(myFrom, atk) : [];

  const theirs = new Set();
  for (const e of state.enemies) {
    if (e.life <= 0) continue;
    const from = projectedSpace(state, e, e.intent, state.player.space);
    for (const sp of threatSpaces(from, e.intent)) theirs.add(sp);
  }

  for (let i = 1; i <= ARENA_SIZE; i++) {
    const d = document.createElement('div');
    const t = mine.includes(i), dg = theirs.has(i);
    d.className = 'space' + (t && dg ? ' both' : t ? ' threat' : dg ? ' danger' : '');
    d.innerHTML = `<span class="idx">${i}</span>`;
    if (state.player.space === i) {
      d.innerHTML += `<div class="token you${ante ? ' immune' : ''}">${state.char.name.slice(0, 3).toUpperCase()}</div>`;
    }
    const e = state.enemies.find((x) => x.life > 0 && x.space === i);
    if (e) {
      const el = document.createElement('div');
      el.className = `token foe${targetUid === e.uid ? ' target' : ''}`;
      el.textContent = e.glyph;
      el.innerHTML += `<span class="mini">${Math.max(0, e.life)}</span>`;
      el.onclick = () => { targetUid = e.uid; render(); };
      d.appendChild(el);
    }
    board.appendChild(d);
  }
}

function renderPreview() {
  const atk = chosenAttack();
  if (!atk) {
    $('preview').innerHTML = sel.base
      ? 'Now pick a <b>Style</b> to combine with it.'
      : 'Choose a <b>Base</b> and a <b>Style</b>.';
    return;
  }
  const tgt = state.enemies.find((e) => e.uid === targetUid && e.life > 0) || nearestEnemy(state);
  const from = tgt ? projectedSpace(state, state.player, atk, tgt.space) : state.player.space;
  const dist = tgt ? Math.abs(from - tgt.space) : null;
  const hits = dist !== null && dist >= atk.range[0] && dist <= atk.range[1] && !atk.isDash;
  const pri = atk.priority + (state.player.priorityBonusNext || 0);

  // what gets through to me, given this attack's Soak
  let incoming = 0, stunRisk = false;
  for (const e of state.enemies) {
    if (e.life <= 0 || !intentThreatens(state, e)) continue;
    const dmg = Math.max(0, e.intent.power - atk.soak);
    incoming += dmg;
    const immune = atk.stunImmune || ante;
    if (dmg > 0 && !immune && atk.stunGuard < dmg) stunRisk = true;
  }
  const faster = state.enemies.filter((e) => e.life > 0 && e.intent.priority > pri).length;

  $('preview').innerHTML = `
    <span class="pname">${atk.name}</span>
    <span class="stat"><i>RANGE</i> ${atk.range[0]}~${atk.range[1]}</span>
    <span class="stat"><i>POWER</i> ${atk.power}</span>
    <span class="stat"><i>PRIORITY</i> ${pri}</span>
    ${atk.soak ? `<span class="soakpill">SOAK ${atk.soak}</span>` : ''}
    ${atk.stunGuard ? `<span class="sgpill">STUN GUARD ${atk.stunGuard}</span>` : ''}
    ${(atk.stunImmune || ante) ? `<span class="immpill">STUN IMMUNE</span>` : ''}
    <div class="verdict ${hits ? 'good' : 'bad'}">
      ${atk.isDash ? 'Dash deals no damage — pure repositioning.'
        : tgt ? (hits ? `Connects with ${tgt.name} at distance ${dist}.`
                      : `Will NOT reach ${tgt.name} (distance ${dist}).`)
              : 'No target.'}
    </div>
    <div class="verdict" style="color:${incoming ? (stunRisk ? 'var(--danger)' : 'var(--dim)') : 'var(--green)'}">
      ${incoming
        ? `Incoming ${incoming} damage after Soak. ${stunRisk
            ? '⚠ Enough to STUN you — your attack would be cancelled.'
            : 'Not enough to stun you.'}`
        : 'Nothing reaches you this beat.'}
      ${faster ? ` ${faster} enemy act${faster > 1 ? '' : 's'} before you.` : ' You act first.'}
    </div>
    <div class="verdict" style="color:var(--dim2)">${atk.text}</div>`;
}

const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
const highlight = (t) => (t || '')
  .replace(/Soak (\d+)/g, '<span class="kw">Soak $1</span>')
  .replace(/Stun Guard (\d+)/g, '<span class="kw">Stun Guard $1</span>')
  .replace(/Stun Immunity/g, '<span class="kw">Stun Immunity</span>');

function renderHand() {
  const h = currentHand(run);
  const B = baseLibrary(state.char), S = styleLibrary(state.char);

  const rowB = $('hand-bases'); rowB.innerHTML = '';
  for (const id of h.bases) {
    const c = B[id];
    rowB.appendChild(cardEl(c, sel.base === id && !sel.finisher,
      `R ${c.range[0]}~${c.range[1]} · POW ${c.power} · PRI ${c.priority}`,
      () => { sel.base = sel.base === id ? null : id; sel.finisher = null; render(); }));
  }

  const rowS = $('hand-styles'); rowS.innerHTML = '';
  for (const id of h.styles) {
    const c = S[id];
    rowS.appendChild(cardEl(c, sel.style === id,
      `R ${fmt(c.dRange[0])}~${fmt(c.dRange[1])} · POW ${fmt(c.dPower)} · PRI ${fmt(c.dPriority)}`,
      () => { sel.style = sel.style === id ? null : id; render(); },
      sel.finisher ? 'locked' : ''));
  }

  const rowF = $('hand-finishers'); rowF.innerHTML = '';
  const unlocked = canUseFinisher(state);
  for (const id of h.finishers) {
    const c = B[id];
    const el = cardEl(c, sel.finisher === id,
      `R ${c.range[0]}~${c.range[1]} · POW ${c.power} · PRI ${c.priority}`,
      unlocked ? () => {
        sel.finisher = sel.finisher === id ? null : id;
        if (sel.finisher) { sel.base = null; sel.style = null; }
        render();
      } : null,
      `finisher${unlocked ? '' : ' locked'}`);
    if (!unlocked) {
      const need = state.player.life - state.force;
      el.innerHTML += `<div class="lockmsg">Needs Force ≥ Life — ${need} more Force (or take some damage).</div>`;
    }
    rowF.appendChild(el);
  }
}

function cardEl(c, selected, stats, onClick, extra = '') {
  const el = document.createElement('div');
  el.className = `card ${selected ? 'sel' : ''} ${extra}`;
  el.innerHTML = `<div class="cname">${c.name}</div>
    <div class="cstats">${stats}</div>
    <div class="ctext">${highlight(c.text)}</div>`;
  if (onClick) el.onclick = onClick;
  return el;
}

function renderTargets() {
  const alive = state.enemies.filter((e) => e.life > 0);
  if (alive.length <= 1) { $('targetsel').innerHTML = ''; return; }
  const t = alive.find((e) => e.uid === targetUid) || nearestEnemy(state);
  $('targetsel').innerHTML = `Target: <b>${t ? t.name : '—'}</b> · click an enemy to switch`;
}

function paintLog() {
  const box = $('log');
  for (const line of state.log.slice(logMark)) {
    const d = document.createElement('div');
    if (line.startsWith('—')) d.className = 'turn';
    if (/cleared|falls|destroyed|STUNNED|Shield/.test(line)) d.className = 'big';
    d.textContent = line;
    box.appendChild(d);
  }
  logMark = state.log.length;
  box.scrollTop = box.scrollHeight;
}

// ============================================================ resolve

$('btn-resolve').onclick = () => {
  if (!ready() || state.over) return;
  const baseId = sel.finisher || sel.base;
  const styleId = sel.finisher ? null : sel.style;

  // Reactive shields: ask only when it actually matters, so the prompt stays
  // meaningful instead of nagging every beat.
  const policy = decideShieldPolicy(baseId, styleId);
  finishBeat(baseId, styleId, policy);
};

/**
 * Preview the beat with shields OFF. If that would be lethal and we have a
 * token, ask the player. Otherwise resolve directly.
 */
function decideShieldPolicy(baseId, styleId) {
  if (!state.char.tokens || state.player.tokens <= 0) return 'never';
  const sim = {
    ...state, log: [],
    player: { ...state.player }, enemies: state.enemies.map((e) => ({ ...e })),
  };
  resolveBeat(sim, { baseId, styleId, targetUid, ante, autoShield: 'never' });
  return sim.player.life <= 0 ? 'ask' : 'never';
}

function finishBeat(baseId, styleId, policy) {
  if (policy === 'ask') {
    $('shield-text').textContent =
      `This beat would be lethal. Spend a Shield to negate the blow entirely? ` +
      `You have ${state.player.tokens}.`;
    $('shield-modal').classList.remove('hidden');
    $('shield-yes').onclick = () => {
      $('shield-modal').classList.add('hidden');
      commit(baseId, styleId, 'lethal');
    };
    $('shield-no').onclick = () => {
      $('shield-modal').classList.add('hidden');
      commit(baseId, styleId, 'never');
    };
    return;
  }
  commit(baseId, styleId, policy);
}

function commit(baseId, styleId, autoShield) {
  resolveBeat(state, { baseId, styleId, targetUid, ante, autoShield });
  cyclePlay(run, baseId, styleId);
  run.force = state.force;
  sel = { base: null, style: null, finisher: null };
  ante = false;
  if (!state.enemies.some((e) => e.uid === targetUid && e.life > 0)) targetUid = null;
  paintLog();
  render();
  if (state.over) setTimeout(endEncounter, 600);
}

function endEncounter() {
  if (!state.victory) { loseRun(run); return endScreen(); }
  advance(run, state);
  if (run.over) return endScreen();
  showRewards();
}

function showRewards() {
  const box = $('rewards');
  box.innerHTML = '';
  $('reward-sub').textContent =
    `${run.cleared} of ${ENCOUNTERS.length} cleared · ${run.life} life · ` +
    `${run.tokens} shields · next: ${currentEncounter(run).name}`;
  for (const opt of rewardOptions(run)) {
    const el = document.createElement('div');
    el.className = 'reward';
    el.innerHTML = `<div class="rkind">Upgrade</div>
      <div class="rname">${opt.name}</div>
      <div class="rtext">${opt.text}</div>`;
    el.onclick = () => { takeReward(run, opt); startNode(); };
    box.appendChild(el);
  }
  show('reward');
}

function endScreen() {
  $('end-title').textContent = run.won ? 'The Warden falls' : 'The run ends';
  $('end-title').className = run.won ? 'won' : '';
  $('end-sub').textContent = run.won
    ? `${run.char.name} cleared all ${ENCOUNTERS.length} encounters with ${run.life} life left.`
    : `${run.char.name} cleared ${run.cleared} of ${ENCOUNTERS.length} encounters.`;
  $('end-deck').innerHTML =
    `<b>Character:</b> ${run.char.name}, ${run.char.epithet}<br>
     <b>Upgrades:</b> ${(run.takenUpgrades || []).join(', ') || 'none'}<br>
     <b>Seed:</b> ${run.seed}`;
  show('end');
}

$('btn-again').onclick = renderSelect;
renderSelect();
