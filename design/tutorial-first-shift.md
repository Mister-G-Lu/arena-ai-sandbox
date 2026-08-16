# Tutorial Design: FIRST SHIFT
## Orientation Sequence — The Player's First Minutes

> **Status:** Implemented
> **Location:** `src/components/FirstShift.jsx` + `OrientTerminal*.jsx`
> **Runtime:** ~2-3 minutes to complete
> **Purpose:** Eases the player into the game's narrative tone and core mechanics while seeding the central mysteries

---

## 1. Design Philosophy

### Why a Tutorial?
The game's core loop (50 actions per shift, storylet-driven progression) is simple mechanically but **narratively dense**. Players need to understand:
- The **tone** (warm, deadpan, bureaucratic horror)
- The **mystery** (what is wrong with this city?)
- The **mechanic** (click to execute tasks, read the log)
- The **stakes** (you've always been here, you can never leave)

A traditional tutorial ("Click here to start your first task!") would break immersion. Instead, the First Shift **is** the first story beat — the player's orientation to the job is also their orientation to the game.

### The Tutorial as Narrative
The First Shift takes place **in-universe**. The player is not "learning a game" — they are **being oriented to their new job** at Meridian Central Dispatch. The tutorial's "steps" are diegetic:
1. Boot sequence = the terminal initializing
2. M.'s memo = your first day paperwork
3. Station check = learning the console UI
4. Break room = your first choice (which doesn't matter)
5. First task = executing your first work order
6. Shift begins = transitioning to the main game

The player learns the mechanics **by doing them**, not by being told about them.

---

## 2. Narrative Structure

### Step-by-Step Breakdown

#### **Step 0: Boot Sequence**
**What happens:** The terminal boots with a typewriter-style line-by-line reveal. System checks run. The player sees:
- Terminal version (v0.41.312)
- Hardware/Network/Roster checks
- **COFFEE STATUS: WARM** (the first wrongness)
- **MEMORY INTEGRITY: UNVERIFIED** (the first hint)

**What it teaches:**
- The terminal is the game's interface
- The city's systems are automated, indifferent
- Something is off (coffee was already warm, memory is "unverified")

**Seeded mysteries:**
- Why is the coffee already warm?
- What does "memory integrity: unverified" mean?
- Why does the roster say "1 operator pending" if you're already hired?

**Waiver branch:** If the player chooses **I ALREADY KNOW ALL OF THIS**, the game no
longer silently skips to the queue. M. opens an unscheduled direct channel:
*“Oh, so you think you already know all of this? … Let's see how smart you are when
the terminal answers back.”* The player may accept the waiver or back down and begin
orientation. This makes skipping itself a character beat and establishes that M. can
speak like a person, not only issue memos.

---

#### **Step 1: Memo from M.**
**What happens:** A memo appears from M. (the Manager), welcoming you to the job. The memo is polite, bureaucratic, and slightly wrong:
- "Your name appeared on the overnight roster this morning. It has been there for **some time**."
- "New operators are always on the roster before they apply."
- "The coffee in the break room is already warm. You did not turn it on. **This is fine.**"

**What it teaches:**
- M. is the system's voice (polite, controlling, unknowable)
- You've always been here (the roster had your name before you applied)
- The coffee is a recurring motif (it's always warm, you never made it)

**Seeded mysteries:**
- How long have you been on the roster?
- Who is M.? (They've never been seen)
- Why is it "fine" that you didn't make the coffee?

---

#### **Step 2: Station Check**
**What happens:** The tutorial walks through the four readouts on the console:
- **SHIFT DAY: 4** — "It says 4. It has always said 4. The calendar shows Tuesday. It always shows Tuesday."
- **SHIFT CLOCK: 01:00** — "Counts forward to 06:00. You have until then. You have never once seen 06:00. No one has."
- **TASKS REMAINING: 50** — "The same fifty. There are no new tasks. There have never been new tasks."
- **STATUS: CLEAR** — "It will stay clear. It always stays clear."

**What it teaches:**
- The console UI (what each readout means)
- The shift structure (01:00–06:00, 50 tasks)
- The central loop (you never see 06:00, the tasks are always the same)

**Seeded mysteries:**
- Why does the day always say 4?
- Why does the calendar always say Tuesday?
- Why has no one ever seen 06:00?
- Why are there "no new tasks"?

---

#### **Step 3: The Break Room (First Choice)**
**What happens:** The player is asked to "check the break room." The tutorial describes the coffee (warm, full, you didn't make it) and then asks:

> **How do you feel about the coffee?**

Three choices:
1. **IT'S FINE** → "It is fine. It is always fine. The system notes your comfort. **Comfort is compliance.**"
2. **I DIDN'T MAKE THIS** → "Correct. You did not. No one did. It was warm before the shift. **It was warm before the building.**"
3. **WHO MADE IT?** → "**[NO DATA]** The question has been filed. The file is empty. The file has **always** been empty."

**What it teaches:**
- The player can make choices (but they don't matter)
- The system responds to questions with polite non-answers
- The coffee is a mystery (it's always warm, no one made it)

**Seeded mysteries:**
- Why is the coffee always warm?
- Who (or what) made it?
- Why does the system file questions it won't answer?

**Design note:** All three choices lead to the same outcome (the player returns to their station). This teaches the player that **choices feel meaningful but don't change the outcome** — a core theme of the game.

---

#### **Step 4: First Task**
**What happens:** The tutorial explains the core mechanic:
- Press EXECUTE → task is logged, clock advances, count decreases
- "This is the job. This is all the job is. Fifty small actions. None of them wrong. **There cannot be wrong actions.**"

The player executes their first task:
> **01:06 — ORIENTATION TASK: Verify terminal link.**
> LINK VERIFIED. Signal: strong. The console knows you are here. **The console has always known you are here.**

**What it teaches:**
- The core loop (click to execute, watch the log, see the clock advance)
- There are no "wrong" actions (you can't fail)
- The system is always watching

**Seeded mysteries:**
- Why has the console "always known" you're here?
- What does it mean that there are "no wrong actions"?
- Why is the system so certain about everything?

---

#### **Step 5: Orientation Complete**
**What happens:** The tutorial concludes:
> ORIENTATION COMPLETE.
> 
> You have been oriented, Operator.
> 
> — Your shift is **active**.
> — Your quota is **loaded**.
> — Your coffee is **warm**.
> 
> The city is counting on you. **The city has always been counting on you.**
> 
> Report to your console below. Fifty tasks await. **They have always been waiting.**

A button scrolls the player to the main console section, where they begin their first shift.

**What it teaches:**
- The tutorial is over, the game has begun
- The transition from "learning" to "playing" is seamless
- The city is always watching, always counting

**Seeded mysteries:**
- Why has the city "always been counting" on you?
- Why have the tasks "always been waiting"?
- What happens when you complete all 50 tasks?

---

## 3. Tone & Voice

### The System's Voice
The tutorial is written in the voice of **the system** — polite, bureaucratic, controlling. Key characteristics:
- **Deadpan:** Everything is stated as fact, no emotion
- **Polite:** The system is never rude, only certain
- **Reassuring (in a wrong way):** "This is fine." "It will stay clear." "You are ready."
- **Slightly off:** Small wrongnesses ("the coffee was warm before the building")
- **Repetitive:** "Always" is a keyword — "always been here," "always known," "always waiting"

### The Player's Voice
The player has no voice in the tutorial. They don't speak, they only **choose**. This reinforces the theme: **you are an operator, not a protagonist**. You execute tasks, you don't drive the story.

### Key Phrases
The tutorial establishes several recurring phrases that become motifs throughout the game:
- "The coffee is warm" (always warm, never made)
- "You have always been here" (the roster, the console, the city)
- "It always says Tuesday" (the calendar never changes)
- "You have never seen 06:00" (the shift ends before you can see it)
- "The city is counting on you" (the system is always watching)

---

## 4. Technical Implementation

### HTML Structure
The tutorial is a new section (`#first-shift`) inserted between the Grid and Console sections:

```html
<section id="first-shift" class="section section-orient">
  <div class="wrap">
    <h2>FIRST SHIFT</h2>
    <p class="section-lede">...</p>
    
    <div class="orient-terminal" id="orient-terminal">
      <div class="orient-head">
        <span class="dot dot-amber"></span>
        MERIDIAN CENTRAL DISPATCH — ORIENTATION SUBSYSTEM
        <span class="orient-status" id="orient-status">IDLE</span>
      </div>
      <div class="orient-screen" id="orient-screen">
        <!-- Steps render here -->
      </div>
      <div class="orient-actions">
        <button id="orient-btn" class="btn btn-primary">▸ INITIATE ORIENTATION</button>
      </div>
    </div>
  </div>
</section>
```

### JavaScript Architecture
The tutorial is implemented as a separate IIFE module in `app.js`:

```javascript
(() => {
  // Step definitions (array of objects)
  const STEPS = [
    { status: 'MEMO RECEIVED', render() { ... } },
    { status: 'STATION CHECK', render() { ... } },
    { status: 'BREAK ROOM', render() { ... } },
    { status: 'FIRST TASK', render() { ... } },
    { status: 'ORIENTED', render() { ... } }
  ];
  
  // Helper functions
  function appendText(text) { ... }
  function appendChoices(choices) { ... }
  function goToStep(n) { ... }
  
  // Boot sequence (typewriter effect)
  function runBootSequence() { ... }
  
  // Init
  btn.onclick = () => runBootSequence();
})();
```

### Key Features
1. **Boot Sequence Animation:** Lines appear one by one with a typewriter effect (22ms per line)
2. **Step Transitions:** Each step has a `render()` function that appends content to the screen
3. **Choice System:** The break room step uses `appendChoices()` to present three options
4. **Status Bar:** The header shows the current step's status (e.g., "MEMO RECEIVED")
5. **Smooth Scroll:** The final step scrolls to the console section
6. **Reduced Motion Support:** Respects `prefers-reduced-motion` (disables animations)

### CSS Styling
The tutorial section uses a distinct visual style:
- **Scanline overlay** (repeating gradient) for CRT effect
- **Amber status dot** (pulsing) to distinguish from the console's teal dot
- **Teal text** with subtle glow (`text-shadow`)
- **Divider lines** between sections
- **Choice buttons** with hover effects

---

## 5. Integration with the Game

### Where It Fits
The First Shift is the **first thing the player experiences** after the hero section. The page flow is:
1. Hero (hook: "You were already on the roster")
2. Directive (the job: 50 tasks, 100% attendance)
3. Grid (the city: 41,312 population, 9 sectors)
4. **First Shift (tutorial: orientation sequence)**
5. Console (main game: execute 50 tasks)
6. Bulletins (memos: the system's voice)

The hero CTA ("BEGIN SHIFT") now points to `#first-shift` instead of `#shift`, so new players go through the tutorial before the main game.

### Transition to the Main Game
When the player completes the tutorial, they click "BEGIN YOUR SHIFT" which scrolls to the console section. The console is **already initialized** (from the existing JS), so the player can immediately start executing tasks.

**Future enhancement:** The tutorial could "seed" the console's first log line. For example, after the tutorial's "ORIENTATION TASK," the console's first task could be:
> 01:12 — FIRST REAL TASK: Roll call — VANTABLACK, Sector 9. Roads clear, stars out, all clear.

This would create a seamless narrative bridge from tutorial to game.

---

## 6. Future Enhancements

### Variant Paths
The tutorial could branch based on player behavior:
- If the player clicks through quickly → "You are eager. The system appreciates eagerness."
- If the player takes a long time → "You are thorough. The system appreciates thoroughness."
- If the player tries to go back → "You are curious. The system notes curiosity."

### Hidden Content
The tutorial could hide a secret for observant players:
- If the player inspects the boot sequence's "MEMORY INTEGRITY: UNVERIFIED" line, it could reveal a hidden message
- If the player clicks the status bar, it could toggle a "DEBUG MODE" that shows hidden data

### Accessibility
The tutorial could offer a "SKIP ORIENTATION" button for returning players, or a "REPLAY ORIENTATION" button after completion (already implemented).

### Localization
The tutorial's text is hardcoded in English. For localization, the text could be moved to a separate data structure (JSON or i18n keys).

---

## 7. Testing Checklist

- [x] Boot sequence animates correctly
- [x] All 5 steps render in order
- [x] Break room choices work (all 3 lead to the same outcome)
- [x] First task executes and transitions to final step
- [x] Final step scrolls to console
- [x] Status bar updates correctly
- [x] Reduced motion preference is respected
- [x] Waiving orientation opens M.'s direct channel before the player confirms the skip
- [x] JS syntax is valid (verified with `node -c`)
- [x] HTML structure is valid (all IDs present)
- [ ] Playtest: Does the tutorial feel like part of the game, not a tutorial?
- [ ] Playtest: Are the seeded mysteries noticeable but not confusing?
- [ ] Playtest: Does the transition to the console feel seamless?

---

## 8. Summary

The First Shift tutorial is a **narrative onboarding** that:
1. **Eases the player** into the game's tone and mechanics
2. **Seeds the mysteries** that drive the story (coffee, roster, 06:00)
3. **Teaches the core loop** (click to execute, read the log)
4. **Establishes the system's voice** (polite, controlling, slightly off)
5. **Transitions seamlessly** to the main game

The tutorial is **diegetic** (it exists in the game world), **interactive** (the player makes choices), and **thematically consistent** (choices don't matter, the system is always watching).

The player finishes the tutorial feeling:
- Oriented (they know how to play)
- Curious (what's wrong with this city?)
- Slightly uneasy (why is the coffee always warm?)
- Ready to begin their shift

**This is the game's first impression. It should feel like the game itself — warm, deadpan, and just a little bit wrong.**
