# User system — magic-link auth (draft)

**Status:** Historical design draft. **Do not implement the v1 envelope or
`fr:progress` / `fr:shift` / `fr:actions` keys below.**

**Implemented source of truth:** [`DEVELOPMENT.md`](DEVELOPMENT.md) and
`src/lib/gameSave.ts`. The live game uses one v2 operator file for local storage,
import/export, and Supabase, with explicit conflict choice instead of field-wise
merge. P10/action-tank notes remain future design only.

**Depends on:** ADR-01 (React + Vite + TypeScript).

## The fiction

You do not "log in." You **request a reinstatement token**. The Municipal
Authority emails you a link. Clicking it confirms you are still the operator
on the roster. Attendance is recorded.

There are no passwords. A password would imply you chose this job.

## Why magic link

- The audience is a habit-game audience. They will return from a phone, a
  work laptop, a different browser. A file that lives only in `localStorage`
  dies the first time they switch.
- Passwords are a support queue we will not staff.
- Magic link via Supabase Auth is one API (`signInWithOtp`) and a redirect
  back to the Pages origin.
- The email *is* the diegesis: "REINSTATEMENT TOKEN — do not forward."

## Identity

| Piece | Store | Notes |
|---|---|---|
| Auth user | Supabase Auth | email + uuid. Created on first magic-link. |
| Profile | `profiles` row, keyed by `auth.uid()` | display handle (default: "Operator"), created by a trigger on signup |
| Save file | `saves` row, **one per operator** (unique on `user_id`) | the logbook |

One operator, one file. There is no second slot. If they want a new life they
**terminate** the old one.

## The save envelope (v1)

The thing we put in `saves.payload` and the thing we export as JSON are the
same shape. That is the point: the cloud file *is* the logbook page.

```
{
  version: 1,
  exportedAt: ISO-8601,
  progress: { qualities, zones, seen },
  shift:    { day, tasks, minutes, log },
  actions:  { current, cap, regenMs, lastTick }
}
```

- `progress.qualities.Attention` is **hidden**. It is in the file. It is never
  rendered. The test suite must assert the Personnel "File" view does not
  print it.
- Unknown keys on import are rejected. A v2 envelope is a different
  `version`, not a bag of extras.

Local keys (Phase 1, pre-auth and as the offline cache):

| Key | Holds |
|---|---|
| `fr:progress` | qualities + zones + seen |
| `fr:shift` | day / tasks / clock / log |
| `fr:actions` | action tank |

## Merge rules (when a token lands on a machine that already has a logbook)

The operator is shown the conflict as a **work order**, not a dialog from a
website.

1. **Keep local** — cloud file is left untouched; next sync overwrites it.
2. **Take Records** — local is replaced by the cloud file.
3. **Merge** — per-field, take the *further along* value:
   - qualities: `max(local, cloud)` per key (Attention included)
   - zones: `complete` > `open` > `locked`
   - seen: union
   - shift: the higher `day`, then the lower `tasks` (further through tonight)
   - actions: `max(current)` after accruing both to *now*; `lastTick` = now
     if the result is at cap, else the later of the two ticks

Merge is the default recommendation. The system prefers continuity.

## Personnel actions

| Action | What it does |
|---|---|
| Request token | `signInWithOtp({ email })` |
| Clock in (callback) | session established; then merge choice if local exists |
| File | read-only view of the envelope (Attention omitted) |
| Export | download `false-reality-logbook.json` |
| Import | replace local from a v1 envelope; reject unknown keys / other versions |
| Terminate | delete the `saves` row, sign out, wipe local keys. The roster has a gap. For a moment. |

## Supabase (Phase 1)

- Project: `ltawgurvhffikilulyfj`
- Publishable key (safe in the client): `sb_publishable_0GwHPCqu6zkd23hJkttM1g_3Zgtf_nP`
- URL: `https://ltawgurvhffikilulyfj.supabase.co`
- Auth: magic link. Redirect URLs that must be allow-listed:
  - `http://localhost:5173/**` (Vite)
  - `https://mister-g-lu.github.io/arena-ai-sandbox/**` (Pages)
- Schema: `0001_init.sql` — `profiles`, `saves`, RLS (own rows only),
  signup trigger, unique index on `saves.user_id`.

Phase 1 trusts the client with the action tank. Phase 2 does not.

## Open questions

1. Do we ever show the email in the HUD, or only "ON DUTY · authenticated"?
2. Termination: is it undoable for 24h (fiction: "the form is in review") or
   immediate? Immediate is simpler and meaner. Lean immediate.
3. Should import from a foreign operator's export be refused (payload signed
   with `user_id`) or allowed (the logbook is an object in the world)? Allowed
   is more interesting. Decide at implementation.
