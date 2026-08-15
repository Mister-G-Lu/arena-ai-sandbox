import React, { useState, useEffect } from 'react';

const BOOT_LINES = [
  '> MERIDIAN CENTRAL DISPATCH',
  '> TERMINAL v0.41.312',
  '> ──────────────────────────────',
  '> HARDWARE CHECK ........... <em>OK</em>',
  '> NETWORK LINK ............. <em>ESTABLISHED</em>',
  '> ROSTER SYNC .............. <em>1 OPERATOR PENDING</em>',
  '> SHIFT WINDOW ............ 01:00–06:00',
  '> COFFEE STATUS ........... <em>WARM</em>',
  '> MEMORY INTEGRITY ......... <em>UNVERIFIED</em>',
  '> ──────────────────────────────',
  '> LOADING ORIENTATION PROTOCOL...',
];

export default function OrientTerminalBoot({ onComplete }) {
  const [bootLines, setBootLines] = useState([]);
  const [bootIndex, setBootIndex] = useState(0);
  const [phase, setPhase] = useState('booting'); // booting, ready

  useEffect(() => {
    if (phase === 'booting' && bootIndex < BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setBootLines(prev => [...prev, BOOT_LINES[bootIndex]]);
        setBootIndex(bootIndex + 1);
      }, 100);
      return () => clearTimeout(timer);
    } else if (phase === 'booting' && bootIndex === BOOT_LINES.length) {
      setTimeout(() => setPhase('ready'), 800);
    }
  }, [phase, bootIndex]);

  return (
    <div className="orient-terminal">
      <div className="orient-head">
        <span className="dot dot-amber"></span>
        MERIDIAN CENTRAL DISPATCH — SYSTEM BOOT
        <span className="orient-status">BOOTING</span>
      </div>
      <div className="orient-screen">
        <div className="boot-sequence">
          {bootLines.map((line, i) => (
            <div key={i} className="boot-line" dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>

        {phase === 'ready' && (
          <div className="orient-stage">
            <div className="orient-content">
              <span className="blink-cursor">▌</span> SYSTEM READY
            </div>
            <button className="btn btn-primary" onClick={onComplete}>
              ▸ CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
