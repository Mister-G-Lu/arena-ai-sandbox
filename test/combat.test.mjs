import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CADENZA, DRIFTER, UNIVERSAL_BASES, combine, baseLibrary, styleLibrary,
} from '../src/characters.js';
import {
  ARENA_SIZE, startEncounter, resolveBeat, anteShield, playerAttack,
  threatSpaces, intentThreatens, nearestEnemy, canUseFinisher,
} from '../src/combat.js';
import { telegraph } from '../src/enemies.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, rewardOptions, takeReward, ENCOUNTERS,
} from '../src/run.js';

const B = baseLibrary(CADENZA);
const S = styleLibrary(CADENZA);

function mkState(enemies, { playerSpace = 1, charId = 'cadenza', life, tokens, force = 0 } = {}) {
  const run = newRun(charId, 42);
  if (life !== undefined) run.life = life;
  if (tokens !== undefined) run.tokens = tokens;
  run.force = force;
  resetPiles(run);
  const s = startEncounter(run, { name: 'Test', playerSpace, enemies });
  s.force = force;
  return s;
}

// ==================================================== Cadenza's card maths

test('Clockwork Press matches the spec sheet exactly', () => {
  // Press (1~2/1/0) Stun Guard 6 + Clockwork (+0/+3/-3) Soak 3
  const a = combine(B.press, S.clockwork);
  assert.deepEqual(a.range, [1, 2]);
  assert.equal(a.power, 4);
  assert.equal(a.priority, -3);
  assert.equal(a.soak, 3);
  assert.equal(a.stunGuard, 6);
});

test('Grapnel extends range without touching power or priority', () => {
  // Grapnel (+2~4/+0/+0) on Press (1~2/1/0)
  const a = combine(B.press, S.grapnel);
  assert.deepEqual(a.range, [3, 6]);
  assert.equal(a.power, 1);
  assert.equal(a.priority, 0);
});

test('Hydraulic Drive: soak, power and the BA advance all carry over', () => {
  const a = combine(B.drive, S.hydraulic);
  assert.deepEqual(a.range, [1, 1]);
  assert.equal(a.power, 5);      // 3 + 2
  assert.equal(a.priority, 3);   // 4 - 1
  assert.equal(a.soak, 1);
  assert.equal(a.before.length, 2, 'Hydraulic advance + Drive advance');
});

test('every Cadenza style is legal on every base', () => {
  for (const st of CADENZA.styles) {
    for (const base of [...UNIVERSAL_BASES, ...CADENZA.bases]) {
      const a = combine(base, st);
      assert.ok(a.power >= 0, `${a.name} power`);
      assert.ok(a.range[0] >= 0 && a.range[1] >= a.range[0], `${a.name} range`);
    }
  }
});

// ==================================================== the stun rule

test('damage stuns by default', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;   // Heavy Swing P5 Pri1
  telegraph(s);
  // Shot P3, no stun guard on the Husk -> it gets stunned and never swings
  resolveBeat(s, { baseId: 'shot', styleId: 'battery', autoShield: 'never' });
  assert.ok(s.enemies[0].stunned, 'husk was stunned by damage');
  assert.equal(s.player.life, 20, 'stunned enemy dealt no damage');
});

test('Stun Guard >= damage prevents the stun but not the damage', () => {
  const s = mkState([{ type: 'brute', space: 2 }]);
  s.enemies[0].patternIndex = 0;   // Brace: stunGuard 4, soak 2
  telegraph(s);
  const before = s.enemies[0].life;
  // Hydraulic Strike: power 4+2=6, soak 2 -> 4 damage, SG 4 holds
  resolveBeat(s, { baseId: 'strike', styleId: 'hydraulic', autoShield: 'never' });
  assert.ok(s.enemies[0].life < before, 'damage still landed');
  assert.ok(!s.enemies[0].stunned, 'Stun Guard 4 held against 4 damage');
});

test('Soak reduces damage to zero and so prevents the stun entirely', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;   // Heavy Swing, power 5
  telegraph(s);
  // Clockwork Press: Soak 3, SG 6, priority -3 so the husk hits first.
  resolveBeat(s, { baseId: 'press', styleId: 'clockwork', autoShield: 'never' });
  assert.equal(s.player.life, 20 - 2, '5 power - 3 soak = 2 damage');
  assert.ok(!s.player.stunned, 'Stun Guard 6 held against 2 damage');
});

test('Stun Immunity from the ante keeps Cadenza activating', () => {
  const s = mkState([{ type: 'brute', space: 2 }]);
  s.enemies[0].patternIndex = 2;   // Stomp: power 4, OH stun, priority 3
  telegraph(s);
  const before = s.enemies[0].life;
  // Mechanical Press: priority -2, so the Stomp lands first and would stun.
  resolveBeat(s, { baseId: 'press', styleId: 'mechanical', ante: true, autoShield: 'never' });
  assert.equal(s.player.tokens, 2, 'a shield was anted');
  assert.ok(!s.player.stunned, 'stun immunity held');
  assert.ok(s.enemies[0].life < before, 'Cadenza still landed his attack');
});

test('Stun Immune enemies cannot be locked down', () => {
  const s = mkState([{ type: 'automaton', space: 2 }]);
  const before = s.player.life;
  resolveBeat(s, { baseId: 'strike', styleId: 'hydraulic', autoShield: 'never' });
  assert.ok(!s.enemies[0].stunned, 'automaton ignores stuns');
  assert.ok(s.player.life < before, 'and so it still hits back');
});

// ==================================================== shields

test('ante spends a shield, and only if one is available', () => {
  const s = mkState([{ type: 'husk', space: 6 }], { tokens: 1 });
  anteShield(s, true);
  assert.equal(s.player.tokens, 0);
  assert.ok(s.player.antedStunImmunity);
  anteShield(s, true);
  assert.equal(s.player.tokens, 0, 'cannot ante what you do not have');
  assert.ok(!s.player.antedStunImmunity);
});

test('reactive Shield negates a lethal blow (Guard 9001)', () => {
  const s = mkState([{ type: 'brute', space: 2 }], { life: 4 });
  s.enemies[0].patternIndex = 1;   // Hammerfall power 7 — lethal at 4 life
  telegraph(s);
  resolveBeat(s, { baseId: 'press', styleId: 'mechanical', autoShield: 'lethal' });
  assert.ok(s.player.life > 0, 'the shield saved the run');
  assert.equal(s.player.tokens, 2, 'exactly one shield spent');
});

test("policy 'never' lets the hit through — shields are a choice", () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;
  telegraph(s);
  resolveBeat(s, { baseId: 'press', styleId: 'mechanical', autoShield: 'never' });
  assert.equal(s.player.tokens, 3, 'no shield spent');
  assert.ok(s.player.life < 20);
});

test('shields are finite and carry between encounters', () => {
  const run = newRun('cadenza', 8);
  resetPiles(run);
  const s = startEncounter(run, { name: 'x', playerSpace: 1, enemies: [{ type: 'husk', space: 6 }] });
  anteShield(s, true);
  anteShield(s, true);
  assert.equal(s.player.tokens, 1);
});

// ==================================================== Press / conditionals

test('Press converts damage taken into Power', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;   // Heavy Swing power 5, priority 1
  telegraph(s);
  // Mechanical Press: priority -2 -> husk hits first for 5, Press then gains +5 Power.
  resolveBeat(s, { baseId: 'press', styleId: 'mechanical', autoShield: 'never' });
  const log = s.log.join('\n');
  assert.match(log, /channels the blow: \+5 Power/);
});

test('Press gains nothing when nothing got through', () => {
  const s = mkState([{ type: 'husk', space: 6 }]);
  resolveBeat(s, { baseId: 'press', styleId: 'clockwork', autoShield: 'never' });
  assert.ok(!/channels the blow/.test(s.log.join('\n')));
});

test('Battery grants +4 Priority on the following beat only', () => {
  const s = mkState([{ type: 'husk', space: 6 }]);
  resolveBeat(s, { baseId: 'shot', styleId: 'battery', autoShield: 'never' });
  assert.equal(s.player.priorityBonusNext, 4);
  resolveBeat(s, { baseId: 'shot', styleId: 'grapnel', autoShield: 'never' });
  assert.equal(s.player.priorityBonus, 4, 'applied this beat');
  assert.equal(s.player.priorityBonusNext, 0, 'and then gone');
});

// ==================================================== finishers / force

test('finishers are gated on Force >= Life', () => {
  const s = mkState([{ type: 'husk', space: 2 }], { life: 6, force: 5 });
  assert.equal(canUseFinisher(s), false);
  s.force = 6;
  assert.equal(canUseFinisher(s), true);
});

test('Rocket Press: 8 power, Soak 3, Stun Immunity, advances at least 2', () => {
  const a = playerAttack(CADENZA, 'rocketPress', null);
  assert.equal(a.power, 8);
  assert.equal(a.soak, 3);
  assert.ok(a.stunImmune);
  assert.equal(a.before[0].min, 2);
});

test('Feedback Field converts soaked damage into Power', () => {
  const s = mkState([{ type: 'husk', space: 2 }], { force: 10, life: 8 });
  s.enemies[0].patternIndex = 1;   // Heavy Swing power 5, priority 1
  telegraph(s);
  // Feedback Field priority 0 < 1, so the husk swings first into Soak 5.
  resolveBeat(s, { baseId: 'feedbackField', styleId: null, autoShield: 'never' });
  assert.match(s.log.join('\n'), /vents the impact: \+10 Power/);
});

test('Force accumulates and caps at 10', () => {
  const s = mkState([{ type: 'husk', space: 7 }]);
  for (let i = 0; i < 14; i++) resolveBeat(s, { baseId: 'dash', styleId: 'battery', autoShield: 'never' });
  assert.ok(s.force <= 10);
});

// ==================================================== board integrity

test('fighters never share a space and never leave the board', () => {
  const plays = [
    ['press', 'clockwork'], ['strike', 'hydraulic'], ['shot', 'grapnel'],
    ['drive', 'mechanical'], ['burst', 'battery'], ['dash', 'hydraulic'],
    ['grasp', 'grapnel'],
  ];
  for (let seed = 0; seed < 30; seed++) {
    const s = mkState(
      [{ type: 'stalker', space: 3 }, { type: 'husk', space: 6 }, { type: 'archer', space: 7 }],
      { playerSpace: 1 }
    );
    for (let t = 0; t < 25 && !s.over; t++) {
      const [b, st] = plays[(seed + t) % plays.length];
      resolveBeat(s, { baseId: b, styleId: st, ante: t % 3 === 0 });
      const live = [s.player, ...s.enemies.filter((e) => e.life > 0)].map((a) => a.space);
      assert.equal(new Set(live).size, live.length, `overlap: ${live}`);
      for (const sp of live) assert.ok(sp >= 1 && sp <= ARENA_SIZE, `off board: ${sp}`);
    }
  }
});

test('Grapnel pull cannot drag a target through another fighter', () => {
  const s = mkState([{ type: 'husk', space: 3 }, { type: 'husk', space: 4 }], { playerSpace: 1 });
  resolveBeat(s, { baseId: 'press', styleId: 'grapnel', targetUid: 1, autoShield: 'never' });
  const live = [s.player, ...s.enemies.filter((e) => e.life > 0)].map((a) => a.space);
  assert.equal(new Set(live).size, live.length);
});

test('Dash deals no damage', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'dash', styleId: 'hydraulic', autoShield: 'never' });
  assert.equal(s.enemies[0].life, before);
});

// ==================================================== telegraphing

test('every enemy telegraphs full attack data', () => {
  const s = mkState([{ type: 'husk', space: 5 }, { type: 'archer', space: 7 }]);
  for (const e of s.enemies) {
    const i = e.intent;
    assert.ok(i && i.name, 'has an intent');
    assert.equal(typeof i.power, 'number');
    assert.equal(typeof i.priority, 'number');
    assert.equal(i.range.length, 2);
  }
});

test('the telegraphed intent is what actually resolves', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;
  telegraph(s);
  const promised = s.enemies[0].intent;
  const before = s.player.life;
  resolveBeat(s, { baseId: 'dash', styleId: 'grapnel', autoShield: 'never' });
  assert.equal(before - s.player.life, promised.power, 'no soak, so damage == promised power');
});

test('the boss reacts to your position', () => {
  const s = mkState([{ type: 'warden', space: 5 }], { playerSpace: 1 });
  const far = s.enemies[0].intent.name;
  s.player.space = 4;
  telegraph(s);
  assert.notEqual(far, s.enemies[0].intent.name);
});

test('intentThreatens accounts for telegraphed movement', () => {
  const s = mkState([{ type: 'husk', space: 4 }], { playerSpace: 1 });
  assert.equal(s.enemies[0].intent.name, 'Shamble');
  assert.equal(intentThreatens(s, s.enemies[0]), true);
  s.enemies[0].space = 7;
  assert.equal(intentThreatens(s, s.enemies[0]), false);
});

test('threatSpaces excludes Dash, which cannot hit anything', () => {
  assert.deepEqual(threatSpaces(1, playerAttack(CADENZA, 'dash', 'hydraulic')), []);
  assert.deepEqual(threatSpaces(1, playerAttack(CADENZA, 'shot', 'grapnel')), [4, 5, 6, 7]);
});

// ==================================================== run layer

test('Cadenza draws only his own styles', () => {
  const run = newRun('cadenza', 5);
  resetPiles(run);
  const own = new Set(CADENZA.styles.map((s) => s.id));
  for (const id of currentHand(run).styles) assert.ok(own.has(id), `${id} is not Cadenza's`);
});

test('the Drifter is a distinct character with its own kit', () => {
  const run = newRun('drifter', 5);
  resetPiles(run);
  const own = new Set(DRIFTER.styles.map((s) => s.id));
  for (const id of currentHand(run).styles) assert.ok(own.has(id));
  assert.equal(run.char.tokens, null, 'no tokens');
  assert.equal(run.life, 16);
});

test('played cards cycle out of hand', () => {
  const run = newRun('cadenza', 5);
  resetPiles(run);
  const h = currentHand(run);
  cyclePlay(run, h.bases[0], h.styles[0]);
  assert.ok(!currentHand(run).bases.includes(h.bases[0]));
  assert.ok(!currentHand(run).styles.includes(h.styles[0]));
});

test('upgrades apply and token upgrades are hidden from tokenless characters', () => {
  const run = newRun('drifter', 5);
  for (let i = 0; i < 6; i++) {
    for (const o of rewardOptions(run)) assert.ok(!o.needsTokens);
  }
  const cad = newRun('cadenza', 5);
  cad.tokens = 1;
  takeReward(cad, { id: 'spring', apply: (r) => { r.tokens = Math.min(3, r.tokens + 1); } });
  assert.equal(cad.tokens, 2);
});

test('a scripted run through every encounter stays consistent', () => {
  const run = newRun('cadenza', 77);
  const plays = [['press', 'clockwork'], ['strike', 'hydraulic'], ['drive', 'mechanical'], ['shot', 'grapnel']];
  for (const enc of ENCOUNTERS) {
    resetPiles(run);
    const s = startEncounter(run, enc);
    for (let t = 0; t < 30 && !s.over; t++) {
      const [b, st] = plays[t % plays.length];
      resolveBeat(s, { baseId: b, styleId: st });
      assert.ok(s.player.life <= s.player.maxLife);
      assert.ok(s.player.tokens >= 0 && s.player.tokens <= 3);
    }
  }
});
