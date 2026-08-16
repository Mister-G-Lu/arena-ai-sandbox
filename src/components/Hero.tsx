import { HoloPlanet } from './HoloPlanet';
import { HudFrame, flickerClass } from './HudFrame';

export function Hero({ flicker }: { flicker: boolean }) {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Meridian Central Dispatch — now hiring</p>
          <h1>The city runs because you answer.</h1>
          <p className="lede">
            We&apos;re looking for night operators. Fifty tasks a shift. One hundred percent
            attendance. The coffee is always warm.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#shift">
              Clock in for tonight&apos;s shift
            </a>
            <a className="btn btn-ghost" href="#memos">
              Read the memos
            </a>
          </div>
          <p className="fine">
            Night differential paid · 01:00–06:00 · No missed shift in one hundred years
          </p>
        </div>

        <HudFrame as="figure" className="hero-art">
          <HoloPlanet />
          <figcaption className={flickerClass(flicker)}>
            MERIDIAN — HOLO PROJECTION · RENDER 0.41.312
          </figcaption>
        </HudFrame>
      </div>
    </section>
  );
}
