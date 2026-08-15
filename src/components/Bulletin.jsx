import React from 'react';

export default function Bulletin() {
  return (
    <section className="section section-alt page active">
      <div className="wrap">
        <h2>BULLETIN BOARD</h2>
        <p className="section-lede">
          Posted for all personnel. Acknowledged. Not to be discussed.
          Not to be investigated. Not to be remembered.
        </p>

        <div className="memos">
          <article className="memo">
            <header>BULLETIN 012 // TUESDAY</header>
            <p>The vending machine on the third floor has been removed from the floor plan. It was not on the third floor. Do not check. — M.</p>
          </article>
          <article className="memo">
            <header>BULLETIN 011 // TUESDAY</header>
            <p>The Municipal Annex contains eleven (11) floors. Reports of a twelfth (12th) floor are to be filed in the elevator. — M.</p>
          </article>
          <article className="memo">
            <header>BULLETIN 010 // TUESDAY</header>
            <p>Operator status: ACTIVE. The city has noted your presence. Your presence was expected. Do not deviate from the expected. — M.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
