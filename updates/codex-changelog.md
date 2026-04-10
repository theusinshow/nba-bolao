# Codex Changelog

## 2026-04-10 - Correção de bugs críticos identificados em auditoria

### Objetivo
- Corrigir bugs encontrados em revisão manual completa do projeto: times trocados no modal de palpite de jogo, side-effect proibido no hook de ranking, game_number duplicado no sync da NBA, falha silenciosa no resultado da série, CORS aberto no backend e logs de debug em produção.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/GamePickModal.tsx`
- `frontend/src/hooks/useRanking.ts`
- `backend/src/jobs/syncNBA.ts`
- `frontend/src/components/SeriesModal.tsx`
- `backend/src/index.ts`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Bug crítico — `GamePickModal.tsx`: times trocados quando mandante do jogo difere da série
- A NBA alterna o mandante em cada jogo da série (ex.: jogos 1-2 em OKC, 3-4 em MEM). O modal usava `teamA/teamB` fixos da *série*, mas `homeId/awayId` vinham do *jogo*. Para o jogo 3, o botão exibia "OKC" mas salvava `MEM` como `winner_id` — palpite gravado errado.
- Corrigido: cada botão agora resolve o time pelo `id` do próprio jogo via `getTeam(homeId) ?? teamA` e `getTeam(awayId) ?? teamB`, garantindo que a abreviação exibida e o ID salvo sempre se refiram ao mesmo time.

#### Bug crítico — `useRanking.ts`: side-effect dentro de state updater do React
- `setBreakdowns(nextBreakdowns)` era chamado dentro do updater de `setRanking((previousRanking) => { ... })`. Em React 18 Strict Mode, updaters podem ser executados duas vezes, causando `breakdowns` e `ranking` dessincronizados por um ciclo de render.
- Corrigido: substituída a abordagem de updater por `useRef<RankingEntry[]>` para guardar o ranking anterior. `buildRankingState` é chamado fora do updater usando `previousRankingRef.current`; após o cálculo, o ref é atualizado e `setRanking`/`setBreakdowns` são chamados separadamente no mesmo flush.

#### Bug alto — `syncNBA.ts`: `game_number` duplicado em sync inicial com múltiplos jogos
- Quando vários jogos novos de uma mesma série eram inseridos numa única passagem do sync, a query de `existingGames` era feita antes de qualquer inserção. Todos os novos jogos calculavam `game_number = 1` (ou outro mesmo valor), gerando duplicatas.
- Corrigido: eliminada a query separada por `nba_game_id`. Os jogos existentes da série são carregados uma única vez com `select('id, nba_game_id, ...')`, e o `existingGame` é encontrado por `existingGames.find(g => g.nba_game_id === bdlGame.id)`. Dessa forma o `game_number` de jogos já existentes é preservado, e novos jogos recebem `existingGames.length + 1` correto considerando as inserções anteriores da mesma passagem.

#### Bug médio — `SeriesModal.tsx`: `getTeam(series.winner_id)` pode retornar `undefined`
- O resultado da série exibia `getTeam(series.winner_id)?.abbreviation`, mas `getTeam` consulta a lista estática de times. Se `winner_id` fosse de um time do play-in ou não mapeado, a abreviação seria `undefined` na tela.
- Corrigido: expressão alterada para `(series.winner ?? getTeam(series.winner_id))?.abbreviation ?? series.winner_id`, priorizando o objeto joined `series.winner` que já vem populado pelo hook `useSeries`.

#### Bug de segurança — `backend/src/index.ts`: CORS sem restrição de origem
- `app.use(cors())` sem configuração permite que qualquer domínio faça requisições ao backend, incluindo os endpoints `/admin/sync` e `/admin/rescore`.
- Corrigido: adicionada configuração `origin: process.env.FRONTEND_URL ?? 'http://localhost:5173'`. A variável `FRONTEND_URL` deve ser definida no ambiente de produção do Render apontando para o domínio Vercel do frontend.

#### Qualidade — `Games.tsx`: 12 instruções de `console.log/warn` em código de produção
- Logs de debug (`'time selecionado'`, `'[GameCard] handleSave chamado'`, `'[savePick] chamado'`, `'[savePick] pick existente'`, `'[savePick] update result'`, `'[savePick] insert result'`, `'[savePick] sucesso!'` e outros) estavam presentes em `GameCard` e `savePick`, aparecendo no console do usuário final.
- Removidos todos os logs de debug. Mantido apenas o `console.error` no bloco `catch` de `savePick`, que registra exceções inesperadas sem expor detalhes desnecessários ao usuário.

### Validações
- `frontend`: `npm run build` concluído com sucesso — sem erros de TypeScript, warning de chunk grande do Vite permanece mas sem falha de compilação.
- `backend`: `npm run build` concluído com sucesso — sem erros de TypeScript.

### Pendências não corrigidas (decisão de produto ou escopo)
- `BracketEditor.tsx`: `gamePickSeries` e `setGamePickSeries` existem mas o modal de palpite de jogo não tem gatilho de abertura a partir do bracket. Requer decisão de produto sobre o fluxo de navegação (ex.: botão "Palpitar jogos" dentro do `SeriesModal`).
- `Compare.tsx` e `RankingTable.tsx`: funções `nameToColor`, `initials` e o componente `Avatar` estão duplicados em dois arquivos com implementações ligeiramente diferentes. Sem impacto funcional, mas candidatos a extração em `frontend/src/components/Avatar.tsx`.
- `SERIES_ID_BY_TEAMS` em `syncNBA.ts`: mapeamento estático de confrontos hardcoded para a temporada 2024-25. Temporadas futuras precisarão atualizar este mapa ou adotar um mapeamento dinâmico via tabela no banco.

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

## 2026-04-10 01:05 - Placeholder de play-in no bracket com bloqueio de palpite

### Objetivo
- Permitir exibir séries ainda indefinidas com texto de placeholder do play-in, sem liberar palpites antes do confronto real estar formado.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/utils/bracket.ts`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/components/BracketSVG.tsx`

### Mudanças feitas
- `frontend/src/utils/bracket.ts` ganhou helpers para:
  - detectar se uma série já está pronta para receber palpite;
  - montar labels de placeholder para séries ainda indefinidas;
  - mostrar “Seed 7/8 / play-in” na primeira rodada quando o adversário ainda não estiver fechado;
  - mostrar fallback do tipo “Vencedor de W1-1” nas rodadas seguintes quando o participante ainda depende de uma série anterior.
- `SeriesModal` agora reconhece séries incompletas de confronto:
  - mostra um bloco explicando que a série ainda aguarda definição;
  - desabilita escolha de vencedor e quantidade de jogos;
  - bloqueia o botão de salvar até o confronto existir de verdade.
- `BracketSVG` foi ajustado em desktop e mobile para:
  - renderizar `PI` / `TBD` quando um lado da série ainda não existe;
  - exibir texto explicativo do placeholder no card mobile;
  - marcar visualmente séries ainda aguardando play-in;
  - manter a chave navegável sem fingir que o confronto já está pronto.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`

### Pendências
- Os placeholders desta rodada são genéricos por estrutura da chave, não por nomes reais dos times do play-in.
- Se você quiser textos como “OKC vs LAL/MIN” com candidatos reais, isso pode entrar numa segunda rodada com uma camada específica para o estado do play-in.
