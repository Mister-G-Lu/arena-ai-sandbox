import { lazy, Suspense, useEffect } from 'react';
import NavBar from './components/NavBar';
import ResourceBar from './components/ResourceBar';
import Hero from './components/Hero';
import FirstShift from './components/FirstShift';
import Console from './components/Console';
import Footer from './components/Footer';
import DevPanel from './components/DevPanel';
import { useRouter } from './hooks/useRouter';
import { GameStateProvider, useGameState } from './context/GameStateContext';

// Keep the public landing shell immediate, then load each playable terminal
// only when its route opens. Story JSON and profile/save tooling no longer
// inflate the first visit to the live site.
const Notices = lazy(() => import('./components/Notices'));
const Shop = lazy(() => import('./components/Shop'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

function RouteFallback() {
  return (
    <section className="section page active" aria-busy="true" aria-live="polite">
      <div className="wrap">
        <p className="eyebrow">// TERMINAL LINK //</p>
        <h2>OPENING FILE…</h2>
      </div>
    </section>
  );
}

interface PageGate {
  open: boolean;
  fallback: string;
}

function GameShell() {
  const { page, navigate } = useRouter();
  const { state } = useGameState();
  // Pages can be gated by state; a locked page redirects to its prerequisite.
  // Notices are a promotion privilege. Investigations appear to everyone when
  // the Shift 2 Annex case arrives, then promotion controls their depth.
  const PAGE_GATES: Record<string, PageGate> = {
    console: { open: state.orientation.completed, fallback: 'first-shift' },
    shop: { open: state.orientation.completed, fallback: 'first-shift' },
    notices: {
      open: state.orientation.completed && state.promotion.unlocks.includes('notice-storylets'),
      fallback: state.orientation.completed ? 'console' : 'first-shift',
    },
    investigations: {
      open: state.orientation.completed && state.day >= 2,
      fallback: state.orientation.completed ? 'console' : 'first-shift',
    },
  };

  const gate = PAGE_GATES[page];
  const blocked = Boolean(gate && !gate.open);
  const visiblePage = blocked ? gate.fallback : page;

  useEffect(() => {
    if (blocked) navigate(gate.fallback);
  }, [blocked, gate?.fallback, navigate]);

  return (
    <>
      <ResourceBar />
      <NavBar currentPage={visiblePage} onNavigate={navigate} />

      <main>
        <Suspense fallback={<RouteFallback />}>
          {visiblePage === 'home' && <Hero />}
          {visiblePage === 'first-shift' && <FirstShift />}
          {visiblePage === 'console' && <Console />}
          {visiblePage === 'shop' && <Shop />}
          {visiblePage === 'notices' && <Notices key="notices" board="notices" />}
          {visiblePage === 'investigations' && <Notices key="investigations" board="investigations" />}
          {visiblePage === 'profile' && <ProfilePage />}
        </Suspense>
      </main>

      <Footer />
      <DevPanel />
    </>
  );
}

function App() {
  return (
    <GameStateProvider>
      <GameShell />
    </GameStateProvider>
  );
}

export default App;
