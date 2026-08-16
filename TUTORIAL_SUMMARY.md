# FIRST SHIFT Tutorial — Implementation Summary

## What Was Built

A fully interactive tutorial/orientation sequence that introduces players to the game's narrative, tone, and mechanics before they reach the main console.

## Files Modified

### 1. `docs/index.html` (+30 lines)
- Added new `#first-shift` section between Grid and Console
- Updated hero CTA to point to `#first-shift` instead of `#shift`
- Added "FIRST SHIFT" to navigation menu

### 2. `docs/styles.css` (+233 lines)
- New `.section-orient` styles with CRT scanline overlay effect
- `.orient-terminal` — dark terminal container with amber status dot
- `.orient-screen` — scrollable content area with teal text
- `.orient-choices` — choice button styling with hover effects
- Animations: boot sequence fade-in, choice responses, cursor blink

### 3. `docs/app.js` (+349 lines)
- New IIFE module for orientation logic
- **Boot sequence** — typewriter-style line-by-line reveal (22ms/line)
- **Step machine** — 5 narrative steps with status bar updates
- **Choice system** — 3-option choice at break room (all lead to same outcome)
- **Smooth transition** — final step scrolls to console
- Respects `prefers-reduced-motion`

### 4. `design/tutorial-first-shift.md` (+343 lines)
- Complete design document covering:
  - Narrative structure (step-by-step breakdown)
  - Tone and voice guidelines
  - Technical implementation details
  - Integration with the main game
  - Future enhancement ideas
  - Testing checklist

## How It Works

### Player Flow
1. Hero section → clicks "BEGIN SHIFT"
2. Scrolls to `#first-shift` section
3. Clicks "INITIATE ORIENTATION"
4. Watches boot sequence animate
5. Reads M.'s welcome memo
6. Reviews station readouts (with narrative wrongness)
7. Makes first choice (break room coffee)
8. Executes first task
9. Clicks "BEGIN YOUR SHIFT" → scrolls to console
10. Starts playing the main game

### Narrative Beats
- **Boot sequence** seeds first wrongnesses (coffee already warm, memory unverified)
- **M.'s memo** establishes the system's voice (polite, controlling, unknowable)
- **Station check** teaches the UI while reinforcing the loop (always Tuesday, never 06:00)
- **Break room** gives first choice (teaches choices feel meaningful but don't matter)
- **First task** teaches the core mechanic (click to execute, watch the log)

### Mysteries Seeded
These questions are planted but not answered (drives curiosity):
- Why is the coffee always warm?
- How long have you been on the roster?
- Who is M.?
- Why does the calendar always say Tuesday?
- Why has no one ever seen 06:00?
- What does "memory integrity: unverified" mean?

## Technical Highlights

### Boot Sequence Animation
```javascript
const BOOT_LINES = [
  '> MERIDIAN CENTRAL DISPATCH',
  '> TERMINAL v0.41.312',
  '> COFFEE STATUS ........... WARM',
  '> MEMORY INTEGRITY ......... UNVERIFIED',
  // ...
];

function runBootSequence() {
  let i = 0;
  function nextLine() {
    if (i >= BOOT_LINES.length) {
      setTimeout(() => goToStep(0), 600);
      return;
    }
    const line = document.createElement('div');
    line.innerHTML = BOOT_LINES[i];
    screen.appendChild(line);
    i++;
    setTimeout(nextLine, 22 + Math.random() * 60);
  }
  nextLine();
}
```

### Choice System
```javascript
function appendChoices(choices) {
  choices.forEach(c => {
    const b = document.createElement('button');
    b.textContent = c.label;
    b.onclick = () => {
      // Disable all, highlight chosen
      // Show response text
      // Show next button
      c.onChoose();
    };
  });
}
```

### Step Machine
```javascript
const STEPS = [
  { status: 'MEMO RECEIVED', render() { ... } },
  { status: 'STATION CHECK', render() { ... } },
  { status: 'BREAK ROOM', render() { ... } },
  { status: 'FIRST TASK', render() { ... } },
  { status: 'ORIENTED', render() { ... } }
];

function goToStep(n) {
  currentStep = n;
  setStatus(STEPS[n].status);
  STEPS[n].render();
}
```

## Design Decisions

### Why Diegetic?
The tutorial exists **in the game world** — you're not "learning a game," you're "being oriented to your job." This maintains immersion and reinforces the theme that you are an operator, not a player.

### Why Choices That Don't Matter?
The break room coffee choice has 3 options that all lead to the same outcome. This teaches the player that **choices feel meaningful but don't change the system** — a core theme of the game.

### Why Seed Mysteries?
The tutorial plants questions (coffee, roster, 06:00) that aren't answered until much later. This creates curiosity and gives players something to look forward to discovering.

### Why Typewriter Effect?
The boot sequence animates line-by-line to feel like a real terminal booting up. This slows the player down and sets the mood before they start reading narrative text.

## Testing

### Manual Testing
- [x] Boot sequence animates correctly
- [x] All 5 steps render in order
- [x] Break room choices work (all 3 lead to same outcome)
- [x] First task executes and transitions to final step
- [x] Final step scrolls to console
- [x] Status bar updates correctly
- [x] JS syntax is valid
- [x] HTML structure is valid

### Playtesting Needed
- [ ] Does the tutorial feel like part of the game?
- [ ] Are the seeded mysteries noticeable but not confusing?
- [ ] Does the transition to the console feel seamless?
- [ ] Is the tone consistent with the rest of the game?

## Future Enhancements

### Variant Paths
Branch based on player behavior:
- Fast clickers → "You are eager. The system appreciates eagerness."
- Slow readers → "You are thorough. The system appreciates thoroughness."
- Going back → "You are curious. The system notes curiosity."

### Hidden Content
Reward observant players:
- Inspect "MEMORY INTEGRITY: UNVERIFIED" → hidden message
- Click status bar → toggle "DEBUG MODE"

### Accessibility
- Add "SKIP ORIENTATION" for returning players
- Add "REPLAY ORIENTATION" after completion (already done)
- Consider audio narration for the boot sequence

### Localization
- Move hardcoded text to JSON/i18n keys
- Support for multiple languages

## Metrics to Track

Once the game is live, track:
- **Tutorial completion rate** — do players finish it?
- **Time to complete** — how long does it take?
- **Choice distribution** — which coffee choice do players pick?
- **Replay rate** — do players replay the tutorial?
- **Drop-off points** — where do players quit?

## Summary

The FIRST SHIFT tutorial is a **narrative onboarding** that:
- Eases players into the game's tone and mechanics
- Seeds mysteries that drive the story forward
- Teaches the core loop through doing, not telling
- Establishes the system's voice (polite, controlling, slightly off)
- Transitions seamlessly to the main game

**Total implementation:** ~950 lines of code across 4 files, plus a comprehensive design document.

**Time to complete:** ~2-3 minutes for the player.

**Impact:** Sets the tone for the entire game, creates curiosity, and teaches mechanics without breaking immersion.
