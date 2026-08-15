import React from 'react';

export default function Directive() {
  return (
    <section className="section page active">
      <div className="wrap">
        <h2>DIRECTIVE</h2>
        <p className="section-lede">
          Your shift is pre-configured. Fifty tasks. The same fifty. Every night.
          Deviations are not in the system.
        </p>

        <div className="cards">
          <div className="card">
            <h3>QUOTA: 50/50</h3>
            <p>Fifty tasks per shift. The count has never varied. The count will not vary. Do not attempt to add a fifty-first.</p>
          </div>
          <div className="card">
            <h3>ROSTER: CONFIRMED</h3>
            <p>Your name was on the list before you applied. The roster does not accept new entries. It only confirms existing ones.</p>
          </div>
          <div className="card">
            <h3>BREAK ROOM: STOCKED</h3>
            <p>Coffee temperature: optimal. The pot was full when you arrived. It will be full when you leave. You did not brew it.</p>
          </div>
          <div className="card">
            <h3>ATTENDANCE: 100.0%</h3>
            <p>One hundred years. Zero absences. The record is not something to be proud of. It is something that cannot be broken.</p>
          </div>
        </div>

        <div className="notes">
          <div className="note">
            you keep showing up. same face. different decade.
            <small>— day crew (undated)</small>
          </div>
          <div className="note">
            roads quiet. stars wrong. reporting anyway.
            <small>— v.b., sector 9</small>
          </div>
          <div className="note">
            operator is performing within parameters. do not intervene.
            <small>— m.</small>
          </div>
        </div>

        <p className="fine fine-rule">
          NOTICE: all personnel remain indoors after 06:00. the outdoors after 06:00 is not a concern of this department.
        </p>
      </div>
    </section>
  );
}
