alter table public.games
  add column if not exists game_state text,
  add column if not exists status_text text,
  add column if not exists current_period integer,
  add column if not exists clock text;

update public.games
set
  game_state = case
    when played then 'final'
    when tip_off_at is not null and tip_off_at <= now() then 'live'
    else 'scheduled'
  end,
  status_text = coalesce(status_text, case
    when played then 'Final'
    when tip_off_at is not null and tip_off_at <= now() then 'Ao vivo'
    else 'Agendado'
  end)
where game_state is null or status_text is null;
