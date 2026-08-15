import { useCallback } from 'react';
import { City } from './components/City';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Job } from './components/Job';
import { Memos } from './components/Memos';
import { Shift } from './components/Shift';
import { useActions } from './hooks/useActions';
import { useGlitch } from './hooks/useGlitch';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useShift } from './hooks/useShift';

export function App() {
  const reduced = useReducedMotion();
  const fx = useGlitch(reduced);
  const { remaining, cap, untilNext, canAct, spendOne } = useActions();
  const { shift, perform, startTomorrow } = useShift(reduced);

  const onTask = useCallback(() => {
    if (!spendOne()) return;
    perform();
  }, [spendOne, perform]);

  return (
    <>
      <div className="grid-floor" aria-hidden="true" />
      <Header flicker={fx.flicker === 'brand'} />
      <main id="top">
        <Hero flicker={fx.flicker === 'caption'} />
        <Job />
        <City flickerStat={fx.flicker === 'stat'} weatherOverride={fx.weatherOverride} />
        <Shift
          shift={shift}
          remaining={remaining}
          cap={cap}
          untilNext={untilNext}
          canAct={canAct && !shift.complete}
          weatherOverride={fx.weatherOverride}
          onTask={onTask}
          onTomorrow={startTomorrow}
        />
        <Memos />
      </main>
      <Footer flicker={fx.flicker === 'hint'} hintOverride={fx.hintOverride} />
    </>
  );
}
