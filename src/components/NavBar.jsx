import React from 'react';
import { useGameState } from '../context/GameStateContext';

export default function NavBar({ currentPage, onNavigate }) {
  const { state } = useGameState();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = [
    { page: 'home', icon: '⌂', label: 'HOME' },
    state.orientation.completed
      ? { page: 'console', icon: '▣', label: 'CONSOLE' }
      : { page: 'first-shift', icon: '◈', label: 'FIRST SHIFT' },
    { page: 'profile', icon: '◉', label: 'PROFILE' },
  ];

  function handleClick(page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <>
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
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
