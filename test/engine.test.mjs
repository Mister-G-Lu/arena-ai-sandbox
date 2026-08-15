import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA_SIZE,
  BASE_BY_ID,
  STYLE_BY_ID,
  combine,
  newGame,
  resolveTurn,
  distance,
  chooseAI,
  hand,
} from '../src/engine.js';

test('Powerful Drive combines as specified', () => {
  const atk = combine(BASE_BY_ID.drive, STYLE_BY_ID.powerful);
  assert.deepEqual(atk.range, [1, 1]);
  assert.equal(atk.att, 4);
  assert.equal(atk.spd, 5);
  assert.deepEqual(atk.before, [{ k: 'advance', min: 1, max: 2 }]);
});

test('range modifiers widen the band', () => {
  const atk = combine(BASE_BY_ID.shot, STYLE_BY_ID.reaching);
  assert.deepEqual(atk.range, [2, 6]);
  assert.equal(atk.att, 2);
});

test('Drive advance closes distance and connects', () => {
  const g = newGame({ seed: 7 });
  g.players[0].space = 2;
  g.players[1].space = 4;
  resolveTurn(g, [
    { baseId: 'drive', styleId: 'powerful', picks: { advance: 1 } },
    { baseId: 'spike', styleId: 'burning' },
  ]);
  assert.equal(g.players[1].life, 18 - 4);
});

test('faster attacker resolves first and stun cancels the reply', () => {
  const g = newGame({ seed: 3 });
  g.players[0].space = 3;
  g.players[1].space = 4;
  resolveTurn(g, [
    { baseId: 'grasp', styleId: 'sudden' }, // spd 7, stuns on hit
    { baseId: 'strike', styleId: 'powerful' }, // spd 6
  ]);
  assert.equal(g.players[0].life, 18, 'stunned foe deals no damage');
  assert.ok(g.players[1].life < 18);
});

test('guard absorbs damage', () => {
  const g = newGame({ seed: 5 });
  g.players[0].space = 3;
  g.players[1].space = 4;
  resolveTurn(g, [
    { baseId: 'strike', styleId: 'grinding' }, // 3 guard, att 4, spd 5
    { baseId: 'strike', styleId: 'burning' }, // att 6, spd 2
  ]);
  assert.equal(g.players[0].life, 18 - 3, '6 att - 3 guard');
});

test('players never occupy the same space and stay on the board', () => {
  const g = newGame({ seed: 11 });
  for (let t = 0; t < 40 && g.winner === null; t++) {
    const a = chooseAI(g, 0);
    const b = chooseAI(g, 1);
    resolveTurn(g, [a, b]);
    const [p, q] = g.players;
    assert.notEqual(p.space, q.space);
    for (const x of g.players) {
      assert.ok(x.space >= 1 && x.space <= ARENA_SIZE, `space ${x.space}`);
    }
  }
});

test('hands cycle: a card played is unavailable next turn', () => {
  const g = newGame({ seed: 2 });
  const first = hand(g.players[0]);
  const played = { baseId: first.bases[0], styleId: first.styles[0] };
  resolveTurn(g, [played, { baseId: 'strike', styleId: 'powerful' }]);
  const next = hand(g.players[0]);
  assert.ok(!next.bases.includes(played.baseId));
  assert.ok(!next.styles.includes(played.styleId));
});

test('AI vs AI games terminate with a winner most of the time', () => {
  let decided = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const g = newGame({ seed });
    for (let t = 0; t < 40 && g.winner === null; t++) {
      resolveTurn(g, [chooseAI(g, 0), chooseAI(g, 1)]);
    }
    if (g.winner !== null) decided++;
  }
  assert.ok(decided >= 10, `only ${decided}/12 games ended`);
});

test('distance helper matches board state', () => {
  const g = newGame({ seed: 1 });
  assert.equal(distance(g), Math.abs(g.players[0].space - g.players[1].space));
});
