# Narration Implementation Guide

## Quick Start

This guide shows how to integrate the narration sets from NARRATION_SETS.md into the game.

---

## Step 1: Create NarrationDisplay Component

Create a reusable component for showing narrations:

```javascript
// src/components/NarrationDisplay.jsx
import React, { useState, useEffect } from 'react';
import './NarrationDisplay.css';

export default function NarrationDisplay({ narration, onComplete }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    setVisible(true);
    // Typing effect
    let i = 0;
    const timer = setInterval(() => {
      if (i < narration.text.length) {
        setText(narration.text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [narration]);

  const handleContinue = () => {
    setVisible(false);
    setTimeout(onComplete, 300);
  };

  return (
    <div className={`narration-overlay ${visible ? 'visible' : ''}`}>
      <div className="narration-container">
        <div className="narration-header">
          {narration.title && <h3>{narration.title}</h3>}
          {narration.location && <span className="location">{narration.location}</span>}
        </div>
        <div className="narration-text">
          {text}
        </div>
        {narration.rewards && (
          <div className="narration-rewards">
            {narration.rewards.map((reward, i) => (
              <span key={i} className="reward">{reward}</span>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={handleContinue}>
          ▸ CONTINUE
        </button>
      </div>
    </div>
  );
}
```

```css
/* src/components/NarrationDisplay.css */
.narration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.narration-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.narration-container {
  max-width: 600px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.narration-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 1rem;
}

.narration-header h3 {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--amber);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.narration-header .location {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--faint);
  letter-spacing: 0.1em;
}

.narration-text {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text);
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
}

.narration-rewards {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.reward {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--teal);
  background: rgba(87, 214, 195, 0.1);
  border: 1px solid var(--teal);
  border-radius: 3px;
  padding: 0.25rem 0.75rem;
}
```

---

## Step 2: Add Narration Data

Create a data file with all narrations:

```javascript
// src/data/narrations.js
export const NARRATIONS = {
  // Arc Transitions
  ARC_1_TO_2: {
    id: 'ARC_1_TO_2',
    title: 'The First Death',
    location: 'The Interim',
    text: `You wake up.

The terminal is humming. The coffee is warm. The clock says 01:00.

You check your hands. They're fine. You check the log. Day 9, same as yesterday. Same as the day before.

//UPDATE THIS: Add more sensory details about the Interim

The system chirps: "Welcome back, Operator. Your previous shift has been logged. There were no incidents."

There were incidents. You remember the fire. You remember—

//UPDATE THIS: Memory fragment here

The coffee is warm. It's always warm.`,
    rewards: ['+1 Residue', 'Unlock: Loop Awareness'],
  },

  ARC_2_TO_3: {
    id: 'ARC_2_TO_3',
    title: 'The Summons',
    location: 'Floor 12 — Manager\'s Office',
    text: `The elevator opens. Floor 12.

//UPDATE THIS: Describe the office—should feel wrong but also familiar

The Manager is waiting. He doesn't look up from his terminal. "You've been busy," he says. "Gathering things that don't belong to you."

You set the Components on his desk. The Key. The Lens. The Wire. The Crystal. The Chip. The Interim.

He looks at them. Then at you.

"You know what these are for," he says. It's not a question.

//UPDATE THIS: Add dialogue about the Seam Ripper

"The system doesn't like loose ends," he continues. "And you've become one."

He slides a form across the desk. Your name is already on it.

"Sign here," he says. "Or don't. But 06:00 is coming, and this time, it won't reset."`,
    rewards: ['Unlock: Arc III', 'Unlock: Final Choice'],
  },

  // Deaths
  DEATH_1: {
    id: 'DEATH_1',
    title: 'The Fire',
    location: 'The Basement',
    text: `The alarm is screaming.

Smoke is pouring from the Basement. You can see the flames through the stairwell window. Orange. Too orange.

//UPDATE THIS: Add more sensory details

The terminal in your office is still running. The log says: "Incident logged. Operator terminated."

You're not dead. You're—

//UPDATE THIS: Describe the transition to the Interim

The coffee is warm. The clock says 01:00.

You remember the fire. You remember dying.

But the system says there were no incidents.`,
    rewards: ['+1 Residue', 'Unlock: Loop Awareness'],
  },

  // Add all other narrations...
  // (Copy from NARRATION_SETS.md)
};
```

---

## Step 3: Update GameStateContext

Add narration tracking to state:

```javascript
// In src/context/GameStateContext.jsx

const INITIAL_STATE = {
  // ... existing state

  // Track which narrations have been shown
  narrations: {
    // Arc Transitions
    ARC_1_TO_2: false,
    ARC_2_TO_3: false,

    // Deaths
    DEATH_1: false,
    DEATH_2: false,
    DEATH_3: false,

    // Promotions
    PROMOTION_1: false,
    PROMOTION_2: false,
    PROMOTION_3: false,
    PROMOTION_4: false,
    PROMOTION_5: false,

    // Zones
    ZONE_1: false,
    ZONE_2: false,
    ZONE_3: false,
    ZONE_4: false,
    ZONE_5: false,
    ZONE_6: false,

    // Story Beats
    FIRST_ANOMALY: false,
    THE_LOGBOOK: false,
    MANAGERS_MEMO: false,

    // First Tasks
    FIRST_TASK: false,
    FIRST_INVESTIGATION: false,
  },

  // Current active narration
  activeNarration: null,
};

// Add these functions to the context
const showNarration = useCallback((narrationId) => {
  const narration = NARRATIONS[narrationId];
  if (narration && !state.narrations[narrationId]) {
    setState(prev => ({
      ...prev,
      activeNarration: narration,
      narrations: { ...prev.narrations, [narrationId]: true }
    }));
  }
}, [state.narrations]);

const dismissNarration = useCallback(() => {
  setState(prev => ({
    ...prev,
    activeNarration: null
  }));
}, []);

// Export in the context value
const value = {
  state,
  actions: {
    // ... existing actions
    showNarration,
    dismissNarration,
  },
};
```

---

## Step 4: Integrate into Components

### Example: Console.jsx

```javascript
// In src/components/Console.jsx
import { useGameState } from '../context/GameStateContext';
import NarrationDisplay from './NarrationDisplay';

export default function Console() {
  const { state, actions } = useGameState();
  const [taskCount, setTaskCount] = useState(0);

  const handleTaskComplete = () => {
    const newCount = taskCount + 1;
    setTaskCount(newCount);

    // First task narration
    if (newCount === 1) {
      actions.showNarration('FIRST_TASK');
    }

    // First anomaly narration (random chance after task 5)
    if (newCount === 5 && Math.random() < 0.3) {
      actions.showNarration('FIRST_ANOMALY');
    }

    // ... rest of task logic
  };

  return (
    <section className="section page active">
      {/* ... existing console UI ... */}

      {/* Narration overlay */}
      {state.activeNarration && (
        <NarrationDisplay
          narration={state.activeNarration}
          onComplete={actions.dismissNarration}
        />
      )}
    </section>
  );
}
```

### Example: ProfilePage.jsx

```javascript
// In src/components/ProfilePage.jsx
import { useGameState } from '../context/GameStateContext';
import NarrationDisplay from './NarrationDisplay';

export default function ProfilePage() {
  const { state, actions } = useGameState();

  // Check for promotion narrations
  useEffect(() => {
    if (state.promotion.tier === 1 && !state.narrations.PROMOTION_1) {
      actions.showNarration('PROMOTION_1');
    }
    // ... check other promotions
  }, [state.promotion.tier, state.narrations]);

  return (
    <section className="section page active">
      {/* ... existing profile UI ... */}

      {/* Narration overlay */}
      {state.activeNarration && (
        <NarrationDisplay
          narration={state.activeNarration}
          onComplete={actions.dismissNarration}
        />
      )}
    </section>
  );
}
```

---

## Step 5: Trigger Narrations at Key Moments

### After Death

```javascript
// In your death handling logic
const handleDeath = (deathType) => {
  // Record the death
  actions.recordDeath();

  // Show death narration
  if (state.deaths === 1) {
    actions.showNarration('DEATH_1');
    // After death narration, show arc transition
    setTimeout(() => {
      actions.showNarration('ARC_1_TO_2');
    }, 1000);
  } else if (state.deaths === 2) {
    actions.showNarration('DEATH_2');
  } else if (state.deaths === 3) {
    actions.showNarration('DEATH_3');
  }
};
```

### After Zone Discovery

```javascript
// In your zone discovery logic
const discoverZone = (zoneNumber) => {
  // Grant component
  actions.addComponent(getComponentForZone(zoneNumber));

  // Show zone narration
  actions.showNarration(`ZONE_${zoneNumber}`);
};
```

### After Component Collection

```javascript
// In your component collection logic
const collectComponent = (componentName) => {
  // Grant component
  actions.addComponent(componentName);

  // Check if all components collected
  if (actions.componentsCount() === 6) {
    actions.showNarration('ARC_2_TO_3');
  }
};
```

---

## Step 6: Test All Narrations

Create a test page to preview all narrations:

```javascript
// src/components/NarrationTest.jsx
import React from 'react';
import { NARRATIONS } from '../data/narrations';
import NarrationDisplay from './NarrationDisplay';

export default function NarrationTest() {
  const [selectedNarration, setSelectedNarration] = React.useState(null);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Narration Test</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {Object.entries(NARRATIONS).map(([id, narration]) => (
          <button
            key={id}
            onClick={() => setSelectedNarration(narration)}
            style={{
              padding: '1rem',
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {narration.title}
          </button>
        ))}
      </div>

      {selectedNarration && (
        <NarrationDisplay
          narration={selectedNarration}
          onComplete={() => setSelectedNarration(null)}
        />
      )}
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create NarrationDisplay component
- [ ] Create NarrationDisplay.css
- [ ] Create narrations.js data file
- [ ] Update GameStateContext with narration tracking
- [ ] Add showNarration and dismissNarration functions
- [ ] Integrate NarrationDisplay into Console.jsx
- [ ] Integrate NarrationDisplay into ProfilePage.jsx
- [ ] Add narration triggers for first tasks
- [ ] Add narration triggers for promotions
- [ ] Add narration triggers for deaths
- [ ] Add narration triggers for zone discoveries
- [ ] Add narration triggers for arc transitions
- [ ] Create NarrationTest component for preview
- [ ] Fill in all //UPDATE THIS sections in narrations.js
- [ ] Test all narrations appear at correct times
- [ ] Add animations and transitions
- [ ] Playtest full game flow

---

## Tips

1. **Test Early**: Use the NarrationTest component to preview all narrations before integrating
2. **Fill in Blanks**: Make sure all //UPDATE THIS sections are filled in before playtesting
3. **Check Timing**: Ensure narrations don't overlap or interrupt important gameplay
4. **Tone Check**: Read all narrations aloud to ensure consistent tone
5. **Length Check**: Make sure no narration exceeds 200 words
6. **Reward Clarity**: Ensure all rewards are clearly shown and applied

---

## Next Steps

1. Implement NarrationDisplay component
2. Create narrations.js with all prose from NARRATION_SETS.md
3. Fill in all //UPDATE THIS sections
4. Integrate into game components
5. Test and iterate
