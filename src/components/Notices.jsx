import React, { useMemo, useState } from 'react';
import { useGameState } from '../context/GameStateContext';
import { loadAllStorylets, findCard, cardsInZone } from '../content/load';
import { describeEffects } from '../game/qualities';
import { requirementLabel, missingRequirements } from '../game/progression';
import './Notices.css';

/**
 * NOTICES — the storylet runner.
 *
 * This is the story spine of the game and it is deliberately thin: all content
 * lives in `src/content/<zone>/*.json`, is validated by the existing schema in
 * `src/game/storylets.ts` at load time, and every consequence is filed through
 * the one effects pipeline in GameStateContext. Adding a zone or a card is a
 * data change; this component never learns their names.
 */
export default function Notices() {
  const { state, actions, availableZones, requirementCtx } = useGameState();
  const [lastOutcome, setLastOutcome] = useState(null);

  // Content is schema-validated at load. A bad card must fail loudly and in
  // place — never by setting state during render.
  const { cards, loadError } = useMemo(() => {
    try {
      return { cards: loadAllStorylets(), loadError: null };
    } catch (err) {
      return { cards: [], loadError: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  const current = state.currentStorylet;
  const card = current ? findCard(cards, current.storyletId) : undefined;

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
    actions.resolveStorylet(card, choice);
    setLastOutcome({
      title: card.title,
      text: choice.outcome?.text ?? '',
      effects: describeEffects(choice.outcome?.qualities)
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
        <h2>NOTICES</h2>
        <p className="section-lede">
          Work that Dispatch did not assign. Everything here is optional, which is
          how the system knows who is only pretending to be tired.
        </p>

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

        {current && !card && (
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

        <div className="zone-board">
          {availableZones.map((zone) => {
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

          {availableZones.length === 0 && (
            <p className="fine">
              Nothing is listed tonight. Notices appear for operators who have started
              noticing. Keep working. Or do not — the difference is the point.
            </p>
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
            {!card && (
              <button className="btn btn-ghost btn-compact" type="button" onClick={standDown}>
                ↩ BACK TO THE DESK
              </button>
            )}
          </div>
        )}

        <p className="fine console-note">
          // NOTICES ARE NEVER REQUIRED. THE SYSTEM PREFERS OPERATORS WHO WORK.
        </p>
      </div>
    </section>
  );
}
