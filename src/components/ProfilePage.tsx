import { useGameState } from '../context/GameStateContext';
import SaveManagement from './SaveManagement';
import ProfileInfo from './profile/ProfileInfo';
import ProfileResources from './profile/ProfileResources';
import ProfileQualities from './profile/ProfileQualities';
import ProfilePromotion from './profile/ProfilePromotion';
import ProfileJournal from './profile/ProfileJournal';
import './ProfilePage.css';

/** The Operator Profile page. Each section is a self-contained sub-component
 * in `./profile/`, so this file is a thin layout that only handles the shared
 * section shell and the return action. */
export default function ProfilePage() {
  const { state } = useGameState();

  return (
    <section className="section page active">
      <div className="wrap">
        <h2>OPERATOR PROFILE</h2>
        <p className="section-lede">
          Your file. Your record. Your history — or what the system allows you to remember.
        </p>

        <ProfileInfo />
        <ProfileResources />
        <ProfileQualities />
        <ProfilePromotion />
        <ProfileJournal />

        <SaveManagement />

        {/* Actions */}
        <div className="profile-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              window.location.hash = state.orientation.completed ? '#console' : '#first-shift';
            }}
          >
            {state.orientation.completed ? '▸ RETURN TO CONSOLE' : '▸ REPORT FOR FIRST SHIFT'}
          </button>
        </div>
      </div>
    </section>
  );
}
