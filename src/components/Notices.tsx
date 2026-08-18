import { useMemo, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { loadAllStorylets, findCard, cardsInZone } from '../content/load';
import { describeEffects } from '../game/qualities';
import { missingRequirements } from '../game/progression';
import { supplyById } from '../game/shop';
import type { Choice, ZoneId } from '../game/storylets';
import HorizonPanel from './HorizonPanel';
import ZoneCard, { type AvailableZone } from './notices/ZoneCard';
import StoryletConsole from './notices/StoryletConsole';
import OutcomePanel from './notices/OutcomePanel';
import './Notices.css';

interface BoardCopy {
  title: string;
  lede: string;
  vista: string;
  empty: string;
  footer: string;
}

const BOARD_COPY: Record<string, BoardCopy> = {
  notices: {
    title: 'NOTICES',
    lede: 'Work that Dispatch did not assign. Everything here is optional, which is how the system knows who is only pretending to be tired.',
    vista: 'Through the office window, the hoverlanes keep their amber river whether you notice or not. The notices are what you notice instead of them.',
    empty: 'Nothing is posted tonight. Notices appear for operators who have started noticing. Keep working. Or do not — the difference is the point.',
    footer: '// NOTICES ARE NEVER REQUIRED. THE SYSTEM PREFERS OPERATORS WHO WORK.',
  },
  investigations: {
    title: 'INVESTIGATIONS',
    lede: 'Cases that exist because the official result did not. Clearance changes what the terminal admits; management would prefer that you call this coincidence.',
    vista: 'The elevator still sits where you left it — Floor 11, display steady, one blank warmth where it shouldn\'t be. The investigation is a door you have to keep choosing to open.',
    empty: 'No open cases. This is the expected result. M. would like you to stop checking.',
    footer: '// INVESTIGATION IS OUTSIDE YOUR JOB DESCRIPTION. THIS HAS NOT STOPPED YOU.',
  },
};

interface NoticesProps {
  board?: 'notices' | 'investigations';
}

/**
 * The shared storylet runner behind the Notices and Investigations tabs.
 * Content declares which board owns it; consequences still file through the
 * one effects pipeline.
 */
export default function Notices({ board = 'notices' }: NoticesProps) {
  const { state, actions, availableZones, requirementCtx, actionTank } = useGameState();
  const [lastOutcome, setLastOutcome] = useState<{
    title: string;
    text: string;
    effects: string | null;
    revisit: boolean;
  } | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const copy = BOARD_COPY[board] ?? BOARD_COPY.notices;
  const boardZones = availableZones.filter((zone: AvailableZone) => zone.board === board);

  // Content is schema-validated at load; a bad card fails loudly, never by
  // setting state during render.
  const { cards, loadError } = useMemo(() => {
    try {
      return { cards: loadAllStorylets(), loadError: null };
    } catch (err) {
      return { cards: [], loadError: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  const current = state.currentStorylet;
  const savedCard = current ? findCard(cards, current.storyletId) : undefined;
  const currentBelongsHere = Boolean(
    current && boardZones.some((zone: AvailableZone) => zone.id === current.zone),
  );
  const card = currentBelongsHere ? savedCard : undefined;
  const otherBoard =
    current && savedCard && !currentBelongsHere
      ? availableZones.find((zone: AvailableZone) => zone.id === current.zone)?.board
      : null;
  // A first read of a card charges; a reread never does.
  const cardCosts = Boolean(card) && !state.seenStorylets.includes(card!.id);

  /** Serve the first card in the zone the operator has not already resolved. */
  function nextCardId(zone: AvailableZone) {
    const zoneCards = cardsInZone(cards, zone.id as ZoneId);
    const unread = zoneCards.find((c) => !state.seenStorylets.includes(c.id));
    return (zone.onceEach ? unread?.id : undefined) ?? zone.entry;
  }

  function openZone(zone: AvailableZone) {
    setLastOutcome(null);
    setRefusal(null);
    actions.enterZone(zone.id, nextCardId(zone));
  }

  function choose(choice: Choice) {
    if (!card) return;
    const revisit = state.seenStorylets.includes(card.id);
    if (!revisit && actionTank.empty) {
      setRefusal(
        `NO ACTIONS REMAINING. THE DECISION HOLDS. NEXT ACTION IN ${actionTank.countdown}.`,
      );
      return;
    }
    setRefusal(null);
    actions.resolveStorylet(card, choice);
    setLastOutcome({
      title: card.title,
      text: choice.outcome?.text ?? '',
      effects: revisit
        ? null
        : describeEffects(choice.outcome?.qualities, {
            qualities: state.qualities,
            attention: state.attention,
          }),
      revisit,
    });
  }

  function standDown() {
    setLastOutcome(null);
    setRefusal(null);
    actions.closeStorylet();
  }

  /** Cards in a zone the operator has already resolved (a notice is read once). */
  function remainingIn(zone: AvailableZone) {
    const zoneCards = cardsInZone(cards, zone.id as ZoneId);
    if (!zone.onceEach) return zoneCards.length;
    return zoneCards.filter((c) => !state.seenStorylets.includes(c.id)).length;
  }

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>{copy.title}</h2>
        <p className="section-lede">{copy.lede}</p>
        {copy.vista && (
          <div className="board-vista">
            <span className="board-vista-kicker">
              // VISUAL // {board === 'investigations' ? 'OUT-OF-RANGE' : 'DESK WINDOW'}
            </span>
            <p>{copy.vista}</p>
          </div>
        )}

        {loadError && (
          <div className="console notice-error">
            <div className="console-head">
              <span className="dot"></span>
              CONTENT VALIDATION FAILURE
              <span className="console-status">▣ HALTED</span>
            </div>
            <p className="fine">{loadError}</p>
          </div>
        )}

        {current && !savedCard && (
          <div className="console notice-error" role="alert">
            <div className="console-head">
              <span className="dot"></span>
              SAVED ORDER COULD NOT BE RESTORED
              <span className="console-status">▣ RECOVERY</span>
            </div>
            <p className="fine">
              The saved pointer &ldquo;{current.storyletId}&rdquo; does not exist in this content build.
              Clear only the open order to keep the rest of the operator file.
            </p>
            <button className="btn btn-ghost btn-compact" type="button" onClick={standDown}>
              CLEAR INVALID ORDER
            </button>
          </div>
        )}

        {otherBoard && (
          <div className="console cross-board-order" role="status">
            <div className="console-head">
              <span className="dot"></span>
              ANOTHER FILE IS OPEN
              <span className="console-status">▣ HELD</span>
            </div>
            <p className="fine">
              Finish or close the order on the {otherBoard === 'notices' ? 'Notices' : 'Investigations'}{' '}
              tab before opening another.
            </p>
            <a className="btn btn-ghost btn-compact" href={`#${otherBoard}`}>
              RETURN TO OPEN FILE
            </a>
          </div>
        )}

        <div className="zone-board">
          {boardZones.map((zone: AvailableZone) => {
            const remaining = remainingIn(zone);
            const exhausted = zone.onceEach && remaining === 0;
            const status = exhausted && zone.status !== 'complete' ? 'complete' : zone.status;
            const blockers = missingRequirements(zone.requires, requirementCtx);
            const clearanceHeld =
              !zone.requiresUnlock || state.promotion.unlocks.includes(zone.requiresUnlock);
            const needsSupplies = Object.keys(zone.requires ?? {}).some(
              (key: string) => supplyById(key) && !state.supplies[key],
            );

            return (
              <ZoneCard
                key={zone.id}
                zone={zone}
                status={status}
                remaining={remaining}
                clearanceHeld={clearanceHeld}
                blockers={blockers}
                needsSupplies={needsSupplies}
                componentAcquired={Boolean(state.components[zone.component!])}
                orderInProgress={Boolean(current)}
                onOpen={() => openZone(zone)}
              />
            );
          })}

          {boardZones.length === 0 && <p className="fine">{copy.empty}</p>}
        </div>

        <HorizonPanel />

        {card && (
          <StoryletConsole
            card={card}
            cardCosts={cardCosts}
            countdown={actionTank.countdown}
            actionTankEmpty={actionTank.empty}
            refusal={refusal}
            effectsFor={(choice: Choice) =>
              describeEffects(choice.outcome?.qualities, {
                qualities: state.qualities,
                attention: state.attention,
              })
            }
            onChoose={choose}
            onStandDown={standDown}
          />
        )}

        {lastOutcome && (
          <OutcomePanel
            outcome={lastOutcome}
            showStandDown={!card}
            onStandDown={standDown}
          />
        )}

        <p className="fine console-note">{copy.footer}</p>
      </div>
    </section>
  );
}
