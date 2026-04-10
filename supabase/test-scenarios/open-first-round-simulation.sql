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

-- Cria jogos fictícios da 1ª rodada com série completa (até 7 jogos por confronto).
-- Os horários ficam distribuídos ao longo dos próximos dias para simular melhor
-- o fluxo real de uma série melhor de 7.
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
  ('W1-1', 2, 'OKC', 'MEM', null, null, null, false, now() + interval '12 hours', 700002),
  ('W1-1', 3, 'MEM', 'OKC', null, null, null, false, now() + interval '1 day', 700003),
  ('W1-1', 4, 'MEM', 'OKC', null, null, null, false, now() + interval '1 day 12 hours', 700004),
  ('W1-1', 5, 'OKC', 'MEM', null, null, null, false, now() + interval '2 days', 700005),
  ('W1-1', 6, 'MEM', 'OKC', null, null, null, false, now() + interval '2 days 12 hours', 700006),
  ('W1-1', 7, 'OKC', 'MEM', null, null, null, false, now() + interval '3 days', 700007),

  ('W1-2', 1, 'HOU', 'LAL', null, null, null, false, now() + interval '15 minutes', 700008),
  ('W1-2', 2, 'HOU', 'LAL', null, null, null, false, now() + interval '12 hours 15 minutes', 700009),
  ('W1-2', 3, 'LAL', 'HOU', null, null, null, false, now() + interval '1 day 15 minutes', 700010),
  ('W1-2', 4, 'LAL', 'HOU', null, null, null, false, now() + interval '1 day 12 hours 15 minutes', 700011),
  ('W1-2', 5, 'HOU', 'LAL', null, null, null, false, now() + interval '2 days 15 minutes', 700012),
  ('W1-2', 6, 'LAL', 'HOU', null, null, null, false, now() + interval '2 days 12 hours 15 minutes', 700013),
  ('W1-2', 7, 'HOU', 'LAL', null, null, null, false, now() + interval '3 days 15 minutes', 700014),

  ('W1-3', 1, 'DEN', 'LAC', null, null, null, false, now() + interval '20 minutes', 700015),
  ('W1-3', 2, 'DEN', 'LAC', null, null, null, false, now() + interval '12 hours 20 minutes', 700016),
  ('W1-3', 3, 'LAC', 'DEN', null, null, null, false, now() + interval '1 day 20 minutes', 700017),
  ('W1-3', 4, 'LAC', 'DEN', null, null, null, false, now() + interval '1 day 12 hours 20 minutes', 700018),
  ('W1-3', 5, 'DEN', 'LAC', null, null, null, false, now() + interval '2 days 20 minutes', 700019),
  ('W1-3', 6, 'LAC', 'DEN', null, null, null, false, now() + interval '2 days 12 hours 20 minutes', 700020),
  ('W1-3', 7, 'DEN', 'LAC', null, null, null, false, now() + interval '3 days 20 minutes', 700021),

  ('W1-4', 1, 'MIN', 'GSW', null, null, null, false, now() + interval '25 minutes', 700022),
  ('W1-4', 2, 'MIN', 'GSW', null, null, null, false, now() + interval '12 hours 25 minutes', 700023),
  ('W1-4', 3, 'GSW', 'MIN', null, null, null, false, now() + interval '1 day 25 minutes', 700024),
  ('W1-4', 4, 'GSW', 'MIN', null, null, null, false, now() + interval '1 day 12 hours 25 minutes', 700025),
  ('W1-4', 5, 'MIN', 'GSW', null, null, null, false, now() + interval '2 days 25 minutes', 700026),
  ('W1-4', 6, 'GSW', 'MIN', null, null, null, false, now() + interval '2 days 12 hours 25 minutes', 700027),
  ('W1-4', 7, 'MIN', 'GSW', null, null, null, false, now() + interval '3 days 25 minutes', 700028),

  ('E1-1', 1, 'CLE', 'ORL', null, null, null, false, now() + interval '30 minutes', 700029),
  ('E1-1', 2, 'CLE', 'ORL', null, null, null, false, now() + interval '12 hours 30 minutes', 700030),
  ('E1-1', 3, 'ORL', 'CLE', null, null, null, false, now() + interval '1 day 30 minutes', 700031),
  ('E1-1', 4, 'ORL', 'CLE', null, null, null, false, now() + interval '1 day 12 hours 30 minutes', 700032),
  ('E1-1', 5, 'CLE', 'ORL', null, null, null, false, now() + interval '2 days 30 minutes', 700033),
  ('E1-1', 6, 'ORL', 'CLE', null, null, null, false, now() + interval '2 days 12 hours 30 minutes', 700034),
  ('E1-1', 7, 'CLE', 'ORL', null, null, null, false, now() + interval '3 days 30 minutes', 700035),

  ('E1-2', 1, 'BOS', 'MIA', null, null, null, false, now() + interval '35 minutes', 700036),
  ('E1-2', 2, 'BOS', 'MIA', null, null, null, false, now() + interval '12 hours 35 minutes', 700037),
  ('E1-2', 3, 'MIA', 'BOS', null, null, null, false, now() + interval '1 day 35 minutes', 700038),
  ('E1-2', 4, 'MIA', 'BOS', null, null, null, false, now() + interval '1 day 12 hours 35 minutes', 700039),
  ('E1-2', 5, 'BOS', 'MIA', null, null, null, false, now() + interval '2 days 35 minutes', 700040),
  ('E1-2', 6, 'MIA', 'BOS', null, null, null, false, now() + interval '2 days 12 hours 35 minutes', 700041),
  ('E1-2', 7, 'BOS', 'MIA', null, null, null, false, now() + interval '3 days 35 minutes', 700042),

  ('E1-3', 1, 'NYK', 'DET', null, null, null, false, now() + interval '40 minutes', 700043),
  ('E1-3', 2, 'NYK', 'DET', null, null, null, false, now() + interval '12 hours 40 minutes', 700044),
  ('E1-3', 3, 'DET', 'NYK', null, null, null, false, now() + interval '1 day 40 minutes', 700045),
  ('E1-3', 4, 'DET', 'NYK', null, null, null, false, now() + interval '1 day 12 hours 40 minutes', 700046),
  ('E1-3', 5, 'NYK', 'DET', null, null, null, false, now() + interval '2 days 40 minutes', 700047),
  ('E1-3', 6, 'DET', 'NYK', null, null, null, false, now() + interval '2 days 12 hours 40 minutes', 700048),
  ('E1-3', 7, 'NYK', 'DET', null, null, null, false, now() + interval '3 days 40 minutes', 700049),

  ('E1-4', 1, 'IND', 'MIL', null, null, null, false, now() + interval '45 minutes', 700050),
  ('E1-4', 2, 'IND', 'MIL', null, null, null, false, now() + interval '12 hours 45 minutes', 700051),
  ('E1-4', 3, 'MIL', 'IND', null, null, null, false, now() + interval '1 day 45 minutes', 700052),
  ('E1-4', 4, 'MIL', 'IND', null, null, null, false, now() + interval '1 day 12 hours 45 minutes', 700053),
  ('E1-4', 5, 'IND', 'MIL', null, null, null, false, now() + interval '2 days 45 minutes', 700054),
  ('E1-4', 6, 'MIL', 'IND', null, null, null, false, now() + interval '2 days 12 hours 45 minutes', 700055),
  ('E1-4', 7, 'IND', 'MIL', null, null, null, false, now() + interval '3 days 45 minutes', 700056);

commit;
