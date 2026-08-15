import { describe, expect, it } from 'vitest';
import {
  AMBIENT_MAX_MS,
  AMBIENT_MIN_MS,
  AMBIENT_TARGETS,
  CORRUPT_LINES,
  GLITCH_CHANCE,
  HEAL_MS,
  flickerDuration,
  healDelay,
  hintGlitchDuration,
  nextAmbientDelay,
  pickAmbientTarget,
  pickCorrupt,
  shouldGlitch,
  weatherStaticDuration,
} from './glitch';

describe('shouldGlitch', () => {
  it('never glitches under reduced motion', () => {
    expect(shouldGlitch(true, () => 0)).toBe(false);
  });
  it('glitches at the 6% threshold', () => {
    expect(shouldGlitch(false, () => GLITCH_CHANCE - 0.001)).toBe(true);
    expect(shouldGlitch(false, () => GLITCH_CHANCE)).toBe(false);
  });
});

describe('picks', () => {
  it('pickCorrupt stays inside the list', () => {
    expect(CORRUPT_LINES).toContain(pickCorrupt(() => 0));
    expect(CORRUPT_LINES).toContain(pickCorrupt(() => 0.99));
  });
  it('pickAmbientTarget stays inside the list', () => {
    expect(AMBIENT_TARGETS).toContain(pickAmbientTarget(() => 0));
    expect(AMBIENT_TARGETS).toContain(pickAmbientTarget(() => 0.99));
  });
});

describe('timings', () => {
  it('heal is ~950ms', () => {
    expect(healDelay()).toBe(HEAL_MS);
  });
  it('ambient delay is in 25–50s', () => {
    expect(nextAmbientDelay(() => 0)).toBe(AMBIENT_MIN_MS);
    expect(nextAmbientDelay(() => 1)).toBe(AMBIENT_MAX_MS);
    const mid = nextAmbientDelay(() => 0.5);
    expect(mid).toBeGreaterThan(AMBIENT_MIN_MS);
    expect(mid).toBeLessThan(AMBIENT_MAX_MS);
  });
  it('fx durations are brief', () => {
    expect(flickerDuration()).toBe(400);
    expect(weatherStaticDuration()).toBe(420);
    expect(hintGlitchDuration()).toBe(520);
  });
});
