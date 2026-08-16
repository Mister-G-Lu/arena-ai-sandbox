# DEV TOOLS — the Maintenance Terminal
### Design note: how developers cheat, warp, and test FALSE REALITY

> **The short answer to "does email login make this hard?":** No — because dev access
> should never be an *account* in the first place. Login is about **identity**; dev
> mode is about **capability**. Bind the cheats to the build and the device, not to a
> user row in a database. Then a dev can warp to Day 80 while signed out, signed in as
> a fresh account, or signed in as a real player's copied save.

---

## 1. The problem

FALSE REALITY is ~85–110 shifts, ~4,400–5,300 actions, 6 zones, 4 endings and 2–4 deaths
(P9, P8, P1). Reaching the Summons legitimately is **30+ hours of play**. Nobody can
test Arc III that way, and nobody should try. Every content change to a late storylet
needs a 5-second path to "put me there, in that exact state, now."

What testers actually need, in priority order:

1. **Warp** — jump to an arc/day/beat with the correct surrounding state.
2. **Poke** — edit any quality, component, flag, or zone status live.
3. **Observe** — see hidden values (Attention is diegetic-only for players — open
   question §9.1 in Draft 04 — but QA must see the number).
4. **Repeat** — save/restore an exact state, and share it with another human.
5. **Accelerate** — skip the 50-action shift, force a glitch, force a death.

---

## 2. Why an admin *account* is the wrong shape

The instinct is "make a Developer role on the account, log in with dev@…, unlock
cheats." That couples three things that want to be separate:

| Coupling problem | What goes wrong |
|---|---|
| Cheats require login | You can't test the **pre-login / first-run** experience — which for this game is the whole cold open. |
| Cheats require *the right* login | Every dev needs a provisioned account per environment; new contributor onboarding becomes a ticket. |
| Cheats live behind a server flag | You can't test **offline**, and every warp is a round trip. |
| Role lives in the DB | A prod DB row is now the only thing between a player and god mode. One bad migration or one leaked session = cheats in the wild. |
| Email magic-link in dev | Testing 12 fresh save states means 12 real inboxes, or an SMTP catcher. Painful. |

And the killer: the state you want to manipulate is **client-side game state**. A
server role can't help you set `doubt = 7` in the browser you're staring at.

---

## 3. The model: capability, in three tiers

Dev mode is a boolean the *client* computes at boot. Three independent gates,
strongest first:

### Tier 1 — Build gate (the real security boundary)
The dev menu ships as **separate files** (`docs/devtools.js`, `docs/devtools.css`) that
are **never referenced by a production build**. In this repo there's no bundler, so
`index.html` uses a conditional loader: the script is only injected into the DOM if the
gate passes. A production build should go further and delete the files outright
(one line in the deploy step). If the code isn't there, it cannot be exploited.

### Tier 2 — Environment gate (zero-friction for devs)
Auto-on, no interaction, when the origin is obviously not production:
`localhost`, `127.0.0.1`, `*.local`, `*.e2b.app` (sandbox previews), `file://`.
Clone the repo, `python3 -m http.server`, press **`** — you have the menu. No account,
no config, no seed data.

### Tier 3 — Opt-in gate (for shared/staging builds)
`?dev=1` in the URL sets a `localStorage` flag that persists for that browser profile.
`?dev=0` clears it. This is how you hand a build to a writer or a playtester who needs
to check their own storylet on the live staging URL, without shipping them a special
account. It is deliberately **not a secret** — Tier 1 is what protects production.
If staging needs to be non-public, put HTTP basic auth or an allowlist in front of the
*whole site*; don't invent a cheat password.

**Escalation path, if the game ever gets a server:** keep Tiers 1–3 exactly as they
are for client state, and add a Tier 4 for anything the server owns (cloud saves,
telemetry, purchases): a `dev` claim on the session token, checked server-side.
That claim is the *only* thing that ever needs an account. Client cheats stay
account-free forever.

---

## 4. So how does login fit?

Login, when it arrives, should be a **thin sync layer over a local save**, not the
source of truth. The logbook is the diegetic save file (P6) — keep that literal:

```
localStorage  ──(authoritative while playing)──>  game
     ▲                                              │
     └────────── optional cloud sync, if signed in ─┘
```

Consequences that make dev life easy:

- **Playable signed-out.** The dev menu manipulates the local save; auth is irrelevant.
- **Save = a JSON blob.** Export/import is the universal cheat: any state a dev can
  reach, they can paste to a colleague. Bug reports carry their own repro.
- **Named local slots** replace "test accounts" entirely. Slot A = Arc I clean,
  Slot B = pre-Summons, Slot C = 3 scars + high Attention.

When you *do* add email auth, three cheap things keep it out of QA's way:

1. **Plus-addressing for test users** — `you+qa-arc3@gmail.com` all land in one inbox.
   No admin role table needed; a hundred test accounts, one mailbox.
2. **A dev mail sink** in non-prod (Mailpit/Mailhog, or log the magic link to stdout).
   Never a hardcoded backdoor code in the auth path — that's the one thing that
   eventually ships to production.
3. **`@example.com` fixture accounts** seeded in non-prod DBs only, with pre-baked
   saves attached — the closest thing to a "dev account" worth having, and it exists
   for *save fixtures*, not for permissions.

---

## 5. Target: what the full menu manipulates

The intended panel covers anything the design bible treats as state and is generated
**from the state schema**, so new qualities appear automatically — a dev tool that
needs manual updating rots within a month. The current pre-alpha panel is the smaller
subset recorded in §9.

| Group | Contents |
|---|---|
| **Shift** | Day, weekday, tasks remaining, clock (01:00–06:00), arc |
| **Qualities** | Perception, Doubt, **Attention** (hidden from players, shown here), Salary |
| **Components** | Null Key, Lens, Wire, Crystal, Chip, the Sixth |
| **Zones** | Each of the six: `locked / found / open / cleared / closed` |
| **Checklist** | Form, Name, Sixth, Signal, Hour |
| **Death** | Death count, scar list, discrepancy count for the next Reinstatement |
| **Toggles** | Glitch rate, ambient FX, god mode (refuse all deaths), fast clock, reveal metadata (the Lens, as a debug view), reduced-motion override |

## 6. Warps — the feature that actually saves the day

A warp is a **named, declarative state patch**, stored next to the content it tests.
Not "set 14 fields by hand" — one button that lands you in a *coherent* state, because
half of testing Arc III is discovering that Arc III breaks when `name` is unset.

```js
{ id: 'summons', label: 'Arc III — The Summons (Day 80)',
  patch: { arc: 3, shift: { day: 80 }, components: ALL_BUT_SIXTH,
           qualities: { doubt: 9, perception: 6 }, zones: { …cleared } } }
```

Ship a warp for every beat that has ever had a bug: Day 1 cold open, Day 2 Floor 12 lead,
Days 3+ first Notice / Handwriting case, Day 30 Floor 12 breach & first death / Interim,
mid-Arc-II (3 components), Arc II gate (5 + Doubt threshold), the Summons (Day 80),
the Last Shift, the descent, and each of the four endings. Each warp is ~6 lines. **Warps are
content, and they live in version control** — that's what makes them shareable and reviewable
in a PR.

## 7. Safety rails (cheap, worth it)

- **`devTouched`** — set to `true` at the save root and never cleared once any
  cheat fires. It rides along in exports and (later) telemetry, so a bug report
  from a warped save is self-labelling. This and the visible badge are implemented.
- **A visible badge.** The panel and HUD make dev mode unmistakable, so nobody
  reports “the pacing feels off” from a save with an unbound action tank.
- **No cheat should write to the cloud as a normal save.** Mark dev-touched
  saves as a separate class or refuse to upload them; this boundary remains open.
- **Keep it out of the analytics funnel** — dev sessions must not pollute balance data.

## 8. Diegetic framing (free, and on-theme)

Style the menu as the system's own **Maintenance Terminal** — patch-note typography,
`M.`'s voice in the button labels, `REASON FOR EDIT:` on the state form. The game is
about a bureaucracy that edits reality by filing forms (P6); a debug panel that edits
reality by filing forms is the same joke. It costs nothing, it makes demos delightful,
and if a slice of it ever leaks into a public build it reads as an easter egg rather
than a broken door.

## 9. Implementation in this repo

### Implemented pre-alpha subset

- `src/lib/devMode.ts` detects obvious development hosts and the persisted
  `?dev=1` / `?dev=0` opt-in. It is a device capability, never an account role.
- `src/components/DevPanel.jsx` is the Maintenance Terminal UI. It can refill or
  detach the action tank and drop the browser's opt-in.
- `GameStateContext.jsx` owns the cheat actions. Every use latches the canonical
  save's root `devTouched` flag; detaching the tank also persists
  `actionsUnbound`. The HUD and panel make an altered file visible.
- Save validation rejects an unbound tank without that audit flag. Tests cover
  host/query detection, schema validation, and the action-tank capability.

Development hosts (`localhost`, `127.0.0.1`, `*.local`, and sandbox preview
hosts) show the panel automatically. A shared build can use `?dev=1`; `?dev=0`
clears that browser's opt-in.

### Still required before a trust-sensitive release

- Production-build exclusion (or an explicit staging-only build flag). The
  current public pre-alpha still contains the panel and accepts `?dev=1` because
  all progression is client-authoritative anyway.
- Declarative beat warps, schema-generated quality/component/zone controls,
  named save slots, force-anomaly/death controls, and the backtick shortcut.
- Refusing cloud upload for `devTouched` files or storing them as a separate QA
  class. At present the badge is an audit signal, not a transport boundary.
- Server-side dev claims only if the server begins owning actions, telemetry,
  purchases, or competitive progression.

The minimal panel is enough to bypass the real-time action wait during opening
playtests. It is not yet the full Arc-II/III authoring terminal designed above.
