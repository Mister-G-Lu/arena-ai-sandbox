import React from 'react';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import Directive from './components/Directive';
import Grid from './components/Grid';
import FirstShift from './components/FirstShift';
import Console from './components/Console';
import Bulletin from './components/Bulletin';
import Footer from './components/Footer';
import { useRouter } from './hooks/useRouter';

function App() {
  const { page, navigate } = useRouter();

  return (
    <>
      <NavBar currentPage={page} onNavigate={navigate} />

      <main>
        {page === 'home' && <Hero />}
        {page === 'directive' && <Directive />}
        {page === 'grid' && <Grid />}
        {page === 'first-shift' && <FirstShift />}
        {page === 'console' && <Console />}
        {page === 'bulletin' && <Bulletin />}
      </main>

      <Footer />
    </>
  );
}

export default App;
