import { useGameState } from '../../context/GameStateContext';
import type { JournalEntry, ContactRecord } from './profileData';

/** LOGBOOK (RESIDUE) — the trailing pages of the operator's own writing. */
function Logbook({ logbook }: { logbook: JournalEntry[] }) {
  if (logbook.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📖</div>
        <div className="empty-text">No entries yet. Your logbook is blank.</div>
        <div className="empty-subtitle">Make discoveries to fill these pages.</div>
      </div>
    );
  }
  return (
    <div className="logbook-entries">
      {logbook.slice(-5).reverse().map((entry: JournalEntry, i: number) => (
        <div key={i} className="logbook-entry">
          <div className="entry-day">Day {entry.day}</div>
          <div className="entry-text">{entry.text}</div>
        </div>
      ))}
    </div>
  );
}

/** DISCOVERIES — the story resources found outside the queue. */
function Discoveries({ discoveries }: { discoveries: JournalEntry[] }) {
  return (
    <div className="logbook-entries">
      {discoveries.slice(-5).reverse().map((entry: JournalEntry, i: number) => (
        <div key={i} className="logbook-entry">
          <div className="entry-day">Day {entry.day}</div>
          <div className="entry-text">{entry.text}</div>
        </div>
      ))}
    </div>
  );
}

/** CONTACTS — the faces the system admits you have met. */
function Contacts({ contacts }: { contacts: ContactRecord[] }) {
  if (contacts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👤</div>
        <div className="empty-text">No contacts yet.</div>
        <div className="empty-subtitle">You are alone in the building. For now.</div>
      </div>
    );
  }
  return (
    <div className="contacts-list">
      {contacts.map((contact: ContactRecord, i: number) => (
        <div key={i} className="contact-item">
          <div className="contact-name">{contact.name}</div>
          <div className="contact-role">{contact.role}</div>
          <div className="contact-meta">
            First met: Day {contact.firstMet} · Interactions: {contact.interactions}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The journal-like trailing sections: logbook, discoveries, contacts. */
export default function ProfileJournal() {
  const { state } = useGameState();
  const { logbook, discoveries, contacts } = state;

  return (
    <>
      <div className="profile-section">
        <h3>LOGBOOK (RESIDUE)</h3>
        <Logbook logbook={logbook} />
      </div>

      {discoveries.length > 0 && (
        <div className="profile-section">
          <h3>DISCOVERIES</h3>
          <Discoveries discoveries={discoveries} />
        </div>
      )}

      <div className="profile-section">
        <h3>CONTACTS</h3>
        <Contacts contacts={contacts} />
      </div>
    </>
  );
}
