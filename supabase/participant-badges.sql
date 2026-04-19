-- Tabela de conquistas dos participantes
create table if not exists public.participant_badges (
  id          uuid default gen_random_uuid() primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz default now() not null,
  unique (participant_id, badge_id)
);

alter table public.participant_badges enable row level security;

-- Leitura pública para todos os autenticados
create policy "badges_select_all"
  on public.participant_badges for select
  to authenticated using (true);

-- Apenas service role pode inserir (backend)
-- (sem policy de insert para authenticated — só o backend com service key insere)
