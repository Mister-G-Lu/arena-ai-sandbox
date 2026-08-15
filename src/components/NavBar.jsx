import React from 'react';

const NAV_ITEMS = [
  { page: 'home', icon: '⌂', label: 'HOME' },
  { page: 'directive', icon: '▸', label: 'DIRECTIVE' },
  { page: 'grid', icon: '◫', label: 'GRID' },
  { page: 'first-shift', icon: '◈', label: 'FIRST SHIFT' },
  { page: 'console', icon: '▣', label: 'CONSOLE' },
  { page: 'bulletin', icon: '▤', label: 'BULLETIN' },
  { page: 'profile', icon: '◉', label: 'PROFILE' },
];

export default function NavBar({ currentPage, onNavigate }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function handleClick(page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <>
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); handleClick('home'); }}>
            FALSE<span className="brand-reality">//</span>REALITY
          </a>
          <span className="brand-sub">v0.41.312</span>
        </div>
        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              className={`nav-link${currentPage === item.page ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); handleClick(item.page); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot"></span>
            <span className="status-text">LINK ACTIVE</span>
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
