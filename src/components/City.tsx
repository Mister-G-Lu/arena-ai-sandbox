import { WEATHER_CLEAR } from '../game/glitch';
import { HudFrame, flickerClass } from './HudFrame';

const STATS = [
  { num: '41,312', lbl: 'Population · holding steady' },
  { num: '100', lbl: 'Years · founded, to the day' },
  { num: '9', lbl: 'Sectors · all on the map' },
  { num: '100.0%', lbl: 'On-time performance' },
];

export function City({
  flickerStat,
  weatherOverride,
}: {
  flickerStat: boolean;
  weatherOverride: string | null;
}) {
  return (
    <section id="city" className="section section-alt">
      <div className="wrap">
        <h2>The City</h2>
        <p className="section-lede">
          Meridian, by the numbers. The numbers never change. That&apos;s how you know they&apos;re
          right.
        </p>
        <div className="stats">
          {STATS.map((s, i) => (
            <HudFrame key={s.lbl} className="stat">
              <div className={`num ${flickerClass(flickerStat && i === 0)}`.trim()}>{s.num}</div>
              <div className="lbl">{s.lbl}</div>
            </HudFrame>
          ))}
        </div>
        <p className="city-weather" id="city-weather">
          Tonight&apos;s forecast:{' '}
          {weatherOverride ?? `${WEATHER_CLEAR.replace('Clear', 'clear')}.`}
        </p>
      </div>
    </section>
  );
}
