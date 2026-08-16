import React, { useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { ACTION_CAP } from '../game/actions';
// City artwork: Pixabay (Gam-Ol, image 7088420, "City View, Night, Digital Art")
// — Pixabay Content License, free for use, no attribution required.
import meridianCity from '../assets/meridian-city.jpg';

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
  ['BUDGET', `${ACTION_CAP} ACTIONS`, 'One returns every ten minutes. Always.'],
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
            <p className="hero-vista">
              Outside, the neon skylines are filled with hovercars threatening to break past the speed limit. Police cutters wail overhead, chasing the delivery drones that stitch the night in quiet, obedient lines. You are not out there. You are at the desk that authorizes it — a dispatcher, not a driver — and the city only moves when you say it did.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href={shiftTarget}>
                {state.orientation.completed ? '▸ RETURN TO CONSOLE' : '▸ BEGIN FIRST SHIFT'}
              </a>
              <button className="btn btn-ghost" type="button" onClick={revealCityFeed}>
                Look around the city
              </button>
            </div>
            <p className="hero-reassure">
              A free story game that runs right in your browser. No download, no
              sign-up — your first shift takes a few minutes, and progress saves itself.
            </p>
            <p className="fine">
              SHIFT WINDOW: 01:00–06:00 · CITY FEED: LIVE
            </p>
          </div>

          <figure className="hero-art">
            <div className="feed-frame">
              <img
                src={meridianCity}
                alt="Meridian at night — dark towers under a striped municipal sun"
                width="640"
                height="360"
                decoding="async"
              />
              <div className="feed-scanline" aria-hidden="true"></div>
              <span className="feed-rec" aria-hidden="true"><i></i> REC</span>
            </div>
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

          <div className="feed-vista" aria-hidden="true">
            <p>
              <strong>01:00 — EXTERNAL FEED:</strong> The neon skylines bleed into rain-slick glass. Hovercars ride their lanes too fast, a river of light that never quite keeps the limit. Delivery drones thread the gaps in quiet lines. A police cutter holds over the annex, searchlight painting floor 11 amber — holding on nothing, holding too long. The towers breathe. You file.
            </p>
            <span>YOU ARE NOT IN THE SKY. YOU ARE AT THE DESK THAT SAYS THE SKY IS CLEAR.</span>
          </div>

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
