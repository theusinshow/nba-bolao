-- Hardening manual para palpites oficiais.
-- Objetivo:
-- 1. impedir duplicidade estrutural em game_picks e series_picks
-- 2. criar base para policies mais restritas de escrita
-- 3. falhar cedo se a base já estiver inconsistente
--
-- IMPORTANTE:
-- - Revise políticas legadas antes de aplicar o bloco de RLS; políticas do Postgres se combinam com OR.
-- - O save oficial do app agora passa pelo backend, que usa service role e não depende destas policies.
-- - Este script foi pensado para uso manual e consciente em produção.

-- Auditoria rápida das policies atuais.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('game_picks', 'series_picks')
order by tablename, policyname;

-- Falha cedo se ainda existir duplicidade.
do $$
begin
  if exists (
    select 1
    from public.game_picks
    group by participant_id, game_id
    having count(*) > 1
  ) then
    raise exception 'Existem duplicidades em public.game_picks. Limpe antes de aplicar o índice UNIQUE.';
  end if;

  if exists (
    select 1
    from public.series_picks
    group by participant_id, series_id
    having count(*) > 1
  ) then
    raise exception 'Existem duplicidades em public.series_picks. Limpe antes de aplicar o índice UNIQUE.';
  end if;
end $$;

create or replace function public.current_participant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.participants p
  where p.user_id = auth.uid()
  limit 1
$$;

comment on function public.current_participant_id()
is 'Resolve o participant_id do usuário autenticado atual para policies de RLS.';

create unique index if not exists game_picks_participant_game_unique_idx
  on public.game_picks (participant_id, game_id);

create unique index if not exists series_picks_participant_series_unique_idx
  on public.series_picks (participant_id, series_id);

alter table public.game_picks enable row level security;
alter table public.series_picks enable row level security;

-- Policies de escrita oficiais.
-- Se existir policy legada ampla de INSERT/UPDATE, remova-a antes de confiar neste bloco.
drop policy if exists "game_picks_insert_own_before_lock" on public.game_picks;
create policy "game_picks_insert_own_before_lock"
on public.game_picks
for insert
to authenticated
with check (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.games g
    where g.id = game_picks.game_id
      and g.played = false
      and g.tip_off_at is not null
      and g.tip_off_at > now() + interval '5 minutes'
      and game_picks.winner_id in (g.home_team_id, g.away_team_id)
  )
);

drop policy if exists "game_picks_update_own_before_lock" on public.game_picks;
create policy "game_picks_update_own_before_lock"
on public.game_picks
for update
to authenticated
using (
  participant_id = public.current_participant_id()
)
with check (
  participant_id = public.current_participant_id()
  and exists (
    select 1
    from public.games g
    where g.id = game_picks.game_id
      and g.played = false
      and g.tip_off_at is not null
      and g.tip_off_at > now() + interval '5 minutes'
      and game_picks.winner_id in (g.home_team_id, g.away_team_id)
  )
);

drop policy if exists "series_picks_insert_own_before_lock" on public.series_picks;
create policy "series_picks_insert_own_before_lock"
on public.series_picks
for insert
to authenticated
with check (
  participant_id = public.current_participant_id()
  and games_count between 4 and 7
  and exists (
    select 1
    from public.series s
    where s.id = series_picks.series_id
      and s.is_complete = false
      and s.home_team_id is not null
      and s.away_team_id is not null
      and series_picks.winner_id in (s.home_team_id, s.away_team_id)
  )
  and exists (
    select 1
    from public.games g
    where g.series_id = series_picks.series_id
      and g.tip_off_at is not null
    group by g.series_id
    having min(g.tip_off_at) > now()
  )
);

drop policy if exists "series_picks_update_own_before_lock" on public.series_picks;
create policy "series_picks_update_own_before_lock"
on public.series_picks
for update
to authenticated
using (
  participant_id = public.current_participant_id()
)
with check (
  participant_id = public.current_participant_id()
  and games_count between 4 and 7
  and exists (
    select 1
    from public.series s
    where s.id = series_picks.series_id
      and s.is_complete = false
      and s.home_team_id is not null
      and s.away_team_id is not null
      and series_picks.winner_id in (s.home_team_id, s.away_team_id)
  )
  and exists (
    select 1
    from public.games g
    where g.series_id = series_picks.series_id
      and g.tip_off_at is not null
    group by g.series_id
    having min(g.tip_off_at) > now()
  )
);

-- Opcional: leitura mínima para o próprio participante.
-- Descomente apenas se o projeto não depender de policies legadas equivalentes.
--
-- drop policy if exists "game_picks_select_own" on public.game_picks;
-- create policy "game_picks_select_own"
-- on public.game_picks
-- for select
-- to authenticated
-- using (participant_id = public.current_participant_id());
--
-- drop policy if exists "series_picks_select_own" on public.series_picks;
-- create policy "series_picks_select_own"
-- on public.series_picks
-- for select
-- to authenticated
-- using (participant_id = public.current_participant_id());
