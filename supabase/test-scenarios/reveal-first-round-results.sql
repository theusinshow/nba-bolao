begin;

-- Ambiente de teste separado apenas.
-- Publica resultados fictícios da 1ª rodada nas tabelas oficiais.

update games
set
  winner_id = case nba_game_id
    when 700001 then 'OKC'
    when 700002 then 'LAL'
    when 700003 then 'DEN'
    when 700004 then 'MIN'
    when 700005 then 'CLE'
    when 700006 then 'BOS'
    when 700007 then 'NYK'
    when 700008 then 'MIL'
    when 700009 then 'OKC'
    when 700010 then 'HOU'
    when 700011 then 'DEN'
    when 700012 then 'GSW'
    when 700013 then 'CLE'
    when 700014 then 'BOS'
    when 700015 then 'DET'
    when 700016 then 'IND'
    else winner_id
  end,
  home_score = case nba_game_id
    when 700001 then 118
    when 700002 then 102
    when 700003 then 116
    when 700004 then 112
    when 700005 then 109
    when 700006 then 121
    when 700007 then 111
    when 700008 then 104
    when 700009 then 122
    when 700010 then 115
    when 700011 then 120
    when 700012 then 101
    when 700013 then 114
    when 700014 then 117
    when 700015 then 98
    when 700016 then 110
    else home_score
  end,
  away_score = case nba_game_id
    when 700001 then 103
    when 700002 then 113
    when 700003 then 101
    when 700004 then 106
    when 700005 then 96
    when 700006 then 99
    when 700007 then 104
    when 700008 then 108
    when 700009 then 95
    when 700010 then 107
    when 700011 then 109
    when 700012 then 108
    when 700013 then 101
    when 700014 then 105
    when 700015 then 105
    when 700016 then 102
    else away_score
  end,
  played = true,
  tip_off_at = coalesce(tip_off_at, now() - interval '5 minutes')
where nba_game_id between 700001 and 700016;

update series
set
  winner_id = case id
    when 'W1-1' then 'OKC'
    when 'W1-2' then 'LAL'
    when 'W1-3' then 'DEN'
    when 'W1-4' then 'MIN'
    when 'E1-1' then 'CLE'
    when 'E1-2' then 'BOS'
    when 'E1-3' then 'NYK'
    when 'E1-4' then 'MIL'
    else winner_id
  end,
  games_played = case id
    when 'W1-1' then 5
    when 'W1-2' then 6
    when 'W1-3' then 4
    when 'W1-4' then 7
    when 'E1-1' then 5
    when 'E1-2' then 5
    when 'E1-3' then 6
    when 'E1-4' then 7
    else games_played
  end,
  is_complete = case
    when id in ('W1-1', 'W1-2', 'W1-3', 'W1-4', 'E1-1', 'E1-2', 'E1-3', 'E1-4') then true
    else is_complete
  end
where id in ('W1-1', 'W1-2', 'W1-3', 'W1-4', 'E1-1', 'E1-2', 'E1-3', 'E1-4');

commit;
