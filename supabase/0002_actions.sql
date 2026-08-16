-- FALSE REALITY — Phase 2 (STAGED, do not apply yet)
-- Server-authoritative action tank + ledger.
-- See design/server-authoritative-actions.md.
-- Requires 0001_init.sql.

create table if not exists public.action_tanks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current int not null check (current >= 0),
  cap int not null default 50 check (cap > 0),
  regen_ms int not null default 600000 check (regen_ms > 0),
  last_tick timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_tanks_current_lte_cap check (current <= cap)
);

create table if not exists public.action_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('regen', 'spend', 'clamp', 'grant')),
  delta int not null,
  balance int not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists action_ledger_user_created
  on public.action_ledger (user_id, created_at desc);

alter table public.action_tanks enable row level security;
alter table public.action_ledger enable row level security;

drop policy if exists "tanks: select own" on public.action_tanks;
create policy "tanks: select own"
  on public.action_tanks for select
  using (auth.uid() = user_id);

drop policy if exists "ledger: select own" on public.action_ledger;
create policy "ledger: select own"
  on public.action_ledger for select
  using (auth.uid() = user_id);

-- New operators start with a full tank (same as Phase 1 client default).
create or replace function public.handle_new_tank()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.action_tanks (user_id, current, cap, regen_ms, last_tick)
  values (new.id, 50, 50, 600000, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_tank on public.profiles;
create trigger on_profile_created_tank
  after insert on public.profiles
  for each row execute function public.handle_new_tank();

-- Accrue offline regen. Cap clamps and resets last_tick.
create or replace function public.fr_accrue()
returns public.action_tanks
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tank public.action_tanks;
  elapsed_ms bigint;
  gained int;
  next_current int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into tank from public.action_tanks where user_id = uid for update;
  if not found then
    insert into public.action_tanks (user_id, current, cap, regen_ms, last_tick)
    values (uid, 50, 50, 600000, now())
    returning * into tank;
    return tank;
  end if;

  if tank.current >= tank.cap then
    update public.action_tanks
      set last_tick = now(), updated_at = now()
      where user_id = uid
      returning * into tank;
    return tank;
  end if;

  elapsed_ms := greatest(0, floor(extract(epoch from (now() - tank.last_tick)) * 1000));
  gained := floor(elapsed_ms / tank.regen_ms)::int;
  if gained <= 0 then
    return tank;
  end if;

  next_current := tank.current + gained;
  if next_current >= tank.cap then
    gained := tank.cap - tank.current;
    update public.action_tanks
      set current = tank.cap, last_tick = now(), updated_at = now()
      where user_id = uid
      returning * into tank;
    insert into public.action_ledger (user_id, kind, delta, balance, meta)
    values (uid, 'clamp', gained, tank.current, '{}'::jsonb);
    return tank;
  end if;

  update public.action_tanks
    set current = next_current,
        last_tick = tank.last_tick + make_interval(secs => (gained * tank.regen_ms) / 1000.0),
        updated_at = now()
    where user_id = uid
    returning * into tank;

  insert into public.action_ledger (user_id, kind, delta, balance, meta)
  values (uid, 'regen', gained, tank.current, '{}'::jsonb);

  return tank;
end;
$$;

create or replace function public.fr_snapshot()
returns public.action_tanks
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.fr_accrue();
end;
$$;

-- Spend n actions. Full-tank spend restarts the clock; below-cap keeps rhythm.
create or replace function public.fr_spend(n int, meta jsonb default '{}'::jsonb)
returns public.action_tanks
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tank public.action_tanks;
  was_full boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if n is null or n <= 0 then
    return public.fr_accrue();
  end if;

  tank := public.fr_accrue();
  if tank.current < n then
    return tank;
  end if;

  was_full := tank.current >= tank.cap;

  update public.action_tanks
    set current = tank.current - n,
        last_tick = case when was_full then now() else tank.last_tick end,
        updated_at = now()
    where user_id = uid
    returning * into tank;

  insert into public.action_ledger (user_id, kind, delta, balance, meta)
  values (uid, 'spend', -n, tank.current, coalesce(meta, '{}'::jsonb));

  return tank;
end;
$$;

create or replace function public.fr_ledger(lim int default 50)
returns setof public.action_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  return query
    select *
    from public.action_ledger
    where user_id = uid
    order by created_at desc
    limit greatest(1, least(coalesce(lim, 50), 200));
end;
$$;

revoke all on public.action_tanks from anon, authenticated;
revoke all on public.action_ledger from anon, authenticated;
grant select on public.action_tanks to authenticated;
grant select on public.action_ledger to authenticated;
grant execute on function public.fr_accrue() to authenticated;
grant execute on function public.fr_snapshot() to authenticated;
grant execute on function public.fr_spend(int, jsonb) to authenticated;
grant execute on function public.fr_ledger(int) to authenticated;
