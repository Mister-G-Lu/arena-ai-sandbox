import { flickerClass } from './HudFrame';

export function Header({ flicker }: { flicker: boolean }) {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a className={`brand ${flickerClass(flicker)}`.trim()} href="#top">
          FALSE <span className="brand-reality">REALITY</span>
        </a>
        <span className="brand-sub">Meridian Municipal Authority</span>
        <nav className="site-nav" aria-label="Main">
          <a href="#job">The Job</a>
          <a href="#city">The City</a>
          <a href="#shift">Your Shift</a>
          <a href="#memos">Memos</a>
        </nav>
      </div>
    </header>
  );
}
