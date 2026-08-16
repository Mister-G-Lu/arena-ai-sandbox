# FALSE REALITY — Progression System Overview

## Quick Reference

This document provides a high-level overview of the player's journey through FALSE REALITY, including the promotion system, resource tracking, and story progression.

---

## The Three Arcs

### Arc I: THE ROSTER (Days 1-9)
**Theme:** "It's just a job."
**Promotion:** Unknown Operator → Operator
**Resources:** ~200-400 Credits, 1 Component, basic qualities
**Key Beat:** First death on Day 9 (discover the loop exists)

### Arc II: THE PATCH (Days 10-42)
**Theme:** "Every truth costs a Tuesday."
**Promotions:** Operator → Senior → Lead → Acting Manager
**Resources:** ~2,000-3,000 Credits, 4-5 Components, mid qualities
**Key Beat:** Learn you are the exception handler, gather components

### Arc III: 0600 (Days 43-52)
**Theme:** "The hour that kills you."
**Promotion:** Acting Manager → Manager (or Rogue)
**Resources:** ~3,500-4,500 Credits, all 6 Components, max qualities
**Key Beat:** Assemble Seam Ripper, choose your ending

---

## Promotion Tiers

| Tier | Title | When | Unlocks |
|------|-------|------|---------|
| 0 | Unknown Operator | Day 1-9 | Basic tasks, break room, memos |
| 1 | Operator | Day 9+ | Notice storylets, first investigation |
| 2 | Senior Operator | Day 15+ | Restricted areas, deeper investigation |
| 3 | Lead Operator | Day 20+ | Self-dispatch, Operator 5's log |
| 4 | Acting Manager | Day 30+ | Classified memos, all secret zones |
| 5 | Manager | Day 42+ | The Summons, final choice, endings |

---

## Resources

### Credits (Salary)
- **Source:** Routine work (task execution)
- **Display:** Top bar, ¤ icon
- **Cap:** Increases with promotion (500 → ∞)
- **Uses:** Buy supplies, cool Attention, conveniences
- **Total:** ~3,500-4,500 over full game

### Components (Story Resources)
- **Source:** Secret zones (one-time discovery)
- **Display:** Top bar, ⚙ icon, shows count (X/6)
- **Cap:** 6 total
- **Uses:** Assemble Seam Ripper, authorize endgame actions
- **Items:** Key, Lens, Wire, Crystal, Chip, Interim

### Qualities (Hidden Meters)
- **Doubt:** Understanding of the loop (0-5)
- **Perception:** Observation ability (0-5)
- **Attention:** System heat (0-10, hidden, death at 10)
- **Display:** Profile page only

### Residue (Permanent Memory)
- **Source:** Major discoveries, deaths, revelations
- **Display:** Profile page, logbook section
- **Tracks:** Deaths, discoveries, contacts, logbook entries
- **Uses:** Unlocks special dialogue, affects endings

---

## The Checklist (Endgame Progression)

| # | Item | Where | When |
|---|------|-------|------|
| 1 | The Key | Floor 12 | Day 9 |
| 2 | The Lens | Records Basement | Day 15-20 |
| 3 | The Wire | Vent Network | Day 20-25 |
| 4 | The Crystal | Rooftop Array | Day 25-30 |
| 5 | The Chip | Off-Map Sectors | Day 30-35 |
| 6 | The Interim | The Interim | Day 35-42 |

**Display:** Top bar (X/6), Profile page (detailed list)

---

## User Interface

### Top Resource Bar
Always visible at top of screen:
- Credits (¤ amount / cap)
- Components (⚙ X/6)
- Day (current day number)
- Tasks (X/50 completed)
- Rank (current promotion title)
- Profile button (quick access)

### Left Sidebar Navigation
- HOME
- DIRECTIVE
- GRID
- FIRST SHIFT
- CONSOLE
- BULLETIN
- PROFILE (new)

### Profile Page
Comprehensive view of:
- Operator info (title, days, deaths)
- Resources (Credits, Components)
- Qualities (Doubt, Perception, Attention)
- Promotion status (current, next, requirements)
- Logbook (recent entries)
- Contacts (NPCs met)

---

## Story Progression Flow

```
Day 1: First Shift (tutorial)
  ↓
Days 2-4: Learn routine, notice wrongness
  ↓
Days 5-8: Coincidences, day crew notes change
  ↓
Day 9: FIRST DEATH → discover loop exists
  ↓
Days 10-15: Test the loop, learn what persists
  ↓
Days 16-25: Meet VANTABLACK, find Operator 5's log
  ↓
Days 26-35: Gather components, understand the patch
  ↓
Days 36-42: Learn you are the exception handler
  ↓
Day 42: THE SUMMONS → Manager offers choice
  ↓
Days 43-48: Final preparation, gather last component
  ↓
Days 49-52: THE LAST SHIFT → finale, choose ending
```

---

## Implementation Status

### ✅ Completed
- Resource system foundation (GameStateContext)
- Credits tracking
- Components tracking
- Qualities tracking (Doubt, Perception, Attention)
- ResourceBar component (top bar UI)
- ProfilePage component (detailed stats)
- Profile route (#profile)
- NavBar updated with Profile link

### 🚧 In Progress
- Connect Console to Credits (earn on task execution)
- Connect story beats to Qualities
- Connect story beats to Components
- Connect Attention to investigation actions
- Promotion notifications

### 📋 Planned
- Phase 1: Resource System Foundation ✅
- Phase 2: UI Components ✅
- Phase 3: Integration (connect game to resources)
- Phase 4: Promotion System (gates and notifications)
- Phase 5: Polish (animations, effects)

---

## Key Design Principles

1. **Story gates everything, not resources**
   - You can't grind your way to the ending
   - Resources track progress, not gate it

2. **Promotions are narrative milestones**
   - Advance by making discoveries, not grinding
   - Each promotion unlocks story content

3. **The UI reinforces the fiction**
   - You're an operator, not a player
   - Resources feel diegetic, not gamey

4. **Every mechanic serves the theme**
   - Monotony (routine work)
   - Discovery (investigation)
   - Choice (endings)

---

## Files Created

### Context
- `src/context/GameStateContext.jsx` — Resource and state management

### Components
- `src/components/ResourceBar.jsx` — Top bar UI
- `src/components/ResourceBar.css` — ResourceBar styles
- `src/components/ProfilePage.jsx` — Profile page UI
- `src/components/ProfilePage.css` — ProfilePage styles

### Updated
- `src/App.jsx` — Added GameStateProvider, ResourceBar, Profile route
- `src/hooks/useRouter.js` — Added 'profile' to valid pages
- `src/components/NavBar.jsx` — Added Profile link

### Documentation
- `PROGRESSION.md` — Full progression system design
- `PROGRESSION_SUMMARY.md` — This file

---

## Next Steps

1. **Integrate resources into Console**
   - Add Credits on task execution
   - Add Attention on investigation
   - Show resource gain animations

2. **Connect story beats**
   - Increase Doubt on discoveries
   - Add Components on zone completion
   - Record deaths

3. **Implement promotion gates**
   - Check promotion after story beats
   - Show promotion notifications
   - Unlock new content

4. **Add polish**
   - Resource gain/loss animations
   - Promotion ceremony
   - Checklist completion effects

---

## Summary

The progression system in FALSE REALITY is **narrative-first, mechanical-second**. Players advance through the story by making discoveries and surviving events, not by grinding. The UI (ResourceBar + Profile page) provides quick access to key stats while reinforcing the diegetic fiction: you are an operator in a system, not a player in a game.

**The game is not about getting stronger. It's about understanding what you are.**
