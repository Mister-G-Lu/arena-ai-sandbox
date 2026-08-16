import React, { useEffect } from 'react';
import NavBar from './components/NavBar';
import ResourceBar from './components/ResourceBar';
import Hero from './components/Hero';
import FirstShift from './components/FirstShift';
import Console from './components/Console';
import Notices from './components/Notices';
import ProfilePage from './components/ProfilePage';
import Footer from './components/Footer';
import { useRouter } from './hooks/useRouter';
import { GameStateProvider, useGameState } from './context/GameStateContext';

function GameShell() {
  const { page, navigate } = useRouter();
  const { state } = useGameState();
  // Shift 2 posts a mandatory-visible secondary order even for an operator who
  // has not earned normal Notice clearance. Promotion still controls how much
  // of the board — and of Floor 12 — the operator can investigate.
  const noticesOpen = state.day >= 2 || state.promotion.unlocks.includes('notice-storylets');
  // Pages can be gated by state; a locked page redirects to its prerequisite.
  const PAGE_GATES = {
    console: { open: state.orientation.completed, fallback: 'first-shift' },
    notices: {
      open: state.orientation.completed && noticesOpen,
      fallback: state.orientation.completed ? 'console' : 'first-shift'
    }
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
        {visiblePage === 'home' && <Hero />}
        {visiblePage === 'first-shift' && <FirstShift />}
        {visiblePage === 'console' && <Console />}
        {visiblePage === 'notices' && <Notices />}
        {visiblePage === 'profile' && <ProfilePage />}
      </main>

      <Footer />
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
