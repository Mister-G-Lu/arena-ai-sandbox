import React, { useMemo, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { loadAllStorylets, findCard, cardsInZone } from '../content/load';
import { describeEffects } from '../game/qualities';
import { requirementLabel, missingRequirements } from '../game/progression';
import './Notices.css';

const BOARD_COPY = {
  notices: {
    title: 'NOTICES',
    lede: 'Work that Dispatch did not assign. Everything here is optional, which is how the system knows who is only pretending to be tired.',
    empty: 'Nothing is posted tonight. Notices appear for operators who have started noticing. Keep working. Or do not — the difference is the point.',
    footer: '// NOTICES ARE NEVER REQUIRED. THE SYSTEM PREFERS OPERATORS WHO WORK.'
  },
  investigations: {
    title: 'INVESTIGATIONS',
    lede: 'Cases that exist because the official result did not. Clearance changes what the terminal admits; management would prefer that you call this coincidence.',
    empty: 'No open cases. This is the expected result. M. would like you to stop checking.',
    footer: '// INVESTIGATION IS OUTSIDE YOUR JOB DESCRIPTION. THIS HAS NOT STOPPED YOU.'
  }
};

/**
 * The shared storylet runner behind the Notices and Investigations tabs.
 * Content declares which board owns it; consequences still file through the
 * one effects pipeline.
 */
export default function Notices({ board = 'notices' }) {
  const { state, actions, availableZones, requirementCtx } = useGameState();
  const [lastOutcome, setLastOutcome] = useState(null);
  const copy = BOARD_COPY[board] ?? BOARD_COPY.notices;
  const boardZones = availableZones.filter((zone) => zone.board === board);

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
    current && boardZones.some((zone) => zone.id === current.zone),
  );
  const card = currentBelongsHere ? savedCard : undefined;
  const otherBoard = current && savedCard && !currentBelongsHere
    ? availableZones.find((zone) => zone.id === current.zone)?.board
    : null;

  /** Serve the first card in the zone the operator has not already resolved. */
  function nextCardId(zone) {
    const zoneCards = cardsInZone(cards, zone.id);
    const unread = zoneCards.find((c) => !state.seenStorylets.includes(c.id));
    return (zone.onceEach ? unread?.id : undefined) ?? zone.entry;
  }

  function openZone(zone) {
    setLastOutcome(null);
    actions.enterZone(zone.id, nextCardId(zone));
  }

  function choose(choice) {
    if (!card) return;
    // Consequences file once per card. A re-read replays the text only.
    const revisit = state.seenStorylets.includes(card.id);
    actions.resolveStorylet(card, choice);
    setLastOutcome({
      title: card.title,
      text: choice.outcome?.text ?? '',
      effects: revisit ? null : describeEffects(choice.outcome?.qualities),
      revisit
    });
  }

  function standDown() {
    setLastOutcome(null);
    actions.closeStorylet();
  }

  /** Cards in a zone the operator has already resolved (a notice is read once). */
  function remainingIn(zone) {
    const zoneCards = cardsInZone(cards, zone.id);
    if (!zone.onceEach) return zoneCards.length;
    return zoneCards.filter((c) => !state.seenStorylets.includes(c.id)).length;
  }

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>{copy.title}</h2>
        <p className="section-lede">{copy.lede}</p>

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
              The saved pointer “{current.storyletId}” does not exist in this content build.
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
              Finish or close the order on the {otherBoard === 'notices' ? 'Notices' : 'Investigations'} tab before opening another.
            </p>
            <a className="btn btn-ghost btn-compact" href={`#${otherBoard}`}>
              RETURN TO OPEN FILE
            </a>
          </div>
        )}

        <div className="zone-board">
          {boardZones.map((zone) => {
            const remaining = remainingIn(zone);
            const exhausted = zone.onceEach && remaining === 0;
            const status = exhausted && zone.status !== 'complete' ? 'complete' : zone.status;
            const blockers = missingRequirements(zone.requires, requirementCtx);

            return (
              <article key={zone.id} className={`zone-card zone-${status}`}>
                <div className="zone-kicker">{zone.kicker}</div>
                <h3>{zone.title}</h3>
                <p>{zone.blurb}</p>
                <div className="zone-meta">
                  <span className={`zone-status-pill zone-status-${status}`}>{status.toUpperCase()}</span>
                  {zone.component && (
                    <span className="zone-prize">
                      {state.components[zone.component] ? '✓ ' : '◇ '}
                      {zone.componentLabel || zone.component.toUpperCase()}
                    </span>
                  )}
                  {zone.onceEach && status !== 'complete' && (
                    <span className="zone-remaining">{remaining} unread</span>
                  )}
                </div>

                {status === 'locked' && (
                  <p className="fine zone-requirement">
                    REQUIRES: {requirementLabel(zone.requires)}
                    {blockers.length > 0 ? ` — you have ${blockers.join(', ')}` : ''}
                  </p>
                )}

                {status === 'complete' && zone.closedNote && (
                  <p className="fine zone-requirement">{zone.closedNote}</p>
                )}

                <button
                  className="btn btn-primary btn-compact"
                  type="button"
                  aria-label={`Open ${zone.title}`}
                  disabled={status !== 'open' || Boolean(current)}
                  onClick={() => openZone(zone)}
                >
                  {current ? 'ORDER IN PROGRESS' : '▸ OPEN'}
                </button>
              </article>
            );
          })}

          {boardZones.length === 0 && (
            <p className="fine">{copy.empty}</p>
          )}
        </div>

        {card && (
          <div className="console storylet-console">
            <div className="console-head">
              <span className="dot"></span>
              {card.zone.toUpperCase()} // {card.id.toUpperCase()}
              <span className="console-status">▣ OPEN ORDER</span>
            </div>
            <div className="storylet-body">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
            <div className="storylet-choices">
              {card.choices.map((choice) => {
                const effects = describeEffects(choice.outcome?.qualities);
                return (
                  <button
                    key={choice.id}
                    className="btn btn-ghost storylet-choice"
                    type="button"
                    onClick={() => choose(choice)}
                  >
                    <span className="storylet-choice-label">{choice.label}</span>
                    {effects && <span className="storylet-choice-effects">{effects}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {lastOutcome && (
          <div className="console storylet-outcome">
            <div className="console-head">
              <span className="dot"></span>
              RESULT // {lastOutcome.title.toUpperCase()}
              <span className="console-status">▣ FILED</span>
            </div>
            <p className="storylet-outcome-text">{lastOutcome.text}</p>
            {lastOutcome.effects && (
              <p className="fine">FILED TO YOUR RECORD: {lastOutcome.effects}</p>
            )}
            {lastOutcome.revisit && (
              <p className="fine">REREAD // RECORD UNCHANGED — CONSEQUENCES FILE ONCE PER CARD.</p>
            )}
            {!card && (
              <button className="btn btn-ghost btn-compact" type="button" onClick={standDown}>
                ↩ BACK TO THE DESK
              </button>
            )}
          </div>
        )}

        <p className="fine console-note">{copy.footer}</p>
      </div>
    </section>
  );
}
