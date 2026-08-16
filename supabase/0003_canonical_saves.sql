-- FALSE REALITY — canonical save hardening
-- Apply after 0001_init.sql. Safe to run more than once.

-- Browser clients may only operate on their own row, and unauthenticated calls
-- are rejected before evaluating auth.uid().
drop policy if exists "saves: own rows" on public.saves;
create policy "saves: own rows"
  on public.saves
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep direct REST calls from bypassing the client-side save-size limits.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'saves_payload_max_bytes'
      and conrelid = 'public.saves'::regclass
  ) then
    alter table public.saves
      add constraint saves_payload_max_bytes
      check (pg_column_size(payload) <= 1048576);
  end if;
end
$$;

-- Server time is authoritative for conflict summaries.
create or replace function public.set_save_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saves_set_updated_at on public.saves;
create trigger saves_set_updated_at
  before insert or update on public.saves
  for each row execute function public.set_save_updated_at();
