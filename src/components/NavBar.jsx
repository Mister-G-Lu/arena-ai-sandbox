import React from 'react';
import { useGameState } from '../context/GameStateContext';

export default function NavBar({ currentPage, onNavigate }) {
  const { state } = useGameState();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Nav is derived from state: a destination appears the moment it exists.
  const navItems = [
    { page: 'home', icon: '⌂', label: 'HOME' },
    state.orientation.completed
      ? { page: 'console', icon: '▣', label: 'CONSOLE' }
      : { page: 'first-shift', icon: '◈', label: 'FIRST SHIFT' },
    state.promotion.unlocks.includes('notice-storylets')
      ? { page: 'notices', icon: '✦', label: 'NOTICES' }
      : null,
    state.day >= 2
      ? {
          page: 'investigations',
          icon: '⌕',
          label: state.zones['annex-order'] !== 'complete'
            ? 'INVESTIGATIONS · NEW'
            : 'INVESTIGATIONS'
        }
      : null,
    { page: 'profile', icon: '◉', label: 'PROFILE' },
  ].filter(Boolean);

  function handleClick(page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <>
      <aside id="site-nav" className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); handleClick('home'); }}>
            FALSE<span className="brand-reality">//</span>REALITY
          </a>
          <span className="brand-sub">v0.41.312</span>
        </div>
        <nav className="sidebar-nav" aria-label="Main">
          {navItems.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              className={`nav-link${currentPage === item.page ? ' active' : ''}`}
              aria-current={currentPage === item.page ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); handleClick(item.page); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot"></span>
            <span className="status-text">
              {state.orientation.completed ? 'OPERATOR LINK ACTIVE' : 'ORIENTATION REQUIRED'}
            </span>
          </div>
        </div>
      </aside>

      <button
        className={`mobile-menu-toggle${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        aria-controls="site-nav"
      >
        <span></span><span></span><span></span>
      </button>

      <div
        className={`sidebar-overlay${mobileOpen ? ' show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
    </>
  );
}
