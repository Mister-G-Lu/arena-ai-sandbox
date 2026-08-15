import { useEffect, useState } from 'react';
import {
  HINT_GLITCH,
  WEATHER_STATIC,
  flickerDuration,
  hintGlitchDuration,
  nextAmbientDelay,
  pickAmbientTarget,
  weatherStaticDuration,
  type AmbientTarget,
} from '../game/glitch';

export interface GlitchFx {
  flicker: AmbientTarget | null;
  weatherOverride: string | null;
  hintOverride: string | null;
}

const IDLE: GlitchFx = { flicker: null, weatherOverride: null, hintOverride: null };

export function useGlitch(reducedMotion: boolean): GlitchFx {
  const [fx, setFx] = useState<GlitchFx>(IDLE);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const timeouts: number[] = [];

    const schedule = () => {
      const delay = nextAmbientDelay();
      const id = window.setTimeout(() => {
        if (cancelled) return;
        const target = pickAmbientTarget();
        if (target === 'weather') {
          setFx({ ...IDLE, flicker: 'weather', weatherOverride: WEATHER_STATIC });
          timeouts.push(
            window.setTimeout(() => {
              if (!cancelled) setFx(IDLE);
            }, weatherStaticDuration()),
          );
        } else if (target === 'hint') {
          setFx({ ...IDLE, flicker: 'hint', hintOverride: HINT_GLITCH });
          timeouts.push(
            window.setTimeout(() => {
              if (!cancelled) setFx(IDLE);
            }, hintGlitchDuration()),
          );
        } else {
          setFx({ ...IDLE, flicker: target });
          timeouts.push(
            window.setTimeout(() => {
              if (!cancelled) setFx(IDLE);
            }, flickerDuration()),
          );
        }
        schedule();
      }, delay);
      timeouts.push(id);
    };

    schedule();
    return () => {
      cancelled = true;
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [reducedMotion]);

  return fx;
}
