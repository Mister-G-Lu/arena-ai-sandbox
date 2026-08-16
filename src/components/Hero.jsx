import React, { useState } from 'react';
import { useGameState } from '../context/GameStateContext';

const SECTORS = [
  { id: 1, status: 'NOMINAL', signal: 'Street grid synchronized.' },
  { id: 2, status: 'NOMINAL', signal: 'No calls awaiting dispatch.' },
  { id: 3, status: 'WATCH', signal: 'Annex elevator returned an extra tone.' },
  { id: 4, status: 'NOMINAL', signal: 'Streetlight 4-B queued for review.' },
  { id: 5, status: 'QUIET', signal: 'Day crew channel is empty.' },
  { id: 6, status: 'NOMINAL', signal: 'Weather loop holding steady.' },
  { id: 7, status: 'UNLISTED', signal: 'Sector is present. Public map disagrees.' },
  { id: 8, status: 'NOMINAL', signal: 'Population ledger balanced.' },
  { id: 9, status: 'SIGNAL', signal: 'VANTABLACK reports: roads quiet. stars wrong.' }
];

const BULLETINS = [
  {
    id: '012',
    title: 'VENDING MACHINE REDESIGNATION',
    body: 'The vending machine on the third floor has been removed from the floor plan. It was not on the third floor. Do not check. — M.'
  },
  {
    id: '011',
    title: 'MUNICIPAL ANNEX FLOOR COUNT',
    body: 'The Municipal Annex contains eleven (11) floors. Reports of a twelfth (12th) floor are to be filed in the elevator. — M.'
  },
  {
    id: '010',
    title: 'OPERATOR STATUS',
    body: 'Operator status: ACTIVE. The city has noted your presence. Your presence was expected. Do not deviate from the expected. — M.'
  }
];

const DIRECTIVES = [
  ['QUOTA', '50/50', 'Every result must be acknowledged.'],
  ['ROSTER', 'CONFIRMED', 'Your entry predates your application.'],
  ['COFFEE', 'WARM', 'Preparation timestamp unavailable.'],
  ['ATTENDANCE', '100.0%', 'The record cannot be broken.']
];

export default function Hero() {
  const { state } = useGameState();
  const [selectedSector, setSelectedSector] = useState(9);
  const [selectedBulletin, setSelectedBulletin] = useState(0);
  const sector = SECTORS.find(item => item.id === selectedSector);
  const bulletin = BULLETINS[selectedBulletin];
  const shiftTarget = state.orientation.completed ? '#console' : '#first-shift';

  function revealCityFeed() {
    document.getElementById('city-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="home-page page active">
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">// CENTRAL DISPATCH — SECTOR 0 //</p>
            <h1>You were already on the roster.</h1>
            <p className="lede">
              Fifty tasks. 01:00 to 06:00. One live city feed. The coffee was waiting before you arrived.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href={shiftTarget}>
                {state.orientation.completed ? '▸ RETURN TO CONSOLE' : '▸ BEGIN FIRST SHIFT'}
              </a>
              <button className="btn btn-ghost" type="button" onClick={revealCityFeed}>
                SCAN MERIDIAN
              </button>
            </div>
            <p className="fine">
              SHIFT WINDOW: 01:00–06:00 · MISSED SHIFTS: 0/100 YEARS · CITY FEED: LIVE
            </p>
          </div>

          <figure className="hero-art">
            <svg viewBox="0 0 640 340" role="img" aria-label="Meridian skyline at night">
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#182548" />
                  <stop offset="1" stopColor="#0b1122" />
                </linearGradient>
                <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#57d6c3" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#57d6c3" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#57d6c3" stopOpacity="0" />
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
              <rect className="city-scan-line" x="0" y="112" width="640" height="2" fill="url(#scan)" />
              <line x1="462" y1="110" x2="462" y2="82" stroke="#2a3a63" strokeWidth="2" />
              <circle className="blink-red" cx="462" cy="80" r="3" fill="#ff6f6f" />
            </svg>
            <figcaption>MERIDIAN — LIVE MUNICIPAL FEED · RENDER 0.41.312</figcaption>
          </figure>
        </div>
      </section>

      <section id="city-feed" className="city-feed-section">
        <div className="wrap">
          <header className="feed-header">
            <div>
              <p className="eyebrow">// ONE DESK. THREE INCOMING CHANNELS. //</p>
              <h2>Meridian is already speaking.</h2>
            </div>
            <div className="feed-live"><span></span> LIVE FEED // TUESDAY // 01:00</div>
          </header>

          <div className="dispatch-deck">
            <article className="deck-panel directive-panel">
              <header className="deck-panel-head">
                <span>SHIFT DIRECTIVE</span>
                <span className="deck-channel">CH.01</span>
              </header>
              <div className="directive-stream">
                {DIRECTIVES.map(([label, value, detail], index) => (
                  <div className="directive-line" key={label}>
                    <span className="directive-index">0{index + 1}</span>
                    <div>
                      <span className="directive-label">{label}</span>
                      <strong>{value}</strong>
                      <small>{detail}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="deck-whisper">“operator is performing within parameters. do not intervene.” — m.</div>
            </article>

            <article className="deck-panel grid-panel">
              <header className="deck-panel-head">
                <span>MERIDIAN GRID</span>
                <span className="deck-channel">CH.02</span>
              </header>
              <div className="grid-readout-row">
                <span><strong>41,312</strong> POPULATION</span>
                <span><strong>100.0%</strong> COMPLIANCE</span>
                <span><strong>9</strong> SECTORS</span>
              </div>
              <div className="sector-map" aria-label="Select a city sector">
                {SECTORS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sector-node${selectedSector === item.id ? ' active' : ''}${item.status === 'UNLISTED' || item.status === 'SIGNAL' ? ' anomaly' : ''}`}
                    onClick={() => setSelectedSector(item.id)}
                    aria-pressed={selectedSector === item.id}
                  >
                    <span>S{item.id}</span>
                    <small>{item.status}</small>
                  </button>
                ))}
                <div className="map-sweep" aria-hidden="true"></div>
              </div>
              <div className="sector-report" aria-live="polite">
                <span>SECTOR {sector.id} // {sector.status}</span>
                <p>{sector.signal}</p>
              </div>
            </article>

            <article className="deck-panel bulletin-panel">
              <header className="deck-panel-head">
                <span>BULLETIN INTERCEPT</span>
                <span className="deck-channel">CH.03</span>
              </header>
              <div className="bulletin-inbox" role="tablist" aria-label="Municipal bulletins">
                {BULLETINS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedBulletin === index}
                    className={selectedBulletin === index ? 'active' : ''}
                    onClick={() => setSelectedBulletin(index)}
                  >
                    <span>B-{item.id}</span>
                    {item.title}
                  </button>
                ))}
              </div>
              <div className="bulletin-document" role="tabpanel" aria-live="polite">
                <span className="bulletin-stamp">ACKNOWLEDGED</span>
                <small>BULLETIN {bulletin.id} // TUESDAY</small>
                <h3>{bulletin.title}</h3>
                <p>{bulletin.body}</p>
              </div>
            </article>
          </div>

          <div className="feed-launch">
            <div>
              <span className="feed-launch-label">THE CITY FEED ENDS HERE. THE SHIFT DOES NOT.</span>
              <strong>{state.orientation.completed ? 'Your live queue is still open.' : 'Your station is ready for orientation.'}</strong>
            </div>
            <a className="btn btn-primary" href={shiftTarget}>
              {state.orientation.completed ? '▸ OPEN OPERATOR CONSOLE' : '▸ REPORT FOR FIRST SHIFT'}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
