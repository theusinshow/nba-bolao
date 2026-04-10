# Codex Changelog

## 2026-04-09 22:30 - Alinhamento com schema real do Supabase

### Objetivo
- Corrigir o desalinhamento entre frontend, backend e o schema real validado no Supabase, com foco em scoring, ranking, sync, seed e fluxo de jogos.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/types/index.ts`
- `frontend/src/utils/bracket.ts`
- `frontend/src/utils/scoring.ts`
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/hooks/useGamePicks.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/components/GamePickModal.tsx`
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/OfficialBracket.tsx`
- `backend/src/utils/bracket.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/routes/seedData.ts`
- `backend/src/routes/admin.ts`

### Mudanças feitas
- Changelog incremental criado para registrar todas as mudanças realizadas pelo Codex.
- Tipos do frontend alinhados ao schema real do Supabase:
  - `Series` agora reflete `position`, `nba_series_id` e trata `slot` como alias opcional.
  - `Game` agora usa `home_score`, `away_score`, `nba_game_id` e aceita aliases derivados para compatibilidade da UI.
  - `SeriesPick` e `GamePick` deixam `points` opcional, porque o banco real não persiste esses campos.
- Helper de normalização criado no frontend (`frontend/src/utils/bracket.ts`) para:
  - converter IDs antigos de bracket (`W-R1-1`, `FINALS`) para o formato canônico (`W1-1`, `FIN`);
  - derivar `round` de série/jogo quando o banco não traz isso em `games`;
  - normalizar jogos reais para o shape usado pela interface.
- Hook `useSeries` atualizado para popular `slot` derivado a partir do `id` real da série, preservando o funcionamento do bracket e das telas que ainda exibem slot.
- Hook `useGamePicks` atualizado para carregar jogos com `round` derivado da série, evitando dependência de `games.round`.
- Hook `useRanking` corrigido para:
  - calcular pontos de jogo usando `round` derivado da série;
  - parar de depender implicitamente de `games.round` persistido;
  - preencher `prev_rank` com base no ranking anterior em memória da sessão atual.
- `BracketSVG`, `BracketEditor` e `OfficialBracket` atualizados para trabalhar com slot normalizado, incluindo correção do campeão das finais (`FIN`).
- `GamePickModal` ajustado para usar `home_team_id`, `away_team_id`, `home_score` e `away_score`, mantendo compatibilidade com jogos normalizados.
- Página `Games` atualizada para:
  - enriquecer jogos com `round` da série;
  - manter o fluxo real de `game_picks` no schema atual;
  - exibir também jogos sem `tip_off_at` em uma seção própria, em vez de escondê-los.
- Helper de normalização criado no backend (`backend/src/utils/bracket.ts`) para unificar IDs de séries e inferência de round.
- Regras de scoring do backend ajustadas para tolerar jogo sem `round` persistido.
- `backend/src/scoring/engine.ts` refeito para o schema real:
  - não tenta mais atualizar colunas inexistentes (`participants.total_points`, `participants.rank`, `series_picks.points`, `game_picks.points`);
  - calcula um snapshot coerente do ranking usando `series.round`;
  - deriva round dos jogos pela série;
  - registra snapshot em log em vez de gravar campos inexistentes no banco.
- `backend/src/jobs/syncNBA.ts` corrigido para o schema real:
  - usa IDs canônicos de série;
  - busca série por `id`, não por `slot`;
  - usa `nba_game_id`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `tip_off_at`;
  - atualiza ou cria jogos no formato real da tabela `games`;
  - recalcula o encerramento da série com base nas vitórias registradas.
- Seed do backend migrado para o schema real:
  - usa `id`, `position`, `home_team_id`, `away_team_id`, `nba_series_id`;
  - abandona `team_a_id`, `team_b_id` e `slot` antigo.
- Rota `/admin/seed` atualizada para fazer upsert lógico por `series.id`, não por `slot`.

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o build do frontend continua emitindo warning de chunk grande do Vite, mas sem falha de compilação.

### Pendências
- O fluxo de `GamePickModal` continua sem gatilho explícito a partir do `BracketEditor`; o modal existe e foi alinhado ao schema, mas a navegação para ele ainda merece decisão de produto.
- O ranking segue sendo um snapshot em memória no frontend e um snapshot em log no backend; se você quiser persistência histórica real de ranking/variação, será preciso definir novas colunas ou uma tabela própria no banco.
- O banco pode conter séries já criadas com IDs antigos; a UI agora tolera aliases, mas vale conferir se você quer migrar esses IDs para o padrão canônico.

## 2026-04-09 23:35 - Relatório de pontuação dentro do ranking

### Objetivo
- Adicionar um relatório explicável de pontuação dentro da tela de ranking, permitindo abrir o breakdown de qualquer participante sem criar rota nova.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/components/RankingTable.tsx`
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/pages/Ranking.tsx`

### Mudanças feitas
- Novos tipos adicionados em `frontend/src/types/index.ts` para suportar o relatório:
  - `ScoreBreakdownSummary`
  - `SeriesScoreBreakdownItem`
  - `GameScoreBreakdownItem`
  - `ParticipantScoreBreakdown`
- Novo util compartilhado criado em `frontend/src/utils/ranking.ts` para centralizar:
  - ordenação do ranking;
  - cálculo do ranking;
  - cálculo do breakdown de pontuação por participante;
  - subtotais de séries, jogos, rodadas e cravadas;
  - labels de confronto e vencedores para relatório.
- `useRanking` foi refatorado para usar o util compartilhado e agora expõe:
  - `ranking`
  - `breakdowns`
  - `getBreakdownForParticipant`
  - `loading`
  - `refetch`
- `RankingTable` foi expandida para suportar:
  - linha selecionada para o participante atualmente inspecionado;
  - callback `onParticipantClick`;
  - coluna/botão `Relatório` por participante;
  - clique na linha para abrir o breakdown.
- Novo componente `ParticipantScoreReport` criado para renderizar o relatório detalhado:
  - hero com nome do participante;
  - cards de resumo: total, séries, jogos, cravadas;
  - pontos por rodada;
  - seção detalhada de séries com status (`cravada`, `vencedor`, `erro`, `pendente`);
  - seção detalhada de jogos com status (`acertou`, `errou`, `pendente`).
- `Ranking.tsx` foi atualizado para incorporar o relatório no fluxo atual:
  - desktop: card fixo abaixo da tabela com o relatório do participante selecionado;
  - mobile: bottom sheet com o relatório;
  - participante logado vem selecionado por padrão;
  - qualquer linha da tabela pode trocar o relatório exibido.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- O relatório usa o mesmo snapshot em memória do ranking; se você quiser links compartilháveis, histórico ou persistência por data, será preciso desenhar isso em outra rodada.
- O desktop hoje mostra o relatório abaixo da tabela, não em painel lateral fixo; a implementação priorizou encaixe rápido e coerente com a página atual.

## 2026-04-09 23:55 - Jogos agrupados por série com expansão

### Objetivo
- Reduzir o scroll excessivo da aba `Jogos` agrupando os cards por série e exibindo o jogo a jogo apenas sob demanda.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas
- A tela `Jogos` deixou de renderizar uma lista longa de jogos soltos e passou a organizar o conteúdo em cards por série.
- Cada card de série agora mostra um resumo compacto com:
  - confronto;
  - rodada;
  - quantidade de jogos cadastrados;
  - quantidade de jogos abertos;
  - quantidade de palpites feitos;
  - pontos acumulados naquela série de jogos;
  - próximo fechamento, quando existir.
- Ao tocar/clicar em uma série, o card expande e revela os jogos daquela série usando os `GameCard`s existentes.
- A ordenação das séries prioriza:
  - séries com jogos ainda abertos;
  - séries com fechamento mais próximo;
  - depois rodada e id da série.
- A primeira série relevante abre automaticamente por padrão, reduzindo fricção para o usuário.
- O fluxo de salvar palpites jogo a jogo foi preservado; a mudança foi concentrada na organização visual da página.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- Se você quiser reduzir ainda mais o tamanho vertical, dá para fazer uma segunda rodada compactando o próprio `GameCard`.
- A tela ainda usa muitos blocos ricos visualmente; a principal melhora desta rodada foi estrutural, não de densidade extrema.

## 2026-04-10 00:05 - Relatório de pontuação com jogos agrupados por série

### Objetivo
- Reduzir a altura do relatório de pontuação agrupando os jogos por série, em vez de listar todos os jogos em sequência plana.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/ParticipantScoreReport.tsx`

### Mudanças feitas
- A seção `Jogos` do relatório de pontuação passou a agrupar o breakdown por série/confronto.
- Cada grupo agora mostra um card-resumo com:
  - rodada;
  - confronto;
  - subtotal de pontos daquela série de jogos;
  - quantidade de acertos;
  - quantidade de jogos concluídos;
  - expansão/recolhimento por série.
- Ao expandir a série, o usuário vê os jogos individuais daquela série com:
  - número do jogo;
  - status (`acertou`, `errou`, `pendente`);
  - palpite feito;
  - vencedor real;
  - pontos gerados.
- A primeira série do relatório abre automaticamente por padrão para manter leitura rápida.
- A seção ficou consistente com a nova organização da aba `Jogos`, reforçando a mesma lógica mental no produto.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- Se quiser, numa próxima rodada dá para aplicar o mesmo padrão de agrupamento por série também à seção de `Séries`, usando expansão para detalhes extras de palpites.

## 2026-04-10 00:40 - Retorno ao modo real da API no backend

### Objetivo
- Preparar o backend para sair do modo de teste com jogos fictícios e voltar a operar com dados reais da API, sem quebrar o ranking por tentar escrever colunas inexistentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/src/scoring/engine.ts`
- `backend/src/jobs/syncNBA.ts`

### Mudanças feitas
- `backend/src/scoring/engine.ts` deixou de tentar persistir `total_points` e `rank` em `participants`, já que essas colunas não existem no schema real atual do Supabase.
- O rescore do backend agora computa o snapshot do ranking e registra o resultado em log, mantendo o frontend como fonte da verdade da exibição do ranking ao vivo.
- `backend/src/jobs/syncNBA.ts` foi ajustado para processar todos os jogos de pós-temporada retornados pela API, não apenas os `Final`.
- O sync agora faz upsert também de jogos futuros/agendados, preenchendo:
  - `series_id`
  - `game_number`
  - `home_team_id`
  - `away_team_id`
  - `tip_off_at`
  - `nba_game_id`
  - `played`
  - `winner_id`
  - `home_score`
  - `away_score`
- Para jogos ainda não finalizados, o sync passa a gravar `played = false` e `winner_id = null`, permitindo que a agenda de palpites volte a aparecer sem depender de seed manual de jogos.
- A atualização da série passou a usar a quantidade real de jogos jogados (`played = true`) em vez de contar todo jogo cadastrado, evitando inflar `games_played` quando a série já tem jogos futuros agendados.

### Validações
- Pendente nesta rodada: rodar `backend` build e `test:scoring` após a alteração.

### Pendências
- Ainda será necessário limpar do Supabase os dados fictícios antes de religar totalmente a operação real.
- O mapeamento `SERIES_ID_BY_TEAMS` continua estático; ele funciona para a chave esperada, mas não substitui um mapeamento dinâmico de bracket em futuras temporadas.
