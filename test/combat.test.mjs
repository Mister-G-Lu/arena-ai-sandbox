import assert from 'node:assert/strict';
import test from 'node:test';
import { BASE_BY_ID, STYLE_BY_ID, combine } from '../src/cards.js';
import {
  ARENA_SIZE, startEncounter, resolveTurn, nearestEnemy,
  threatSpaces, intentThreatens, playerAttack,
} from '../src/combat.js';
import { ENEMY_TYPES, telegraph } from '../src/enemies.js';
import { newRun, resetPiles, currentHand, cyclePlay, rewardOptions, takeReward } from '../src/run.js';

const mkState = (enemies, playerSpace = 1, life = 20) => {
  const run = { ...newRun(42), life, maxLife: 20, node: 0 };
  return startEncounter(run, { name: 'Test', playerSpace, enemies });
};

// ---------------------------------------------------------------- card math

test('Powerful Drive combines exactly as specified', () => {
  const a = combine(BASE_BY_ID.drive, STYLE_BY_ID.powerful);
  assert.deepEqual(a.range, [1, 1]);
  assert.equal(a.att, 4);
  assert.equal(a.spd, 5);
  assert.deepEqual(a.before, [{ k: 'advance', min: 1, max: 2 }]);
});

test('style range deltas widen the band', () => {
  const a = combine(BASE_BY_ID.shot, STYLE_BY_ID.reaching);
  assert.deepEqual(a.range, [2, 6]);
  assert.equal(a.att, 2);
});

// ------------------------------------------------------------- telegraphing

test('every enemy telegraphs a fully specified intent before the turn', () => {
  const s = mkState([{ type: 'husk', space: 5 }, { type: 'archer', space: 7 }]);
  for (const e of s.enemies) {
    assert.ok(e.intent, `${e.name} has no intent`);
    const i = e.intent;
    assert.equal(typeof i.att, 'number');
    assert.equal(typeof i.spd, 'number');
    assert.equal(i.range.length, 2);
    assert.ok(i.name.length > 0);
  }
});

test('intents are stable: reading one does not change it', () => {
  const s = mkState([{ type: 'husk', space: 5 }]);
  const first = JSON.stringify(s.enemies[0].intent);
  telegraph(s);
  assert.equal(JSON.stringify(s.enemies[0].intent), first);
});

test('the telegraphed intent is what actually resolves', () => {
  const s = mkState([{ type: 'husk', space: 3 }], 1);
  s.enemies[0].patternIndex = 1;      // Heavy Swing: R1, Att 5, Spd 1
  telegraph(s);
  const promised = s.enemies[0].intent;
  assert.equal(promised.att, 5);
  const lifeBefore = s.player.life;
  // Stand still and eat it: Parry has 4 guard, so use a 0-guard play.
  s.enemies[0].space = 2;
  resolveTurn(s, { baseId: 'shot', styleId: 'reaching' });
  assert.equal(lifeBefore - s.player.life, promised.att);
});

test('enemy patterns advance after each turn', () => {
  const s = mkState([{ type: 'husk', space: 6 }]);
  const first = s.enemies[0].intent.name;
  resolveTurn(s, { baseId: 'parry', styleId: 'grinding' });
  assert.notEqual(s.enemies[0].intent.name, first);
});

// -------------------------------------------------------------- resolution

test('speed order decides who swings first', () => {
  const s = mkState([{ type: 'husk', space: 2 }], 1);
  s.enemies[0].patternIndex = 1;   // Heavy Swing, Spd 1
  s.enemies[0].life = 3;
  telegraph(s);
  // Powerful Strike: Att 5, Spd 6 — kills the 3-life husk before it swings.
  resolveTurn(s, { baseId: 'strike', styleId: 'powerful' });
  assert.equal(s.player.life, 20, 'dead enemies do not get to act');
  assert.ok(s.victory);
});

test('stagger cancels the target attack', () => {
  const s = mkState([{ type: 'husk', space: 2 }], 1);
  s.enemies[0].patternIndex = 1;   // Heavy Swing Att 5, Spd 1
  telegraph(s);
  // Sudden Grasp: Spd 7, hits at range 1, staggers.
  resolveTurn(s, { baseId: 'grasp', styleId: 'sudden' });
  assert.equal(s.player.life, 20, 'staggered enemy dealt no damage');
});

test('guard absorbs damage', () => {
  const s = mkState([{ type: 'husk', space: 2 }], 1);
  s.enemies[0].patternIndex = 1;   // Heavy Swing Att 5
  telegraph(s);
  // Grinding Parry: 4 base guard + 3 = 7 guard, so 5 damage is fully absorbed.
  resolveTurn(s, { baseId: 'parry', styleId: 'grinding' });
  assert.equal(s.player.life, 20);
});

test('sweep hits every enemy in range', () => {
  const s = mkState([{ type: 'husk', space: 2 }, { type: 'husk', space: 3 }], 1);
  const before = s.enemies.map((e) => e.life);
  resolveTurn(s, { baseId: 'sweep', styleId: 'powerful' });
  assert.ok(s.enemies[0].life < before[0], 'first enemy hit');
  assert.ok(s.enemies[1].life < before[1], 'second enemy hit');
});

test('out of range attacks simply miss', () => {
  const s = mkState([{ type: 'husk', space: 7 }], 1);
  const before = s.enemies[0].life;
  resolveTurn(s, { baseId: 'strike', styleId: 'powerful' });
  assert.equal(s.enemies[0].life, before);
});

test('player can target a chosen enemy', () => {
  const s = mkState([{ type: 'husk', space: 2 }, { type: 'stalker', space: 3 }], 1);
  const before = s.enemies[1].life;
  resolveTurn(s, { baseId: 'shot', styleId: 'reaching', targetUid: 1 });
  assert.ok(s.enemies[1].life < before, 'the chosen far enemy took the hit');
});

// ----------------------------------------------------------- board integrity

test('fighters never share a space and never leave the board', () => {
  const plays = [
    ['drive', 'powerful'], ['shot', 'reaching'], ['sweep', 'sliding'],
    ['grasp', 'sudden'], ['parry', 'grinding'], ['strike', 'powerful'],
  ];
  for (let seed = 0; seed < 25; seed++) {
    const s = mkState(
      [{ type: 'stalker', space: 3 }, { type: 'husk', space: 6 }, { type: 'archer', space: 7 }],
      1
    );
    for (let t = 0; t < 25 && !s.over; t++) {
      const [b, st] = plays[(seed + t) % plays.length];
      resolveTurn(s, { baseId: b, styleId: st });
      const live = [s.player, ...s.enemies.filter((e) => e.life > 0)];
      const spaces = live.map((a) => a.space);
      assert.equal(new Set(spaces).size, spaces.length, `overlap: ${spaces}`);
      for (const sp of spaces) assert.ok(sp >= 1 && sp <= ARENA_SIZE, `off board: ${sp}`);
    }
  }
});

test('push cannot shove a target through another fighter', () => {
  const s = mkState([{ type: 'husk', space: 2 }, { type: 'husk', space: 3 }], 1);
  resolveTurn(s, { baseId: 'sweep', styleId: 'powerful', targetUid: 0 });
  const live = [s.player, ...s.enemies.filter((e) => e.life > 0)].map((a) => a.space);
  assert.equal(new Set(live).size, live.length);
});

// ------------------------------------------------------------ UI helpers

test('threatSpaces marks exactly the reachable spaces', () => {
  const a = playerAttack('shot', 'powerful');   // range 2~4
  assert.deepEqual(threatSpaces(1, a), [3, 4, 5]);
});

test('intentThreatens predicts an incoming hit including its movement', () => {
  const s = mkState([{ type: 'husk', space: 4 }], 1);
  // Shamble: advance 1~2 then range 1 -> from 4 reaches space 2, player at 1. Hit.
  assert.equal(s.enemies[0].intent.name, 'Shamble');
  assert.equal(intentThreatens(s, s.enemies[0]), true);
  s.player.space = 1;
  s.enemies[0].space = 7;
  assert.equal(intentThreatens(s, s.enemies[0]), false, 'too far to reach');
});

// ------------------------------------------------------------- run layer

test('hand cycling keeps a played card out for a couple of turns', () => {
  const run = newRun(5);
  resetPiles(run);
  const h = currentHand(run);
  cyclePlay(run, h.bases[0], h.styles[0]);
  assert.ok(!currentHand(run).bases.includes(h.bases[0]));
  assert.ok(!currentHand(run).styles.includes(h.styles[0]));
});

test('rewards add cards to the deck and healing is capped', () => {
  const run = newRun(9);
  run.life = 18;
  const opts = rewardOptions(run);
  assert.ok(opts.length >= 2);
  const card = opts.find((o) => o.kind === 'base' || o.kind === 'style');
  const sizeBefore = run.deck.bases.length + run.deck.styles.length;
  takeReward(run, card);
  assert.equal(run.deck.bases.length + run.deck.styles.length, sizeBefore + 1);
  takeReward(run, { kind: 'heal', amount: 6 });
  assert.equal(run.life, 20, 'healing cannot exceed max life');
});

test('reward options never offer a card already owned', () => {
  const run = newRun(3);
  for (let i = 0; i < 5; i++) {
    for (const o of rewardOptions(run)) {
      if (o.kind === 'base') assert.ok(!run.deck.bases.includes(o.id));
      if (o.kind === 'style') assert.ok(!run.deck.styles.includes(o.id));
    }
    const o = rewardOptions(run).find((x) => x.kind !== 'heal');
    if (o) takeReward(run, o);
  }
});

test('the boss reacts to range instead of looping blindly', () => {
  const s = mkState([{ type: 'warden', space: 5 }], 1);
  const far = s.enemies[0].intent.name;
  s.player.space = 4;              // now adjacent-ish
  telegraph(s);
  const near = s.enemies[0].intent.name;
  assert.notEqual(far, near, 'boss changed its telegraph with the board state');
});

test('a full scripted run of every encounter stays consistent', () => {
  const run = newRun(77);
  const plays = [['drive', 'powerful'], ['strike', 'powerful'], ['shot', 'reaching'], ['parry', 'grinding']];
  let guard = 0;
  for (const enc of [
    { name: 'a', playerSpace: 2, enemies: [{ type: 'husk', space: 6 }] },
    { name: 'b', playerSpace: 4, enemies: [{ type: 'stalker', space: 1 }, { type: 'husk', space: 7 }] },
    { name: 'c', playerSpace: 1, enemies: [{ type: 'warden', space: 5 }] },
  ]) {
    const s = startEncounter(run, enc);
    for (let t = 0; t < 30 && !s.over; t++) {
      const [b, st] = plays[t % plays.length];
      resolveTurn(s, { baseId: b, styleId: st });
      guard++;
      assert.ok(s.player.life <= s.player.maxLife);
    }
  }
  assert.ok(guard > 0);
});
