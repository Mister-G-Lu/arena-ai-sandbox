import React, { useEffect } from 'react';
import NavBar from './components/NavBar';
import ResourceBar from './components/ResourceBar';
import Hero from './components/Hero';
import FirstShift from './components/FirstShift';
import Console from './components/Console';
import ProfilePage from './components/ProfilePage';
import Footer from './components/Footer';
import { useRouter } from './hooks/useRouter';
import { GameStateProvider, useGameState } from './context/GameStateContext';

function GameShell() {
  const { page, navigate } = useRouter();
  const { state } = useGameState();
  const consoleLocked = page === 'console' && !state.orientation.completed;
  const visiblePage = consoleLocked ? 'first-shift' : page;

  useEffect(() => {
    if (consoleLocked) navigate('first-shift');
  }, [consoleLocked]);

  return (
    <>
      <ResourceBar />
      <NavBar currentPage={visiblePage} onNavigate={navigate} />

      <main>
        {visiblePage === 'home' && <Hero />}
        {visiblePage === 'first-shift' && <FirstShift />}
        {visiblePage === 'console' && <Console />}
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
