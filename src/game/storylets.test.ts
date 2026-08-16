import { describe, expect, it } from 'vitest';
import {
  SchemaError,
  validateChoice,
  validateOutcome,
  validateStoryGraph,
  validateStorylet,
  type Storylet,
} from './storylets';

const base = {
  id: 'routine-01',
  zone: 'routine',
  title: 'Building 7, basement light',
  body: 'The chair is warm.',
  choices: [
    {
      id: 'sit',
      label: 'File it.',
      outcome: { text: 'You sit.', qualities: { Routine: 1 } },
      next: 'routine-02',
    },
  ],
};

describe('validateStorylet', () => {
  it('accepts a valid card', () => {
    const s = validateStorylet(base);
    expect(s.id).toBe('routine-01');
    expect(s.choices[0]?.next).toBe('routine-02');
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
            label: 'File it.',
            outcome: { text: 'You sit.', next: 'routine-02' },
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

describe('validateStoryGraph', () => {
  const first = validateStorylet(base);
  const second = validateStorylet({
    ...base,
    id: 'routine-02',
    title: 'Continue',
    choices: [{ id: 'done', label: 'Done', outcome: { text: 'Done.' }, completeZone: true }],
  });

  it('accepts a closed graph and verifies configured entry points', () => {
    expect(validateStoryGraph([first, second], { routine: 'routine-01' })).toEqual([
      first,
      second,
    ]);
  });

  it('rejects duplicate cards and choices', () => {
    expect(() => validateStoryGraph([first, first])).toThrow(/duplicate storylet/);
    expect(() =>
      validateStoryGraph([
        {
          ...second,
          choices: [second.choices[0], second.choices[0]],
        },
      ]),
    ).toThrow(/duplicate choice/);
  });

  it('rejects missing, cross-zone, and ambiguous transitions', () => {
    expect(() => validateStoryGraph([first])).toThrow(/missing routine-02/);
    expect(() =>
      validateStoryGraph([
        first,
        { ...second, zone: 'floor12' },
      ]),
    ).toThrow(/crosses/);
    expect(() =>
      validateStoryGraph([
        {
          ...second,
          choices: [{
            id: 'ambiguous',
            label: 'Both',
            outcome: { text: 'No.' },
            endZone: true,
            completeZone: true,
          }],
        },
      ]),
    ).toThrow(/exactly one/);
  });

  it('rejects unknown effects and invalid zone entries', () => {
    const badEffect = {
      ...second,
      choices: [{
        id: 'bad',
        label: 'Bad.',
        outcome: { text: 'Bad.', qualities: { TypoQuality: 1 } },
        endZone: true,
      }],
    };
    expect(() => validateStoryGraph([badEffect])).toThrow(/unknown effect/);
    expect(() => validateStoryGraph([first, second], { routine: 'missing' })).toThrow(/entry/);
    const floorCard: Storylet = { ...second, id: 'floor12-01', zone: 'floor12' };
    expect(() => validateStoryGraph([first, second, floorCard], {
      routine: 'floor12-01',
    })).toThrow(/belongs/);
  });
});
