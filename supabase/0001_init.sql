-- FALSE REALITY — Phase 1 schema
-- profiles + saves, RLS, signup trigger, one file per operator.
-- Run this in the Supabase SQL editor (project ltawgurvhffikilulyfj).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null default 'Operator',
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists saves_one_per_operator
  on public.saves (user_id);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

drop policy if exists "profiles: own rows" on public.profiles;
create policy "profiles: own rows"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "saves: own rows" on public.saves;
create policy "saves: own rows"
  on public.saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (new.id, coalesce(new.raw_user_meta_data->>'handle', 'Operator'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
