begin;

-- Ambiente de teste separado apenas.
-- Reinicia picks e jogos para abrir uma 1ª rodada fictícia nas páginas oficiais.

delete from game_picks;
delete from series_picks;
delete from games;

-- Reseta toda a chave para um estado de playoffs iniciando agora.
update series
set
  home_team_id = case id
    when 'W1-1' then 'OKC'
    when 'W1-2' then 'HOU'
    when 'W1-3' then 'DEN'
    when 'W1-4' then 'MIN'
    when 'E1-1' then 'CLE'
    when 'E1-2' then 'BOS'
    when 'E1-3' then 'NYK'
    when 'E1-4' then 'IND'
    else null
  end,
  away_team_id = case id
    when 'W1-1' then 'MEM'
    when 'W1-2' then 'LAL'
    when 'W1-3' then 'LAC'
    when 'W1-4' then 'GSW'
    when 'E1-1' then 'ORL'
    when 'E1-2' then 'MIA'
    when 'E1-3' then 'DET'
    when 'E1-4' then 'MIL'
    else null
  end,
  winner_id = null,
  games_played = 0,
  is_complete = false,
  nba_series_id = null;

-- Cria jogos fictícios da 1ª rodada com tip-off distribuído ao longo da próxima hora.
insert into games (
  series_id,
  game_number,
  home_team_id,
  away_team_id,
  winner_id,
  home_score,
  away_score,
  played,
  tip_off_at,
  nba_game_id
)
values
  ('W1-1', 1, 'OKC', 'MEM', null, null, null, false, now() + interval '10 minutes', 700001),
  ('W1-2', 1, 'HOU', 'LAL', null, null, null, false, now() + interval '15 minutes', 700002),
  ('W1-3', 1, 'DEN', 'LAC', null, null, null, false, now() + interval '20 minutes', 700003),
  ('W1-4', 1, 'MIN', 'GSW', null, null, null, false, now() + interval '25 minutes', 700004),
  ('E1-1', 1, 'CLE', 'ORL', null, null, null, false, now() + interval '30 minutes', 700005),
  ('E1-2', 1, 'BOS', 'MIA', null, null, null, false, now() + interval '35 minutes', 700006),
  ('E1-3', 1, 'NYK', 'DET', null, null, null, false, now() + interval '40 minutes', 700007),
  ('E1-4', 1, 'IND', 'MIL', null, null, null, false, now() + interval '45 minutes', 700008),
  ('W1-1', 2, 'OKC', 'MEM', null, null, null, false, now() + interval '50 minutes', 700009),
  ('W1-2', 2, 'HOU', 'LAL', null, null, null, false, now() + interval '55 minutes', 700010),
  ('W1-3', 2, 'DEN', 'LAC', null, null, null, false, now() + interval '60 minutes', 700011),
  ('W1-4', 2, 'MIN', 'GSW', null, null, null, false, now() + interval '65 minutes', 700012),
  ('E1-1', 2, 'CLE', 'ORL', null, null, null, false, now() + interval '70 minutes', 700013),
  ('E1-2', 2, 'BOS', 'MIA', null, null, null, false, now() + interval '75 minutes', 700014),
  ('E1-3', 2, 'NYK', 'DET', null, null, null, false, now() + interval '80 minutes', 700015),
  ('E1-4', 2, 'IND', 'MIL', null, null, null, false, now() + interval '85 minutes', 700016);

commit;
