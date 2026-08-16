import { describe, expect, it } from 'vitest';
import {
  attentionTone,
  clampQuality,
  describeEffects,
  normalizeEffects,
  qualityDef,
  visibleQualityDefs,
} from './qualities';

describe('qualities', () => {
  it('normalises storylet JSON names to save-file keys', () => {
    expect(normalizeEffects({ Doubt: 1, Attention: 2 })).toEqual({ doubt: 1, attention: 2 });
  });

  it('drops unknown, zero and non-finite effects', () => {
    expect(normalizeEffects({ Nonsense: 3, Doubt: 0, Perception: Number.NaN, Routine: 1 }))
      .toEqual({ routine: 1 });
    expect(normalizeEffects(null)).toEqual({});
    expect(normalizeEffects(['Doubt'])).toEqual({});
  });

  it('never answers a lookup from the prototype chain', () => {
    // A plain-object table answers inherited members truthy: every caller
    // reads that as "the table knows this quality".
    expect(qualityDef('__proto__')).toBeUndefined();
    expect(qualityDef('constructor')).toBeUndefined();
    expect(qualityDef('toString')).toBeUndefined();
    expect(qualityDef('Doubt')).toBeDefined();
  });

  it('drops prototype-named forged effects instead of minting a junk bucket', () => {
    // JSON.parse is the realistic entry point: it gives __proto__ as an own
    // key, where an object literal would shadow the prototype instead.
    const forged = JSON.parse('{"__proto__": 5, "constructor": 3, "Doubt": 2}');
    const normalized = normalizeEffects(forged);
    expect(normalized).toEqual({ doubt: 2 });
    expect(Object.keys(normalized)).not.toContain('undefined');
  });

  it('clamps to each quality\u2019s own maximum', () => {
    expect(clampQuality('doubt', 9)).toBe(5);
    expect(clampQuality('attention', 99)).toBe(10);
    expect(clampQuality('doubt', -3)).toBe(0);
    expect(clampQuality('salary', 10 ** 9)).toBe(10 ** 9);
  });

  it('describes an outcome without leaking hidden qualities', () => {
    expect(describeEffects({ Doubt: 1, Attention: 1 })).toBe('Doubt +1');
    expect(describeEffects({ Routine: 1, Perception: -1 })).toBe('Perception -1 · Routine +1');
    expect(describeEffects(undefined)).toBe('');
    // Salary is shown in the currency the player receives, at its declared rate.
    expect(describeEffects({ Routine: 1, Salary: 2 })).toBe('Routine +1 · ¤+10');
  });

  it('hides Attention from the visible table', () => {
    expect(visibleQualityDefs().map((d) => d.key)).not.toContain('attention');
    expect(qualityDef('ATTENTION')?.hidden).toBe(true);
  });

  it('turns Attention into tone, never a number', () => {
    expect(attentionTone(0)).toBe('Polite');
    expect(attentionTone(4)).toContain('Courteous');
    expect(attentionTone(9)).toContain('Warm');
  });
});
