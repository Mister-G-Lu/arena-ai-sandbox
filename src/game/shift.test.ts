import { beforeEach, describe, expect, it } from 'vitest';
import { resetIds } from '../utils/id';
import {
  createShift,
  healLine,
  nextShift,
  parseShift,
  performTask,
} from './shift';
import { MAX_TASKS, SHIFT_COMPLETE_LINE, SHIFT_END_MINUTES, SHIFT_START_LINE } from './snippets';

const noRand = () => 0.99; // never glitch (0.99 > 0.06)

beforeEach(() => {
  resetIds(0);
});

describe('createShift', () => {
  it('opens on day 4 at 01:00 with 50 tasks and a system line', () => {
    const s = createShift();
    expect(s.day).toBe(4);
    expect(s.tasks).toBe(MAX_TASKS);
    expect(s.minutes).toBe(60);
    expect(s.complete).toBe(false);
    expect(s.log[0]?.text).toBe(SHIFT_START_LINE);
    expect(s.log[0]?.kind).toBe('system');
  });
});

describe('performTask', () => {
  it('decrements tasks and advances the clock 6 minutes', () => {
    const s = performTask(createShift(), { reducedMotion: true, rand: noRand });
    expect(s.tasks).toBe(49);
    expect(s.minutes).toBe(66);
    expect(s.log.at(-1)?.kind).toBe('routine');
  });

  it('is a no-op when complete', () => {
    const done = { ...createShift(), tasks: 0, complete: true };
    expect(performTask(done, { reducedMotion: true })).toBe(done);
  });

  it('writes a corrupt line that knows how to heal', () => {
    const s = performTask(createShift(), { reducedMotion: false, rand: () => 0, snippet: 'hello' });
    const line = s.log.at(-1);
    expect(line?.kind).toBe('corrupt');
    expect(line?.healTo).toBe('hello');
    expect(line?.text).not.toBe('hello');
    const healed = healLine(s, line!.id);
    expect(healed.log.at(-1)?.kind).toBe('routine');
    expect(healed.log.at(-1)?.text).toBe('hello');
    expect(healLine(s, 'missing')).toEqual(s);
  });

  it('never glitches under reduced motion even if rand says so', () => {
    const s = performTask(createShift(), { reducedMotion: true, rand: () => 0, snippet: 'ok' });
    expect(s.log.at(-1)?.kind).toBe('routine');
    expect(s.log.at(-1)?.text).toBe('ok');
  });

  it('completes the shift on the 50th task', () => {
    let s = createShift();
    for (let i = 0; i < 50; i++) {
      s = performTask(s, { reducedMotion: true, rand: noRand, snippet: 'tick' });
    }
    expect(s.complete).toBe(true);
    expect(s.tasks).toBe(0);
    expect(s.minutes).toBe(SHIFT_END_MINUTES);
    expect(s.log.at(-1)?.text).toBe(SHIFT_COMPLETE_LINE);
    expect(performTask(s, { reducedMotion: true })).toBe(s);
  });
});

describe('nextShift', () => {
  it('increments the day and resets the tank of tasks', () => {
    const s = nextShift({ ...createShift(), day: 7, complete: true, tasks: 0 });
    expect(s.day).toBe(8);
    expect(s.tasks).toBe(50);
    expect(s.complete).toBe(false);
  });
});

describe('parseShift', () => {
  it('returns a fresh shift on garbage', () => {
    expect(parseShift(null).day).toBe(4);
    expect(parseShift('x').day).toBe(4);
  });
  it('keeps valid fields and drops bad log lines', () => {
    const s = parseShift({
      day: 9,
      tasks: 3,
      minutes: 200,
      complete: false,
      log: [{ id: 'a', clock: '01:00', text: 'hi', kind: 'routine' }, { nope: true }],
    });
    expect(s.day).toBe(9);
    expect(s.tasks).toBe(3);
    expect(s.minutes).toBe(200);
    expect(s.log).toHaveLength(1);
  });
  it('marks complete when tasks hit 0', () => {
    expect(parseShift({ day: 1, tasks: 0, minutes: 360, log: [] }).complete).toBe(true);
  });
  it('falls back individual fields that are not finite', () => {
    const s = parseShift({
      day: Number.NaN,
      tasks: Number.POSITIVE_INFINITY,
      minutes: 'x',
      complete: true,
      log: 'nope',
    });
    expect(s.day).toBe(4);
    expect(s.tasks).toBe(50);
    expect(s.minutes).toBe(60);
    expect(s.complete).toBe(true);
    expect(s.log[0]?.kind).toBe('system');
  });
  it('clamps negative tasks to 0', () => {
    expect(parseShift({ day: 2, tasks: -3, minutes: 10, log: [] }).tasks).toBe(0);
  });
});
