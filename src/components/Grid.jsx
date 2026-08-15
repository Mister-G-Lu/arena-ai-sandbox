import React from 'react';

export default function Grid() {
  return (
    <section className="section section-alt page active">
      <div className="wrap">
        <h2>MERIDIAN GRID</h2>
        <p className="section-lede">
          The city is a number. The number has not changed.
          If you observe a different number, file a report. The report will not be read.
        </p>

        <div className="stats">
          <div className="stat"><div className="num">41,312</div><div className="lbl">POPULATION // UNCHANGED</div></div>
          <div className="stat"><div className="num">100</div><div className="lbl">YEARS // FOUNDED TODAY</div></div>
          <div className="stat"><div className="num">9</div><div className="lbl">SECTORS // ALL MAPPED</div></div>
          <div className="stat"><div className="num">100.0%</div><div className="lbl">COMPLIANCE RATE</div></div>
        </div>

        <p className="city-weather">// FORECAST: CLEAR UNTIL 06:00. AFTER 06:00: N/A.</p>
      </div>
    </section>
  );
}
