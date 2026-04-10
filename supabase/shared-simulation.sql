create extension if not exists pgcrypto;

create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.participants
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_current_participant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state jsonb not null,
  status text not null default 'open' check (status in ('open', 'revealed')),
  is_active boolean not null default true,
  created_by_participant_id uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revealed_at timestamptz
);

create unique index if not exists simulation_runs_one_active_idx
  on public.simulation_runs ((is_active))
  where is_active = true;

create table if not exists public.simulation_series_picks (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulation_runs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  series_id text not null,
  winner_id text not null,
  games_count integer not null check (games_count between 4 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (simulation_id, participant_id, series_id)
);

create table if not exists public.simulation_game_picks (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulation_runs(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  game_id text not null,
  winner_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (simulation_id, participant_id, game_id)
);

alter table public.simulation_runs enable row level security;
alter table public.simulation_series_picks enable row level security;
alter table public.simulation_game_picks enable row level security;

drop policy if exists "simulation_runs_read_authenticated" on public.simulation_runs;
create policy "simulation_runs_read_authenticated"
on public.simulation_runs
for select
to authenticated
using (true);

drop policy if exists "simulation_runs_admin_manage" on public.simulation_runs;
create policy "simulation_runs_admin_manage"
on public.simulation_runs
for all
to authenticated
using (public.is_current_participant_admin())
with check (public.is_current_participant_admin());

drop policy if exists "simulation_series_picks_read_authenticated" on public.simulation_series_picks;
create policy "simulation_series_picks_read_authenticated"
on public.simulation_series_picks
for select
to authenticated
using (true);

drop policy if exists "simulation_series_picks_write_own" on public.simulation_series_picks;
create policy "simulation_series_picks_write_own"
on public.simulation_series_picks
for all
to authenticated
using (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.simulation_runs runs
    where runs.id = simulation_id
      and runs.is_active = true
      and runs.status = 'open'
  )
)
with check (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.simulation_runs runs
    where runs.id = simulation_id
      and runs.is_active = true
      and runs.status = 'open'
  )
);

drop policy if exists "simulation_game_picks_read_authenticated" on public.simulation_game_picks;
create policy "simulation_game_picks_read_authenticated"
on public.simulation_game_picks
for select
to authenticated
using (true);

drop policy if exists "simulation_game_picks_write_own" on public.simulation_game_picks;
create policy "simulation_game_picks_write_own"
on public.simulation_game_picks
for all
to authenticated
using (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.simulation_runs runs
    where runs.id = simulation_id
      and runs.is_active = true
      and runs.status = 'open'
  )
)
with check (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.simulation_runs runs
    where runs.id = simulation_id
      and runs.is_active = true
      and runs.status = 'open'
  )
);
