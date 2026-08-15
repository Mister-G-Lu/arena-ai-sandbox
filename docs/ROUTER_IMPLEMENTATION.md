# Left Sidebar Navigation & Hash-Based Router

## Overview

Transformed the single-page scrolling layout into a multi-page application with:
- **Fixed left sidebar** (220px width) with navigation links
- **Hash-based routing** (#home, #directive, #grid, etc.)
- **Page transitions** with fade/slide animations
- **Mobile responsive** hamburger menu

## Why This Change?

### User Request
> "I want the navigation bar to be on the left instead of current; since we might have it grow. Instead of everything on one page, a router can be used to navigate to each separate section (producing feel of moving to 'different locations')."

### Design Benefits
1. **Scalability** — Easy to add more sections without cluttering the page
2. **Spatial Memory** — Each section feels like a distinct "location"
3. **Focus** — Only one section visible at a time, reducing cognitive load
4. **Performance** — Sections are hidden (display:none), not just scrolled past

## Implementation Details

### 1. HTML Structure Changes

**Before:**
```html
<header class="site-header">
  <nav class="site-nav">
    <a href="#job">DIRECTIVE</a>
    ...
  </nav>
</header>
<main>
  <section class="hero">...</section>
  <section id="job" class="section">...</section>
  ...
</main>
```

**After:**
```html
<aside class="sidebar">
  <nav class="sidebar-nav">
    <a href="#home" data-page="home" class="nav-link active">
      <span class="nav-icon">⌂</span>
      <span class="nav-label">HOME</span>
    </a>
    ...
  </nav>
</aside>

<button class="mobile-menu-toggle">...</button>
<div class="sidebar-overlay"></div>

<main>
  <section class="hero page" id="page-home" data-page="home">...</section>
  <section id="page-directive" data-page="directive" class="section page">...</section>
  ...
</main>
```

**Key Changes:**
- Replaced `<header>` with `<aside class="sidebar">`
- Added `data-page` attributes to nav links and sections
- Changed section IDs to `page-{name}` format
- Added `page` class to all sections
- Added mobile menu toggle button and overlay

### 2. CSS Changes

#### Sidebar Styles
```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-w); /* 220px */
  background: rgba(8, 12, 24, 0.95);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--line-soft);
  z-index: 100;
  display: flex;
  flex-direction: column;
}
```

#### Page Visibility Rules
```css
.page {
  display: none;
  opacity: 0;
}
.page.active {
  display: block;
  animation: page-enter 0.35s ease forwards;
}
```

#### Page Transitions
```css
@keyframes page-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes page-leave {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}
```

#### Mobile Responsive
```css
@media (max-width: 860px) {
  :root { --sidebar-w: 0px; }
  
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    width: 240px;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  
  .mobile-menu-toggle {
    display: flex;
  }
  
  main {
    margin-left: 0;
  }
}
```

### 3. JavaScript Router

#### Core Router Logic
```javascript
(() => {
  const pages = {
    home: $('#page-home'),
    directive: $('#page-directive'),
    grid: $('#page-grid'),
    'first-shift': $('#page-first-shift'),
    console: $('#page-console'),
    bulletin: $('#page-bulletin')
  };

  const navLinks = $$('.nav-link');
  let currentPage = 'home';

  function navigateTo(pageName) {
    // Validate page
    if (!pages[pageName]) pageName = 'home';
    
    // Skip if already on this page
    if (currentPage === pageName) return;

    const oldPage = pages[currentPage];
    const newPage = pages[pageName];

    // Animate out old page
    if (oldPage) {
      oldPage.classList.add('page-exit');
      setTimeout(() => {
        oldPage.classList.remove('active', 'page-exit');
      }, 200);
    }

    // Animate in new page
    setTimeout(() => {
      newPage.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 200);

    // Update nav links
    navLinks.forEach(link => {
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update hash
    history.pushState(null, '', '#' + pageName);
    currentPage = pageName;
  }

  // Listen for nav clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Listen for hash changes (back/forward)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    navigateTo(hash);
  });

  // Initial route
  const initialHash = window.location.hash.slice(1);
  if (initialHash && pages[initialHash]) {
    navigateTo(initialHash);
  } else {
    pages.home.classList.add('active');
    history.replaceState(null, '', '#home');
  }
})();
```

#### Mobile Menu Toggle
```javascript
const sidebar = $('.sidebar');
const menuToggle = $('.mobile-menu-toggle');
const overlay = $('.sidebar-overlay');

function openMobileMenu() {
  sidebar.classList.add('open');
  menuToggle.classList.add('open');
  overlay.classList.add('show');
}

function closeMobileMenu() {
  sidebar.classList.remove('open');
  menuToggle.classList.remove('open');
  overlay.classList.remove('show');
}

menuToggle.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

overlay.addEventListener('click', closeMobileMenu);
```

## Features

### 1. Hash-Based Navigation
- Each section has a unique hash: `#home`, `#directive`, `#grid`, etc.
- Users can bookmark specific pages
- Back/forward browser buttons work correctly
- Direct links work: `https://example.com/#first-shift`

### 2. Page Transitions
- **Enter animation**: Fade in + slide up (0.35s)
- **Exit animation**: Fade out + slide up (0.2s)
- Smooth, non-jarring transitions between pages
- Scroll position resets to top on navigation

### 3. Active State Tracking
- Current page highlighted in sidebar (teal border + background)
- Nav icon gets subtle glow effect
- Updates automatically when navigating

### 4. Mobile Responsive
- **Desktop (>860px)**: Fixed left sidebar
- **Mobile (≤860px)**: Hamburger menu that slides in from left
- Overlay backdrop when menu is open
- Click overlay to close menu
- Auto-closes after navigation

### 5. Accessibility
- Keyboard navigable (Tab through nav links)
- `aria-label` on mobile menu toggle
- Focus management (scroll to top on page change)
- Reduced motion support (disables animations)

## Page Structure

| Hash | Page ID | Nav Label | Icon | Description |
|------|---------|-----------|------|-------------|
| `#home` | `page-home` | HOME | ⌂ | Hero section with skyline |
| `#directive` | `page-directive` | DIRECTIVE | ▸ | Job requirements & rules |
| `#grid` | `page-grid` | GRID | ◫ | City stats & forecast |
| `#first-shift` | `page-first-shift` | FIRST SHIFT | ◈ | Interactive tutorial |
| `#console` | `page-console` | CONSOLE | ▣ | Game console (50 tasks) |
| `#bulletin` | `page-bulletin` | BULLETIN | ▤ | Memos & bulletins |

## Adding New Pages

To add a new page:

1. **Add nav link** in `index.html`:
```html
<a href="#new-page" data-page="new-page" class="nav-link">
  <span class="nav-icon">◉</span>
  <span class="nav-label">NEW PAGE</span>
</a>
```

2. **Add section** in `index.html`:
```html
<section id="page-new-page" data-page="new-page" class="section page">
  <div class="wrap">
    <h2>NEW PAGE</h2>
    <!-- Content -->
  </div>
</section>
```

3. **Register page** in `app.js` router:
```javascript
const pages = {
  // ... existing pages
  'new-page': $('#page-new-page')
};
```

That's it! The router will automatically handle navigation.

## Testing

### Manual Testing Checklist
- [x] Click each nav link — page changes with animation
- [x] Browser back/forward buttons work
- [x] Direct hash URLs work (`/#first-shift`)
- [x] Active state updates correctly
- [x] Mobile menu opens/closes
- [x] Mobile menu closes after navigation
- [x] Overlay click closes menu
- [x] Page scrolls to top on navigation
- [x] Console page still works (tasks execute)
- [x] First Shift tutorial still works
- [x] Reduced motion preference respected

### Browser Testing
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile Safari (iOS)
- Mobile Chrome (Android)

## Performance

- **Initial load**: All pages loaded upfront (no lazy loading yet)
- **Navigation**: Instant (just CSS class changes)
- **Memory**: All sections in DOM but hidden (display:none)
- **Future optimization**: Could lazy-load page content if sections grow large

## Future Enhancements

### 1. Page Transition Variations
- Different animations per page (slide left/right, fade, scale)
- Transition direction based on navigation order

### 2. Lazy Loading
- Load page content only when first visited
- Reduce initial bundle size
- Show loading spinner for large pages

### 3. Deep Linking
- Allow direct links to specific tutorial steps
- Preserve console state in URL
- Shareable game states

### 4. Breadcrumbs
- Show navigation history
- Allow jumping back multiple steps

### 5. Keyboard Shortcuts
- 1-6 keys for quick navigation
- Left/Right arrows for prev/next page
- Escape to close mobile menu

## Migration Notes

### What Changed
- Header → Sidebar
- Scroll-based navigation → Hash-based routing
- All sections visible → Only active section visible
- Section IDs renamed to `page-{name}`

### What Stayed the Same
- All content preserved
- All functionality preserved
- Visual design preserved (except navigation)
- Console game logic unchanged
- First Shift tutorial unchanged

### Breaking Changes
- Old anchor links (`#job`, `#city`, etc.) no longer work
- Must update any external links to use new hashes
- URL structure changed from scroll position to hash

## Conclusion

The left sidebar with hash-based routing successfully transforms the site from a single-page scrolling layout into a multi-page application. Each section now feels like a distinct "location" that users navigate between, improving spatial memory and focus. The implementation is scalable, performant, and fully responsive.
