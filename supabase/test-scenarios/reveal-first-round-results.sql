begin;

-- Ambiente de teste separado apenas.
-- Publica resultados fictícios da 1ª rodada nas tabelas oficiais.

update games
set
  winner_id = case cast(nba_game_id as bigint)
    when 700001 then 'OKC'
    when 700002 then 'OKC'
    when 700003 then 'MEM'
    when 700004 then 'OKC'
    when 700005 then 'OKC'
    when 700006 then 'MEM'
    when 700007 then 'OKC'
    when 700008 then 'LAL'
    when 700009 then 'HOU'
    when 700010 then 'LAL'
    when 700011 then 'LAL'
    when 700012 then 'HOU'
    when 700013 then 'LAL'
    when 700014 then 'LAL'
    when 700015 then 'DEN'
    when 700016 then 'DEN'
    when 700017 then 'LAC'
    when 700018 then 'DEN'
    when 700019 then 'DEN'
    when 700020 then 'LAC'
    when 700021 then 'DEN'
    when 700022 then 'MIN'
    when 700023 then 'GSW'
    when 700024 then 'GSW'
    when 700025 then 'MIN'
    when 700026 then 'GSW'
    when 700027 then 'MIN'
    when 700028 then 'GSW'
    when 700029 then 'CLE'
    when 700030 then 'CLE'
    when 700031 then 'ORL'
    when 700032 then 'CLE'
    when 700033 then 'CLE'
    when 700034 then 'ORL'
    when 700035 then 'CLE'
    when 700036 then 'BOS'
    when 700037 then 'BOS'
    when 700038 then 'MIA'
    when 700039 then 'BOS'
    when 700040 then 'BOS'
    when 700041 then 'MIA'
    when 700042 then 'BOS'
    when 700043 then 'NYK'
    when 700044 then 'NYK'
    when 700045 then 'DET'
    when 700046 then 'NYK'
    when 700047 then 'DET'
    when 700048 then 'NYK'
    when 700049 then 'NYK'
    when 700050 then 'IND'
    when 700051 then 'MIL'
    when 700052 then 'MIL'
    when 700053 then 'IND'
    when 700054 then 'MIL'
    when 700055 then 'IND'
    when 700056 then 'IND'
    else winner_id
  end,
  home_score = case cast(nba_game_id as bigint)
    when 700001 then 118
    when 700002 then 121
    when 700003 then 101
    when 700004 then 104
    when 700005 then 126
    when 700006 then 99
    when 700007 then 119
    when 700008 then 102
    when 700009 then 117
    when 700010 then 109
    when 700011 then 114
    when 700012 then 108
    when 700013 then 103
    when 700014 then 111
    when 700015 then 116
    when 700016 then 118
    when 700017 then 105
    when 700018 then 102
    when 700019 then 120
    when 700020 then 99
    when 700021 then 123
    when 700022 then 112
    when 700023 then 104
    when 700024 then 118
    when 700025 then 113
    when 700026 then 99
    when 700027 then 107
    when 700028 then 101
    when 700029 then 109
    when 700030 then 113
    when 700031 then 97
    when 700032 then 104
    when 700033 then 118
    when 700034 then 100
    when 700035 then 116
    when 700036 then 121
    when 700037 then 114
    when 700038 then 108
    when 700039 then 102
    when 700040 then 119
    when 700041 then 98
    when 700042 then 117
    when 700043 then 111
    when 700044 then 108
    when 700045 then 115
    when 700046 then 101
    when 700047 then 99
    when 700048 then 103
    when 700049 then 120
    when 700050 then 117
    when 700051 then 104
    when 700052 then 112
    when 700053 then 105
    when 700054 then 101
    when 700055 then 114
    when 700056 then 118
    else home_score
  end,
  away_score = case cast(nba_game_id as bigint)
    when 700001 then 103
    when 700002 then 97
    when 700003 then 108
    when 700004 then 110
    when 700005 then 107
    when 700006 then 112
    when 700007 then 101
    when 700008 then 113
    when 700009 then 108
    when 700010 then 116
    when 700011 then 119
    when 700012 then 101
    when 700013 then 111
    when 700014 then 118
    when 700015 then 102
    when 700016 then 109
    when 700017 then 112
    when 700018 then 113
    when 700019 then 108
    when 700020 then 107
    when 700021 then 114
    when 700022 then 105
    when 700023 then 111
    when 700024 then 124
    when 700025 then 106
    when 700026 then 107
    when 700027 then 101
    when 700028 then 109
    when 700029 then 98
    when 700030 then 101
    when 700031 then 104
    when 700032 then 109
    when 700033 then 99
    when 700034 then 106
    when 700035 then 103
    when 700036 then 103
    when 700037 then 99
    when 700038 then 113
    when 700039 then 109
    when 700040 then 104
    when 700041 then 105
    when 700042 then 101
    when 700043 then 102
    when 700044 then 96
    when 700045 then 109
    when 700046 then 110
    when 700047 then 104
    when 700048 then 112
    when 700049 then 108
    when 700050 then 108
    when 700051 then 109
    when 700052 then 118
    when 700053 then 99
    when 700054 then 110
    when 700055 then 105
    when 700056 then 109
    else away_score
  end,
  played = true,
  tip_off_at = coalesce(tip_off_at, now() - interval '5 minutes')
where cast(nba_game_id as bigint) between 700001 and 700056;

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
    when 'W1-2' then 7
    when 'W1-3' then 5
    when 'W1-4' then 7
    when 'E1-1' then 5
    when 'E1-2' then 5
    when 'E1-3' then 7
    when 'E1-4' then 7
    else games_played
  end,
  is_complete = case
    when id in ('W1-1', 'W1-2', 'W1-3', 'W1-4', 'E1-1', 'E1-2', 'E1-3', 'E1-4') then true
    else is_complete
  end
where id in ('W1-1', 'W1-2', 'W1-3', 'W1-4', 'E1-1', 'E1-2', 'E1-3', 'E1-4');

commit;
