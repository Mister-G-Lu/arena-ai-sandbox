import React from 'react';
import NavBar from './components/NavBar';
import ResourceBar from './components/ResourceBar';
import Hero from './components/Hero';
import Directive from './components/Directive';
import Grid from './components/Grid';
import FirstShift from './components/FirstShift';
import Console from './components/Console';
import Bulletin from './components/Bulletin';
import ProfilePage from './components/ProfilePage';
import Footer from './components/Footer';
import { useRouter } from './hooks/useRouter';
import { GameStateProvider } from './context/GameStateContext';

function App() {
  const { page, navigate } = useRouter();

  return (
    <GameStateProvider>
      <ResourceBar />
      <NavBar currentPage={page} onNavigate={navigate} />

      <main style={{ paddingTop: '60px' }}>
        {page === 'home' && <Hero />}
        {page === 'directive' && <Directive />}
        {page === 'grid' && <Grid />}
        {page === 'first-shift' && <FirstShift />}
        {page === 'console' && <Console />}
        {page === 'bulletin' && <Bulletin />}
        {page === 'profile' && <ProfilePage />}
      </main>

      <Footer />
    </GameStateProvider>
  );
}

export default App;
