import React from 'react';

export default function Hero() {
  return (
    <section className="hero page active">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">// CENTRAL DISPATCH — SECTOR 0 //</p>
          <h1>You were already on the roster.</h1>
          <p className="lede">Fifty tasks. 01:00 to 06:00. The coffee was waiting before you arrived.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#first-shift">▸ BEGIN SHIFT</a>
            <a className="btn btn-ghost" href="#bulletin">READ BULLETINS</a>
          </div>
          <p className="fine">SHIFT WINDOW: 01:00–06:00 · MISSED SHIFTS: 0/100 YEARS · ALL TASKS ASSIGNED</p>
        </div>

        <figure className="hero-art">
          <svg viewBox="0 0 640 340" role="img" aria-label="Meridian skyline at night">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#182548" />
                <stop offset="1" stopColor="#0b1122" />
              </linearGradient>
            </defs>
            <rect width="640" height="340" fill="url(#sky)" />
            <g fill="#a9bce8" opacity="0.75">
              <circle cx="60" cy="42" r="1.4" /><circle cx="130" cy="80" r="1" />
              <circle cx="205" cy="30" r="1.2" /><circle cx="300" cy="55" r="1" />
              <circle cx="380" cy="25" r="1.3" /><circle cx="465" cy="70" r="1" />
              <circle cx="555" cy="38" r="1.2" /><circle cx="620" cy="90" r="1" />
              <circle cx="95" cy="120" r="1" />
            </g>
            <circle cx="540" cy="70" r="34" fill="#ece3c6" opacity="0.08" />
            <circle cx="540" cy="70" r="24" fill="#ece3c6" opacity="0.92" />
            <g fill="#0f1830" stroke="#1d2a4d" strokeWidth="1">
              <rect x="28" y="170" width="70" height="170" />
              <rect x="108" y="140" width="54" height="200" />
              <rect x="172" y="190" width="78" height="150" />
              <rect x="260" y="120" width="86" height="220" />
              <rect x="356" y="160" width="60" height="180" />
              <rect x="426" y="110" width="72" height="230" />
              <rect x="508" y="150" width="52" height="190" />
              <rect x="570" y="180" width="70" height="160" />
            </g>
            <g fill="#ffc66b" opacity="0.85">
              <rect x="40" y="185" width="6" height="8" /><rect x="56" y="205" width="6" height="8" /><rect x="72" y="225" width="6" height="8" />
              <rect x="120" y="155" width="6" height="8" /><rect x="140" y="185" width="6" height="8" /><rect x="130" y="245" width="6" height="8" />
              <rect x="188" y="205" width="6" height="8" /><rect x="210" y="235" width="6" height="8" /><rect x="228" y="265" width="6" height="8" />
              <rect x="278" y="140" width="6" height="8" /><rect x="300" y="170" width="6" height="8" /><rect x="322" y="205" width="6" height="8" /><rect x="290" y="255" width="6" height="8" />
              <rect x="370" y="175" width="6" height="8" /><rect x="392" y="215" width="6" height="8" /><rect x="382" y="265" width="6" height="8" />
              <rect x="440" y="130" width="6" height="8" /><rect x="466" y="160" width="6" height="8" /><rect x="452" y="210" width="6" height="8" /><rect x="474" y="250" width="6" height="8" />
              <rect x="520" y="165" width="6" height="8" /><rect x="534" y="215" width="6" height="8" /><rect x="540" y="265" width="6" height="8" />
              <rect x="584" y="195" width="6" height="8" /><rect x="612" y="235" width="6" height="8" /><rect x="596" y="275" width="6" height="8" />
            </g>
            <line x1="462" y1="110" x2="462" y2="82" stroke="#2a3a63" strokeWidth="2" />
            <circle className="blink-red" cx="462" cy="80" r="3" fill="#ff6f6f" />
          </svg>
          <figcaption>MERIDIAN — NIGHT VIEW · RENDER 0.41.312</figcaption>
        </figure>
      </div>
    </section>
  );
}
