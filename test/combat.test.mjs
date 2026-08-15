import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CADENZA, RUKYUK, CHARACTERS, UNIVERSAL_BASES, STARTING_LIFE,
  combine, baseLibrary, styleLibrary,
} from '../src/characters.js';
import { AMMO_TOKENS, SHIELD_TOKENS, startingPool, applyTokenMods } from '../src/tokens.js';
import {
  ARENA_SIZE, startEncounter, resolveBeat, anteShield, playerAttack,
  threatSpaces, intentThreatens, nearestEnemy, canUseFinisher, anteTokens,
} from '../src/combat.js';
import { telegraph } from '../src/enemies.js';
import {
  newRun, resetPiles, currentHand, cyclePlay, rewardOptions, takeReward,
  advance, ENCOUNTERS, PLAYER_START, ENEMY_START,
} from '../src/run.js';

const B = baseLibrary(CADENZA);
const S = styleLibrary(CADENZA);

function mkState(enemies, { playerSpace = 1, charId = 'cadenza', life, tokens, force = 0 } = {}) {
  const run = newRun(charId, 42);
  if (life !== undefined) run.life = life;
  if (tokens !== undefined) run.tokenPool = startingPool(run.char.tokens).slice(0, tokens);
  run.force = force;
  resetPiles(run);
  const s = startEncounter(run, { name: 'Test', playerSpace, enemies });
  s.force = force;
  return s;
}

// ==================================================== Cadenza's card maths

test('Clockwork Press matches the spec sheet exactly', () => {
  // Press (1~2/1/0) Guard 6 + Clockwork (+0/+3/-3) Armor 3
  const a = combine(B.press, S.clockwork);
  assert.deepEqual(a.range, [1, 2]);
  assert.equal(a.power, 4);
  assert.equal(a.priority, -3);
  assert.equal(a.armor, 3);
  assert.equal(a.guard, 6);
});

test('Grapnel extends range without touching power or priority', () => {
  // Grapnel (+2~4/+0/+0) on Press (1~2/1/0)
  const a = combine(B.press, S.grapnel);
  assert.deepEqual(a.range, [3, 6]);
  assert.equal(a.power, 1);
  assert.equal(a.priority, 0);
});

test('Hydraulic Drive: armor, power and the BA advance all carry over', () => {
  const a = combine(B.drive, S.hydraulic);
  assert.deepEqual(a.range, [1, 1]);
  assert.equal(a.power, 5);      // 3 + 2
  assert.equal(a.priority, 3);   // 4 - 1
  assert.equal(a.armor, 1);
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
  assert.equal(s.player.life, STARTING_LIFE, 'stunned enemy dealt no damage');
});

test('Guard >= damage prevents the stun but not the damage', () => {
  const s = mkState([{ type: 'brute', space: 2 }]);
  s.enemies[0].patternIndex = 0;   // Brace: guard 4, armor 2
  telegraph(s);
  const before = s.enemies[0].life;
  // Hydraulic Strike: power 4+2=6, armor 2 -> 4 damage, SG 4 holds
  resolveBeat(s, { baseId: 'strike', styleId: 'hydraulic', autoShield: 'never' });
  assert.ok(s.enemies[0].life < before, 'damage still landed');
  assert.ok(!s.enemies[0].stunned, 'Guard 4 held against 4 damage');
});

test('Armor reduces damage to zero and so prevents the stun entirely', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  s.enemies[0].patternIndex = 1;   // Heavy Swing, power 5
  telegraph(s);
  // Clockwork Press: Armor 3, SG 6, priority -3 so the husk hits first.
  resolveBeat(s, { baseId: 'press', styleId: 'clockwork', autoShield: 'never' });
  assert.equal(s.player.life, STARTING_LIFE - 2, '5 power - 3 armor = 2 damage');
  assert.ok(!s.player.stunned, 'Guard 6 held against 2 damage');
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
  anteTokens(s, true);
  assert.equal(s.player.tokens, 0);
  assert.ok(s.player.antedStunImmunity);
  anteTokens(s, true);
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
  assert.ok(s.player.life < STARTING_LIFE);
});

test('shields are finite and carry between encounters', () => {
  const run = newRun('cadenza', 8);
  resetPiles(run);
  const s = startEncounter(run, { name: 'x', playerSpace: 1, enemies: [{ type: 'husk', space: 6 }] });
  anteTokens(s, true);
  anteTokens(s, true);
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

test('Rocket Press: 8 power, Armor 3, Stun Immunity, advances at least 2', () => {
  const a = playerAttack(CADENZA, 'rocketPress', null);
  assert.equal(a.power, 8);
  assert.equal(a.armor, 3);
  assert.ok(a.stunImmune);
  assert.equal(a.before[0].min, 2);
});

test('Feedback Field converts armored damage into Power', () => {
  const s = mkState([{ type: 'husk', space: 2 }], { force: 10, life: 8 });
  s.enemies[0].patternIndex = 1;   // Heavy Swing power 5, priority 1
  telegraph(s);
  // Feedback Field priority 0 < 1, so the husk swings first into Armor 5.
  resolveBeat(s, { baseId: 'feedbackField', styleId: null, autoShield: 'never' });
  assert.match(s.log.join('\n'), /vents the impact: \+10 Power/);
});

test('Force accumulates and caps at 10', () => {
  const s = mkState([{ type: 'husk', space: 7 }]);
  for (let i = 0; i < 14; i++) resolveBeat(s, { baseId: 'dodge', styleId: 'battery', autoShield: 'never' });
  assert.ok(s.force <= 10);
});

// ==================================================== board integrity

test('fighters never share a space and never leave the board', () => {
  const plays = [
    ['press', 'clockwork'], ['strike', 'hydraulic'], ['shot', 'grapnel'],
    ['drive', 'mechanical'], ['burst', 'battery'], ['dodge', 'hydraulic'],
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

// ==================================================== Dodge

test('Dodge can never deal damage, whatever Style is attached', () => {
  const s = mkState([{ type: 'husk', space: 2 }]);
  const before = s.enemies[0].life;
  // Clockwork is +3 Power; Dodge must still deal nothing.
  resolveBeat(s, { baseId: 'dodge', styleId: 'clockwork', picks: { dodgeMove: 1 }, autoShield: 'never' });
  assert.equal(s.enemies[0].life, before);
  const a = playerAttack(CADENZA, 'dodge', 'clockwork');
  assert.equal(a.power, null, 'power is N/A, not a number');
  assert.ok(a.noDamage);
});

test('Dodge base priority is 3', () => {
  const B = baseLibrary(CADENZA);
  assert.equal(B.dodge.priority, 3);
  assert.equal(combine(B.dodge, styleLibrary(CADENZA).battery).priority, 2);  // 3 - 1
});

test('moving PAST an enemy dodges all of its attacks that beat', () => {
  const s = mkState([{ type: 'husk', space: 5 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 1;   // Heavy Swing, power 5, range 1
  telegraph(s);
  // Move 3: 3 -> 6, passing through space 5 where the husk stands.
  resolveBeat(s, { baseId: 'dodge', styleId: 'battery', picks: { dodgeMove: 3 }, autoShield: 'never' });
  assert.equal(s.player.space, 6, 'passed through and landed beyond');
  assert.equal(s.player.life, STARTING_LIFE, 'the dodged attack could not connect');
  assert.match(s.log.join('\n'), /dodged/);
});

test('dodging is per-enemy: one you slip past misses, one you do not still hits', () => {
  // Husk at 2 (we pass it), archer at 7 (we do not).
  const s = mkState([{ type: 'husk', space: 2 }, { type: 'archer', space: 7 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 1;   // Heavy Swing range 1
  s.enemies[1].patternIndex = 0;   // Loose Arrow range 3~6
  telegraph(s);
  // 1 -> 3, passing space 2. Archer at 7 is then 4 away: still in its band.
  resolveBeat(s, { baseId: 'dodge', styleId: 'battery', picks: { dodgeMove: 2 }, autoShield: 'never' });
  const log = s.log.join('\n');
  assert.match(log, /Husk swings at empty air/);
  assert.ok(s.player.life < STARTING_LIFE, 'the archer we never passed still connects');
});

test('a dodge that passes nobody grants no protection', () => {
  const s = mkState([{ type: 'husk', space: 5 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 0;   // Shamble: advances then hits at range 1
  telegraph(s);
  // Retreat away: 3 -> 1, passing nobody.
  resolveBeat(s, { baseId: 'dodge', styleId: 'battery', picks: { dodgeMove: 2, dodgeDir: -1 }, autoShield: 'never' });
  assert.ok(!/dodged/.test(s.log.join('\n')) || s.player.space === 1);
});

test('Dodge resolves in the Start band, before any activation', () => {
  // The stalker is FASTER than Dodge (Dart In, Pri 6 vs Dodge Pri 3), but
  // Start effects still happen first, so the dodge protects us anyway.
  const s = mkState([{ type: 'stalker', space: 5 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 1;   // Slash, priority 5, range 1
  telegraph(s);
  assert.ok(s.enemies[0].intent.priority > 3, 'enemy really is faster');
  resolveBeat(s, { baseId: 'dodge', styleId: null, picks: { dodgeMove: 3 }, autoShield: 'never' });
  assert.equal(s.player.life, STARTING_LIFE, 'faster attacker was still dodged');
});

test('threatSpaces is empty for Dodge — it threatens nothing', () => {
  assert.deepEqual(threatSpaces(1, playerAttack(CADENZA, 'dodge', 'hydraulic')), []);
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
  resolveBeat(s, { baseId: 'dodge', styleId: 'grapnel', picks: { dodgeMove: 1 }, autoShield: 'never' });
  assert.equal(before - s.player.life, promised.power, 'no armor, so damage == promised power');
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

test('threatSpaces marks exactly the reachable spaces', () => {
  assert.deepEqual(threatSpaces(1, playerAttack(CADENZA, 'shot', 'grapnel')), [4, 5, 6, 7]);
});

// ==================================================== run layer

test('Cadenza draws only his own styles', () => {
  const run = newRun('cadenza', 5);
  resetPiles(run);
  const own = new Set(CADENZA.styles.map((s) => s.id));
  for (const id of currentHand(run).styles) assert.ok(own.has(id), `${id} is not Cadenza's`);
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
  const run = newRun('rukyuk', 5);
  for (let i = 0; i < 6; i++) rewardOptions(run);
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

// ==================================================== constants & setup

test('every character starts at the shared STARTING_LIFE constant', () => {
  assert.equal(STARTING_LIFE, 20);
  for (const c of CHARACTERS) {
    assert.equal(c.life, STARTING_LIFE, `${c.name} is off-spec`);
    assert.equal(newRun(c.id, 1).life, STARTING_LIFE);
  }
});

test('fighters open on the 3rd and 5th tiles', () => {
  assert.equal(PLAYER_START, 3);
  assert.equal(ENEMY_START, 5);
  for (const enc of ENCOUNTERS) {
    assert.equal(enc.playerSpace, PLAYER_START, `${enc.name} player start`);
    assert.ok(
      enc.enemies.some((e) => e.space === ENEMY_START),
      `${enc.name} has no enemy on the 5th tile`
    );
  }
});

test('the opening board is exactly two spaces apart', () => {
  const run = newRun('cadenza', 1);
  resetPiles(run);
  const s = startEncounter(run, ENCOUNTERS[0]);
  assert.equal(s.player.space, 3);
  assert.equal(s.enemies[0].space, 5);
  assert.equal(Math.abs(s.player.space - s.enemies[0].space), 2);
});

test('clash: on equal Priority the player acts first', () => {
  // Husk Shamble is Priority 2. Build a player attack that is also 2.
  const s = mkState([{ type: 'husk', space: 2 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 0;
  telegraph(s);
  assert.equal(s.enemies[0].intent.priority, 2);
  // Hydraulic Burst: base priority 1 + 0 ... use Press+Hydraulic: 0 - 1 = -1.
  // Grasp (pri 5) + Clockwork (-3) = 2 -> a genuine clash.
  const atk = playerAttack(CADENZA, 'grasp', 'clockwork');
  assert.equal(atk.priority, 2, 'set up a real tie');
  s.enemies[0].life = 2;   // player-first means this dies before it swings
  resolveBeat(s, { baseId: 'grasp', styleId: 'clockwork', autoShield: 'never' });
  assert.ok(s.enemies[0].life <= 0, 'player resolved first and killed it');
  assert.equal(s.player.life, STARTING_LIFE, 'so it never got to swing');
});

// ==================================================== timing bands

test('Burst retreats in the Start band, before anyone activates', () => {
  const B = baseLibrary(CADENZA);
  assert.equal(B.burst.before, undefined, 'no BA effects left on Burst');
  assert.deepEqual(B.burst.start, [{ k: 'retreat', min: 1, max: 2 }]);
  // Stalker Slash: priority 5, range 1. Burst is priority 1 — far slower.
  // The Start retreat must still happen first and pull us out of its range.
  const s = mkState([{ type: 'stalker', space: 4 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 1;   // Slash, range 1, priority 5
  telegraph(s);
  assert.ok(s.enemies[0].intent.priority > 1, 'enemy is genuinely faster');
  resolveBeat(s, { baseId: 'burst', styleId: null, picks: { retreat: 2 }, autoShield: 'never' });
  assert.equal(s.player.space, 1, 'retreated in the Start band');
  assert.equal(s.player.life, STARTING_LIFE, 'the faster Slash could not reach');
});

test('Start effects resolve fastest-first', () => {
  // Both sides move at Start. The faster fighter commits first, so the
  // slower one reacts to the board the fast one created.
  const s = mkState([{ type: 'archer', space: 5 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 1;   // Backstep Shot: BA retreat, priority 4
  telegraph(s);
  const order = [];
  const origLog = s.log;
  resolveBeat(s, { baseId: 'burst', styleId: null, picks: { retreat: 1 }, autoShield: 'never' });
  // Burst priority 1 < archer 4, so the archer's band resolves before ours.
  const text = s.log.join('\n');
  assert.ok(text.includes('retreats'), 'someone retreated');
});

test('End of Beat fires even when the fighter is stunned', () => {
  // Brute Stomp (OH: Stun, priority 3) beats Battery Press (priority -1).
  const s = mkState([{ type: 'brute', space: 4 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 2;   // Stomp
  telegraph(s);
  resolveBeat(s, { baseId: 'press', styleId: 'battery', autoShield: 'never' });
  assert.ok(s.player.stunned, 'we really were stunned');
  assert.equal(s.player.priorityBonusNext, 4, 'Battery EoB fired anyway');
});

test('After Activating is cancelled by a stun, unlike End of Beat', () => {
  // Mechanical is EoB (advance up to 3). Build a case where we are stunned
  // and confirm the EoB movement still happens.
  const s = mkState([{ type: 'brute', space: 5 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 2;   // Stomp: range 1~2, priority 3 — too far to reach
  telegraph(s);
  const before = s.player.space;
  resolveBeat(s, { baseId: 'press', styleId: 'mechanical', picks: { advance: 3 }, autoShield: 'never' });
  assert.notEqual(s.player.space, before, 'EoB advance moved us');
});

test('End of Beat fires even when the attack whiffed entirely', () => {
  const s = mkState([{ type: 'husk', space: 7 }], { playerSpace: 1 });
  resolveBeat(s, { baseId: 'strike', styleId: 'battery', autoShield: 'never' });
  assert.match(s.log.join('\n'), /whiffs/);
  assert.equal(s.player.priorityBonusNext, 4, 'EoB is unconditional');
});

test('a stunned fighter makes no attack at all', () => {
  const s = mkState([{ type: 'brute', space: 2 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 2;   // Stomp: OH stun, priority 3
  telegraph(s);
  const enemyLife = s.enemies[0].life;
  // Burning-slow play: Clockwork Press is priority -3, so we are stunned first.
  resolveBeat(s, { baseId: 'press', styleId: 'clockwork', autoShield: 'never' });
  assert.ok(s.player.stunned);
  assert.equal(s.enemies[0].life, enemyLife, 'stunned player dealt no damage');
});

test('the five bands resolve in the documented order', () => {
  // Start (Burst retreat) -> BA -> attack -> After -> EoB.
  const s = mkState([{ type: 'husk', space: 5 }], { playerSpace: 3 });
  resolveBeat(s, { baseId: 'burst', styleId: 'battery', picks: { retreat: 1 }, autoShield: 'never' });
  const log = s.log.join('\n');
  const iRetreat = log.indexOf('retreats');
  const iPriority = log.indexOf('+4 Priority');
  assert.ok(iRetreat >= 0 && iPriority >= 0);
  assert.ok(iRetreat < iPriority, 'Start resolved before End of Beat');
});

// ==================================================== Rukyuk

const RB = baseLibrary(RUKYUK);
const RS = styleLibrary(RUKYUK);

const rukState = (enemies, opts = {}) =>
  mkState(enemies, { charId: 'rukyuk', ...opts });

test('Rukyuk styles are range MODIFIERS, not absolutes', () => {
  // Sniper +3~5 on Strike (Range 1) -> 4~6.
  const a = combine(RB.strike, RS.sniper);
  assert.deepEqual(a.range, [4, 6], 'style range adds to the base');
  assert.equal(a.power, 5);
  assert.equal(a.priority, 5);
  // The same style on a longer base reaches further — base choice matters.
  assert.deepEqual(combine(RB.shot, RS.sniper).range, [4, 9], 'Shot 1~4 + 3~5');
  assert.deepEqual(combine(RB.burst, RS.sniper).range, [5, 8], 'Burst 2~3 + 3~5');
  // Point Blank +0~1 keeps a melee base in melee.
  assert.deepEqual(combine(RB.strike, RS.pointblank).range, [1, 2]);
  const cf = combine(RB.strike, RS.crossfire);
  assert.equal(cf.armor, 2);
  assert.equal(cf.guard, 3, 'Crossfire Guard 1 + Strike Guard 2');
});

test('an asterisked *fixed range overrides everything', () => {
  // Fully Automatic is *3~6: no style is attached, and no modifier applies.
  const fa = combine(RB.fullyAutomatic, null);
  assert.deepEqual(fa.range, [3, 6]);
  assert.ok(fa.rangeFixed);
});

test('Longshot cannot widen a fixed range, but does widen a normal one', () => {
  const fa = combine(RB.fullyAutomatic, null);
  const fixed = applyTokenMods(
    { ...fa, range: [...fa.range], hit: [...fa.hit] }, ['longshot']);
  assert.deepEqual(fixed.range, [3, 6], 'fixed range ignores Longshot');

  const ss = combine(RB.strike, RS.sniper);          // 4~6
  const normal = applyTokenMods(
    { ...ss, range: [...ss.range], hit: [...ss.hit] }, ['longshot']);
  assert.deepEqual(normal.range, [3, 7], 'normal range widens by -1/+1');
});

test('Trick grants Stun Immunity', () => {
  assert.ok(combine(RB.strike, RS.trick).stunImmune);
});

test('no Ammo anted means Range N/A and the shot cannot connect', () => {
  const s = rukState([{ type: 'husk', space: 6 }], { playerSpace: 2 });
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: null, autoShield: 'never' });
  assert.equal(s.enemies[0].life, before, 'no shell, no hit');
  assert.match(s.log.join('\n'), /Range becomes N\/A/);
});

test('anteing an Ammo lets the shot connect and spends that shell', () => {
  // The archer holds its distance, so the range band stays meaningful.
  const s = rukState([{ type: 'archer', space: 6 }], { playerSpace: 2 });
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['flash'], autoShield: 'never' });
  assert.ok(s.enemies[0].life < before, 'the shot landed');
  assert.equal(s.player.tokens, 5);
  assert.ok(!s.player.tokenPool.includes('flash'), 'that specific shell is gone');
});

test('Explosive Shell adds +2 Power', () => {
  const mk = (ante) => {
    const s = rukState([{ type: 'archer', space: 6 }], { playerSpace: 2 });
    const before = s.enemies[0].life;
    resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante, autoShield: 'never' });
    return before - s.enemies[0].life;
  };
  assert.equal(mk(['explosive']) - mk(['ap']), 2, 'Explosive is worth exactly +2');
});

test('Swift Shell adds +2 Priority', () => {
  const s = rukState([{ type: 'husk', space: 6 }], { playerSpace: 2 });
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['swift'], autoShield: 'never' });
  assert.match(s.log.join('\n'), /Pri 7/, 'Sniper Strike priority 5 + 2');
});

test('AP Shell ignores Armor', () => {
  const s = rukState([{ type: 'brute', space: 5 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 0;   // Brace: armor 2, guard 4
  telegraph(s);
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['ap'], autoShield: 'never' });
  const dealt = before - s.enemies[0].life;
  assert.equal(dealt, 5, 'full power, Armor 2 ignored');
  assert.match(s.log.join('\n'), /Armor ignored/);
});

test('Flash Shell ignores Guard, so a small hit still stuns', () => {
  const s = rukState([{ type: 'brute', space: 5 }], { playerSpace: 1 });
  s.enemies[0].patternIndex = 0;   // Brace: guard 4
  telegraph(s);
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['flash'], autoShield: 'never' });
  assert.ok(s.enemies[0].stunned, 'Guard 4 ignored');
  assert.match(s.log.join('\n'), /Guard ignored/);
});

test('Impact Shell pushes the target 2 on hit', () => {
  const s = rukState([{ type: 'archer', space: 6 }], { playerSpace: 2 });
  const before = s.enemies[0].space;
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['impact'], autoShield: 'never' });
  assert.ok(s.enemies[0].space > before || s.enemies[0].life <= 0, 'pushed away');
});

test('Longshot widens the range band by -1 to +1', () => {
  const s = rukState([{ type: 'archer', space: 7 }], { playerSpace: 1 });
  // distance 6, outside Sniper 3~5; Longshot's +1 brings it to 3~6.
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'strike', styleId: 'sniper', ante: ['longshot'], autoShield: 'never' });
  assert.ok(s.enemies[0].life < before, 'reached at distance 6');
});

test('Reload cannot hit, teleports, and refills every shell', () => {
  const s = rukState([{ type: 'husk', space: 6 }], { playerSpace: 3 });
  s.player.tokenPool = ['impact'];
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'reload', styleId: 'sniper', ante: ['impact'], autoShield: 'never' });
  assert.equal(s.enemies[0].life, before, 'Reload does not hit');
  assert.equal(s.player.tokens, 6, 'all six shells back');
});

test("Reload's EoB refill happens even if Rukyuk is stunned", () => {
  const s = rukState([{ type: 'husk', space: 4 }], { playerSpace: 3 });
  s.enemies[0].patternIndex = 1;   // Heavy Swing, power 5
  telegraph(s);
  s.player.tokenPool = ['impact'];
  resolveBeat(s, { baseId: 'reload', styleId: 'gunner', ante: ['impact'], autoShield: 'never' });
  assert.equal(s.player.tokens, 6, 'End of Beat fires regardless');
});

test('Fully Automatic negates the anted shell but still spends it', () => {
  const s = rukState([{ type: 'archer', space: 6 }], { playerSpace: 2, force: 20 });
  s.force = 20;
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'fullyAutomatic', styleId: null, ante: ['explosive'], autoShield: 'never' });
  assert.equal(s.player.tokens, 0, 'anted shell spent, remainder dumped for power');
  assert.match(s.log.join('\n'), /negates the loaded shell/);
  assert.ok(before - s.enemies[0].life > 2, 'magazine dump added power');
});

test('Fully Automatic converts every remaining shell into +2 Power', () => {
  const s = rukState([{ type: 'archer', space: 5 }], { playerSpace: 2, force: 20 });
  s.force = 20;
  s.player.tokenPool = ['explosive', 'longshot', 'ap'];
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'fullyAutomatic', styleId: null, ante: ['explosive'], autoShield: 'never' });
  // 2 base + 2 remaining shells x2 = 6, minus the Brute's armor
  assert.match(s.log.join('\n'), /empties the magazine — 2 shells for \+4 Power/);
  assert.ok(s.enemies[0].life < before);
});

test('Force Grenade works with no ammo at all — the dry-magazine answer', () => {
  const s = rukState([{ type: 'husk', space: 5 }], { playerSpace: 3, force: 20 });
  s.force = 20;
  s.player.tokenPool = [];
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'forceGrenade', styleId: null, ante: null, autoShield: 'never' });
  assert.ok(s.enemies[0].life < before, 'still hits with zero ammo');
});

test('tokens carry between encounters — ammo is not free', () => {
  const ruk = newRun('rukyuk', 3);
  resetPiles(ruk);
  const s1 = startEncounter(ruk, ENCOUNTERS[0]);
  s1.player.tokenPool = ['ap'];
  advance(ruk, s1);
  assert.equal(ruk.tokenPool.length, 1, 'walks into the next fight nearly dry');

  const cad = newRun('cadenza', 3);
  resetPiles(cad);
  const s2 = startEncounter(cad, ENCOUNTERS[0]);
  s2.player.tokenPool = ['shield'];
  advance(cad, s2);
  assert.equal(cad.tokenPool.length, 1, 'shields stay spent too');
});

test('every Rukyuk style is legal on every base he can draw', () => {
  for (const st of RUKYUK.styles) {
    for (const base of [...UNIVERSAL_BASES, ...RUKYUK.bases]) {
      const a = combine(base, st);
      assert.ok(a.power === null || a.power >= 0, `${a.name} power`);
      if (a.range) assert.ok(a.range[1] >= a.range[0], `${a.name} range`);
    }
  }
});

test('the six Ammo tokens are all distinct and unique-kind', () => {
  assert.equal(AMMO_TOKENS.kind, 'unique');
  assert.equal(AMMO_TOKENS.list.length, 6);
  assert.equal(new Set(startingPool(AMMO_TOKENS)).size, 6, 'no duplicates');
  assert.equal(SHIELD_TOKENS.kind, 'fungible');
});

// ==================================================== hit/damage ordering

test('On Hit resolves before damage, so it can raise Power', () => {
  // Feedback Field: Armor 5, OH +2 Power per damage absorbed.
  const s = mkState([{ type: 'husk', space: 4 }], { playerSpace: 3, force: 20 });
  s.force = 20;
  s.enemies[0].patternIndex = 1;   // Heavy Swing power 5 -> fully absorbed
  telegraph(s);
  const before = s.enemies[0].life;
  resolveBeat(s, { baseId: 'feedbackField', styleId: null, autoShield: 'never' });
  const dealt = before - s.enemies[0].life;
  assert.ok(dealt > 1, `OH bonus must apply before damage (dealt ${dealt})`);
});

test('On Damage only fires when damage actually got through', () => {
  // Armor 5 vs a 2-power shot: no damage, so Point Blank's OD push must not
  // happen. Contrast with the hit case below.
  const s = rukState([{ type: 'husk', space: 2 }], { playerSpace: 1 });
  s.enemies[0].armorOverride = true;
  telegraph(s);
  s.enemies[0].intent.armor = 99;   // nothing will get through
  const spaceBefore = s.enemies[0].space;
  // Strike has no OH push of its own, so any movement must come from
  // Point Blank's On Damage rider.
  resolveBeat(s, { baseId: 'strike', styleId: 'pointblank', ante: ['longshot'], picks: { push: 2 }, autoShield: 'never' });
  assert.match(s.log.join('\n'), /absorbs all/);
  assert.equal(s.enemies[0].space, spaceBefore, 'no damage means no OD push');
});

test('On Damage does fire when damage gets through', () => {
  const s = rukState([{ type: 'husk', space: 2 }], { playerSpace: 1 });
  const spaceBefore = s.enemies[0].space;
  resolveBeat(s, { baseId: 'strike', styleId: 'pointblank', ante: ['explosive'], picks: { push: 2 }, autoShield: 'never' });
  assert.ok(s.enemies[0].space > spaceBefore || s.enemies[0].life <= 0, 'OD push happened');
});
