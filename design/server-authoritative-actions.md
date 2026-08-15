# Phase 2 — Server-authoritative actions

**Status:** Staged. Do not run in production until Phase 1 Personnel has been
lived-in for a bit. Schema lives in `supabase/0002_actions.sql` (not applied).
**Depends on:** P10, `design/user-system.md`, `supabase/0001_init.sql`.

## Why

Phase 1 trusts the client with the action tank. A clock-rolled laptop can mint
a full shift. That is fine for a pre-alpha on Pages. It is not fine the moment
a second operator exists, or the moment Floor 12's first death has a reward.

Phase 2 moves **regen and spend** to Postgres RPCs. The client still *displays*
the tank; it no longer *decides* it.

## The contract (same math as P10, now on the server)

| Rule | Server behaviour |
|---|---|
| Regen | `+1` per 10 minutes while `current < cap` |
| Cap | 50. Accrual that would exceed 50 is clamped; `last_tick` becomes `now()` |
| Full-tank spend | Spending from 50 sets `last_tick = now()` |
| Below-cap spend | Spending from 49 or fewer leaves `last_tick` alone |
| Offline | The next RPC call accrues `floor(elapsed / 10min)` first |
| Refusal | Spending more than you have is a no-op that returns the accrued state |

The client must treat the RPC return value as the new truth and write it into
`fr:actions`. Never the other way around.

## Tables

### `action_tanks`

One row per operator. The live tank.

```
user_id     uuid pk → auth.users
current     int  not null check (0 ≤ current ≤ cap)
cap         int  not null default 50
regen_ms    int  not null default 600000
last_tick   timestamptz not null
updated_at  timestamptz not null
```

Created by a trigger on `profiles` insert (so a brand-new operator starts with
a full tank, same as Phase 1).

### `action_ledger`

Append-only. Every successful spend, and every regen that actually added
actions, writes a row. This is the audit the Manager would keep.

```
id          bigint generated
user_id     uuid
kind        text  check (kind in ('regen', 'spend', 'clamp', 'grant'))
delta       int   -- negative for spend
balance     int   -- current after the event
meta        jsonb -- {reason, storylet_id?, choice_id?}
created_at  timestamptz
```

`grant` is reserved for admin / story gifts. There is no paid refill.

## RPCs

All `security definer`, `set search_path = public`, and they read
`auth.uid()`. The client never writes these tables directly (RLS: select own
rows, no insert/update/delete for `authenticated`).

### `fr_accrue()` → `action_tanks`

Applies offline regen. Idempotent. Called at the top of every other RPC.

### `fr_spend(n int, meta jsonb default '{}')` → `action_tanks`

Accrue, then try to spend `n`. Returns the tank. If `n` is more than
`current`, no spend occurs (`spent` is not a column; the client compares
`current` before/after, or reads the latest ledger row).

Full-tank / below-cap clock rules are implemented here, not in the client.

### `fr_snapshot()` → `action_tanks`

Accrue and return. Used on load.

### `fr_ledger(limit int default 50)` → setof `action_ledger`

Newest first. The File can show this later as "attendance log."

## Client migration (when we flip the switch)

1. Apply `0002_actions.sql` in the SQL editor.
2. On Personnel clock-in, if the operator has no tank row, the trigger already
   made one. If they have a Phase-1 envelope, **do not** trust `actions.current`
   above the server value; take `min(local, server)` after accruing both, then
   `fr_spend(0)` is wrong — call `fr_snapshot()` and replace `fr:actions`.
3. `useActions.spendOne` becomes `await fr_spend(1, { reason: 'task' | 'storylet', id })`.
4. The 1s interval still ticks locally for the countdown UI, but a spend that
   the server refuses snaps the display back.
5. Export envelope v1 stays. The `actions` field becomes a cache of the last
   server snapshot, labelled as such in v2 if we ever need to.

## What this does not do

- It does not move *storylet outcomes* server-side. Qualities stay in the
  save envelope until there is a reason not to (multiplayer, leaderboards,
  or a player proving they can edit Attention).
- It does not add rate limits beyond the tank. One RPC per click is fine at
  our scale.
- It does not grant actions for money.

## Open questions

1. Do we show the ledger in the File, or is that too much machine for the
   fiction? Lean: a short "attendance" list of the last few spends.
2. Clock skew: we use `now()` in Postgres. A client whose clock is 20 minutes
   fast will see a pessimistic countdown until the next snapshot. Acceptable.
3. When to flip: after Floor 12 has been played by someone who is not us.
