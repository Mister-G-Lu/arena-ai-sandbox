import { describe, expect, it } from 'vitest';
import {
  SchemaError,
  applyChoice,
  createProgress,
  enterZone,
  firstIdInZone,
  parseProgress,
  validateChoice,
  validateOutcome,
  validateStorylet,
  visibleQualities,
  type Storylet,
} from './storylets';

const base = {
  id: 'tutorial-01',
  zone: 'tutorial',
  title: 'Clock in',
  body: 'The chair is warm.',
  choices: [
    {
      id: 'sit',
      label: 'Sit.',
      outcome: { text: 'You sit.', qualities: { Routine: 1 } },
      next: 'tutorial-02',
    },
  ],
};

describe('validateStorylet', () => {
  it('accepts a valid card', () => {
    const s = validateStorylet(base);
    expect(s.id).toBe('tutorial-01');
    expect(s.choices[0]?.next).toBe('tutorial-02');
  });

  it('rejects unknown keys on the storylet', () => {
    expect(() => validateStorylet({ ...base, oops: true })).toThrow(SchemaError);
    expect(() => validateStorylet({ ...base, oops: true })).toThrow(/unknown key/);
  });

  it('rejects transition flags inside outcome (the exact bug)', () => {
    expect(() =>
      validateStorylet({
        ...base,
        choices: [
          {
            id: 'sit',
            label: 'Sit.',
            outcome: { text: 'You sit.', next: 'tutorial-02' },
          },
        ],
      }),
    ).toThrow(/unknown key/);
  });

  it('rejects unknown keys on the choice', () => {
    expect(() =>
      validateChoice({ id: 'a', label: 'A', outcome: { text: 't' }, extra: 1 }),
    ).toThrow(/unknown key/);
  });

  it('rejects unknown keys on the outcome', () => {
    expect(() => validateOutcome({ text: 't', flag: true })).toThrow(/unknown key/);
  });

  it('rejects a bad zone', () => {
    expect(() => validateStorylet({ ...base, zone: 'limbo' })).toThrow(/zone/);
  });

  it('rejects empty choices', () => {
    expect(() => validateStorylet({ ...base, choices: [] })).toThrow(/choices/);
  });

  it('rejects a non-object', () => {
    expect(() => validateStorylet(null)).toThrow(/object/);
    expect(() => validateStorylet([])).toThrow(/object/);
  });

  it('rejects empty strings and bad next', () => {
    expect(() => validateStorylet({ ...base, title: '' })).toThrow(/title/);
    expect(() =>
      validateChoice({ id: 'a', label: 'A', outcome: { text: 't' }, next: '' }),
    ).toThrow(/next/);
  });

  it('rejects non-boolean flags and bad qualities', () => {
    expect(() =>
      validateChoice({ id: 'a', label: 'A', outcome: { text: 't' }, endZone: 'yes' }),
    ).toThrow(/endZone/);
    expect(() =>
      validateChoice({ id: 'a', label: 'A', outcome: { text: 't' }, completeZone: 1 }),
    ).toThrow(/completeZone/);
    expect(() => validateOutcome({ text: 't', qualities: 4 })).toThrow(/qualities/);
    expect(() => validateOutcome({ text: 't', qualities: { X: 'no' } })).toThrow(/finite/);
  });
});

describe('applyChoice / progress', () => {
  const card = validateStorylet(base);

  it('applies quality deltas and follows next', () => {
    const { progress, choice } = applyChoice(createProgress(), card, 'sit');
    expect(progress.qualities.Routine).toBe(1);
    expect(progress.current?.storyletId).toBe('tutorial-02');
    expect(progress.seen).toContain('tutorial-01');
    expect(choice.id).toBe('sit');
  });

  it('does not re-add a seen id', () => {
    const start = { ...createProgress(), seen: ['tutorial-01'] };
    const { progress } = applyChoice(start, card, 'sit');
    expect(progress.seen.filter((id) => id === 'tutorial-01')).toHaveLength(1);
  });

  it('completeZone closes the zone and unlocks Floor 12 from tutorial', () => {
    const closer: Storylet = {
      ...card,
      choices: [
        {
          id: 'done',
          label: 'Done',
          outcome: { text: 'ok' },
          completeZone: true,
        },
      ],
    };
    const { progress } = applyChoice(createProgress(), closer, 'done');
    expect(progress.zones.tutorial).toBe('complete');
    expect(progress.zones.floor12).toBe('open');
    expect(progress.current).toBeNull();
  });

  it('endZone clears current without completing', () => {
    const ender: Storylet = {
      ...card,
      zone: 'routine',
      id: 'routine-01',
      choices: [{ id: 'x', label: 'X', outcome: { text: 't' }, endZone: true }],
    };
    const start = {
      ...createProgress(),
      current: { zone: 'routine' as const, storyletId: 'routine-01' },
    };
    const { progress } = applyChoice(start, ender, 'x');
    expect(progress.current).toBeNull();
    expect(progress.zones.routine).toBe('open');
  });

  it('throws on an unknown choice', () => {
    expect(() => applyChoice(createProgress(), card, 'nope')).toThrow(/unknown choice/);
  });

  it('enterZone refuses locked zones', () => {
    const p = createProgress();
    expect(enterZone(p, 'floor12', 'floor12-01')).toBe(p);
    const opened = enterZone(p, 'routine', 'routine-01');
    expect(opened.current).toEqual({ zone: 'routine', storyletId: 'routine-01' });
  });

  it('firstIdInZone returns the first matching card', () => {
    expect(firstIdInZone([card], 'tutorial')).toBe('tutorial-01');
    expect(firstIdInZone([card], 'routine')).toBeUndefined();
  });
});

describe('parseProgress / visibility', () => {
  it('returns a fresh progress on garbage', () => {
    expect(parseProgress(null).zones.tutorial).toBe('open');
    expect(parseProgress('x').current?.storyletId).toBe('tutorial-01');
  });

  it('merges finite qualities and valid zones', () => {
    const p = parseProgress({
      qualities: { Attention: 4, Perception: 2, bogus: 'no' },
      zones: { floor12: 'open', nope: 'open', tutorial: 'maybe' },
      seen: ['a', 3, 'b'],
      current: { zone: 'routine', storyletId: 'routine-01' },
    });
    expect(p.qualities.Attention).toBe(4);
    expect(p.qualities.Perception).toBe(2);
    expect(p.zones.floor12).toBe('open');
    expect(p.zones.tutorial).toBe('open');
    expect(p.seen).toEqual(['a', 'b']);
    expect(p.current).toEqual({ zone: 'routine', storyletId: 'routine-01' });
  });

  it('accepts a null current', () => {
    expect(parseProgress({ current: null }).current).toBeNull();
  });

  it('hides Attention from the rendered list', () => {
    const vis = visibleQualities({ Attention: 9, Perception: 1, Salary: 0 });
    expect(vis.map(([k]) => k)).toEqual(['Perception', 'Salary']);
    expect(vis.find(([k]) => k === 'Attention')).toBeUndefined();
  });
});
