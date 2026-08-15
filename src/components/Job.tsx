import { HudFrame } from './HudFrame';

const CARDS = [
  {
    title: 'Perfectly paced shifts',
    body: "Fifty tasks a night. Never one more, never one less. You'll never feel rushed, and you'll never feel idle.",
  },
  {
    title: 'A city that knows you',
    body: 'The roster has never made a mistake. Your name has always been on it.',
  },
  {
    title: 'Coffee, always warm',
    body: "The break room is always stocked, and you'll have it all to yourself.",
  },
  {
    title: 'One hundred percent attendance',
    body: 'In a hundred years, not a single shift has been missed. We intend to keep it that way.',
  },
];

const NOTES = [
  { text: 'The night operator seems... familiar.', by: '— Day Crew' },
  { text: 'Roads quiet. Stars out. All clear.', by: '— V.B., Sector 9' },
  { text: 'Attendance: perfect. Continue.', by: '— M.' },
];

export function Job() {
  return (
    <section id="job" className="section">
      <div className="wrap">
        <h2>The Job</h2>
        <p className="section-lede">
          Working nights at Central Dispatch is simple. It&apos;s the same every night. That&apos;s
          the best part.
        </p>
        <div className="cards">
          {CARDS.map((c) => (
            <HudFrame key={c.title} className="card">
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </HudFrame>
          ))}
        </div>
        <div className="notes">
          {NOTES.map((n) => (
            <div className="note" key={n.by}>
              {n.text}
              <small>{n.by}</small>
            </div>
          ))}
        </div>
        <p className="fine fine-rule">
          Reminder: all personnel are asked to remain indoors after 06:00. There is nothing to see
          after 06:00.
        </p>
      </div>
    </section>
  );
}
