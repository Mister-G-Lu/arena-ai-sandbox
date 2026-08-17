import { useGameState } from '../context/GameStateContext';
import { zoneById } from '../game/progression';
import type { SupplyDef } from '../game/shop';
import './Shop.css';

/**
 * The municipal supply terminal. Salary's whole legitimate purpose: small,
 * useful things, bought once, each opening a storylet on the Notices board.
 * The fiction does the rest — the machine gives no change, no receipts, and
 * has never needed to.
 */
export default function Shop() {
  const { state, ledger, SUPPLY_DEFS, actions } = useGameState();

  function buy(supplyId: string) {
    actions.purchaseSupply(supplyId);
  }

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>MUNICIPAL SUPPLY</h2>
        <p className="section-lede">
          The vending machine on the third floor takes credits and returns small useful things.
          It does not give change. It does not give receipts. It has never needed to.
        </p>

        <div className="console supply-console">
          <div className="console-head">
            <span className="dot"></span>
            SUPPLY TERMINAL // THIRD FLOOR
            <span className="console-status">▣ ACCEPTING CREDITS</span>
          </div>
          <div className="supply-balance">
            <span className="supply-balance-label">AVAILABLE BALANCE</span>
            <span className="supply-balance-value">
              ¤ {ledger.display}
            </span>
            <span className="supply-balance-note">
              {ledger.unbound ? 'THE LEDGER IS NO LONGER A NUMBER. THE MACHINE ACCEPTS THAT.' : 'SALARY IS MUNDANE. THAT IS THE POINT OF IT.'}
            </span>
          </div>
        </div>

        <div className="supply-board">
          {SUPPLY_DEFS.map((supply: SupplyDef) => {
            const owned = Boolean(state.supplies[supply.id]);
            const canAfford = ledger.credits >= supply.price;
            const zone = supply.unlocksZone ? zoneById(supply.unlocksZone) : undefined;
            return (
              <article
                key={supply.id}
                className={`supply-card${supply.locked ? ' supply-locked' : ''}${owned ? ' supply-owned' : ''}`}
              >
                <div className="supply-kicker">
                  {supply.category}
                  {owned ? ' // ON ORDER' : ''}
                </div>
                <h3>{supply.name}</h3>
                <p className="supply-blurb">{supply.blurb}</p>

                {supply.hint && <p className="fine supply-hint">{supply.hint}</p>}

                {zone && (
                  <p className="fine supply-unlock">
                    UNLOCKS: {zone.title} · {zone.board === 'notices' ? 'NOTICES BOARD' : 'INVESTIGATIONS BOARD'}
                  </p>
                )}

                {zone && zone.board === 'notices' && !state.promotion.unlocks.includes('notice-storylets') && (
                  <p className="fine supply-sealed">
                    THE NOTICES BOARD IS SEALED UNTIL THE SYSTEM RECOGNIZES YOU. THE GOOD WILL WAIT.
                  </p>
                )}

                {supply.locked && supply.lockedNote && (
                  <p className="fine supply-locked-note">{supply.lockedNote}</p>
                )}

                <div className="supply-actions">
                  {!supply.locked && (
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={owned || !canAfford}
                      onClick={() => buy(supply.id)}
                    >
                      {owned ? '✓ ORDERED' : `ORDER FOR ¤${supply.price.toLocaleString()}`}
                    </button>
                  )}
                  {!supply.locked && !owned && !canAfford && (
                    <span className="supply-short">INSUFFICIENT CREDITS</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="fine console-note">
          ALL PURCHASES ARE FINAL. THE MACHINE DOES NOT GIVE RECEIPTS. IT REMEMBERS EVERY ORDER.
        </p>
      </div>
    </section>
  );
}
