import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GameStateContext = createContext();
const STORAGE_KEY = 'fr:player-progress:v1';

// Initial state
const INITIAL_STATE = {
  // Resources
  credits: 0,
  maxCredits: 500, // Increases with promotion

  // Components (story resources)
  components: {
    key: false,      // NULL KEY from Floor 12
    lens: false,     // LENS from Records Basement
    wire: false,     // WIRE from Vent Network
    crystal: false,  // CRYSTAL from Rooftop Array
    chip: false,     // CHIP from Off-Map Sectors
    interim: false   // INTERIM from The Interim
  },

  // Qualities
  qualities: {
    doubt: 0,        // Understanding meter (0-5)
    perception: 0,   // Observation meter (0-5)
  },

  // Hidden
  attention: 0,      // Heat meter (0-10, death at 10)

  // Progress
  day: 1,
  tasksCompleted: 0,
  deaths: 0,
  orientation: {
    completed: false,
    skipped: false,
    taskRecorded: false
  },

  // Promotion
  promotion: {
    tier: 0,
    title: 'Unknown Operator',
    unlocks: []
  },

  // Logbook (Residue)
  logbook: [],
  discoveries: [],
  contacts: []
};

function loadSavedState() {
  if (typeof window === 'undefined') return INITIAL_STATE;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_STATE;

    const parsed = JSON.parse(saved, (_key, value) => value === '__INFINITY__' ? Infinity : value);
    const hasLegacyConsoleProgress = !parsed.orientation && (
      Number(parsed.tasksCompleted) > 0 || Number(parsed.day) > 1
    );

    return {
      ...INITIAL_STATE,
      ...parsed,
      components: { ...INITIAL_STATE.components, ...parsed.components },
      qualities: { ...INITIAL_STATE.qualities, ...parsed.qualities },
      orientation: {
        ...INITIAL_STATE.orientation,
        ...parsed.orientation,
        ...(hasLegacyConsoleProgress ? { completed: true, skipped: true } : {})
      },
      promotion: { ...INITIAL_STATE.promotion, ...parsed.promotion },
      logbook: Array.isArray(parsed.logbook) ? parsed.logbook : [],
      discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function GameStateProvider({ children }) {
  const [state, setState] = useState(loadSavedState);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(
        state,
        (_key, value) => value === Infinity ? '__INFINITY__' : value
      );
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Storage can be unavailable in private browsing. The in-memory file remains valid.
    }
  }, [state]);

  // Credit management
  const addCredits = useCallback((amount) => {
    setState(prev => {
      const newCredits = Math.min(prev.credits + amount, prev.maxCredits);
      return { ...prev, credits: newCredits };
    });
  }, []);

  const spendCredits = useCallback((amount) => {
    setState(prev => {
      if (prev.credits < amount) return prev;
      return { ...prev, credits: prev.credits - amount };
    });
  }, []);

  // Component management
  const addComponent = useCallback((componentName) => {
    setState(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentName]: true
      }
    }));
  }, []);

  const hasComponent = useCallback((componentName) => {
    return state.components[componentName];
  }, [state.components]);

  const componentsCount = Object.values(state.components).filter(Boolean).length;

  // Quality management
  const increaseQuality = useCallback((quality, amount = 1) => {
    setState(prev => ({
      ...prev,
      qualities: {
        ...prev.qualities,
        [quality]: Math.min(prev.qualities[quality] + amount, 5)
      }
    }));
  }, []);

  // Attention management
  const increaseAttention = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      attention: Math.min(prev.attention + amount, 10)
    }));
  }, []);

  const decreaseAttention = useCallback((amount = 1) => {
    setState(prev => ({
      ...prev,
      attention: Math.max(prev.attention - amount, 0)
    }));
  }, []);

  // Promotion system
  const PROMOTIONS = [
    {
      tier: 0,
      title: 'Unknown Operator',
      maxCredits: 500,
      unlocks: ['basic-tasks', 'break-room', 'memos']
    },
    {
      tier: 1,
      title: 'Operator',
      maxCredits: 1000,
      unlocks: ['notice-storylets', 'first-investigation'],
      requirement: () => state.qualities.doubt >= 1
    },
    {
      tier: 2,
      title: 'Senior Operator',
      maxCredits: 2500,
      unlocks: ['restricted-areas', 'deeper-investigation'],
      requirement: () => state.qualities.doubt >= 2 && state.deaths >= 1
    },
    {
      tier: 3,
      title: 'Lead Operator',
      maxCredits: 5000,
      unlocks: ['self-dispatch', 'operator5-log'],
      requirement: () => state.qualities.doubt >= 3 && componentsCount >= 3
    },
    {
      tier: 4,
      title: 'Acting Manager',
      maxCredits: 10000,
      unlocks: ['classified-memos', 'all-secret-zones'],
      requirement: () => state.qualities.doubt >= 4 && componentsCount >= 4
    },
    {
      tier: 5,
      title: 'Manager',
      maxCredits: Infinity,
      unlocks: ['the-summons', 'final-choice', 'endings'],
      requirement: () => componentsCount >= 6
    }
  ];

  const checkPromotion = useCallback(() => {
    const currentTier = state.promotion.tier;
    const nextTier = PROMOTIONS[currentTier + 1];

    if (!nextTier) return false;

    if (nextTier.requirement && nextTier.requirement()) {
      setState(prev => ({
        ...prev,
        promotion: {
          tier: nextTier.tier,
          title: nextTier.title,
          unlocks: [...prev.promotion.unlocks, ...nextTier.unlocks]
        },
        maxCredits: nextTier.maxCredits
      }));
      return true;
    }

    return false;
  }, [state.promotion.tier, state.qualities.doubt, state.deaths, componentsCount]);

  // Orientation and progress tracking
  const recordOrientationTask = useCallback(() => {
    setState(prev => {
      if (
        prev.orientation.completed ||
        prev.orientation.taskRecorded ||
        prev.day !== 1 ||
        prev.tasksCompleted !== 0
      ) return prev;

      return {
        ...prev,
        credits: Math.min(prev.credits + 10, prev.maxCredits),
        tasksCompleted: 1,
        orientation: { ...prev.orientation, taskRecorded: true },
        logbook: [...prev.logbook, {
          day: prev.day,
          text: 'Orientation link verified. The live queue opened with forty-nine tasks remaining.',
          timestamp: Date.now()
        }]
      };
    });
  }, []);

  const completeOrientation = useCallback((skipped = false) => {
    setState(prev => {
      if (prev.orientation.completed) return prev;

      return {
        ...prev,
        orientation: {
          ...prev.orientation,
          completed: true,
          skipped
        },
        logbook: skipped
          ? [...prev.logbook, {
              day: prev.day,
              text: 'Orientation waived. Prior operating knowledge accepted without verification.',
              timestamp: Date.now()
            }]
          : prev.logbook
      };
    });
  }, []);

  const incrementDay = useCallback(() => {
    setState(prev => ({
      ...prev,
      day: prev.day + 1,
      tasksCompleted: 0
    }));
  }, []);

  const completeTask = useCallback(() => {
    setState(prev => ({
      ...prev,
      tasksCompleted: Math.min(prev.tasksCompleted + 1, 50)
    }));
  }, []);

  const recordDeath = useCallback(() => {
    setState(prev => ({
      ...prev,
      deaths: prev.deaths + 1
    }));
  }, []);

  // Logbook
  const addLogEntry = useCallback((entry) => {
    setState(prev => ({
      ...prev,
      logbook: [...prev.logbook, {
        day: prev.day,
        text: entry,
        timestamp: Date.now()
      }]
    }));
  }, []);

  // Discoveries
  const addDiscovery = useCallback((discovery) => {
    setState(prev => ({
      ...prev,
      discoveries: [...prev.discoveries, {
        day: prev.day,
        text: discovery,
        timestamp: Date.now()
      }]
    }));
  }, []);

  // Contacts
  const addContact = useCallback((contact) => {
    setState(prev => {
      if (prev.contacts.find(c => c.name === contact.name)) return prev;
      return {
        ...prev,
        contacts: [...prev.contacts, {
          ...contact,
          firstMet: prev.day,
          interactions: 1
        }]
      };
    });
  }, []);

  // Reset for new game
  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const value = {
    state,
    actions: {
      addCredits,
      spendCredits,
      addComponent,
      hasComponent,
      componentsCount,
      increaseQuality,
      increaseAttention,
      decreaseAttention,
      checkPromotion,
      recordOrientationTask,
      completeOrientation,
      incrementDay,
      completeTask,
      recordDeath,
      addLogEntry,
      addDiscovery,
      addContact,
      resetGame
    },
    PROMOTIONS
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
