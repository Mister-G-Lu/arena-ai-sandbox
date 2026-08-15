import { chance, pick, type Rand, nativeRand } from '../utils/random';

export const GLITCH_CHANCE = 0.06;
export const HEAL_MS = 950;
export const AMBIENT_MIN_MS = 25_000;
export const AMBIENT_MAX_MS = 50_000;

export const CORRUPT_LINES = [
  '▓▓▓ sector ▓▓9▓▓▓ — all clear ▓▓',
  'there is no building 7. there is no building 7.',
  'population: 41,31▓ — unchan6ed. forever.',
  'you are not supposed to remember this',
  '██ 06:00 ██ — do not be awake ██',
] as const;

export const AMBIENT_TARGETS = ['brand', 'weather', 'stat', 'hint', 'caption'] as const;
export type AmbientTarget = (typeof AMBIENT_TARGETS)[number];

export const HINT_GLITCH = 'you are not supposed to remember this.';
export const WEATHER_STATIC = '…static…';
export const WEATHER_CLEAR = 'Clear skies until 06:00';

export function shouldGlitch(reducedMotion: boolean, rand: Rand = nativeRand): boolean {
  if (reducedMotion) return false;
  return chance(GLITCH_CHANCE, rand);
}

export function pickCorrupt(rand: Rand = nativeRand): string {
  return pick(CORRUPT_LINES, rand);
}

export function pickAmbientTarget(rand: Rand = nativeRand): AmbientTarget {
  return pick(AMBIENT_TARGETS, rand);
}

export function nextAmbientDelay(rand: Rand = nativeRand): number {
  return AMBIENT_MIN_MS + rand() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
}

export function healDelay(): number {
  return HEAL_MS;
}

export function flickerDuration(): number {
  return 400;
}

export function weatherStaticDuration(): number {
  return 420;
}

export function hintGlitchDuration(): number {
  return 520;
}
