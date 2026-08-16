import { HudFrame } from './HudFrame';

const MEMOS = [
  {
    id: '013',
    tag: 'disregard',
    body: 'A work order has been filed for Floor 12. There is no Floor 12. Please disregard. Attendance remains mandatory. — M.',
  },
  {
    id: '012',
    tag: 'internal',
    body: 'The third-floor vending machine has been re-designated. Please do not look for it. — M.',
  },
  {
    id: '011',
    tag: 'hr',
    body: 'Reminder: the Municipal Annex has eleven (11) floors. Any employee reporting a twelfth (12th) floor should be referred to HR. — M.',
  },
  {
    id: '010',
    tag: 'welcome',
    body: 'Welcome, Operator. The city is glad to have you. Attendance is recorded from 01:00. — M.',
  },
];

export function Memos() {
  return (
    <section id="memos" className="section section-alt">
      <div className="wrap">
        <h2>Memos</h2>
        <p className="section-lede">
          Posted for all personnel. Please read them. Please do not read into them.
        </p>
        <div className="memos">
          {MEMOS.map((m) => (
            <HudFrame as="article" className="memo" key={m.id}>
              <header>
                MEMO {m.id} · TUESDAY <span className="memo-tag">{m.tag}</span>
              </header>
              <p>{m.body}</p>
            </HudFrame>
          ))}
        </div>
      </div>
    </section>
  );
}
