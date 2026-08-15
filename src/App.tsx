import { useCallback } from 'react';
import { City } from './components/City';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Job } from './components/Job';
import { Memos } from './components/Memos';
import { Shift } from './components/Shift';
import { Personnel } from './components/Personnel';
import { WorkOrders } from './components/WorkOrders';
import { useActions } from './hooks/useActions';
import { usePersonnel } from './hooks/usePersonnel';
import { useGlitch } from './hooks/useGlitch';
import { useProgress } from './hooks/useProgress';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useShift } from './hooks/useShift';

export function App() {
  const reduced = useReducedMotion();
  const fx = useGlitch(reduced);
  const { remaining, cap, untilNext, canAct, spendOne } = useActions();
  const { shift, perform, startTomorrow } = useShift(reduced);
  const { progress, currentCard, lastOutcome, choose, openZone } = useProgress();
  const personnel = usePersonnel();

  const onTask = useCallback(() => {
    if (!spendOne()) return;
    perform();
  }, [spendOne, perform]);

  const onChoose = useCallback(
    (id: string) => {
      if (!spendOne()) return;
      choose(id);
    },
    [spendOne, choose],
  );

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
        <WorkOrders
          progress={progress}
          currentCard={currentCard}
          lastOutcome={lastOutcome}
          canAct={canAct}
          onChoose={onChoose}
          onOpenZone={openZone}
        />
        <Personnel
          identity={personnel.identity}
          loading={personnel.loading}
          error={personnel.error}
          status={personnel.status}
          conflict={personnel.conflict}
          file={personnel.file}
          onRequestToken={personnel.requestToken}
          onSignOut={() => void personnel.signOut()}
          onKeepLocal={personnel.onKeepLocal}
          onTakeRecords={personnel.onTakeRecords}
          onMerge={personnel.onMerge}
          onExport={personnel.onExport}
          onImport={personnel.onImport}
          onTerminate={() => void personnel.onTerminate()}
        />
        <Memos />
      </main>
      <Footer flicker={fx.flicker === 'hint'} hintOverride={fx.hintOverride} />
    </>
  );
}
