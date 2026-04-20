# Codex Changelog

## 2026-04-20 — Odds ESPN + fix dots ranking

### Análise: odds migradas para ESPN (sem key, sem quota)
- `backend/src/lib/odds.ts` — nova `fetchESPNGameOddsSummary()`: busca scoreboard da ESPN, depois odds do ESPN Core API (`/events/{id}/competitions/{id}/odds`); moneyline americano via `homeTeamOdds.moneyLine` / `awayTeamOdds.moneyLine`; cache 30min; sem API key necessária
- `backend/src/routes/analysis.ts` — `/odds-summary` trocado para usar ESPN em vez de The Odds API (que esgotou cota gratuita de 500 req/mês)
- The Odds API permanece no `/insights` endpoint (spread/totals)
- Commit: `321c1f0`

### Fix: dots do ranking mostrando jogos futuros
- `frontend/src/components/GamePickDots.tsx` — adicionado campo `played: boolean` ao `DotData`; `CompactDots` agora filtra `dots.filter(d => d.played).slice(-5)` — só jogos já jogados, pegando os 5 mais recentes
- `frontend/src/hooks/useAllGamePickDots.ts` — `played: game.played` incluído no dot
- `frontend/src/pages/Compare.tsx` — mesmo campo adicionado em `computeCompareDots`
- Causa: `slice(-5)` sem filtro pegava os 5 últimos do array (56 jogos), que eram todos game 7 futuros
- Commits: `86bdf4d`, `6524f74`

## 2026-04-19 — Sessão extra: histórico de palpites + fixes

### Profile: aba "Histórico" de palpites
- `frontend/src/pages/Profile.tsx` — novo tab switcher "Perfil / Histórico" abaixo do header card; componente `HistoricoTab` exibe todos os palpites agrupados por rodada (séries + jogos); status emoji: 🏆 cravada, ✅ acerto, ❌ erro, ⏳ pendente; badge de pontos em dourado; sem novas queries — usa `breakdown` já carregado pelo `useParticipantProfile`
- Commit: `6c9d954`

### Fix: dots do ranking mostravam os 5 jogos mais antigos em vez dos mais recentes
- `frontend/src/components/GamePickDots.tsx` — `CompactDots` usava `slice(0, 5)` (primeiros 5 cronológicos); o jogo DET-ORL ficava na posição 6 e nunca aparecia; trocado para `slice(-5)` para mostrar sempre os 5 jogos mais recentes
- Causa raiz: com 8 séries de R1 iniciando simultaneamente, o jogo do DET caia fora da janela fixa dos primeiros 5
- Commit: `86bdf4d`

### Digest WhatsApp: formato scoreboard
- `backend/src/digest/exportDailyPicksDigest.ts` — novo `buildBar()` gera barras `█░`; `buildGameScoreboard` / `buildSeriesScoreboard` retornam barras por time com % de votos; picks agrupados por time `👥 Nome1, Nome2 → ABBR`; coverage `✅ 9/9` ou `⚠️ 8/9 · Falta: Nomes`; headers `🏀 *BOLÃO NBA · DD/MM*` com separadores `━━━`; seções `🎮 PALPITES JOGO A JOGO` / `🏆 PALPITES DE SÉRIE`; `formatTipOffShort` converte `21:30` → `21h30`
- Commit: `a8e3ea5`

## 2026-04-19 — Múltiplos fixes e melhorias (sessão completa)

### Admin: painel de cobertura detecta round ativo dinamicamente
- `backend/src/routes/admin.ts` — `buildAdminPickCoverage` agora busca todas as séries (sem filtro fixo `eq('round', 1)`) e detecta o round ativo como o menor round com séries incompletas; ao fim do R1 passa automaticamente para R2
- `frontend/src/pages/Admin.tsx` — adicionado `activeRound` à interface e helper `roundShortLabel()`; labels "R1 abertas", "R1 pronta para pick", "Série da rodada 1" etc. agora são dinâmicos
- Commit: `5e48741`

### Admin: seção de relatório diário reformulada
- `frontend/src/pages/Admin.tsx` — cards "Resumo do dia" e "Lembrete de palpites" agora exibem o texto completo da mensagem inline (sem precisar clicar "Gerar"); botão "Copiar mensagem" copia direto do preview auto-carregado; "Exportar arquivo" virou ação secundária; modal de exportação simplificado para confirmação apenas
- Removidos botões "Atualizar preview" (redundantes — useEffect já fazia isso)
- Commit: `0257653`

### Admin: seletor de seção no digest (só jogos / só séries / completo)
- `backend/src/digest/exportDailyPicksDigest.ts` — novo tipo `DailyDigestSection = 'all' | 'games' | 'series'`; `buildDigestSections` aceita parâmetro `section`; quando `'games'`: título próprio, bloco de jogos + contra a corrente; quando `'series'`: título próprio, bloco de séries
- `backend/src/routes/admin.ts` — endpoints preview e POST passam `section` adiante
- `frontend/src/pages/Admin.tsx` — novo estado `digestSection`; terceiro select "Só jogos / Só séries / Completo"; preview atualiza automaticamente ao mudar seção
- Commit: `58c7623`

### Home: botão de stats NBA.com removido
- Tentativa de link para `nba.com/game/{id}` não funcionou: `nba_game_id` no banco é o ID interno do BDL, não o ID oficial da NBA.com; URL com data também não abriu corretamente; feature removida
- Commits: `49eb9dc`, `627a4dc`, `03ca29b`, `637651f`

## 2026-04-18 — Home: ampliar detecção de fim de quarto na rail ao vivo

### Problema
O commit anterior detectava fim de quarto apenas com `/end of/i` no `status_text`. Screenshot mostrou "Q2 em andamento" quando o 2º quarto já havia encerrado — a BDL API retornou clock `0:00` sem o texto "End of Qtr".

### Correção
`frontend/src/utils/gameStatus.ts` — condição `Fim do Q{N}` agora ativa quando:
- `cleanClock === '0:00'` (relógio zerado), **ou**
- `status_text` contém `end of`, `between qtr` ou `intermission` (regex ampliado)

### Validação
- `npm --prefix frontend run build` ✓
- `git push` ✓ (commit `2e7cd99`)

## 2026-04-18 — Games: fix definitivo Séries urgentes usando nextGamePicked

### Problema
O fix anterior comparava `pickedGames < effectiveGamesCount`, que é sempre verdadeiro em séries em andamento (effectiveGamesCount inclui os 7 jogos potenciais da série, o usuário só palpitou 1). Resultado: "Séries urgentes" continuava mostrando 1 mesmo com todos os picks feitos.

### Correção
- `frontend/src/pages/Games.tsx` — adicionado `nextGamePicked: boolean` ao `SeriesGroup`, que verifica especificamente se o **próximo jogo aberto** da série tem pick do usuário
- Filtro `urgent` agora usa `!group.nextGamePicked` — contador zera quando o próximo jogo da série já tem pick

### Validação
- `npm --prefix frontend run build` ✓

## 2026-04-18 — Home/Games: correções na rail de jogos ao vivo

### Mudanças
- `frontend/src/utils/gameStatus.ts` — detalhe do jogo ao vivo com três estados: `Q1 • 7:45` (período + relógio), `Q1 em andamento` (período sem relógio da API), `Início` (sem dados ainda). Antes mostrava o horário UTC do tip-off quando `status_text` não era útil.
- `frontend/src/utils/gameStatus.ts` — indicador `~30s` discreto ao lado do relógio para informar o usuário sobre o delay de sincronização.
- `frontend/src/pages/Games.tsx` — "Fecham hoje" agora só conta jogos que o usuário ainda não palpitou; antes contava todos os jogos fechando em 3h mesmo com pick salvo.
- `frontend/src/pages/Games.tsx` — "Séries urgentes" agora só conta séries onde o próximo jogo ainda não tem pick; antes contava todas as séries com próximo jogo em 3h.

### Validação
- `npm --prefix frontend run build` ✓

## 2026-04-18 — Digest: análise de grupo com consenso, divergências e contra a corrente

### O que foi feito
`backend/src/digest/exportDailyPicksDigest.ts` — três novas funções de análise injetadas no `whatsappText`:

- **`buildGameInsight`**: linha de consenso por jogo com contagem e % de cada time. Detecta consenso total (✅) e duelo acirrado (⚔️ diferença ≤ 1 voto)
- **`buildSeriesInsight`**: mesmo consenso para séries + distribuição de duração apostada pela maioria (ex: `5j×4, 6j×2`)
- **`buildContraCorrenteLines`**: bloco final `🔀 Apostas contra a corrente` — lista participantes que apostaram no time minoritário quando a diferença é clara (minoritário ≤ 40% dos votos)

O formato `compact` também recebe a linha de consenso (sem listar nomes).
Estrutura de dados (`DailyDigestGameSummary`, `DailyDigestSeriesSummary`) não mudou — compatível com frontend existente.

### Exemplo de saída
```
Jogo 1 - CLE x TOR (14:00)
📊 CLE 6 (67%) x TOR 3 (33%) — maioria no CLE (6/9)
- Victor: CLE | Rafael: CLE | ...
- Cobertura: 9/9

🔀 Apostas contra a corrente
- Matheus: TOR (J1 CLE x TOR)
```

### Validação
- `npm --prefix backend run build` ✓

## 2026-04-18 — Admin: ferramenta de inserção manual de palpites

### O que foi feito
- `backend/src/routes/admin.ts` — dois endpoints novos:
  - `GET /admin/picks/options`: retorna participantes, jogos abertos e séries abertas para popular o formulário
  - `POST /admin/picks/insert`: insere palpite de jogo ou série para qualquer participante; nunca sobrescreve pick existente (retorna `inserted: false` com aviso se já havia pick)
- `frontend/src/pages/Admin.tsx` — seção "Inserir Palpite Manual" na aba Cobertura:
  - dropdown de participante, toggle Jogo/Série, dropdown do alvo, dropdown do vencedor (auto-populado), seletor 4-7 jogos (apenas para série)
  - feedback visual: verde (inserido), dourado (já existia), vermelho (erro)
  - ao inserir com sucesso, recarrega automaticamente o painel de cobertura

### Proteções
- nunca sobrescreve pick já existente — somente insere se não houver
- valida `winnerId` contra os times reais do jogo/série no backend
- valida participante existente antes de inserir

### Validação
- `npm --prefix backend run build` ✓
- `npm --prefix frontend run build` ✓

## 2026-04-18 — Fix deleteGameRows preserva game_picks

### Problema
O job `syncNBA` chamava `deleteGameRows` que apagava `game_picks` antes de deletar `games` considerados "stale". Qualquer jogo que a API da balldontlie deixasse de retornar (por mismatch de season, paginação ou instabilidade) fazia todos os palpites ligados a ele sumirem em até 15 minutos.

### Correção
- `backend/src/jobs/syncNBA.ts` — `deleteGameRows` agora consulta `game_picks` antes de deletar: jogos que já possuem palpites de usuários **não são deletados**; apenas jogos sem palpite são removidos.
- Isso elimina a perda silenciosa de picks causada pelo ciclo de sync.

### Validação
- `npm --prefix backend run build`

## 2026-04-18 11:31:00

### Sync NBA - correção do sumiço de palpites jogo a jogo
- corrigi `backend/src/jobs/syncNBA.ts` para normalizar `nba_game_id` como string nas comparações entre o banco e a API da balldontlie;
- a regressão vinha do fato de `games.nba_game_id` voltar do Supabase como string, enquanto o sync comparava com `bdlGame.id` numérico, classificando jogos válidos como `stale`;
- isso fazia o scheduler apagar o jogo local, deletar `game_picks` ligados a ele e recriar a mesma partida com um novo `id`, causando exatamente o sintoma de “salvou, recarreguei e sumiu”;
- também alinhei a busca de `existingGame` por `nba_game_id` para usar a mesma normalização, evitando recriação indevida de jogos já existentes.

### Validação
- `npm --prefix backend run build`

## 2026-04-18 11:34:00

### Palpites jogo a jogo - restauração do save e lock corrigido no modal
- corrigi `frontend/src/hooks/useGamePicks.ts` para travar cada jogo pelo próprio `tip_off_at` com a mesma janela de 5 minutos usada em `frontend/src/pages/Games.tsx` e no backend, removendo o bloqueio indevido da série inteira após o Jogo 1;
- fortalecei `frontend/src/lib/picksApi.ts` com fallback controlado para o fluxo antigo via Supabase quando o backend oficial de picks estiver indisponível, em CORS quebrado, fora do ar ou ainda sem as novas rotas publicadas;
- com isso, o app continua preferindo `POST /api/picks/game` e `POST /api/picks/series`, mas volta a salvar palpites em cenários de deploy parcial do backend, evitando o estado crítico de “cliquei e nada persistiu”.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 10:43:32

### Palpites oficiais - save blindado via backend para jogo a jogo e séries
- criei [backend/src/routes/picks.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/routes/picks.ts) com os endpoints `POST /api/picks/game` e `POST /api/picks/series`, exigindo sessão válida, resolvendo o participante autenticado, validando lock, confronto e `winner_id`, e salvando com `upsert` mais fallback controlado quando a constraint ainda não existir;
- liguei essa rota em [backend/src/index.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/index.ts), consolidando um caminho oficial de gravação no servidor em vez de depender de `insert/update` disparado direto do cliente;
- adicionei [frontend/src/lib/picksApi.ts](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/lib/picksApi.ts) para encapsular o `fetch` autenticado com bearer token do Supabase para os saves oficiais;
- atualizei [frontend/src/pages/Games.tsx](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/pages/Games.tsx), [frontend/src/hooks/useGamePicks.ts](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/hooks/useGamePicks.ts) e [frontend/src/hooks/useSeries.ts](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/hooks/useSeries.ts) para usar esse fluxo oficial, reduzindo risco de estado stale, corrida entre `insert`/`update` e falso positivo de “palpite salvo”.

### Admin - painel de integridade para detectar problema antes da queixa do usuário
- ampliei [backend/src/routes/admin.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/routes/admin.ts) com `buildAdminPickIntegrity()` e a rota `GET /admin/pick-integrity`, que varrem:
  - duplicidade de `game_picks` por `(participant_id, game_id)`;
  - duplicidade de `series_picks` por `(participant_id, series_id)`;
  - picks órfãos;
  - `winner_id` inválido em jogo e série;
  - jogos abertos sem `tip_off_at`;
  - séries prontas sem horário-base para lock;
- evoluí [frontend/src/pages/Admin.tsx](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/pages/Admin.tsx) com a nova seção `Integridade dos Palpites`, trazendo cards-resumo, severidade, amostras dos casos, recomendações e recarga automática quando `participants`, `game_picks`, `series_picks`, `games` ou `series` mudam.

### Banco - hardening manual preparado para constraints e RLS
- adicionei [supabase/pick-integrity-hardening.sql](C:/Dev/pessoal/projetos/nba-bolao/supabase/pick-integrity-hardening.sql) com:
  - fail-fast se ainda houver duplicidade estrutural;
  - helper `current_participant_id()` para policies;
  - índices `UNIQUE` em `game_picks(participant_id, game_id)` e `series_picks(participant_id, series_id)`;
  - policies de `insert/update` restringindo gravação ao próprio participante e apenas dentro da janela válida de lock;
- o script foi deixado para aplicação manual e revisada, porque políticas legadas podem se combinar com `OR` e precisam de conferência antes de produção.

### Validação
- `npm --prefix frontend run build`
- `npm --prefix backend run build`

## 2026-04-18 03:01:00

### Infra - backup operacional diário agendado para 03:00 BRT
- ajustei o workflow [\.github/workflows/operational-backup.yml](C:/Dev/pessoal/projetos/nba-bolao/.github/workflows/operational-backup.yml) para disparar o backup operacional diário às `06:00 UTC`, que corresponde a `03:00` da manhã no fuso de São Paulo;
- o fluxo continua chamando o endpoint interno protegido `/admin/internal/backup/run` com verificação automática do snapshot.

## 2026-04-18 02:47:00

### Home - cards ao vivo da rail agora destacam melhor transmissão, relógio e placar parcial
- refinei os cards da timeline de jogos em [frontend/src/pages/Home.tsx](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/pages/Home.tsx) para dar mais peso visual aos confrontos ao vivo sem mudar a estrutura aprovada;
- o badge `LIVE`/`HALF` ganhou contraste e glow mais forte, deixando o estado de transmissão mais evidente;
- se o jogo estiver ao vivo, o card agora abre uma faixa própria com `AO VIVO` ou `INTERVALO` e o detalhe principal (`Qx • relógio`);
- aumentei o tamanho do placar parcial nos jogos ao vivo e dei mais destaque ao score com tratamento visual específico;
- também simplifiquei o microtexto do contexto live para não repetir demais a mesma informação em várias linhas do card.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 02:34:00

### Backend/Admin - health agora denuncia quando o banco ainda não suporta status live
- adicionei a checagem operacional de colunas live em [backend/src/lib/liveGameColumns.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/lib/liveGameColumns.ts), validando no Supabase se `games` já possui `game_state`, `status_text`, `current_period` e `clock`;
- expus esse diagnóstico nos endpoints [backend/src/index.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/index.ts) e [backend/src/routes/admin.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/routes/admin.ts), com snapshot cacheado, caminho da migração e mensagem operacional pronta;
- atualizei [frontend/src/pages/Admin.tsx](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/pages/Admin.tsx) para mostrar alerta visível quando o schema live ainda não foi aplicado, inclusive marcando `Health backend` como `Ajuste pendente` e apontando para `supabase/live-game-status.sql`;
- durante a verificação real do ambiente, confirmei que o Supabase atual ainda está sem essas colunas, então o próximo passo externo continua sendo aplicar [supabase/live-game-status.sql](C:/Dev/pessoal/projetos/nba-bolao/supabase/live-game-status.sql) no SQL Editor.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## 2026-04-18 02:18:00

### Backend - scheduler de sync real agora trabalha em segundos para acelerar pós-jogo
- reestruturei o scheduler em [backend/src/scheduler/nbaSyncScheduler.ts](C:/Dev/pessoal/projetos/nba-bolao/backend/src/scheduler/nbaSyncScheduler.ts) para sair do pulso fixo de 1 minuto e passar a operar com heartbeat de 15 segundos;
- a cadência agora segue o plano operacional:
  - `clutch`: `15s` quando há jogo ao vivo na reta final ou overtime;
  - `live`: `30s` durante jogo em andamento;
  - `pregame`: `5 min`;
  - `daily`: `15 min`;
  - `idle`: `60 min`;
- adicionei detecção de reta final usando `game_state`, `current_period` e `clock` quando essas colunas estão disponíveis, com fallback seguro para a leitura básica da agenda quando não estiverem;
- o snapshot do scheduler agora expõe `intervalSeconds` além de `intervalMinutes`.

### Admin - health do sync mostra segundos quando a cadência cai abaixo de 1 minuto
- atualizei [frontend/src/pages/Admin.tsx](C:/Dev/pessoal/projetos/nba-bolao/frontend/src/pages/Admin.tsx) para exibir a cadência real do scheduler como `15s`, `30s` ou `5 min`, em vez de arredondar tudo para minutos.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## 2026-04-18 02:04:00

### Home - bloco do visitante ancorado pela largura do conteúdo
- finalizei o ajuste do `TeamMark` em `frontend/src/pages/Home.tsx` para que o lado direito em `Jogos de hoje` use largura de conteúdo (`max-content`) e fique realmente preso à borda direita da coluna, em vez de continuar visualmente centralizado.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 02:00:00

### Home - alinhamento do time visitante ajustado na direita do card
- refinei `TeamMark` em `frontend/src/pages/Home.tsx` para que o bloco do time visitante se ancore de fato na borda direita do card em `Jogos de hoje`, alinhando logo e sigla com mais precisão visual.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 01:54:00

### Home - linhas de `Jogos de hoje` sem vazios laterais excessivos
- ajustei o layout dos cards de `Jogos de hoje` em `frontend/src/pages/Home.tsx` para remover o espaço morto que sobrava nas laterais da linha;
- substituí o comportamento em `flex` no desktop por uma grade fixa de 3 colunas (`time da casa`, `miolo`, `time visitante`), mantendo o centro estável sem empurrar os times para longe;
- também dei largura mínima controlada ao bloco central de horário/status para a leitura continuar equilibrada sem abrir “buracos” visuais.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 01:46:00

### Home - cards de séries abaixo de `Jogos de hoje` mais compactos e com destaque verde melhor resolvido
- refinei a área de `Resultados reais` em `frontend/src/pages/Home.tsx`, especialmente os cards logo abaixo de `Jogos de hoje`, para reduzir vazios e aumentar a densidade de informação;
- os confrontos com jogo no dia agora usam um tratamento verde mais editorial, com destaque superior `EM JOGO HOJE`, fundo mais intencional e leitura visual mais clara do estado ativo da série;
- compacteis os blocos laterais dos times com uma variação `compact` de `TeamShowcase`, diminuindo paddings, logo badge e tipografia sem perder conteúdo;
- reorganizei a base do card para juntar headline, detalhe e status operacional em um bloco mais fechado, evitando a sensação de espaços mortos entre seções.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 01:32:00

### Home - estilização premium da rail de jogos sem mudar a lógica aprovada
- refinei a apresentação da faixa `Jogos` em `frontend/src/pages/Home.tsx` mantendo a lógica já aprovada de agenda por data, com hoje centralizado e passados/futuros distribuídos na rolagem;
- fortaleci o bloco de data com largura maior, destaque editorial para `HOJE`, contraste superior e separação mais clara entre grupos diários;
- reorganizei a hierarquia visual dos cards para deixar horário, badge de status, fase, número do jogo e confronto mais legíveis, com placar mais forte em `live/final`;
- diferenciei melhor os estados dos cards:
  - `live` com destaque verde e brilho mais esportivo;
  - `final` com tratamento editorial próprio;
  - jogos de hoje com realce sutil mesmo quando ainda estão em agenda;
- melhorei a navegação horizontal com `snap` consistente, fades laterais mais úteis e cards com pesos diferentes para agenda versus jogos em momento editorial.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 01:18:00

### Home - rail agora colapsa duplicatas do mesmo jogo por slot real
- ajustei `frontend/src/pages/Home.tsx` para deduplicar a faixa `Jogos` não só por `nba_game_id`, mas também por `série + confronto + horário`, espelhando melhor a lógica do topo do site da NBA;
- com isso, quando a Home recebe o mesmo jogo pela base local e pela trilha complementar `external-*`, os cards são fundidos em uma única entrada em vez de aparecerem como `Game 1` e `Game 2` no mesmo dia e horário;
- a seleção do card vencedor agora prioriza estado mais relevante (`live`/`halftime`, depois `final`, depois `scheduled`) e preserva o menor `game_number` quando houver conflito do mesmo slot.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 01:02:00

### Home - faixa de jogos agora abre focada no dia de hoje
- mantive o visual e o posicionamento original da faixa `Jogos` em `frontend/src/pages/Home.tsx`, preservando o mesmo layout e as mesmas informações dos cards;
- restaurei a composição completa da agenda por data, mantendo jogos passados à esquerda, jogos futuros à direita e a ordenação cronológica contínua;
- a faixa agora identifica o bloco do dia atual e abre com a área de hoje centralizada na rolagem horizontal, aproximando a navegação da lógica visual do site da NBA;
- preservei a deduplicação por `nba_game_id` e os agrupamentos por dia para que a agenda continue consistente entre base local e jogos extras.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 00:48:00

### Home - agenda de jogos no topo com leitura mais próxima da NBA
- reorganizei `frontend/src/pages/Home.tsx` para levar a faixa de jogos para o topo completo da Home, ocupando toda a largura antes das colunas principais;
- redesenhei a rail para ficar com cara de `schedule strip`, mais próxima da navegação da NBA:
  - bloco de dia separado;
  - cards compactos em sequência horizontal;
  - horário no topo;
  - ordem cronológica contínua por data e hora;
- também removi o avanço automático da faixa para deixar a agenda mais estável e previsível, com navegação manual por arraste e setas;
- refinei o visual dos cards para uma leitura mais direta de agenda real, com status curtos (`LIVE`, `HALF`, `FINAL`, `AGENDA`) e menos tratamento editorial no topo.

### Validação
- `npm --prefix frontend run build`

## 2026-04-18 00:25:00

### Admin - cobertura de palpites e operação orientada a dados reais
- adicionei a rota `GET /admin/pick-coverage` em `backend/src/routes/admin.ts`, consolidando um painel operacional com:
  - jogos abertos do dia;
  - séries de R1 prontas para pick;
  - nomes de quem já enviou e quem ainda não enviou;
  - resumo agregado de pendências;
- mantive a regra de não expor o conteúdo do palpite: o endpoint e a UI mostram apenas cobertura de envio, nunca `winner_id` ou escolha individual;
- evoluí `frontend/src/pages/Admin.tsx` com uma nova navegação entre `Centro operacional` e `Cobertura de palpites`, incluindo:
  - cards-resumo;
  - filtro para mostrar só pendentes;
  - blocos separados para `Jogos do dia` e `R1 pronta para pick`;
  - chips de status como `Completo`, `Faltam X` e `Travou`.

### Admin - linguagem e fluxo alinhados com sync real da NBA
- revisei a comunicação do admin para tratar o produto como operação baseada em dados reais da NBA, sem depender do conceito de “modo fictício” no fluxo principal;
- renomeei a ação principal de sync para `Sincronizar dados reais` e atualizei textos de apoio, cards de contexto e avisos operacionais em `frontend/src/pages/Admin.tsx`;
- também passei a destacar no painel a origem operacional como `API da NBA + base local`, com referência ao último sync real disponível.

### Home - rail de jogos sem duplicidade e com visual mais scoreboard
- corrigi a composição da rail em `frontend/src/pages/Home.tsx` para normalizar os jogos em uma única etapa, unindo base local e extras da API;
- a deduplicação agora prioriza `nba_game_id` quando existir, impedindo que um jogo local e sua versão `external-*` apareçam duas vezes;
- reforcei a ordenação cronológica com desempate por `game_number` e `id`, mantendo a sequência estável por data e hora;
- removi a repetição visual da lista causada pelo loop duplicado da rail e ajustei os cards para uma leitura mais próxima de scoreboard da NBA, com:
  - status curto (`LIVE`, `HALF`, `FINAL`, `AGENDA`);
  - fase e número do jogo destacados;
  - placar com mais peso visual em jogos ao vivo e finalizados.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## 2026-04-17 13:42:00

### Home - rail de jogos com leitura editorial de pressão da série
- refinei a linguagem contextual da nova faixa de `Jogos` em `frontend/src/pages/Home.tsx` para sair de rótulos frios e passar a comunicar o momento da série de forma mais útil;
- os cards agora podem mostrar leituras como `série começa hoje`, `entra empatada 2-2`, `vale fechamento para BOS`, `MIA tenta empatar` e `DEN abre match point`, dependendo do estado da série antes ou depois do jogo;
- mantive o placar agregado da série no card, mas com uma camada editorial mais direta para leitura rápida da Home.
- também separei o texto por estado do confronto, com frases próprias para `próximo`, `ao vivo` e `final`, evitando que a mesma mensagem apareça fora de contexto.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 - Feature: Centro operacional do Admin com preview real, trilha persistida e backups auditáveis

### Contexto
O painel administrativo saiu de um estado mais manual e local para uma operação mais confiável. O foco foi tratar `backup operacional`, `resumo do dia`, `lembrete de palpites` e observabilidade como rotinas auditáveis de verdade, com preview, manifesto e histórico compartilhado.

### `backend/src/lib/operationalArtifacts.ts`, `backend/src/admin/adminOperationLog.ts`
- Entrou uma camada comum para descrever artefatos operacionais com:
  - `sha256`
  - tamanho em bytes
  - tipo do arquivo
  - validação final do lote
- As execuções administrativas agora geram histórico persistido em disco dentro de `backups/admin-operations/operations-log.json`
- O backend passou a resumir por operação:
  - última execução
  - último sucesso
  - último erro
  - total de execuções

### `backend/src/backup/exportOperationalSnapshot.ts`
- O `backup operacional` deixou de gerar só CSVs e resumo solto
- Agora ele gera também:
  - `payload` bruto do snapshot
  - `manifesto` do backup
  - validação do conjunto de arquivos
  - métricas consolidadas do estado do bolão
- O retorno do backend passou a incluir:
  - `backupId`
  - `generatedAt`
  - `metrics`
  - `validation`
  - lista completa de `artifacts`

### `backend/src/digest/exportDailyPicksDigest.ts`
- O `resumo do dia` ganhou modo de preview reutilizável no backend
- Entraram variantes:
  - `full`
  - `compact`
- A exportação agora salva:
  - `.txt`
  - `.md`
  - `payload .json`
  - `manifesto .json`
- O resultado também traz resumo operacional com:
  - jogos do dia
  - séries abertas
  - picks do dia
  - itens sem cobertura

### `backend/src/digest/exportDailyReminder.ts`
- O `lembrete de palpites` também passou a ter preview e exportação auditável
- Entraram variantes:
  - `full`
  - `pending-only`
- A rotina agora salva artefatos em `backups/daily-reminders/...` com manifesto e payload bruto
- O retorno traz:
  - jogos pedindo atenção
  - participantes pendentes
  - total de lacunas de pick
  - validação do pacote gerado

### `backend/src/routes/admin.ts`, `backend/src/scheduler/dailyDigestScheduler.ts`
- `GET /admin/health` ficou rico e passou a expor:
  - uptime
  - snapshot do scheduler de sync da NBA
  - snapshot do scheduler do resumo diário
  - resumo do histórico operacional
- Nova rota `GET /admin/operations` para abastecer o painel com execuções recentes
- Novas rotas de preview:
  - `GET /admin/daily-digest/preview`
  - `GET /admin/daily-reminder/preview`
- As ações administrativas críticas agora são rastreadas no log operacional, inclusive quando falham
- O scheduler automático do resumo diário também passou a registrar sua própria execução no histórico

### `frontend/src/pages/Admin.tsx`
- O Admin virou um `Centro Operacional`
- A lateral de operações agora ganhou:
  - preview real de `Resumo do dia`
  - preview real de `Lembrete`
  - seleção de data alvo
  - seleção de variante
  - cards de `sync`, `rescore` e `reset` com contexto da última execução
  - observabilidade dos schedulers
- A trilha `Atividade Recente` deixou de depender de estado local do navegador e passou a usar o histórico real vindo do backend
- Os modais de `backup`, `resumo` e `lembrete` passaram a mostrar métricas, validação e artefatos gerados
- Os `window.confirm` / `window.prompt` foram substituídos por modal interno de confirmação, inclusive com confirmação digitada no reset pré-largada

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-17 - Fix: Rodada crítica de estabilidade em Análise, login mobile, Compare e Home

### Contexto
Entrou um pacote de contenção e correção para estabilizar o app antes da abertura do bolão. O foco foi eliminar a quebra da aba `Análise`, endurecer o login no mobile, fechar uma brecha competitiva na `Compare` e terminar o polimento mobile da seção `Resultados reais`.

### `frontend/src/App.tsx`, `frontend/src/pages/Analysis.tsx`, `frontend/src/hooks/useAnalysisInsights.ts`, `frontend/src/hooks/useInjuries.ts`
- A aba `Análise` deixou de derrubar o app inteiro quando recebia payload torto ou reabria subscriptions em duplicidade.
- Entrou isolamento da rota com fallback de erro, normalização defensiva dos dados de insights/lesões e proteção adicional nos blocos mais sensíveis.
- A causa raiz do crash foi corrigida removendo a segunda assinatura de autenticação dentro da `Analysis` e reaproveitando a instância central de `auth` já criada no `App`.

### `frontend/src/components/OnboardingTour.tsx`, `frontend/src/hooks/useOnboarding.ts`, `frontend/src/pages/Analysis.tsx`
- O tour foi temporariamente desligado durante a investigação da regressão e depois reativado.
- O timing do onboarding ficou mais robusto para a navegação entre rotas, especialmente na ida para `Análise`.
- O resultado final é que o tour voltou a funcionar sem ser o causador do crash da aba.

### `frontend/src/hooks/useAuth.ts`, `frontend/src/pages/AuthCallback.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/lib/supabase.ts`, `frontend/.env.example`, `frontend/vercel.json`
- O bootstrap de autenticação ganhou timeout de segurança para evitar loading infinito antes da tela de login.
- O login com Google no mobile passou a usar callback explícita em `/auth/callback`, com rota própria para finalizar a sessão e reportar erro com mais clareza.
- O fluxo mobile foi endurecido para redes lentas, estados intermediários e navegadores embutidos.
- A tela de login passou a orientar melhor quando o OAuth estiver sendo aberto em browser embutido.
- O cliente Supabase foi ajustado de volta para `implicit`, priorizando compatibilidade prática no mobile.
- Entrou também um rewrite em `frontend/vercel.json` para permitir proxy de chamadas do Supabase via infraestrutura da Vercel quando necessário.

### `frontend/src/pages/Compare.tsx`
- A comparação agora só abre por completo depois que todas as séries da `1ª rodada` estiverem travadas.
- Enquanto isso não acontecer, a página mostra estado bloqueado com progresso de travamento e próximo lock previsto.
- Depois da liberação, a aba continua exibindo apenas séries e jogos já fechados para edição.
- Summary, highlights, divergências, dots de jogos e brackets lado a lado foram alinhados ao mesmo filtro, para não vazar leitura antecipada por blocos secundários.

### `frontend/src/pages/Home.tsx`
- A seção `Resultados reais` recebeu mais uma rodada de ajuste específico para mobile.
- Os cards passaram a respeitar melhor a largura curta do celular, com confronto mais estável e leitura menos desalinhada.
- O card central de `VS` voltou a ficar entre os dois times no mobile, em vez de subir isolado para o topo do confronto.
- O badge ambíguo `2/6` passou a aparecer como `2/6 picks`, deixando claro que se trata de quantidade de palpites salvos naquela série.
- O botão `Ver playoff real da NBA` foi movido para o topo da seção, facilitando o acesso no mobile.

### Validações
- `frontend`: `npm run build` concluído com sucesso após os ajustes de `Analysis`, `Auth`, `Compare` e `Home`

## 2026-04-17 - Feature: Fechamento do roadmap com alertas, pulso social, badges e admin premium

### Contexto
A fase principal do produto já estava muito polida, então esta rodada fechou as últimas pontas do roadmap sem poluir a navegação. O foco foi adicionar leitura inteligente e contexto operacional em lugares específicos do app.

### `frontend/src/pages/Home.tsx`
- Adicionados os blocos `Alertas Inteligentes` e `Pulso do Bolão`
- A Home agora resume:
  - próximo lock relevante
  - série com lesão/pressão mais sensível
  - rival direto imediato
  - nome quente do ranking
  - líder atual
  - líder em cravadas
- O objetivo foi manter a Home executiva, mas com mais leitura dinâmica do bolão

### `frontend/src/pages/Games.tsx`
- Novo bloco `Radar inteligente` logo abaixo do hero
- A tela de jogos agora destaca:
  - próximo aperto de lock
  - janela de ação mais importante
  - último movimento relevante da cartela
- Isso reforça a tomada de decisão sem poluir a grade principal de jogos

### `frontend/src/pages/Profile.tsx`
- Novo card `DNA da Cartela`
- Entraram badges heurísticos como:
  - `Cravador`
  - `Leitura quente`
  - `Em ascensão`
  - `Fiel à leitura`
  - `Sem queda cara`
- O perfil ficou mais autoral sem virar gamificação exagerada

### `frontend/src/pages/Admin.tsx`
- Novo bloco `Pulso do Comissário`
- O painel admin agora abre com leitura rápida de:
  - estado operacional
  - última movimentação
  - modo atual + saúde do backend
- Isso ajuda a transformar o Admin em um painel mais premium e menos só operacional

## 2026-04-16 - Feature: Jogos Reais da Home ganham destaques individuais via Ball Don't Lie

### Contexto
Com o plano `ALL-STAR` ativo, a seção `Jogos Reais` da Home passou a aproveitar o endpoint de `Game Player Stats` da Ball Don't Lie. O objetivo foi enriquecer apenas esse bloco com contexto pós-jogo, sem mexer no restante da Home.

### `backend/src/lib/gameHighlights.ts`
- Novo adaptador para `GET /v1/stats` da Ball Don't Lie com filtro por `game_ids`
- Adicionado suporte a paginação por `cursor` e `per_page=100`
- O backend agora resume cada jogo finalizado em:
  - `headline`
  - `best_line`
  - líderes de `points`, `rebounds` e `assists`
- Entrou cache em memória por `game_id` para evitar chamadas repetidas desnecessárias nos mesmos jogos finalizados
- O provider foi padronizado como `balldontlie-game-player-stats`

### `backend/src/routes/analysis.ts`
- Nova rota pública `GET /analysis/game-highlights`
- A rota aceita múltiplos `gameIds` e devolve destaques por jogo

### `frontend/src/hooks/useGameHighlights.ts`
- Nova hook para buscar os destaques individuais dos jogos finalizados da Home
- A carga é disparada apenas para `nba_game_id` válidos dos jogos reais recentes

### `frontend/src/pages/Home.tsx`
- A seção `Jogos da última noite` foi enriquecida sem alterar o restante da Home
- Cada card finalizado agora pode mostrar:
  - headline curta da partida
  - líder em pontos
  - líder em rebotes
  - líder em assistências
- O bloco continua preservando o comportamento anterior de placar real e o restante da página segue intacto
- O botão do chaveamento real não foi alterado e continua no fluxo atual da Home

### Correção de alvo
- Depois da validação visual, foi identificado que o pedido do usuário mirava a seção `Resultados reais` do `OfficialBracketCard`, e não o carrossel `Jogos da última noite`
- A seção `Resultados reais` passou então a consumir o radar de lesões já disponível no app
- Cada série pendente agora pode mostrar o principal alerta/desfalque de cada lado (`LAL Luka fora`, `PHI Embiid fora`, etc.)
- O CTA `Acompanhar playoffs` foi mantido exatamente no mesmo lugar

### Segunda rodada de polimento
- A seção `Resultados reais` ganhou um resumo editorial no topo com leitura rápida da chave
- As séries passaram a ser priorizadas por urgência:
  - jogos de hoje sobem na leitura
  - confrontos com impacto alto ficam mais evidentes
- Cada série aberta agora recebe selo de impacto:
  - `Impacto alto`
  - `Impacto moderado`
  - `Monitorar`
  - `Elencos íntegros`
- O contexto operacional da série também ficou mais claro:
  - `Confronto ativo na agenda de hoje`
  - `Série em andamento`
  - `Aguardando abertura`

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso
- Teste direto da rota `/analysis/game-highlights` ficou pendente porque o backend local não estava ativo no momento da validação final

## 2026-04-16 - Fix: Relatório de lesões passa a focar só nos times ativos da rodada

### Contexto
Depois da migração para a Ball Don't Lie, o feed de `player_injuries` passou a trazer a liga inteira. A seção da aba `Análise` já estava curada por relevância, mas ainda precisava ser recortada para os times realmente envolvidos no feed atual do app.

### `frontend/src/pages/Analysis.tsx`
- O filtro de lesões deixou de usar todos os times da base `TEAMS_2025` como critério principal
- A seção agora monta o recorte a partir dos times realmente presentes no feed atual de jogos e séries
- Entram no conjunto relevante:
  - `home_team`
  - `away_team`
  - `series.home_team_id`
  - `series.away_team_id`
- Quando não houver times suficientes no feed, a tela ainda faz fallback para os times do bracket conhecido
- Se o provider trouxer lesões mas nenhuma delas pertencer aos times ativos da rodada, a UI agora mostra uma mensagem honesta em vez de parecer vazia por erro

### Validações
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Feature: Injuries migram da RapidAPI para Ball Don't Lie

### Contexto
Depois de validar que a RapidAPI estava bloqueada por quota mensal e de você ativar o endpoint `Player Injuries` no plano `ALL-STAR`, a trilha de lesões foi consolidada na própria Ball Don't Lie, que já era o provedor principal do app para dados NBA.

### `backend/src/lib/injuries.ts`
- A integração de injuries deixou de usar RapidAPI e passou a usar `GET /v1/player_injuries` da Ball Don't Lie
- A autenticação passou a reaproveitar `BALLDONTLIE_API_KEY`, sem exigir chave separada para lesões
- Entrou suporte a paginação por `cursor`, com `per_page=100`, para evitar truncar o relatório
- O backend agora mapeia `team_id` da Ball Don't Lie para as siglas do app (`BOS`, `LAL`, `OKC`, etc.)
- `position` do jogador passou a ser preservada quando vier no payload
- O status passou a ser inferido também pelo texto da `description`, porque o feed pode trazer exemplos em que a descrição cita `doubtful/questionable` com `status` simplificado
- A curadoria editorial existente foi mantida:
  - só entram `Out`, `Questionable` e `Doubtful`
  - razões operacionais como `G League`, `Two-Way` e `Not With Team` continuam excluídas
  - jogadores-chave por time seguem priorizados
  - o payload final mantém `impact` para a UI
- As mensagens operacionais de erro foram adaptadas para a Ball Don't Lie, incluindo falta de acesso ao endpoint e limite do provedor

### `frontend/src/hooks/useInjuries.ts`
- Tipagem do provider atualizada de `rapidapi-nba-injuries` para `balldontlie-nba-injuries`

### `backend/.env.example`
- `RAPIDAPI_NBA_INJURIES_KEY` removida do exemplo
- `BALLDONTLIE_API_KEY` passou a ser a única chave necessária para a trilha de injuries

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso
- `GET /analysis/injuries` validado localmente com a chave `ALL-STAR` ativa, retornando `provider: balldontlie-nba-injuries` e lista real de lesões

## 2026-04-16 - Feature: Radar editorial no topo do relatório de injuries

### Contexto
Para fechar a trilha da nova seção de lesões, a UI ganhou um bloco-resumo no topo do card. A ideia foi transformar a área em um radar escaneável da rodada, e não apenas uma listagem agrupada.

### `frontend/src/pages/Analysis.tsx`
- Foi adicionado um bloco `Radar da rodada` no topo da seção de lesões
- O radar agora resume:
  - quantidade de casos de impacto alto
  - número total de casos monitorados
  - quantidade de times afetados
  - times mais impactados
  - principais nomes em alerta
- Os headlines do radar priorizam primeiro casos de impacto alto
- Quando não há impacto alto, o radar sobe os casos médios mais relevantes
- O resultado final deixa a leitura muito mais rápida e editorial

### Validações
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Feature: Destaque visual por impacto no relatório de injuries

### Contexto
Depois de refinar a curadoria no backend, a UI ainda precisava comunicar melhor quais lesões realmente pesam na leitura da rodada. Nesta etapa, o nível de impacto calculado internamente passou a atravessar o contrato e ganhar destaque visual na aba `Análise`.

### `backend/src/lib/injuries.ts`
- O contrato de `AnalysisInjuryItem` passou a incluir `impact`
- O campo agora é devolvido no payload final com três níveis:
  - `high`
  - `medium`
  - `low`

### `frontend/src/hooks/useInjuries.ts`
- Tipagem atualizada para aceitar o novo campo `impact`

### `frontend/src/pages/Analysis.tsx`
- O card de lesões agora exibe selo de impacto para casos relevantes
- Casos de impacto alto e médio ganharam leitura visual mais forte
- Isso ajuda a separar ausência realmente importante de monitoramento secundário

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Feature: Curadoria reforçada de jogadores-chave no relatório de injuries

### Contexto
Depois da troca de provedor e do agrupamento por time, o próximo ganho real de qualidade estava em decidir melhor quais nomes entram no relatório. Nesta etapa, a lógica de relevância no backend foi refinada para priorizar ainda mais os jogadores que realmente mudam a leitura da rodada.

### `backend/src/lib/injuries.ts`
- A lista manual de jogadores-chave por time foi expandida e ordenada por prioridade
- Cada franquia agora tem uma ordem interna mais útil para o radar de lesões
- A lógica passou a calcular prioridade por:
  - ranking manual do jogador dentro do time
  - severidade do status
  - impacto estimado (`high`, `medium`, `low`) para uso interno
- A regra de corte por time ficou mais agressiva contra ruído:
  - jogadores-chave continuam entrando normalmente
  - jogadores secundários só entram com muito mais restrição
  - quando já existe nome importante lesionado, o backend evita poluir o relatório com secundários questionáveis
- O resultado final ficou mais editorial e mais próximo do que interessa para leitura rápida do bolão

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Feature: Fase 2 da seção de injuries com agrupamento por time

### Contexto
Depois de trocar a fonte de lesões no backend, a UI da aba `Análise` ainda mostrava uma lista corrida. Nesta fase, a seção foi transformada em um painel mais editorial, agrupado por time e com filtro rápido.

### `frontend/src/pages/Analysis.tsx`
- A seção `Relatório de Lesões` agora mostra uma visão mais útil da rodada
- Os casos passaram a ser agrupados por time, em vez de lista única
- Foi adicionado filtro rápido com chips:
  - `Todos`
  - um chip por time presente no relatório atual
- O card agora mostra:
  - cabeçalho do time com logo e nome
  - quantidade de alertas por franquia
  - jogadores relevantes daquele time
  - badge de status por lesão
- Foi incluído estado vazio honesto para quando o filtro selecionado não tiver lesões relevantes
- A seção também ganhou texto de contexto para deixar claro que o relatório está priorizando os casos mais importantes

### Validações
- `frontend`: `npm run build` concluído com sucesso

### Próximo passo recomendado
- Refinar a curadoria manual de jogadores-chave por time
- Se quiser, incluir mais inteligência no backend para destacar “impacto alto” visualmente na UI

## 2026-04-16 - Feature: Fase 1 da nova integração de injuries via RapidAPI

### Contexto
A seção de lesões da aba `Análise` estava dependente de um feed anterior que podia vir embaralhado (`scrambled`) e também trazia muita coisa pouco útil para leitura rápida. Nesta fase, a base foi trocada para uma nova API da RapidAPI e o backend passou a filtrar relevância antes de entregar os dados ao frontend.

### `backend/src/lib/injuries.ts`
- A integração antiga com SportsDataIO foi substituída por `RapidAPI NBA Injuries Reports`
- O backend agora consulta o endpoint diário `GET /injuries/nba/{date}` usando a data atual em BRT
- Status irrelevantes deixaram de entrar no relatório:
  - `Available`
  - `Probable`
- O backend agora aceita por padrão apenas:
  - `Out`
  - `Questionable`
  - `Doubtful`
- Razões operacionais pouco úteis para o bolão passaram a ser excluídas, como:
  - `G League`
  - `Two-Way`
  - `Not With Team`
- Times vindos por nome completo da API agora são normalizados para abreviações do app (`BOS`, `LAL`, `OKC`, etc.)
- Foi adicionada uma primeira camada manual de relevância por time com lista de jogadores-chave
- A saída final passou a priorizar:
  - jogadores-chave lesionados
  - e, na ausência deles, no máximo os 2 casos mais relevantes por time

### `frontend/src/hooks/useInjuries.ts`
- Tipagem do provider alinhada com o novo backend (`rapidapi-nba-injuries`)

### `backend/.env.example`
- Documentada a nova variável:
  - `RAPIDAPI_NBA_INJURIES_KEY`
- Variáveis antigas da SportsDataIO foram removidas do exemplo de configuração

### Validações
- `backend`: `npm run build` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso

### Próximo passo recomendado
- Agrupar a UI por time
- Adicionar filtro `Todos` + chips por time
- Refinar a lista manual de jogadores-chave com base nos times que realmente importam no bolão

## 2026-04-16 - Feature: Segunda rodada de motion premium com continuidade de rota e números animados

### Contexto
Depois da primeira camada de motion, a próxima etapa foi deixar o app mais fluido no fluxo completo: troca de páginas, mudanças de ranking, leitura de métricas e sensação de progressão do bracket.

### `frontend/src/App.tsx`
- Rotas principais passaram a usar transição de página com `AnimatePresence`
- As telas agora entram e saem com fade + deslocamento suave + blur leve
- Isso deixa a navegação mais contínua sem depender só da View Transitions API

### `frontend/src/components/AnimatedNumber.tsx`
- Novo componente para animar números com `motion`
- Usado para métricas, posições e totais que mudam com frequência

### `frontend/src/components/RankingTable.tsx`
- Linhas do ranking agora usam `layout` para suavizar reordenação
- Posição, total e cravadas passaram a usar número animado
- Botão de relatório ganhou feedback de hover/tap mais refinado

### `frontend/src/pages/OfficialBracket.tsx`
- Hero do bracket oficial ganhou motion de entrada e hover leve
- Métricas principais agora animam valores numéricos
- Botão de sync admin recebeu feedback de interação mais premium

### `frontend/src/components/CountdownTimer.tsx`
- O valor do timer agora entra com microtransição a cada mudança perceptível
- Mantido o fix anterior que evita loop de animação

### `frontend/src/components/BracketSVG.tsx`
- Séries recém-concluídas agora recebem destaque visual temporário
- O efeito foi aplicado tanto no bracket mobile quanto no desktop
- Isso melhora a sensação de progressão automática da chave

### Validações
- `frontend`: `npm run build` concluído com sucesso

### Observação técnica
- O build passou, mas o Vite sinalizou que o bundle principal ficou acima de `500 kB` minificado
- Isso não quebrou o app, mas virou um ponto real de atenção para uma próxima rodada de code splitting/manual chunks

## 2026-04-16 - Feature: Base premium de motion com Motion for React

### Contexto
O app já estava visualmente consistente, mas ainda faltava uma camada de movimento mais profissional e coordenada entre Home, Ranking, bracket mobile e modais. A proposta desta rodada foi criar uma base reutilizável de animações e aplicá-la nos pontos de maior impacto.

### Dependências
- `frontend`: instalada a biblioteca `motion`

### `frontend/src/lib/motion.ts`
- Novo arquivo com a base reutilizável de motion do app
- Centraliza easing, tween, spring e variantes como:
  - `fadeUpItem`
  - `fadeInItem`
  - `scaleInItem`
  - `staggerContainer`
  - `softStaggerContainer`
  - `pressMotion`

### `frontend/src/pages/Home.tsx`
- Home passou a usar entradas em cascata com `motion`
- `LastNightRecap`, `HeroPanel`, `RankingCard`, `MyPicksCard` e `HomeQuickDeck` ganharam presença de entrada e hover mais premium
- Cards rápidos da Home agora respondem com lift e press mais elegantes
- Hero principal ganhou sensação mais “broadcast” com entrada suave e microprofundidade

### `frontend/src/pages/Ranking.tsx`
- Hero do ranking ganhou motion de entrada e hover sutil
- Pódio do top 3 ficou mais vivo com cards animados e resposta em hover/tap
- Drawer mobile de pontuação agora entra e sai com presença mais limpa
- Cards do gráfico e da tabela receberam movimento leve de painel premium
- CTA do simulador ganhou feedback melhor em interação

### `frontend/src/components/SeriesModal.tsx`
- Modal da série passou a abrir com transição mais cinematográfica, usando fade + subida + escala + leve profundidade
- Botão de fechar, seleção de time, seleção de jogos e CTA principal ganharam feedbacks de hover/tap mais refinados

### `frontend/src/components/BracketSVG.tsx`
- Cards do bracket mobile agora entram em cascata e respondem melhor ao toque/hover
- A leitura do bracket mobile ficou mais dinâmica sem comprometer clareza

### Validações
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Fix: Loader passa a usar o asset oficial loading.svg

### Contexto
O ícone de loading precisava usar a arte centralizada em `assets/loading.svg`, em vez do desenho inline mantido no componente.

### `frontend/src/components/LoadingBasketball.tsx`
- O componente passou a importar `../../../assets/loading.svg`
- O SVG inline foi removido
- O loader agora renderiza a arte oficial por `<img>` mantendo as classes e animações já existentes

### `frontend/src/index.css`
- A rotação do loader foi refinada para girar no próprio eixo com leve perspectiva
- Adicionada aura dourado/laranja com pulso sutil, alinhada à paleta do app
- Glow e sombra foram ajustados para deixar o ícone mais premium sem pesar visualmente

### Validações
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Fix: Correcoes de review em locks, ranking, bracket e auth

### Contexto
Entrada focada em corrigir bugs confirmados pela revisão recente, priorizando regras de negócio e consistência de dados, com o menor escopo possível.

### `frontend/src/hooks/useGamePicks.ts`
- Lock de palpite de jogo corrigido para usar o lock da série (primeiro `tip_off_at` da série), em vez do horário individual de cada jogo
- `saveGamePick()` e `isGameLocked()` agora seguem a regra oficial do produto

### `frontend/src/utils/ranking.ts`
- Adicionada deduplicação defensiva de `series_picks` por `series_id`
- Adicionada deduplicação defensiva de `game_picks` por `game_id`
- O ranking e o breakdown deixam de somar picks duplicados em dobro na UI

### `backend/src/jobs/syncNBA.ts`
- `propagateBracket()` agora também limpa slots descendentes quando o `winner_id` do feeder volta para `null`
- Isso evita bracket preso com time antigo após correção/reversão de resultado

### `frontend/src/components/CountdownTimer.tsx`
- Corrigido loop de animação do contador
- `prevSecondsRef` agora é atualizado na troca real de segundo, evitando flicker e re-render contínuo

### `frontend/src/hooks/useAuth.ts`
- Corrida de primeiro login mitigada
- Se a criação do participante falhar por conflito (`23505`), o hook refaz a leitura do participant e conclui a autenticação normalmente

### `frontend/src/driverjs.d.ts`
- Tipagem local adicionada para `driver.js`, eliminando o bloqueio de TypeScript no tour de onboarding

### Ambiente local do frontend
- `npm install` executado em `frontend/` para alinhar o `node_modules` com o `package.json` / `package-lock.json`
- O pacote `driver.js`, que já estava declarado, voltou a existir localmente e o bundle do Vite passou a resolver o import normalmente

### `backend/src/lib/rollback.ts`
- Novo utilitário para restauração compensatória via `upsert`, usado nas operações admin destrutivas

### `backend/src/routes/admin.ts`
- `reset-picks` agora cria snapshots das quatro tabelas de palpites antes de deletar
- Em caso de falha no meio da operação, o backend tenta restaurar os registros apagados para evitar estado parcial

### `backend/src/admin/removeParticipant.ts`
- Remoção completa de participante agora cria snapshot de:
  - `participants`
  - `allowed_emails`
  - `series_picks`
  - `game_picks`
  - `simulation_series_picks`
  - `simulation_game_picks`
- Se qualquer etapa falhar, o backend tenta recompor os dados removidos

### Validações
- `backend`: `npm run build` concluído com sucesso
- `backend`: `npm run test:scoring` concluído com sucesso
- `frontend`: `npm run build` concluído com sucesso

## 2026-04-16 - Feature: Visual Upgrade — Animações e micro-interações premium

### Contexto
O app funcionava corretamente mas era completamente estático — navegação instantânea, modais sem entrada/saída, toasts sem movimento, sem feedback de press em botões, sem sentido de vida nas páginas. O objetivo foi tornar cada parte do app fluída e responsiva usando **somente CSS puro + View Transitions API** (sem adicionar nenhuma biblioteca de animação). Intensidade alvo: "presente e fluído" — 200–350ms, nada teatral.

### `frontend/src/index.css`
Adicionados novos keyframes e classes utilitárias:
- **Page transitions**: `@keyframes page-fade-in`, `@keyframes page-fade-out` + `::view-transition-new(root)` e `::view-transition-old(root)` — cross-fade com leve slide de 6px ao trocar de rota (220ms entrada / 180ms saída)
- **Modal animations**: `modal-backdrop-in/out`, `modal-panel-in/out` — backdrop faz fade, painel desliza 16px + escala de 0.98 → 1 (200–220ms)
- **Toast**: `toast-in/out` + classes `.toast-enter` e `.toast-exit` — slide de 24px pela direita com fade (250ms / 200ms)
- **Nav menu**: `nav-menu-in` + `.nav-menu-open` — menu desliza de -10px + scale 0.98 → 1 (200ms)
- **Ranking row stagger**: `.stagger-row-1` até `.stagger-row-9` — rows aparecem em cascata com delay de 40ms entre cada uma (300ms base, usando `fadeInUp` existente)
- **Card hover lift**: `.card-hover` com `transition` e hover `translateY(-1px)` + glow dourado sutil — sem background fixo, compatível com estilo inline
- **Bracket glow**: `.bracket-series-node:hover` e `.bracket-slot.clickable:hover` — `filter: drop-shadow(0 0 10px rgba(200,150,60,0.22/0.3))` em ambas as versões (mobile card e SVG desktop)
- **Podium entrance**: `podium-center/left/right` + classes `.podium-enter-center/left/right` — cards do pódio entram de ângulos opostos (300–320ms)
- **Digit tick**: `digit-tick` + `.digit-tick` — scale vertical 1 → 0.84 → 1 a cada tick do contador (120ms)
- **Button press**: `.btn-primary:active { transform: scale(0.97) }` e `.btn-ghost:active:not(:disabled) { transform: scale(0.97) }` — feedback tátil imediato em todos os botões principais
- **Prefers-reduced-motion**: todas as novas classes adicionadas ao bloco existente de `prefers-reduced-motion: reduce` + `::view-transition-*` desabilitados explicitamente

### `frontend/src/App.tsx`
- Adicionado `ViewTransitionHandler` — componente interno ao `BrowserRouter` que intercepta clicks em `<a>` internos e envolve a navegação com `document.startViewTransition()` quando disponível (progressive enhancement — browsers sem suporte ignoram silenciosamente)

### `frontend/src/components/SeriesModal.tsx`
- Adicionado estado `closing: boolean` — quando usuário fecha o modal (botão X ou Escape), aciona `.closing` em vez de chamar `onClose` diretamente
- `onAnimationEnd` no painel chama `onClose()` depois da animação de saída (180ms)
- Backdrop e painel recebem `modal-backdrop` e `modal-panel` classes, com `closing` adicionada condicionalmente

### `frontend/src/components/GamePickModal.tsx`
- Mesma lógica de animação de saída do `SeriesModal` — `closing` state, `handleClose()`, `onAnimationEnd`

### `frontend/src/components/Toast.tsx`
- Refatorado para manter lista local `DisplayToast[]` que sobrevive à remoção do store
- Quando um toast sai do store, é marcado como `exiting: true` e removido da lista local após 210ms (após animação `toast-exit`)
- Cada toast recebe `toast-enter` ou `toast-exit` class dinamicamente — slide visível tanto na entrada quanto na saída

### `frontend/src/components/Nav.tsx`
- Painel do menu mobile recebe `className="nav-menu-open"` — aparece com slide-down + scale (200ms) em vez de instantâneo

### `frontend/src/components/RankingTable.tsx`
- Rows recebem `stagger-row-{N}` (de 1 a 9) baseado no índice — entrance em cascata ao carregar a tabela inicial
- A lógica de `flash-success` / `flash-danger` existente não foi alterada

### `frontend/src/components/CountdownTimer.tsx`
- Adicionado `ticking` state — togglado `true` por 130ms cada vez que o dígito de segundos muda
- Span do tempo recebe `digit-tick` class quando `ticking === true` — scale vertical sutil a cada segundo
- `display: 'inline-block'` adicionado ao span para que `transform: scaleY()` funcione

### `frontend/src/components/BracketSVG.tsx`
- `SeriesCard` (versão mobile/card) recebe `className="bracket-series-node"` + `transition: '... filter 0.25s'`
- CSS do glow via `.bracket-series-node:hover:not(:disabled)` e `.bracket-slot.clickable:hover`

### `frontend/src/pages/Home.tsx`
- Stats grid (Participantes, Séries, Posição, Pontos): `card-hover` adicionado — hover lift nos 4 cards
- Card "Séries Recentes": `card-hover` adicionado
- Card "Meus Palpites": `card-hover` adicionado
- Rows do ranking compacto (top 5): `animate-in-{i+1}` para entrada em cascata

### `frontend/src/pages/Analysis.tsx`
- Cards "Próximos Confrontos", "Resultados Recentes", "Odds dos Confrontos", "Notícias da NBA", "Relatório de Lesões": todos recebem `card-hover` class

### `frontend/src/pages/Ranking.tsx`
- `TopThreeCards`: cada card do pódio recebe `podium-enter-center/left/right` baseado no índice — 1º lugar entra do centro, 2º da direita, 3º da esquerda

---

## 2026-04-16 - Fix: Layout do Ranking Geral invadindo coluna na Home

### Contexto
O card "Ranking Geral" na coluna esquerda da Home estava extrapolando o container de `280px`, invadindo visualmente o conteúdo central. Causa raiz: comportamento padrão do flexbox onde `flex: 1` sem `minWidth: 0` não força truncamento, e a coluna do grid não tinha contenção de overflow.

### `frontend/src/pages/Home.tsx`
- **Coluna esquerda**: adicionadas classes `min-w-0 overflow-hidden` ao `<div>` da sidebar esquerda — contém o conteúdo dentro dos `280px` do grid track
- **`RankingCard`**: `style={card}` expandido com `minWidth: 0, overflow: 'hidden'` para que o card não extrapole a coluna pai
- **Span do nome**: adicionado `minWidth: 0` ao `<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>` — sem isso o flex item não trunca nomes longos (comportamento padrão do flexbox onde `min-width: auto` prevalece sobre `overflow: hidden`)

---

## 2026-04-16 - Fix: LoadingBasketball SVG embutido inline

### Contexto
A animação de loading da bolinha de basquete não estava funcionando porque o componente carregava o SVG via `<img src="/loading-basketball.svg">`. Isso é frágil — o path absoluto pode falhar em ambientes com base path diferente, hot reload ou deploy CDN, e o `<img>` não garante que a animação CSS será aplicada ao SVG interno.

### `frontend/src/components/LoadingBasketball.tsx`
- SVG migrado de arquivo externo (`/loading-basketball.svg` via `<img>`) para **SVG inline** no JSX
- `viewBox="0 0 2000 2000"` perfeitamente quadrado com centro em (1000, 1000) — garante que `transform-origin: center center` do CSS rotacione em torno do centro exato da bola
- Visual redesenhado e mais legível no dark mode:
  - Corpo: `circle` com fill `#1a1a24` (quase preto) e stroke dourado `#C8963C` (`strokeWidth="80"`)
  - 4 costuras curvas em `#E05C3A` (laranja) com `opacity="0.85"` e `strokeLinecap="round"` — 2 horizontais curvas para cima/baixo, 2 verticais curvas para esquerda/direita
- `loading-basketball-icon` aplicado ao `<svg>` direto — a animação `loading-basketball-spin` agora é garantida pelo DOM (antes dependia do `<img>` aplicar CSS ao seu conteúdo SVG)
- Classes CSS e keyframes em `index.css` não foram alterados

---

## 2026-04-16 - Feature: Relatório de Lesões na página de Análise

### Contexto
O backend já tinha `fetchNBAInjuries()` (SportsDataIO) totalmente implementado mas sem rota, sem hook e sem UI. A feature foi conectada do zero até a exibição.

### `backend/src/routes/analysis.ts`
- Novo endpoint `GET /analysis/injuries` — chama `fetchNBAInjuries()` e retorna `{ ok, generatedAt, provider, injuries }`
- Tratamento de erro com log e status 500 em caso de falha

### `frontend/src/hooks/useInjuries.ts` *(novo)*
- Hook `useInjuries()` — fetch contra `/analysis/injuries` com cancelamento via flag `active`
- Retorna: `{ loading, error, generatedAt, injuries, provider }`
- Mesma convenção do `useAnalysisInsights`

### `frontend/src/pages/Analysis.tsx`
- **`InjuriesCard`** — novo componente (inserido antes de `AnalysisActionsCard`):
  - Lista jogadores lesionados com logo do time, nome, detalhe da lesão e posição
  - Ordenação: Out → Doubtful → Day-To-Day → Questionable → Probable
  - Badge de status com cor semântica: vermelho (Out), laranja (Doubtful/Day-To-Day), amarelo (Questionable), verde (Probable)
  - Cor primária do time ao lado da posição
  - Filtrado para mostrar apenas times dos playoffs (TEAMS_2025)
- **`AnalysisHero`** — novo stat "Lesionados" no grid de 5 métricas
- Integrado em ambas as colunas: desktop (coluna direita) e mobile (após notícias)
- Import de `TEAMS_2025` e `getTeamLogoUrl` consolidados em uma linha
- Import de `HeartPulse` (ícone) adicionado ao lucide-react

---

## 2026-04-16 - Sprint 2 e 3: Correções de bugs médios e tech debt

### Contexto
Continuação da auditoria. 6 bugs médios/baixos corrigidos + 2 novos arquivos de constantes criados.

### `frontend/src/components/GamePickModal.tsx`
- **Fix 7 — Série re-validada em tempo real enquanto modal está aberto**: adicionado `useEffect` que assina `postgres_changes` na série específica (`filter: id=eq.{series.id}`); quando `is_complete` ou `games_played` muda no banco, `liveSeries` é atualizado — `seriesClosedBeforeGame` passa a refletir o estado atual, não o snapshot do momento de abertura do modal

### `frontend/src/utils/constants.ts` *(novo)*
- **Fix 8 — ROUND_LABELS compartilhado**: constante `ROUND_LABELS` extraída de `BracketEditor.tsx` e `Ranking.tsx` para arquivo central; ambas as páginas agora importam de lá
- `BRT_TIMEZONE = 'America/Sao_Paulo'` também definida aqui como fonte de verdade para o frontend

### `frontend/src/pages/BracketEditor.tsx`
- Definição local de `roundLabels` removida; importa `ROUND_LABELS` de `utils/constants`

### `frontend/src/pages/Ranking.tsx`
- Definição local de `ROUND_LABELS` removida; importa de `utils/constants`

### `frontend/src/pages/Games.tsx`, `Home.tsx`, `Admin.tsx`, `Analysis.tsx`
- **Fix 12 (frontend) — Timezone**: todas as 13 ocorrências de `'America/Sao_Paulo'` substituídas por `BRT_TIMEZONE` importado de `utils/constants`

### `backend/src/index.ts`
- **Fix 9 — Validação de env vars no startup**: bloco de validação adicionado antes de qualquer inicialização; lista `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` como obrigatórias; encerra com `process.exit(1)` e mensagem clara se alguma estiver ausente

### `backend/src/lib/odds.ts`
- **Fix 10 — Log detalhado de erros**: bloco `catch` agora loga `status`, `reason`, `body` (response body da API) e `message` da exceção via `console.error` — erros de autenticação e rate-limit da The Odds API ficam visíveis no log de produção

### `frontend/src/types/index.ts` e `frontend/src/utils/bracket.ts`
- **Fix 11 — `NormalizedGame` type**: novo tipo `NormalizedGame extends Game` com `round`, `team_a_id`, `team_b_id`, `score_a`, `score_b` e `balldontlie_id` como campos obrigatórios (não-opcionais); `normalizeGame()` em `bracket.ts` agora declara retorno `NormalizedGame`

### `backend/src/lib/constants.ts` *(novo)*
- **Fix 12 (backend) — Timezone**: `BRT_TIMEZONE = 'America/Sao_Paulo'` definida aqui

### `backend/src/digest/exportDailyPicksDigest.ts`, `exportDailyReminder.ts`
### `backend/src/backup/exportOperationalSnapshot.ts`
### `backend/src/scheduler/dailyDigestScheduler.ts`
- Todas as ocorrências de `'America/Sao_Paulo'` substituídas por `BRT_TIMEZONE` importado de `lib/constants`

---

## 2026-04-16 - Sprint 1: Correções de bugs críticos e altos

### Contexto
Auditoria completa do projeto identificou 6 bugs críticos/altos. Todos corrigidos nesta entrada.

### `frontend/src/hooks/useRanking.ts`
- **Fix 1 — Subscription sem error handler**: `.subscribe()` agora recebe callback de status; `CHANNEL_ERROR` e `TIMED_OUT` exibem mensagem de erro e disparam re-fetch manual; `SUBSCRIBED` limpa o erro anterior
- **Fix 2 — Stale closure em `computeRanking`**: função migrada para `useCallback` com dependências vazias; `computeRankingRef` (ref) mantida sempre atualizada; subscription usa `computeRankingRef.current()` para sempre chamar a versão mais recente sem capturar closure stale

### `frontend/src/utils/scoring.ts`
- **Fix 3 — `championBonus` fantasma removido**: campo `championBonus: 0` não existia no backend (`rules.ts`) e não era usado em nenhum cálculo; removido para manter os dois arquivos em sync perfeito

### `backend/src/jobs/syncNBA.ts`
- **Fix 4 — `propagateBracket` não propaga nulls**: antes sobrescrevia `home_team_id`/`away_team_id` da série seguinte com `null` quando o feeder ainda não tinha vencedor, corrompendo o bracket em cascata; agora só propaga se `winner_id != null`, preservando o valor atual

### `backend/src/routes/admin.ts`
- **Fix 5 — `reset-picks` com proteção contra falha parcial**: as 4 deleções (`series_picks`, `game_picks`, `simulation_series_picks`, `simulation_game_picks`) agora rodam em `for...of` sequencial; se qualquer `deleteAllRows` lançar exceção, o catch externo retorna erro sem continuar as demais tabelas — evita estado corrompido sem precisar de rollback explícito
- **Fix 6 — `countDuplicateValues` contava grupos ao invés de entradas extras**: lógica anterior retornava `1` para "João" aparecendo 3 vezes; corrigido para somar `(count - 1)` por grupo, retornando `2` (as 2 entradas extras além da primeira)

---

## 2026-04-16 - Home: Resultados Reais redesenhado + jogos do dia + acertos por série

### Contexto
Seção "Resultados Reais" na Home ganhou informação de bolão (quantos acertaram cada série), cores dos times, badges de status e um bloco de jogos do dia com horário e indicador AO VIVO.

### `frontend/src/pages/Home.tsx`
- `OfficialBracketCard` recebe dois novos props: `upcomingGames` e `participantCount`
- Hook `useSeriesPickStats` adicionado: busca `series_picks` e agrupa por `seriesId → Map<winnerId, count>`
- Helpers `getBrtDateKey` e `formatBrtTime` adicionados para filtro e exibição em horário BRT
- **Jogos de hoje**: nova seção no topo do card mostrando jogos não jogados com tip-off hoje (BRT); cada linha tem cor primária dos times, horário BRT e badge `J1`/`J2`/`AO VIVO`
- **Cores dos times**: abreviações (BOS, CLE etc.) agora usam `primary_color` do time; time eliminado fica com opacidade 0.4
- **Badge de status** por série:
  - Concluída → `X/N ✓` (quantos participantes acertaram o vencedor)
  - Em andamento → `X/N` (quantos já palpitaram) com borda dourada
  - Pendente → `pendente` ou `X/N` se já há palpites
- `import { supabase }` adicionado ao arquivo

---

## 2026-04-16 - Ranking: coluna Sequência + remoção de R1/R2/CF/Finals

### Contexto
Colunas de pontos por rodada (R1/R2/CF/Finals) removidas da tabela de ranking por serem redundantes com o relatório individual. Os dots de sequência ganharam coluna própria com visual melhorado.

### `frontend/src/components/RankingTable.tsx`
- Colunas R1, R2, CF, Finals removidas do header e das linhas do body
- Dots extraídos da célula do nome para **coluna própria** com header "Sequência"
- `lineHeight: 1` adicionado ao nome para corrigir desalinhamento vertical
- `maxWidth` do nome aumentado de 120 → 140px

### `frontend/src/components/GamePickDots.tsx`
- `CompactDots` não retorna mais `null` com `dots = []` — sempre renderiza 5 slots
- `GamePickDots` só faz early-return para variant `grouped`; compact sempre renderiza
- Tamanho dos dots: 9px (era 7px), gap: 4px (era 3px)
- Dots `no-pick` e vazios com fundo `rgba(136,136,153,0.08)` — visíveis no dark mode
- Dots `correct` com `box-shadow` verde sutil; `wrong` com sombra vermelha
- Borda do `no-pick` com opacidade 0.4 (era 0.3); `pending` com borda cinza

---

## 2026-04-16 - Admin: lembrete de palpites do dia

### Contexto
Nova função no painel admin que mostra quem ainda não palpitou nos jogos do dia e gera mensagem pronta para WhatsApp. Complementa o "Resumo do grupo" existente, mas focado em lembrete pré-jogo.

### `backend/src/digest/exportDailyReminder.ts` (novo)
- Busca jogos do dia (BRT) cujo `played = false`
- Cruza com `game_picks` para identificar quem palpitou em cada jogo
- Para cada jogo: retorna `matchup`, `tipOff`, lista `missing` (quem falta), contador `picked/total`
- Gera texto WhatsApp com emojis ⏰ / ⚠️ / ✅ por jogo
- Aceita `targetDate` opcional (padrão = hoje BRT)

### `backend/src/routes/admin.ts`
- Nova rota `POST /admin/daily-reminder`
- Aceita `{ targetDate?: string }` no body

### `frontend/src/pages/Admin.tsx`
- Interface `DailyReminderResponse` / `DailyReminderGame` adicionadas
- Estado `reminderModalOpen` + `latestReminder`
- Handler `handleDailyReminder` — chama rota, abre modal, registra atividade
- Botão "Lembrete de palpites do dia" (`BellRing`) inserido na seção Operações
- Modal: cards por jogo com contador `X/total`, nomes de quem falta em tags vermelhas, badge verde "✅ Todos palpitaram!" quando completo, texto WhatsApp com botão copiar

---

## 2026-04-16 - GamePickDots: dots cinzas para jogos sem palpite

### Contexto
Antes do início dos playoffs, os dots ficavam invisíveis porque `CompactDots` só exibia `correct | wrong`. Agora mostra todos os 5 slots visualmente.

### `frontend/src/components/GamePickDots.tsx`
- `CompactDots` reescrito: usa todos os dots (sem filtrar por status), preenche até 5 slots com padding
- Slots de padding (menos de 5 dots): círculo vazio com borda `rgba(136,136,153,0.25)`
- `no-pick`: círculo transparente com borda `rgba(136,136,153,0.3)`
- `pending`: fundo `#555566`
- `DOT_COLOR` atualizado: `pending: '#555566'`, `no-pick: 'transparent'`

---

## 2026-04-16 - Modo visitante (guest mode)

### Contexto
Qualquer pessoa pode acessar o bolão em modo leitura, sem precisar de conta Google nem estar na lista `allowed_emails`. Todas as tabelas públicas já permitiam leitura anônima via RLS, tornando a implementação puramente frontend.

### `useAuth.ts`
- Adicionado `| { status: 'guest' }` ao tipo `AuthState`
- Nova função `enterAsGuest()` — define estado como guest sem tocar no Supabase Auth
- `signOut()` adaptado: para guest apenas reseta estado local; para authorized chama `supabase.auth.signOut()`
- `enterAsGuest` exposto no retorno do hook

### `Login.tsx`
- Nova prop `onEnterAsGuest`
- Separador "ou" entre os dois botões
- Botão "Ver como visitante" (estilo ghost dourado) abaixo do botão Google

### `ProtectedRoute.tsx`
- Nova prop `blockGuest?: boolean`
- Guest com `blockGuest` ou `requireAdmin` → redireciona para `/ranking`
- Guest sem restrição → passa normalmente

### `Nav.tsx`
- `guestPrimaryLinks`: Home, Análise, Bracket (→ `/official`), Ranking — sem Jogos
- Guest vê links simplificados na barra inferior
- Menu hambúrguer para guest: apenas bloco informativo "Modo visitante" + botão "Sair do modo visitante" (azul, sem itens de perfil/tour/admin)
- Botão de saída muda cor e texto dinamicamente (azul para guest, vermelho para authorized)

### `App.tsx`
- `enterAsGuest` conectado ao `Login`
- `participantId` e `isAdmin` derivados condicionalmente: `''` e `false` para guest
- Rotas bloqueadas para guest (`blockGuest`): `/bracket`, `/games`, `/simulacao`
- Rotas liberadas: `/`, `/analysis`, `/official`, `/ranking`, `/compare`, `/profile/:id`

## 2026-04-16 - JOGOS: visualização por dia (CalendarStrip + ViewModeToggle)

### Contexto
Redesign da página Jogos para ter como modo primário a visualização por dia (semelhante ao NBA.com), substituindo o accordion de séries que continua disponível como modo secundário.

---

### Novos componentes (`Games.tsx`)

**`ViewModeToggle`**
- Dois botões pill acima do conteúdo: "Por dia" (`CalendarDays`) e "Por série" (`Layers3`)
- Estado `viewMode: 'day' | 'series'` com default `'day'`
- Persiste durante a sessão enquanto o usuário navega entre filtros

**`CalendarStrip`**
- Janela deslizante de 5 dias com setas esquerda/direita (`ChevronLeft`, `ChevronRight`)
- Cada célula mostra: dia da semana curto (SEG/TER…), número do dia e mês abreviado
- "Hoje" substitui o dia da semana na célula do dia atual
- Auto-scroll da janela ao mudar o dia selecionado externamente (efeito `useEffect`)
- Setas desabilitadas (opacidade 0.25) quando não há mais dias na direção

**`SeriesContextBadge`**
- Badge de round colorido + "OKC × IND — Jogo 3" + linha separadora
- Exibido acima de cada `GameCard` no modo Por Dia
- `isFirst` prop controla margem superior (sem margem no primeiro card)

### Modo "Por dia"
- `selectedDayGames` useMemo: filtra `games` pelo `selectedDay` (DD/MM/YYYY BRT) e ordena por `tip_off_at`
- `selectedDayAutoPickGroup` useMemo: encontra o `AutoPickDayGroup` correspondente ao dia selecionado
- "Vai na fé" exibido apenas para o dia selecionado (não para todos os dias de uma vez)
- Jogos listados individualmente com `SeriesContextBadge` + `GameCard` completo
- Estado vazio tratado com mensagem contextual ("Nenhum jogo neste dia" vs "Selecione um dia")

### Modo "Por série"
- Comportamento original inteiramente preservado
- `PicksFocusCard`, `FiltersBar`, `DayTabsBar` e accordion de séries mantidos

### Seleção automática de dia
- `useEffect` atualizado: se hoje tem jogos → seleciona hoje; senão, seleciona o próximo dia futuro com jogos; senão, o último dia disponível
- Usuário não precisa clicar em nenhum dia ao abrir a página

---

## 2026-04-16 - JOGOS: "Vai na fé" redesenhado como FAB flutuante (`Games.tsx`)

### Contexto
`TopAutoPickBar` (barra de pills no topo da lista) substituído por um botão circular flutuante (FAB) posicionado acima da navbar, inspirado no padrão Material Design.

### `AutoPickFAB`
- `position: fixed`, bottom direito, acima da navbar (`calc(80px + 16px + env(safe-area-inset-bottom))`)
- Círculo 52×52px com ícone `Shuffle` em fundo `var(--nba-gold)`
- Badge vermelho no canto superior direito com contagem de jogos pendentes; some quando tudo está salvo
- Hover: escala 1.08 via `onMouseEnter/Leave`
- Desabilitado (dourado apagado) quando não há jogos abertos

### Balão de boas-vindas (primeira visita)
- Aparece automaticamente 700ms após o mount quando `totalPending > 0`
- Seta CSS triangular (borda dupla) apontando para o FAB
- Texto: "Vai na fé — sorteia seus palpites, você confere antes de confirmar"
- Botão "Entendi!" — dispensa e persiste no `localStorage` (`nba-bolao:vai-na-fe-intro-seen`) para nunca mais aparecer
- Clicar no próprio FAB também dispensa o balão
- `useRef` garante que a lógica de exibição roda no máximo uma vez por mount

### Comportamento do clique
- **1 dia com jogos abertos** → abre `AutoPickModal` diretamente
- **Múltiplos dias** → exibe popover flutuante com lista de dias + contador de pendentes por dia
- Overlay invisível fecha o popover ao clicar fora

---

## 2026-04-16 - UX/UI: melhorias de navegação, visual e usabilidade pré-playoffs

### Contexto
Bateria de melhorias solicitadas antes do início dos playoffs (18/04), cobrindo 9 itens distribuídos em 5 páginas e 2 componentes.

---

### JOGOS — Filtro por dia (`Games.tsx`)
- Adicionado componente `DayTabsBar` com tabs "Todos os dias / Hoje / Amanhã / Seg 20/04 …"
- Ao carregar, seleciona automaticamente "Hoje" se houver jogos na data atual
- `availableDays` calculado via `dateKeyBRT` a partir dos jogos carregados
- `filteredByDay` aplica filtro de dia sobre `filteredSeriesGroups` (filtra series que têm ao menos um jogo no dia selecionado)
- Função auxiliar `getDayLabel` formata a data em BRT com labels relativos

### JOGOS — "Vai na fé" movido para o topo (`Games.tsx`) *(substituído posteriormente por FAB — ver entrada abaixo)*
- `DailyAutoPickCard` substituído por `TopAutoPickBar` — renderiza acima do `FiltersBar`, como botões compactos em linha
- `TopAutoPickBar` foi por sua vez substituído pelo `AutoPickFAB` flutuante na mesma sessão

### APP — Grace period de 5 min antes do tip-off (`Games.tsx`)
- Constante `PICK_GRACE_MS = 5 * 60_000` centraliza o threshold
- `isGameOpenForPick`, `getGameStateMeta` e `GameCard.locked` usam agora `tipOff - 5min > now` em vez de `tipOff > now`
- Permite palpitar até 5 minutos antes do início do jogo

### RANKING — Botão "E se..." redesenhado e movido para o fundo (`Ranking.tsx`)
- Removido do header strip (ao lado do contador de participantes)
- Movido para uma faixa dedicada abaixo da `<RankingTable>`, com separador visual
- Novo visual: label "Simulador de cenários" + descrição curta + botão dourado com ícone `FlaskConical`
- Tooltip explica a funcionalidade ao passar o mouse

### NAV — Profile no menu hambúrguer (`Nav.tsx`)
- `NavLink` para `/profile` adicionado como primeiro item do menu popup, com ícone `UserCircle`
- Label "Meu perfil"

### HOME — Mensagem dev removida + logos + scroll automático (`Home.tsx`, `index.css`)
- Removido o texto "Sem fallback fictício: este espaço só mostra resultados reais…" que aparecia para todos os usuários
- Carrossel "Jogos da última noite" agora exibe logos dos times (20px, `getTeamLogoUrl`) acima da abreviação
- Vencedor aparece em `var(--nba-text)`, perdedor em `var(--nba-text-muted)`
- Animação CSS `@keyframes nba-marquee` (28s linear infinite) rola o carrossel automaticamente; pausa ao hover
- Conteúdo duplicado (`[...sourceGames, ...sourceGames]`) garante loop contínuo sem salto
- `prefers-reduced-motion: reduce` desabilita a animação

### ANÁLISE — Pills renomeadas + logos em próximos confrontos (`Analysis.tsx`)
- `SOURCE_PILLS`: "Ball Don't Lie" → "Dados NBA", "The Odds API" → "Odds ao vivo", "ESPN News" → "Notícias"
- `NextGamesCard`: confronto em destaque exibe logos 22px + nome abreviado + apelido do time em duas linhas
- Lista de outros jogos exibe logos 18px antes das abreviações
- Novo componente `TeamLogoRow` reutilizável dentro da página

---

## 2026-04-15 - Feature: GamePickDots — histórico visual de palpites de jogos

### Objetivo
Exibir um histórico visual dos últimos 5 palpites de jogo de cada participante diretamente na tabela de ranking (pontos coloridos inline) e uma visão agrupada por série na página Compare.

### Visual

**Ranking (compact):**
```
#1  [avatar] Victor ↑  ● ● ● ○ ●   Ver >
```
Pontos verdes = acerto, vermelhos = erro. Hover revela tooltip `J3 · OKC vs IND · Acertou`.

**Compare (grouped):**
```
OKC × IND   ● ● ● ○ ●  ▼
             J1 — Acertou
             J2 — Acertou
             J3 — Acertou
             J4 — Errou
             J5 — Acertou
```

### Decisões de implementação
- **Query única para todos os participantes**: `useAllGamePickDots` faz 1 query `game_picks JOIN games` e distribui os dados por `participant_id` no cliente. Evita N+1 completamente.
- **Compare reusa dados existentes**: `computeCompareDots()` recebe os `gamePicks` e `games` que Compare já tinha carregado — zero queries adicionais.
- **Compact mostra apenas jogos finalizados**: filtra `status === 'correct' | 'wrong'`, ignora pending/no-pick.
- **Grouped expande ao toque**: label clicável toggling mini-legenda com J1/J2/… e status. Adequado para mobile.
- **Variante controlada por prop `variant`**: `compact` (padrão) | `grouped` — componente único.

---

### Arquivos criados

#### `frontend/src/hooks/useAllGamePickDots.ts` (novo)
- Query: `supabase.from('game_picks').select('participant_id, winner_id, game_id, games(...)')`.
- Mapeia cada linha para `DotData`, resolve `homeAbbr`/`awayAbbr` via `TEAM_MAP` de `teams2025.ts`.
- Ordena os dots de cada participante por `tip_off_at` ascendente.
- Retorna `{ dotsById: Map<string, DotData[]>, loading: boolean }`.

#### `frontend/src/components/GamePickDots.tsx` (novo)
- Tipos exportados: `DotStatus` (`correct | wrong | pending | no-pick`), `DotData`.
- `DOT_COLOR`: correct=`#2ecc71`, wrong=`#e74c3c`, pending=`#3a3a4e`, no-pick=`#2a2a38`.
- `CompactDots`: últimos 5 jogos finalizados, círculo 7px, `title` para tooltip nativo.
- `GroupedDots`: agrupado por `seriesId`, label `HOME × AWAY`, tap expande linhas `J{n} — {label}`.
- `GamePickDots`: wrapper público, `variant='compact'` por padrão.

---

### Arquivos alterados

#### `frontend/src/pages/Ranking.tsx`
- Importado `useAllGamePickDots`.
- Hook chamado no topo do componente: `const { dotsById } = useAllGamePickDots()`.
- Prop `dotsById` passada para `<RankingTable>`.

#### `frontend/src/components/RankingTable.tsx`
- Adicionada prop `dotsById?: Map<string, DotData[]>`.
- Importado `GamePickDots` e tipo `DotData`.
- Renderiza `<GamePickDots dots={dotsById.get(id) ?? []} variant="compact" />` inline após as setas de rank.
- `maxWidth` do span de nome reduzido de 140→120px para acomodar os dots.

#### `frontend/src/pages/Compare.tsx`
- Importados `GamePickDots`, `DotData`, `DotStatus`, `TEAM_MAP`.
- Adicionada função `computeCompareDots(gamePicks, games)` — reusa dados já carregados, sem nova query.
- Seção de dots agrupados inserida após `SummaryCard`, mostrando os dois participantes lado a lado.

#### `frontend/src/components/SeriesModal.tsx`
- Condição do bloco de contexto corrigida: removido `&& !series.is_complete` — contexto agora exibe também em séries já encerradas.

#### `frontend/.env` e `frontend/.env.example`
- Adicionada variável `VITE_BACKEND_URL=https://nba-bolao-backend.onrender.com`.
- Sem essa variável, `useSeriesContext` fazia fallback para `http://localhost:3001` e falhava silenciosamente em produção.

---

## 2026-04-15 - Feature: contexto de temporada regular no SeriesModal

### Objetivo
Ao abrir o modal de palpite de série, exibir dados reais da temporada regular 2024–25 (aproveitamento, recordes casa/fora e confronto direto) para ajudar na decisão.

### Visual no modal
```
OKC  68-14 na temp. | Casa: 38-3 | Fora: 30-11
IND  48-34 na temp. | Casa: 27-14 | Fora: 21-20
Confronto direto: OKC 2 × 1 IND
```

### Decisões de implementação
- **IDs do BDL resolvidos dinamicamente**: em vez de mapa estático (o spec tinha colisão `MEM: 20` e `MIL: 20`), o backend faz fetch do `/v1/standings` e constrói o mapa `abreviação → id` a partir da resposta. Sem IDs hardcoded.
- **Cache duplo**: backend (Map em memória, permanente enquanto o processo viver) + frontend (Map de módulo, persiste entre aberturas do modal na mesma sessão). Dados da temporada regular nunca mudam.
- **Degradação silenciosa**: se BDL estiver fora ou retornar erro, o bloco simplesmente não renderiza. O modal funciona normalmente.
- **Não bloqueia abertura**: o hook dispara o fetch após o modal montar, exibindo skeleton enquanto carrega.

---

### Arquivos criados

#### `backend/src/routes/seriesContext.ts` (novo)
- Instância axios própria com `BALLDONTLIE_API_KEY` e timeout de 10s.
- `GET /api/series-context/:homeId/:awayId` (público, sem auth).
- Fluxo: fetch `/v1/standings?season=N` → extrai `wins/losses/home_record/visitor_record` para cada time → fetch `/v1/games` com `team_ids[]` dos dois times → filtra apenas jogos entre os dois (H2H) → conta vitórias por time.
- Resposta:
  ```json
  {
    "ok": true,
    "home": { "abbreviation": "OKC", "wins": 68, "losses": 14, "homeWins": 38, "homeLosses": 3, "awayWins": 30, "awayLosses": 11 },
    "away": { ... },
    "headToHead": { "homeWins": 2, "awayWins": 1 }
  }
  ```
- Cache por chave `sort([homeId, awayId]).join('-')` — simétrico independente da ordem.

#### `frontend/src/hooks/useSeriesContext.ts` (novo)
- Fetch simples com `fetch()` (sem auth — rota pública).
- Cache de módulo por chave simétrica de times.
- Retorna `{ data: SeriesContextData | null, loading: boolean }`.
- Cancela request em curso se o componente desmontar antes da resposta.

---

### Arquivos alterados

#### `backend/src/index.ts`
- Importado e registrado `seriesContextRouter` em `/api/series-context`.

#### `frontend/src/components/SeriesModal.tsx`
- Importado `useSeriesContext`.
- Hook chamado com `teamA.id` e `teamB.id` (disponíveis após resolução dos times).
- Bloco inserido entre o team picker e o games picker, apenas quando `matchupReady && !series.is_complete`:
  - Loading: 3 linhas skeleton usando a classe `.skeleton` existente.
  - Dados: box compacto com fonte Barlow Condensed, fundo dourado suave, aproveitamento dos dois times e confronto direto separados por linha.
  - Sem dados: nada é renderizado.

---

## 2026-04-15 - Auditoria UX/UI — acessibilidade, performance e qualidade de interação

### Contexto
Auditoria do arquivo `analises/ui/ux.md`. Foram confirmados os problemas reais e implementadas as correções de maior impacto que não exigem refatoração estrutural do design system.

### O que foi confirmado e corrigido

| Problema | Arquivo | Solução |
|---|---|---|
| Modais sem semântica de diálogo acessível | `SeriesModal`, `GamePickModal` | `role="dialog"`, `aria-modal`, `aria-labelledby`, Esc key, focus trap, restore de foco |
| Toast sem anúncio acessível | `Toast` | `role="status"`, `aria-live="polite"`, `aria-atomic="false"` |
| `setInterval` por instância no CountdownTimer | `CountdownTimer` | Hook singleton `useNowTick` com intervalo compartilhado |
| Animações infinitas sem fallback de acessibilidade | `index.css` | `@media (prefers-reduced-motion: reduce)` desabilita animações decorativas |
| Hover imperativo com `onMouseEnter/Leave` no RankingTable | `RankingTable` | CSS class `.ranking-row-interactive` com `filter: brightness(1.12)` no `:hover` |

### O que NÃO foi alterado (e por quê)
- **Refetch total no `useRanking`**: exige reescrita da estratégia de cache/patch incremental — escopo separado.
- **Semântica de `<tr>` clicável**: a última coluna já tem botão "Ver" acessível por teclado, cobrindo o caso crítico sem refatoração de tabela.
- **Design system / inline styles**: migração de inline styles para componentes reutilizáveis é trabalho de longo prazo, não urgente.

---

### Arquivos criados

#### `frontend/src/hooks/useFocusTrap.ts` (novo)
- Hook que recebe `active: boolean` e uma ref tipada.
- Ao ativar: foca o primeiro elemento focalizável dentro do container, instala trap de Tab/Shift+Tab, e ao desmontar restaura o foco ao elemento que estava ativo antes da abertura.
- Usa seletor de elementos focalizáveis (`button`, `[href]`, `input`, `select`, `textarea`, `[tabindex]`) com filtro de `disabled`.

#### `frontend/src/hooks/useNowTick.ts` (novo)
- Singleton: único `setInterval` de 1000ms compartilhado por todos os `CountdownTimer` ativos.
- Ao primeiro subscriber, inicia o intervalo; ao último sair, limpa com `clearInterval`.
- Retorna `now: number` (timestamp em ms), atualizado a cada segundo.

---

### Arquivos alterados

#### `frontend/src/components/SeriesModal.tsx`
- Overlay externo recebe `aria-hidden="true"` (esconde o fundo para leitores de tela).
- Container do diálogo recebe `role="dialog"`, `aria-modal="true"`, `aria-labelledby="series-modal-title"` e `ref={dialogRef}` do `useFocusTrap`.
- `<h2>` recebe `id="series-modal-title"`.
- Botão fechar recebe `aria-label="Fechar"`.
- `useEffect` adiciona listener de `Escape` no `document` enquanto o modal está montado.

#### `frontend/src/components/GamePickModal.tsx`
- Mesmas mudanças de acessibilidade do `SeriesModal`, com `id="game-pick-modal-title"`.

#### `frontend/src/components/Toast.tsx`
- Container recebe `role="status"`, `aria-live="polite"` e `aria-atomic="false"`.
- Com `aria-atomic="false"`, leitores de tela anunciam cada toast individualmente conforme aparece.

#### `frontend/src/components/CountdownTimer.tsx`
- Removido `useState` + `useEffect` com `setInterval` próprio.
- Agora usa `useNowTick()` — o `diff` é calculado como expressão derivada de `now`.
- Resultado: N timers na tela = 1 intervalo, não N.

#### `frontend/src/index.css`
- Adicionado bloco `.ranking-row-interactive` com `filter: brightness(1.12)` no `:hover` e `transition: filter 0.2s ease`.
- Adicionado `@media (prefers-reduced-motion: reduce)` que:
  - Desabilita `animation` em `.title-glow`, `.podium-gold/silver/bronze`, `.skeleton`, `.animate-in-*`.
  - Aplica `transition-duration: 0.01ms`, `animation-duration: 0.01ms`, `animation-iteration-count: 1` globalmente.

#### `frontend/src/components/RankingTable.tsx`
- Removidos `onMouseEnter` e `onMouseLeave` que alteravam `style.filter` imperativamente.
- Linha recebe classe `ranking-row-interactive` (condicionada a `onParticipantClick` existir) para o hover via CSS.
- Removida `transition: filter` do `style` inline (agora fica no CSS).

---

## 2026-04-15 - Auditoria de backend e correções de integridade de pontuação

### Contexto
Auditoria completa da lógica de pontuação, sync e integridade do backend, conforme documento `analises/logica.md`. Foram confirmados os problemas reais e implementadas as correções com melhor custo/benefício para o contexto do projeto (bolão entre amigos, instância única no Render.com).

### O que foi confirmado como bug real

| Problema | Arquivo | Impacto confirmado |
|---|---|---|
| `recalculateAllScores` engolia erros silenciosamente | `backend/src/scoring/engine.ts` | Alto — sync terminava como sucesso mesmo com pontuação desatualizada |
| Duplicidade de picks não deduplida no cálculo | `backend/src/scoring/engine.ts` | Médio — pontuação inflada se houvesse duplicatas no banco |
| Config de scoring duplicada sem mecanismo de validação | `rules.ts` + `scoring.ts` | Médio — risco de divergência silenciosa em mudanças futuras |
| Lock de palpite apenas no frontend | `useSeries.ts`, `useGamePicks.ts` | Baixo/médio — contornável direto na API Supabase |

### O que NÃO foi corrigido (e por quê)
- **Sync sem transação atômica**: instância única no Render, falha no meio é rara e recuperável no próximo ciclo.
- **`isRunning` em memória**: só é problema com múltiplas réplicas; não se aplica ao setup atual.
- **`game_number` race condition**: mesma condição acima.
- **DST no `parseTipOffAt`**: ET = UTC-4 durante playoffs (abr–jun), sem mudança de DST no período crítico.
- **Lock de palpite no banco (RLS)**: ver seção SQL abaixo — requer execução manual no Supabase.

---

### Arquivos alterados

#### `backend/src/scoring/engine.ts`
- **`recalculateAllScores()`**: adicionado `throw error` no bloco `catch`. O erro agora propaga para o `syncNBA.ts` e para rotas admin (`/admin/rescore`), que podem tratá-lo corretamente em vez de reportar sucesso falso.
- **`computeRankingSnapshot()`**: adicionada deduplicação defensiva de picks antes do cálculo. Se houver múltiplas linhas de `series_picks` ou `game_picks` para o mesmo `participant_id + series_id/game_id` (violação de unicidade não enforçada no banco), apenas a primeira ocorrência é considerada. Previne pontuação inflada.

#### `backend/src/index.ts`
- Adicionado endpoint público `GET /scoring-rules` (sem autenticação). Retorna o objeto `SCORING` de `backend/src/scoring/rules.ts`. Usado para validar sincronia entre backend e frontend quando as regras forem alteradas.

#### `backend/src/scoring/rules.ts`
- Comentário atualizado: deixa claro que este é o source of truth e que mudanças devem ser propagadas ao frontend. Aponta para o endpoint `/scoring-rules`.

#### `frontend/src/utils/scoring.ts`
- Comentário atualizado: instrui o desenvolvedor a usar `GET /scoring-rules` para validar sincronia antes de alterar os valores.

---

### SQL para rodar no Supabase (não foi executado automaticamente)

Os scripts abaixo resolvem os problemas P1 restantes. Devem ser rodados no SQL Editor do Supabase em produção após validação em staging.

#### 1. Unique constraints (previne duplicidade de picks no banco)

```sql
-- Garante que cada participante só tenha um palpite por série
ALTER TABLE series_picks
  ADD CONSTRAINT series_picks_participant_series_unique
  UNIQUE (participant_id, series_id);

-- Garante que cada participante só tenha um palpite por jogo
ALTER TABLE game_picks
  ADD CONSTRAINT game_picks_participant_game_unique
  UNIQUE (participant_id, game_id);
```

> Se já existirem duplicatas no banco, o ALTER TABLE vai falhar. Antes de rodar, execute:
> ```sql
> -- Verificar duplicatas em series_picks
> SELECT participant_id, series_id, COUNT(*) FROM series_picks
> GROUP BY participant_id, series_id HAVING COUNT(*) > 1;
>
> -- Verificar duplicatas em game_picks
> SELECT participant_id, game_id, COUNT(*) FROM game_picks
> GROUP BY participant_id, game_id HAVING COUNT(*) > 1;
> ```

#### 2. RLS Policy para bloquear palpite de jogo após tip_off_at (enforcement no banco)

```sql
-- Remove policy de INSERT existente se houver, recria com check de tip_off_at
CREATE POLICY "game_picks_block_after_tipoff"
ON game_picks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
      AND g.played = false
      AND (g.tip_off_at IS NULL OR g.tip_off_at > now())
  )
);

-- Idem para UPDATE (impede alteração após início)
CREATE POLICY "game_picks_block_update_after_tipoff"
ON game_picks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = game_id
      AND g.played = false
      AND (g.tip_off_at IS NULL OR g.tip_off_at > now())
  )
);
```

#### 3. RLS Policy para bloquear palpite de série após tip_off do primeiro jogo

```sql
-- Bloqueia INSERT em series_picks se o primeiro jogo da série já iniciou
CREATE POLICY "series_picks_block_after_tipoff"
ON series_picks
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM games g
    WHERE g.series_id = series_id
      AND g.tip_off_at IS NOT NULL
      AND g.tip_off_at <= now()
  )
);

CREATE POLICY "series_picks_block_update_after_tipoff"
ON series_picks
FOR UPDATE
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM games g
    WHERE g.series_id = series_id
      AND g.tip_off_at IS NOT NULL
      AND g.tip_off_at <= now()
  )
);
```

> **Nota**: Testar estas policies em staging antes de aplicar em produção. Caso o Supabase já tenha policies conflitantes, rodar `DROP POLICY IF EXISTS` com o nome antigo primeiro.

---

## 2026-04-15 - Fase 3: onboarding tour com driver.js (Codex)

### Objetivo
- Implementar tour guiado no primeiro acesso autorizado.
- Permitir relançar o tour manualmente pelo menu do avatar.

### Arquivos alterados
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/hooks/useOnboarding.ts`
- `frontend/src/components/OnboardingTour.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/index.css`

### Mudanças feitas

#### Dependência
- Adicionado `driver.js` ao frontend (`npm install driver.js`).

#### `useOnboarding.ts` (novo)
- Hook com persistência via `localStorage` (`nba_bolao_onboarding_done`).
- Exposição de `show`, `complete` e `skip`.
- Adicionado evento global `nba-bolao:restart-onboarding` e helper `restartOnboardingTour()` para reabrir o tour sem backend.

#### `OnboardingTour.tsx` (novo)
- Implementação do tour com `driver.js` e 5 etapas:
  1. boas-vindas,
  2. destaque do acesso ao bracket,
  3. explicação do SeriesModal,
  4. guia de pontuação/cravada,
  5. atalho para ranking.
- Configurado overlay escuro, textos em PT-BR e fechamento marcando onboarding como concluído.

#### `Home.tsx`
- Integração do hook `useOnboarding` com render do `OnboardingTour` após carregamento de dados principais.
- Adicionado alvo estável para o tour no acesso do bracket (`#bracket-highlight`).
- Adicionado alvo estável para o tour no guia de pontuação/ranking (`#scoring-guide-highlight`).
- Expandido bloco de “Acessos Rápidos” para incluir cartão dedicado ao bracket.

#### `Nav.tsx`
- Adicionado botão `Ver tour novamente` no menu do avatar.
- Botão dispara `restartOnboardingTour()` e fecha o menu.
- Adicionado id `#ranking-nav` na aba Ranking da navegação para uso no tour.

#### `index.css`
- Estilização da popover do driver (`.nba-tour-popover`) alinhada ao design system (`--nba-*`), incluindo título, descrição, progresso e botões.

### Validação
- `ReadLints` sem erros nos arquivos alterados.
- `npm run build` do frontend executado com sucesso.

## 2026-04-15 - Fase 2: feedback visual no ranking e score report (Codex)

### Objetivo
- Dar feedback visual imediato quando pontuação/posição muda com updates do Realtime.
- Adicionar micro-animação para séries recém-resolvidas no relatório individual.

### Arquivos alterados
- `frontend/src/index.css`
- `frontend/src/components/RankingTable.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/components/ParticipantScoreReport.tsx`

### Mudanças feitas

#### `index.css`
- Criadas animações utilitárias:
  - `flashSuccess` / `.flash-success` (ganho de pontos/subida),
  - `flashDanger` / `.flash-danger` (queda de posição),
  - `rankingReorder` / `.ranking-reorder` (reordenação da tabela),
  - `resolvedPulse` / `.series-resolved` (série resolvida),
  - `cravadaBurst` / `.series-cravada-burst` (destaque de cravada).

#### `RankingTable.tsx`
- Adicionado controle de estado anterior por participante (`useRef`) para comparar `total_points` e `rank`.
- Aplicação automática de flash por linha por ~800ms:
  - verde (`flash-success`) quando os pontos sobem ou a posição melhora;
  - vermelho (`flash-danger`) quando a posição piora.

#### `Ranking.tsx`
- Detecta mudança de ordem da tabela via assinatura do array de participantes.
- Quando ordem muda, aplica animação curta (`ranking-reorder`) no card da classificação.

#### `ParticipantScoreReport.tsx`
- Detecta transição de série `pending -> resolvida`.
- Séries resolvidas recebem micro-feedback (`series-resolved`).
- Quando a resolução é `cravada`, usa destaque específico (`series-cravada-burst`) por ~800ms.

### Validação
- `ReadLints` executado nos arquivos alterados sem erros.

## 2026-04-15 - Fase 1: Skeleton loading em Home/Ranking/Bracket (Codex)

### Objetivo
- Substituir estados de carregamento com tela vazia/spinner isolado por skeleton shimmer coerente com o layout real.
- Melhorar percepção de performance sem alterar regras de negócio.

### Arquivos alterados
- `frontend/src/components/SkeletonCard.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/OfficialBracket.tsx`

### Mudanças feitas

#### `SkeletonCard.tsx` (novo)
- Criado componente base reutilizável de skeleton com props de `width`, `height`, `radius`, `style` e `className`.

#### `index.css`
- Adicionados `@keyframes shimmer` e classe global `.skeleton` usando `--nba-surface` e `--nba-surface-2`.

#### `Home.tsx`
- `LastNightRecap` agora recebe `loading` e renderiza skeleton cards horizontais durante carregamento.
- `RankingCard` trocou spinner por skeleton de linhas simulando os itens do top ranking.
- `StatsGrid` ganhou estado skeleton para os valores numéricos dos cards.
- Integração do loading existente de `useSeries` e `useRanking` para controlar skeletons.

#### `Ranking.tsx`
- Criado `TopThreeCardsSkeleton` para simular cards do pódio.
- Estado `loading` passou a renderizar estrutura completa da página (sidebar de pontuação, card do gráfico e tabela) com skeletons no formato real.
- Mantido loader discreto no rodapé para reforçar feedback sem perder layout.

#### `BracketSVG.tsx`
- Adicionada prop opcional `loading`.
- Implementado `BracketSkeleton` com duas variações:
  - mobile: blocos por rodada;
  - desktop: cabeçalhos e slots do bracket em formato shimmer.

#### `BracketEditor.tsx` e `OfficialBracket.tsx`
- Durante `loading`, substituído spinner central por render do `BracketSVG` em modo skeleton.

### Validação
- `ReadLints` executado nos arquivos alterados sem erros.

## 2026-04-14 - OfficialBracketCard redesenhado com lista por rodada (Claude Code)

### Objetivo
- Eliminar os "spotlight boxes" que exibiam `— vs —` quando os times das finais ainda não estavam definidos.
- Substituir por lista agrupada por rodada, limpa e sem caixas incompletas.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### `Home.tsx` — `OfficialBracketCard`
- Removidos os 2 spotlight boxes fixos (filtravam apenas `round >= 3` e exibiam "Confronto em andamento" com times `—`).
- Adicionadas constantes `ROUND_FULL_LABEL` e `ROUND_COLOR` para labels e cores por rodada.
- Novo layout: séries agrupadas por rodada (Finals → CF → R2 → R1), mostrando **apenas rodadas que têm pelo menos uma série com times definidos** (`home_team_id != null`).
- Cada série exibe uma linha compacta: `HOME abbr · score · AWAY abbr`, onde:
  - Série concluída: placar `4 – X` com vencedor em cor do time e perdedor com `opacity: 0.5`; ícone `✓` verde
  - Série em andamento com jogos: mostra `Xj` (número de jogos disputados)
  - Série não iniciada: mostra `vs`
- Separador de rodada com linha decorativa e label colorido por rodada.
- Chips de estatística (Concluídas / Em aberto / Campeão) mantidos, com ajuste: "Concluídas" agora mostra `X/15` para dar contexto de progresso; campeão usa a cor primária do time quando definido.
- Corrigido bug do label duplicado "Finals Finals" — a lógica de label agora usa `ROUND_FULL_LABEL` por round, sem concatenar `conference`.

---

## 2026-04-14 - Tradução automática das notícias ESPN para português (Claude Code)

### Objetivo
- Traduzir automaticamente `title` e `summary` de cada notícia da ESPN de inglês para português antes de enviá-las ao frontend.

### Arquivos alterados
- `backend/src/lib/news.ts`

### Mudanças feitas

#### `backend/src/lib/news.ts`
- Adicionada função `translateText(text)`: chama a **MyMemory API** (`api.mymemory.translated.net`) com `langpair=en|pt-BR`, timeout de 6s. Retorna o texto original silenciosamente em caso de erro (rede, rate limit, resposta inválida).
- Adicionada função `translateNewsItem(item)`: traduz `title` e `summary` em paralelo via `Promise.all`, retorna o item com os campos substituídos.
- Em `fetchNBANews`: após o parse do RSS, os 12 itens são traduzidos em paralelo com `Promise.all(rawNews.map(translateNewsItem))` antes de serem retornados.

### Comportamento em caso de falha
- Se a MyMemory API estiver indisponível, lenta ou tiver atingido o limite diário, cada item retorna com o texto original em inglês — o app continua funcionando normalmente sem nenhum erro visível ao usuário.

### Limites da API gratuita
- MyMemory free tier: **5.000 chars/dia** por IP (anônimo).
- Estimativa por chamada: 12 itens × ~250 chars médios = ~3.000 chars — dentro do limite para uso normal do bolão.

---

## 2026-04-14 - Polimento visual II: cravada, hero, gráfico, ScoringGuide (Claude Code)

### Objetivo
- Segunda passagem de refinamento visual sem alterações de lógica ou arquitetura.
- Foco em hierarquia visual, feedback de interação e limpeza de elementos repetitivos.

### Arquivos alterados
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/components/RankingChart.tsx`

### Mudanças feitas

#### `ParticipantScoreReport.tsx` — destaque visual da cravada
- Item de série com `status === 'cravada'` agora tem: border dourada 1.5px (`rgba(255,209,102,0.38)`), gradiente de fundo amarelo-dourado tênue, badge maior (`padding: 4px 10px`, `font-size: 0.76rem`) com borda sutil, e pontuação em `font-size: 1rem` (vs 0.78 padrão).
- Cor da cravada ajustada de `var(--nba-gold)` para `#ffd166` (dourado mais claro e vibrante).

#### `Ranking.tsx` — TopThreeCards + ScoringGuide
- `TopThreeCards`: cada card tem agora `minHeight: 180` e `display: flex; flexDirection: column` para altura uniforme nos 3 cards do pódio.
- `ScoringGuide`: tabela de pontuação convertida de blocos textuais para grid visual com cabeçalhos Jogo / Série / Cravada. Coluna Cravada tem fundo `rgba(255,209,102,0.09)` e cor `#ffd166` para diferenciação imediata.

#### `SeriesModal.tsx` — feedback inline
- Quando a série está aberta para palpite mas o usuário ainda não selecionou vencedor ou número de jogos, aparece uma dica inline discreta acima do botão explicando o que falta ("Falta escolher quem vai vencer.", etc.).

#### `Home.tsx` — HeroPanel
- CTA block (ação principal) refatorado: botão "Ir agora" agora é full-width com layout `display: flex; justify-content: center`, separado do label por `borderTop`. Mais clicável no mobile.
- Stat chips (Minha posição / Meus pontos / Dist. do líder): `borderRadius: 10 → 12`, label em `Barlow Condensed uppercase` com `letter-spacing`, refatorado para map para reduzir repetição.

#### `RankingChart.tsx` — hierarquia de linhas
- Linha do líder: `strokeWidth: 3 → 3.5`, `dot.r: 3`, `activeDot.r: 5`, `fontWeight: 800` no label.
- Demais linhas: `strokeWidth: 2 → 1.5`, `opacity: 0.62`, `dot.r` reduzido.
- `CustomLegend`: marcador de linha (retângulo `10×3.5` vs `7×2.5`), líder em `var(--nba-text) fontWeight 700`, demais em `opacity: 0.72`.

---

## 2026-04-14 - Polimento visual global: CSS, SeriesModal, RankingTable, Nav (Claude Code)

### Objetivo
- Refinar UI/UX em pontos específicos sem alterar lógica de negócio.
- Melhorar consistência visual entre componentes.

### Arquivos alterados
- `frontend/src/index.css`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/components/RankingTable.tsx`
- `frontend/src/components/Nav.tsx`

### Mudanças feitas

#### `index.css` — melhorias globais
- Adicionado `scroll-behavior: smooth` no `html`.
- `.btn-primary`: radius 6→8px, fonte `Barlow Condensed` com `letter-spacing`, `transform: translateY(-1px)` no hover, `:active` zera o transform, `focus-visible` com outline dourado.
- Novo `.btn-ghost`: botão fantasma com borda dourada sutil, hover com cor e background leves, `focus-visible`.
- Adicionada classe `.font-condensed` no CSS global (era usada extensivamente nos JSX mas não estava definida em CSS — agora declarada explicitamente para consistência).

#### `SeriesModal.tsx` — games picker e team picker refinados
- **Games picker (4/5/6/7)**: botões agora têm altura uniforme com `flexDirection: column`; opções extremas ("Sweep" sob 4 e "Máximo" sob 7) ganham hint label em tamanho pequeno; estado selecionado usa `border: 2px solid var(--nba-gold)` em vez de apenas classe Tailwind; bordas e backgrounds com transição suave.
- **Team picker**: buttons agora com `padding: 14px 8px` (mais altura para área de toque); adicionada barra colorida de 3px no topo do botão com a cor secundária do time (`opacity: 0.35` padrão, `1` quando selecionado); background levemente tintado pela cor do time quando selecionado; abreviação com `font-size: 1.5rem`.

#### `RankingTable.tsx` — cursor e último row
- `cursor: default` → `cursor: onParticipantClick ? 'pointer' : 'default'` — agora o cursor muda corretamente quando a linha é clicável.
- Último row da tabela não exibe `border-bottom` (antes havia uma linha órfã na última linha do componente).

#### `Nav.tsx` — botão de menu unificado
- O avatar e o ícone hamburger antes eram dois elementos separados dentro de um único botão, com estilos conflitantes (borda left aplicada ao wrapper e borda nos dois elementos). Reescrito como um único botão compacto com avatar + Menu ícone, sem o span intermediário extra. Estado aberto tem background e borda dourada suaves para feedback visual. Avatar ganha borda dourada quando menu está aberto.

### Validações
- `frontend`: `npm run build` — ✓ built in 2.65s, zero erros.

---

## 2026-04-14 - Fundo do login com quadra de basquete em vez de campo (Codex)

### Objetivo
- Fazer o fundo da tela de login comunicar basquete com mais clareza
- Remover a leitura ambígua de “campo de futebol” nas linhas de fundo

### Arquivos alterados
- `frontend/src/pages/Login.tsx`

### Mudanças feitas
- O SVG de fundo da página de login foi redesenhado para parecer uma quadra de basquete completa.
- As linhas passaram a destacar elementos típicos do esporte:
  - linha de meio da quadra
  - círculo central
  - garrafões
  - área restrita
  - tabela e aro
  - linhas laterais do perímetro
  - arco de três pontos
- A composição foi mantida em clima escuro e premium, sem mudar a identidade geral da tela.

### Resultado prático
- A primeira impressão do login ficou mais coerente com o tema do app.
- O fundo agora lê imediatamente como basquete, sem confusão visual com futebol.

### Validações
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Loading com bola girando em vez de quicando (Codex)

### Objetivo
- Trocar a animação do loader para uma leitura mais simples e contínua
- Remover o movimento de quique e substituir por rotação da bola

### Arquivos alterados
- `frontend/src/index.css`

### Mudanças feitas
- A animação `loading-basketball-bounce` foi substituída por `loading-basketball-spin`.
- O ícone da bola passou a girar continuamente em torno do próprio centro.
- O `transform-origin` foi alterado de `center bottom` para `center center`.
- A sombra abaixo da bola foi suavizada para acompanhar a nova proposta visual, sem simular impacto no chão.
- O tempo da animação foi ajustado para `1.15s` para deixar a rotação fluida e limpa.

### Resultado prático
- O loading ficou com uma estética mais estável e menos “saltitante”.
- A leitura visual passa a ser de bola girando, não de bola quicando.

### Validações
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Reset administrativo de palpites pré-largada com backup automático (Codex)

### Objetivo
- Evitar que palpites de teste contaminem o bolão oficial antes da abertura
- Dar ao admin uma forma segura e auditável de limpar palpites antigos
- Garantir backup prévio e confirmação forte antes de qualquer limpeza destrutiva

### Arquivos alterados
- `backend/src/routes/admin.ts` — nova rota `POST /admin/reset-picks` com confirmação obrigatória, backup automático e limpeza das tabelas de palpites
- `frontend/src/pages/Admin.tsx` — novo botão `Zerar palpites pré-largada`, confirmação forte via prompt e modal com resumo da limpeza

### Mudanças feitas
- Criada a rota administrativa `POST /admin/reset-picks`.
- A rota exige a frase exata `ZERAR PALPITES` para executar a operação.
- Antes de apagar qualquer dado, o sistema gera um backup operacional completo.
- A limpeza remove registros de:
  - `series_picks`
  - `game_picks`
  - `simulation_series_picks`
  - `simulation_game_picks`
- Após a exclusão, o backend roda `recalculateAllScores()` para deixar o estado consistente.
- No painel admin, entrou um botão dedicado para reset pré-largada com visual de ação sensível.
- Após a limpeza, o frontend abre um modal mostrando quantos registros foram removidos em cada categoria.
- O fluxo também reaproveita o modal de backup para expor onde o snapshot preventivo foi salvo.

### Resultado prático
- O admin consegue “zerar a largada” do bolão com transparência e rastreabilidade.
- Palpites antigos de teste deixam de aparecer em relatórios diários e resumos do grupo.
- O processo fica mais profissional: backup antes, confirmação explícita e evidência visual do que foi apagado.

### Validações
- `backend`: `npm run build` — ✓
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Modal do backup operacional com caminhos reais dos arquivos (Codex)

### Objetivo
- Deixar claro para o admin onde o backup operacional foi salvo
- Eliminar a ambiguidade de “cliquei no botão e não apareceu arquivo no navegador”
- Expor a pasta e os arquivos gerados de forma legível na própria interface

### Arquivos alterados
- `frontend/src/pages/Admin.tsx`

### Mudanças feitas
- O fluxo de `Gerar backup operacional` passou a guardar a resposta completa da rota admin.
- Após a geração, o painel abre um modal dedicado ao backup.
- O modal mostra:
  - a pasta de saída (`outputDir`)
  - o CSV de palpites de séries
  - o CSV de palpites jogo a jogo
  - o CSV do ranking congelado
  - o resumo `.md` da rodada
- Também foi adicionado texto explicando que o backup é salvo no disco do backend, e não baixado automaticamente pelo navegador.

### Resultado prático
- O admin sabe exatamente onde procurar o backup gerado.
- Fica mais fácil diferenciar um arquivo real do sistema de qualquer arquivo estranho aberto por engano no desktop.

### Validações
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Modal com mensagem completa e botão de copiar para WhatsApp (Codex)

### Objetivo
- Facilitar o uso diário do resumo do grupo sem depender de abrir arquivos manualmente
- Dar ao admin acesso imediato ao texto pronto após a geração do digest

### Arquivos alterados
- `backend/src/digest/exportDailyPicksDigest.ts` — retorno passou a incluir `whatsappText`
- `frontend/src/pages/Admin.tsx` — modal de visualização do resumo e botão `Copiar mensagem`

### Mudanças feitas
- O exportador diário passou a retornar o texto completo do WhatsApp além dos caminhos dos arquivos.
- O botão `Gerar resumo do grupo` no admin agora abre um modal após a geração.
- O modal mostra:
  - data-alvo do resumo
  - pasta onde os arquivos foram salvos
  - caminho do `.txt`
  - mensagem completa pronta para copiar
- Adicionado botão `Copiar mensagem` usando `navigator.clipboard`.
- Em caso de sucesso, o admin recebe feedback visual por toast.

### Resultado prático
- O resumo diário pode ser gerado, conferido e copiado em um único fluxo.
- O admin não precisa mais abrir a pasta de backup só para pegar o texto do grupo.

### Validações
- `backend`: `npm run build` — ✓
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Automação diária de resumo dos palpites para o grupo (Codex)

### Objetivo
- Automatizar a extração diária dos palpites dos participantes
- Gerar um texto bonito e pronto para compartilhamento no grupo do WhatsApp
- Permitir tanto agendamento automático quanto disparo manual pelo admin

### Arquivos alterados
- `backend/src/digest/exportDailyPicksDigest.ts` — novo exportador diário
- `backend/src/scheduler/dailyDigestScheduler.ts` — novo scheduler com cron configurável
- `backend/src/scripts/exportDailyPicksDigest.ts` — script manual de geração
- `backend/src/routes/admin.ts` — nova rota `POST /admin/daily-digest`
- `backend/src/index.ts` — scheduler diário ligado ao boot do servidor
- `backend/package.json` — novo script `digest:daily`
- `frontend/src/pages/Admin.tsx` — botão `Gerar resumo do grupo`

### Mudanças feitas
- Criado exportador diário que lê:
  - participantes
  - teams
  - séries
  - palpites de séries
  - jogos
  - palpites de jogos
- O resumo gerado separa:
  - `Palpites jogo a jogo do dia`
  - `Palpites de séries em aberto`
- Os arquivos são salvos em `backups/daily-digests/...` com `.txt`, `.md` e `.json`.
- Adicionado scheduler diário configurável por:
  - `DAILY_DIGEST_CRON`
  - `DAILY_DIGEST_TIMEZONE`
- O health do backend passou a incluir o snapshot do scheduler diário.
- Adicionado endpoint manual `POST /admin/daily-digest`.
- No admin, entrou o botão para disparar a geração sob demanda.

### Resultado prático
- O sistema já consegue produzir automaticamente a mensagem-base do grupo.
- O admin também pode regenerar o resumo manualmente quando quiser revisar ou reenviar.
- O app passa a ter uma camada operacional mais madura para comunicação diária do bolão.

### Validações
- `backend`: `npm run build` — ✓
- `frontend`: `npm run build` — ✓

---

## 2026-04-14 - Cores por time: primary na letra, secondary na borda (Claude Code)

---

## 2026-04-14 - Secondary color como faixa vertical nos cards de time (Claude Code)

### Objetivo
- Tornar a secondary color visível e impactante como faixa lateral (left/right border strip) em todos os contextos onde times aparecem

### Arquivos alterados
- `frontend/src/utils/teamColors.ts` — simplificado: `teamAbbrStyle` retorna só `color: primary_color`; `teamAbbrSVGProps` retorna só `fill: primary_color`; removido todo código de stroke/WebkitTextStroke
- `frontend/src/components/BracketSVG.tsx`:
  - Mobile: `borderLeft: 3px solid secA` no div do time A; `borderRight: 3px solid secB` no div do time B; barra de acento removida
  - SVG desktop: dois `<rect>` de 3×(rowH) px na borda esquerda de cada row do box, um por time, na secondary_color respectiva; texto x ajustado de 10→12 para acomodar strip
- `frontend/src/components/SeriesModal.tsx` — botão de cada time recebe `borderLeft: 4px solid secondary_color` via inline style (sobrescreve Tailwind no lado esquerdo)
- `frontend/src/pages/Games.tsx` — TeamPickButton recebe `borderLeft` (side=left) ou `borderRight` (side=right) de 4px na secondary_color do time

---

## 2026-04-14 - Highlight de seleção jogo a jogo reforçado (Claude Code)

### Objetivo
- Tornar visível qual time foi selecionado no palpite jogo a jogo (estava muito fraco)

### Arquivos alterados
- `frontend/src/pages/Games.tsx` (TeamPickButton):
  - `teamTint`: opacidade `22` → `50` (~13% → ~31%)
  - `teamOutline`: opacidade `88` → `cc` (~53% → ~80%)
  - `resultBg` quando selecionado: gradiente com `primary38` no topo em vez de `teamTint` diluído
  - `boxShadow`: substituído por `inset 0 0 18px primary28` + anel externo `0 0 0 2px teamOutline`
  - `textShadow`: de `teamTint` para `primaryaa` (~67% opacidade)

---

## 2026-04-14 - Cores por time: primary na letra, secondary adicionada (Claude Code)

### Objetivo
- Usar `primary_color` do time diretamente como cor da letra (sem auto-clareamento)
- Adicionar `secondary_color` para cada time
- Merge dos dados locais com dados do Supabase para garantir que `secondary_color` chegue aos componentes

### Arquivos alterados
- `frontend/src/types/index.ts` — adicionado campo `secondary_color: string` em `Team`
- `frontend/src/data/teams2025.ts` — adicionado `secondary_color` para todos os 16 times; `primary_color` revisado com cores curadas e legíveis (ver tabela no entry anterior)
- `frontend/src/hooks/useSeries.ts` — import de `TEAM_MAP`; teamMap montado com `{ ...dbTeam, ...TEAM_MAP[id] }` para enriquecer dados do Supabase com cores locais
- `frontend/src/pages/Games.tsx` — mesmo merge de TEAM_MAP no fetch de times; `getTeamTextColor` removido e substituído por `primary_color` direto em todos os pontos; import de `TEAM_MAP` e `teamAbbrStyle`

---

## 2026-04-13 - Contraste de cores de times no Bracket e Jogos (Claude Code)

### Cores secundárias adicionadas (referência)
| Time | Primary (letra) | Secondary (borda) |
|------|----------------|-------------------|
| OKC  | #007AC1        | #EF3B24 (laranja) |
| HOU  | #CE1141        | #000000 (preto)   |
| GSW  | #FFC72C        | #1D428A (azul)    |
| DEN  | #236AB9        | #FEC524 (dourado) |
| LAC  | #C8102E        | #1D428A (azul)    |
| LAL  | #FDB927        | #552583 (roxo)    |
| MIN  | #236192        | #78BE20 (verde)   |
| MEM  | #5D76A9        | #F5B112 (dourado) |
| CLE  | #FDBB30        | #860038 (vinho)   |
| BOS  | #007A33        | #BA9653 (dourado) |
| NYK  | #F58426        | #006BB6 (azul)    |
| IND  | #FDBB30        | #002D62 (navy)    |
| MIL  | #00B04F        | #EEE1C6 (creme)   |
| DET  | #C8102E        | #1D42BA (azul)    |
| MIA  | #F9A01B        | #98002E (vermelho)|
| ORL  | #0077C0        | #000000 (preto)   |

---

## 2026-04-13 - Contraste de cores de times no Bracket e Jogos (Claude Code)

### Objetivo
- Corrigir cores de times com contraste insuficiente contra o fundo escuro (#13131a), especialmente MIN/DEN (cores quase idênticas e invisíveis) e demais times com navy/verde escuro.

### Arquivos alterados
- `frontend/src/data/teams2025.ts`
- `frontend/src/utils/teamColors.ts` (novo)
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### `teams2025.ts` — cores substituídas para times com primárias problemáticas
- `MIN #0C2340` (navy quase-preto) → `#78BE20` (verde lima icônico dos Timberwolves)
- `DEN #0E2240` (navy quase-preto, idêntico ao MIN) → `#FFC627` (dourado dos Nuggets)
- `IND #002D62` (navy escuro) → `#FDBB30` (dourado dos Pacers)
- `MIL #00471B` (verde escuro) → `#00B04F` (verde mais vibrante, ainda identifica os Bucks)
- Essas cores são usadas tanto para texto quanto para barras de acento e gradientes nos cards — a troca melhora a identidade visual em todos os contextos.

#### `utils/teamColors.ts` — utilitário novo
- Função `getTeamTextColor(primaryColor)`: calcula luminosidade percebida (ITU-R BT.601) e, se abaixo de 112, mistura linearmente a cor com branco para atingir legibilidade mínima.
- Cores já legíveis são retornadas sem modificação.
- Cores muito escuras (brightness < ~60) recebem maior boost via fator 1.35x.
- Documentado: usar apenas em contextos de texto — backgrounds/borders com opacidade não precisam da função.

#### `BracketSVG.tsx` — texto dos times usa `getTeamTextColor`
- SVG desktop: `fill` das abreviações substituído (`tA?.primary_color` → `getTeamTextColor(tA?.primary_color)`) em ambas as linhas de texto (team A e B).
- Mobile card (`MobileSeriesCard`): `color` das abreviações substituído em ambos os lados.
- Barras de acento e gradientes de background mantêm `primary_color` direto (sem `getTeamTextColor`).

#### `Games.tsx` — texto dos times usa `getTeamTextColor`
- Linha de votação (home/away vote count): `color: game.team_a/b?.primary_color` → `getTeamTextColor(...)`.
- Pick badge (abreviação do time escolhido): texto usa `getTeamTextColor`.
- Componente de seleção de time: `color: selectedTeam?.primary_color` → `getTeamTextColor(...)` em dois lugares.
- Card de histórico ("Seu pick"): `color: team?.primary_color` → `getTeamTextColor(...)`.
- `teamTint` (background tint) mantém `primary_color` original para preservar a identidade visual com opacidade.

### Resultado prático
- MIN e DEN agora têm cores totalmente distintas (verde lima vs dourado) — não se confundem mais.
- IND e MIL passam de invisível para dourado/verde vivo.
- Times como GSW, LAL, BOS, CLE, HOU recebem boost automático da função sem precisar alterar teams2025.ts.
- Backgrounds e bordas coloridas mantêm a cor original com opacidade — não foram afetados.

### Validações
- `frontend`: `npm run build` — ✓ built in 2.65s, zero erros.

---

## 2026-04-13 - Melhorias visuais na página Bracket (desktop + mobile) (Claude Code)

### Objetivo
- Melhorar a experiência visual do bracket tanto no desktop (SVG muito pequeno, fixo em pixel) quanto no mobile (cards sem identidade visual dos times, layout single-column sem hierarquia).

### Arquivos alterados
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/pages/BracketEditor.tsx`

### Mudanças feitas

#### Desktop — SVG responsivo
- SVG alterado de `width: VB_W` (px fixo ~1332px) para `width: '100%', minWidth: VB_W`.
- O SVG agora preenche a largura disponível do container; o `viewBox` cuida do escalonamento proporcional das caixas e fontes.
- Em monitores grandes (1440px+) o bracket cresce proporcional ao espaço — sem scroll horizontal na maioria dos casos.
- Em viewports menores que 1332px o `minWidth` mantém a legibilidade com scroll horizontal.
- Removido `display: flex; justifyContent: 'safe center'` do container (causava dependência circular de largura).

#### Mobile — identidade visual das equipes nos cards (`MobileSeriesCard`)
- Adicionada barra de cor topo (3px) dividida ao meio pelas cores primárias dos dois times (`linear-gradient` 50%/50%).
- Background do card alterado de `var(--nba-surface)` sólido para gradiente lateral sutil usando as cores primárias de cada time (`${colorA}12` em cada extremidade).
- `borderRadius` dos cards aumentado de 8px para 10px.
- `minHeight` da linha de times aumentado de 80 para 82px.

#### Mobile — layout em grade para R1/R2 (`MobileBracketView`)
- Em `sm+` (≥640px), rodadas 1 e 2 exibem os cards em `grid-cols-2` (2 colunas).
- Finais de conferência e NBA Finals continuam em coluna única (mais destaque).
- Adicionada constante `ROUND_COLOR` com cor diferente por rodada (azul R1, roxo R2, laranja CF, dourado Finals).
- Headers de rodada aprimorados: badge circular colorido com número da rodada (`R1`/`R2`/`CF`/`★`), cor ajustada por fase, contagem de séries à direita (`X série(s)`).

#### Mobile — limpeza do `BracketEditor`
- Removido bloco de duas tiles de dica ("Dica: Toque numa série..." / "Leitura: Use a legenda...") — informação redundante com os próprios cards.
- Removido pill hint "Arraste lateralmente para ver toda a chave" — texto incorreto no mobile (que não usa SVG scrollável, mas sim cards).
- Removido fade-gradient de borda direita (só fazia sentido no contexto do SVG scrollável).

### Resultado prático
- Desktop: bracket preenche o ecrã e é imediatamente legível sem scroll em monitores comuns.
- Mobile: cada card é visualmente identificável pelo time pelo gradiente e barra colorida; layout 2-col em telas maiores reduz scroll; hierarquia entre fases mais clara.

#### Ajuste de padding do wrapper SVG
- Wrapper do SVG alterado de `px-2` para `px-2 md:px-6 lg:px-10` para adicionar respiro nas laterais em desktop e evitar que o bracket encoste nas bordas do monitor.

### Validações
- `frontend`: `npm run build` — ✓ built in 2.61s, zero erros.

---

## 2026-04-13 - Melhorias e correções completas na aba Análise (Claude Code)

### Objetivo
- Corrigir bugs visuais e de dados na aba Análise, melhorar hierarquia de informação e aproveitar melhor as três APIs integradas (balldontlie, The Odds API, SportsDataIO).

### Arquivos alterados
- `frontend/src/pages/Analysis.tsx`

### Mudanças feitas

#### Novo hero (`AnalysisHero`)
- Substituiu o hero anterior por um bloco com gradiente diagonal azul→dourado→escuro.
- Exibe 4 chips de status: Próximos jogos (contagem), Resultados (contagem), Odds (Pronto/Indisponível), Lesões (Pronto/Indisponível).
- Footer com pills coloridos das 3 fontes de dados + contador `X/3 frentes ativas` + data/hora da última atualização.
- Corrigido bug que mostrava `/4` — agora mostra corretamente `/3`.
- Componentes auxiliares extraídos: `AnalysisHeroFooter`, constante `SOURCE_PILLS`.

#### `AnalysisContextCard` removido
- Componente removido por redundância com o novo hero.
- Removida da renderização no return principal.

#### `NextGamesCard` — jogo em destaque sem duplicata
- Lista agora usa `sourceGames.slice(1)` para evitar repetir o primeiro jogo já exibido no card de destaque.

#### `RecentResultsCard` — vencedor destacado em cor
- `sourceGames` agora inclui `homeWon`, `awayWon`, `homeColor`, `awayColor`, `gameNumber`.
- Time vencedor exibido em negrito na cor do time; time perdedor em muted.
- Badge `J1`, `J2` etc. adicionado ao lado do badge de rodada.

#### `OddsCard` — fallback + correções
- Adicionado prop `unfiltered?: boolean`; quando verdadeiro exibe banner de aviso amarelo.
- Corrigido typo `"Preco"` → `"Preço"` na coluna da tabela.
- Time favorito (menor odd) exibido em negrito; time azarão em muted.
- `oddsToShow` e `injuriesToShow`: quando o filtro por time não encontra resultados, exibe todos os dados sem filtro (fallback).

#### `InjuriesCard` — sidebar e mobile
- Aviso de dados embaralhados comprimido para uma única linha.
- No layout desktop (`xl`): exibido na sidebar direita via `hidden xl:block`.
- No layout mobile: bloco adicional `xl:hidden` antes dos cards principais.

#### Correção de build — smart quotes
- Todo o bloco `AnalysisHero` havia sido escrito com aspas curvas (U+2018/U+2019) em vez de aspas ASCII, corrompendo o parser do TypeScript.
- Aplicado replace global de `'` / `'` / `"` / `"` → `'` / `"` em todo o arquivo.

#### `AlertTriangle` removido dos imports
- Ícone não estava mais em uso após simplificações; removido para evitar warning de lint.

### Resultado prático
- Aba Análise carrega sem erros de TypeScript.
- Odds filtradas por time com fallback funcional.
- Lesões visíveis em sidebar no desktop sem poluir o feed principal.
- Vencedor de cada jogo recente destacado na cor do time.

### Validações
- `frontend`: `npm run build` — ✓ built in 2.64s, zero erros.

---

## 2026-04-13 - Countdown, número do jogo, alerta de lesões e limpeza da Home (Claude Code)

### Objetivo
- Aproveitar dados já disponíveis nas APIs existentes para enriquecer a Home com informações úteis sem adicionar dependências novas.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Countdown pro próximo jogo (`useCountdown` + `LastNightRecap`)
- Adicionado hook `useCountdown(targetDate)` que calcula a diferença entre agora e o `tip_off_at` do próximo jogo, atualizando a cada 30 segundos.
- Exibe: `"em Xh Ymin"` se nas próximas 24h, `"em Ymin"` se menos de 1h, data formatada se mais distante, `"Agora"` se já começou.
- No header do `LastNightRecap`, o texto estático foi substituído por um pill dourado `"Próximo em Xh Ymin"` quando há jogo confirmado.

#### Número do jogo nos cards de placar (`LastNightRecap`)
- Adicionado `gameNumber: game.game_number` no mapeamento de `sourceGames`.
- Cada card exibe `"J1"`, `"J2"` etc. ao lado do badge de rodada.

#### Alerta discreto de lesões (`InjuryAlertPill`)
- Novo componente `InjuryAlertPill` que chama `useAnalysisInsights` internamente.
- Exibe banner vermelho com total de lesões e link para Análise se `injuries.length > 0`.
- Retorna `null` silenciosamente se loading ou sem lesões — não afeta o layout.
- Renderizado entre `HeroPanel` e `HomeQuickDeck` com stagger `animate-in-3`.

#### Limpeza do `HomeQuickDeck`
- Removido parágrafo descritivo desnecessário.

#### Imports adicionados
- `useEffect`, `useState` (React), `Zap` (lucide), `useAnalysisInsights`.

### Validações
- `frontend`: `npm run build` concluído com sucesso — zero erros ou warnings.

---

## 2026-04-13 - Estilização do top 3 no Ranking Geral da Home (Claude Code)

### Objetivo
- Destacar visualmente o 1º, 2º e 3º colocados no card "Ranking Geral" da Home, que antes tratava todos os participantes de forma idêntica.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`

### Mudanças feitas
- Adicionado array `podium` local no `RankingCard` com cor, background e border específicos para cada posição (ouro `#ffd166`, prata `#c9d1d9`, bronze `#d68c45`).
- Os 3 primeiros colocados passaram a ter: medalha emoji (🥇🥈🥉) no lugar do número, fundo colorido sutil, borda colorida, nome e pontos na cor da medalha, fonte maior e negrito.
- Os demais colocados (4º e 5º) mantêm o estilo anterior compacto, com número de posição e cor muted.
- O layout da lista trocou de `<Divider />` entre itens para `gap: 6` no grid, deixando o espaçamento mais consistente com os cards do pódio.
- Participante logado continua destacado em dourado quando fora do top 3.

### Resultado prático
- O pódio fica imediatamente legível e com hierarquia visual clara.
- O 1º lugar chama atenção sem precisar abrir a página de Ranking completo.

### Validações
- `frontend`: `npm run build` concluído com sucesso — zero erros ou warnings.

---

## 2026-04-13 - Aumento do tamanho base de fonte (Claude Code)

### Objetivo
- Corrigir tipografia pequena demais em toda a interface, especialmente no mobile.

### Arquivos alterados
- `frontend/src/index.css`

### Mudanças feitas
- Adicionado `font-size: 17px` ao seletor `html, body, #root`.
- Como todos os componentes usam `rem`, o ajuste escala toda a tipografia proporcionalmente sem tocar nenhum componente individualmente.

### Resultado prático
- Labels de 0.68rem: 10.9px → 11.6px
- Texto secundário de 0.8rem: 12.8px → 13.6px
- Corpo de 0.85rem: 13.6px → 14.5px
- Títulos e números em rem escalam junto

### Validações
- `frontend`: `npm run build` concluído com sucesso — zero erros ou warnings.

---

## 2026-04-13 - Fusão do hero da Home em bloco único (Claude Code)

### Objetivo
- Eliminar repetição de informação na Home: posição, pontos e séries apareciam 3 vezes em blocos distintos.
- Reduzir o scroll no mobile de 5 blocos para 3 na coluna principal.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`

### Mudanças feitas
- Removidos os componentes `PanelPulseBar` e `MyMomentCard` inteiramente.
- `HeroPanel` reescrito para absorver toda a responsabilidade dos três blocos anteriores.
- O novo hero exibe em sequência: label "Painel do participante", título "Bolão NBA 2026", saudação personalizada, 3 chips de estatística (posição / pontos / distância do líder), barra de progresso do bracket com contagem e percentual, e CTA inteligente com botão sólido colorido (dourado se há picks pendentes, azul se está atrás do líder, verde se está em dia).
- A prop `totalSeries` e `leaderPoints` foram adicionadas ao `HeroPanel` para suportar a lógica do CTA inteligente que antes vivia no `MyMomentCard`.
- O render principal da Home passou de 5 wrappers com stagger para 3: `LastNightRecap`, `HeroPanel`, `HomeQuickDeck`.
- A transição da barra de progresso ganhou `transition: width 0.6s ease` para animar o preenchimento.

### Resultado prático
- A posição e os pontos do participante aparecem uma única vez, com hierarquia clara.
- O mobile ficou significativamente mais curto e direto.
- O bundle da Home encolheu de 29.10 kB para 24.38 kB (remoção dos dois componentes).
- Nenhuma informação relevante foi perdida — apenas a duplicação.

### Validações
- `frontend`: `npm run build` concluído com sucesso — zero erros ou warnings.

---

## 2026-04-13 - Efeitos visuais e animações globais (Claude Code)

### Objetivo
- Elevar o nível visual do app adicionando animações e efeitos de profundidade sem alterar nenhuma lógica, hook, rota ou integração.

### Arquivos alterados
- `frontend/src/index.css`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Ranking.tsx`

### Mudanças feitas

#### `index.css` — efeitos globais
- Adicionado `@keyframes fadeInUp` com classes utilitárias `.animate-in` e `.animate-in-1` a `.animate-in-5` para entrada escalonada (stagger de 0.05s até 0.36s) de blocos e cards ao carregar qualquer página.
- Adicionado `@keyframes pulseGoldText` e classe `.title-glow` para o título principal na Login pulsar o brilho dourado de forma suave e contínua.
- Adicionados `@keyframes glowGold`, `glowSilver`, `glowBronze` e classes `.podium-gold`, `.podium-silver`, `.podium-bronze` para os cards do pódio no Ranking emitirem aura animada por posição (ouro, prata, bronze).
- Adicionado `@keyframes courtFade` e classe `.court-lines` para as linhas da quadra SVG na Login respirarem suavemente entre 4% e 8% de opacidade.
- Melhorado `.card:hover`: adicionados `transform: translateY(-2px)` e `box-shadow` com sombra escura + borda dourada sutil, criando efeito de lift ao passar o mouse sobre qualquer card do site.
- Adicionada classe utilitária `.glass` com `backdrop-filter: blur(14px)` para glassmorphism opcional em elementos futuros.

#### `Login.tsx`
- SVG da quadra de fundo passou de `opacity-5` estático para a classe `.court-lines` com animação de respiração.
- Título "Bolão NBA" ganhou a classe `.title-glow` para o pulso de brilho dourado animado (substituiu o `textShadow` estático inline).
- Container principal ganhou `.animate-in` para entrada suave com fade ao carregar a página.

#### `Home.tsx`
- Blocos principais da coluna central encapsulados em wrappers com stagger `.animate-in-1` a `.animate-in-5`: `LastNightRecap`, `HeroPanel`, `PanelPulseBar`, `MyMomentCard` e `HomeQuickDeck`.

#### `Ranking.tsx`
- `RankingHero` encapsulado em wrapper `.animate-in` para entrada com fade.
- `TopThreeCards` encapsulado em wrapper `.animate-in-2` para entrada escalonada após o hero.
- Cards do pódio receberam propriedade `glowClass` (`podium-gold`, `podium-silver`, `podium-bronze`) aplicada via `className` para o glow animado por posição.
- Cards do pódio ganharam `transition: transform 0.22s ease` para suavizar interações futuras.

### Resultado prático
- O app ganhou sensação de fluidez e profissionalismo sem nenhuma alteração de comportamento.
- Os efeitos são todos em CSS puro, sem dependências novas.
- As classes utilitárias (`.animate-in-*`, `.glass`, `.podium-*`, `.title-glow`) ficam disponíveis para reuso em qualquer página ou componente futuro.

### Validações
- `frontend`: `npm run build` concluído com sucesso — zero erros ou warnings.

### Pendências
- A classe `.glass` está disponível mas ainda não aplicada em nenhum componente — pode ser usada nos modais (SeriesModal, GamePickModal) ou no menu da Nav em rodadas futuras.
- Os cards das páginas `Games`, `Analysis` e `Compare` ainda não têm stagger de entrada — podem ser adicionados seguindo o mesmo padrão das classes já criadas.

---

## 2026-04-13 13:29 - Fluxo oficial deixa de reintroduzir seeds e mocks no bolão real

### Objetivo
- Proteger o bolão oficial contra reintrodução de dados fictícios de pontuação e contra fallback visual de jogos simulados no fluxo principal.

### Arquivos alterados
- `backend/src/routes/admin.ts`
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A rota `POST /admin/seed` foi removida do backend.
- O `admin.ts` deixou de importar `SERIES_SEED` como parte do fluxo operacional.
- Com isso, o painel admin do bolão oficial não expõe mais a entrada rápida que podia reescrever séries com resultados seedados de teste.
- A página `Games` deixou de manter o modo `mock` no fluxo principal.
- Foram removidos da rota oficial de jogos:
  - `MOCK_GAMES`;
  - `MOCK_TEAMS`;
  - `brt()` de apoio ao cenário falso;
  - estado `isMock`;
  - fallback de picks salvos localmente em simulação;
  - mensagem visual de “dados simulados”.
- A aba `Games` agora depende apenas dos jogos reais carregados do banco.
- Se não houver jogos reais disponíveis, a tela passa a assumir estado vazio ou indisponível, em vez de inventar agenda de teste.

### Resultado prático
- O bolão oficial ficou mais seguro contra confusão entre ambiente real e cenário de teste.
- O admin perde um atalho perigoso para regravar séries com seeds fictícios.
- A aba `Games` para de mascarar ausência de dados reais com partidas falsas.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`

### Pendências
- Os scripts SQL de teste ainda existem em `supabase/test-scenarios` como material de ambiente separado.
- Se você quiser, a próxima rodada pode adicionar uma limpeza administrativa guiada para remover do banco os resíduos de cenários fictícios já executados.

## 2026-04-13 13:08 - Primeira camada de dados reais conecta Home e Analise ao feed de jogos

### Objetivo
- Iniciar a fase de dados reais aproveitando a pipeline já existente de sync para alimentar `Home` e `Analise` com jogos vindos do banco, em vez de manter tudo preso a blocos estáticos.

### Arquivos alterados
- `frontend/src/hooks/useGameFeed.ts`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Analysis.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criada a nova camada compartilhada `useGameFeed` para buscar do `Supabase`:
  - jogos;
  - times;
  - séries.
- O hook enriquece os jogos com referência de times e série e expõe dois recortes principais:
  - `recentCompletedGames`
  - `upcomingGames`
- O hook também passa a ouvir mudanças em tempo real nas tabelas:
  - `games`
  - `series`
  - `teams`
- A `Home` deixou de depender apenas do array estático de `Jogos da última noite`.
- O topo da `Home` agora consome os jogos finalizados mais recentes do banco quando houver dados reais disponíveis, com fallback para conteúdo estático quando o feed ainda estiver vazio.
- A aba `Análise` passou a consumir os próximos jogos reais sincronizados para:
  - métricas do hero;
  - card `Próximos confrontos`;
  - contexto visual da página.
- A `Análise` agora sinaliza explicitamente quando os confrontos e resultados recentes já estão vindos de dados reais.

### Auditoria da pipeline atual
- O backend já possui uma job real de sync em `backend/src/jobs/syncNBA.ts`.
- A integração atual usa `Ball Don't Lie` como fonte de jogos de pós-temporada.
- O backend grava e atualiza os dados em `games` e `series` no `Supabase`.
- Ao final do sync, o backend já recalcula as pontuações com `recalculateAllScores()`.
- O backend também já agenda sync recorrente via `node-cron` em `backend/src/index.ts`.
- O principal gargalo observado nesta rodada não estava no banco, e sim no frontend:
  - `Home` ainda tinha recap estático;
  - `Analysis` ainda estava fortemente simulada.

### Resultado prático
- O app começou a aproveitar melhor a infraestrutura real que já existia.
- `Home` e `Análise` agora reagem ao estado real do banco sem precisar esperar a integração completa de odds e lesões.
- A próxima fase fica mais clara:
  - reforçar a job de sync;
  - expandir o uso de dados reais;
  - tratar odds e lesões com provedores dedicados.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- O build precisou ser executado fora do sandbox por limitação do `esbuild` no ambiente Windows restrito, mas compilou normalmente após isso.

### Pendências
- `Analysis` ainda mantém odds e lesões em modo simulado.
- A próxima rodada ideal é aprofundar a auditoria de `backend/src/jobs/syncNBA.ts` e reforçar a camada de sync com mais metadados operacionais e maior cobertura de status de jogo.

## 2026-04-13 12:35 - Prompt completo criado para migracao para outra conta do Codex

### Objetivo
- Criar um prompt robusto, em arquivo Markdown, para iniciar outra conta do Codex já com contexto, direção de implementação e exigência explícita de documentação operacional.

### Arquivos alterados
- `updates/prompt-outra-conta-codex-dados-reais.md`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criado um prompt completo para colar na outra conta do Codex.
- O prompt deixa explícito:
  - stack atual com `Supabase`, `Ball Don't Lie`, `Render`, `Node/Express`, `React/Vite`;
  - ordem de leitura dos arquivos mais importantes;
  - prioridade da fase de dados reais;
  - necessidade de auditar `syncNBA.ts`;
  - necessidade de implementação real e não só análise;
  - exigência de documentação prática sobre env vars, chaves, provedores, endpoints, testes e validação operacional.
- O prompt também obriga a outra conta a explicar:
  - onde colocar as chaves da API;
  - quais APIs usar para odds e lesões;
  - como validar localmente, no Render e no Supabase;
  - como rodar e monitorar o sync manualmente.

### Resultado prático
- Agora existe um prompt pronto para iniciar a outra conta com bem menos ambiguidade.
- Isso aumenta a chance da próxima sessão já entrar direto na fase certa: integração real de dados + documentação operacional.

### Validações
- Arquivo Markdown criado com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\updates`

### Pendências
- Se voce quiser, ainda posso gerar uma segunda versao mais curta, focada apenas em backend/sync, para usar caso voce queira economizar contexto na outra conta.

## 2026-04-13 12:26 - Documento de handoff criado para migracao de contexto entre contas do Codex

### Objetivo
- Criar um documento de contexto rapido para permitir que outra conta do Codex assuma o projeto ja alinhada com o estado atual do produto e com a proxima fase de integracao de dados reais.

### Arquivos alterados
- `updates/codex-handoff-dados-reais.md`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criado um handoff dedicado para a proxima conta do Codex.
- O documento resume:
  - rotas atuais;
  - funcao de cada tela principal;
  - arquitetura relevante do frontend e backend;
  - pontos sensiveis de scoring e ranking;
  - prioridades da fase de dados reais;
  - ordem de investigacao recomendada;
  - riscos principais da integracao;
  - prompt sugerido para a nova conta iniciar o trabalho.

### Resultado prático
- Agora existe um ponto unico de entrada para acelerar a troca de contexto entre contas.
- A nova conta consegue entrar mais rapido na fase de API e sync sem depender de reler o projeto inteiro.

### Validações
- Documento criado com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\updates`

### Pendências
- Se voce quiser, eu ainda posso gerar uma segunda versao mais curta, em formato de checklist operacional, para colar direto na primeira mensagem da outra conta.

## 2026-04-13 12:14 - Compare evolui para duelo analítico com ousadia e potencial de virada

### Objetivo
- Transformar a tela `Compare` em um diferencial mais forte do bolão, saindo de uma comparação estática e indo para uma leitura de duelo com divergências quentes, ousadia e potencial real de virada.

### Arquivos alterados
- `frontend/src/pages/Compare.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A comparação principal ganhou um novo bloco analítico no topo com leitura mais visual do confronto.
- O resumo agora destaca:
  - quem está na frente;
  - quantas divergências ainda estão quentes;
  - quem está mais ousado no recorte restante;
  - qual é o potencial de virada do duelo.
- A tela passou a calcular `ousadia` com base na exposição direta dos dois lados nas divergências ainda abertas.
- A tela passou a calcular `potencial de virada` com base no swing máximo ainda possível nas séries e jogos restantes onde os dois podem se separar em pontos.
- Essa leitura não usa chute probabilístico; ela usa os pontos ainda disputáveis segundo as regras reais de pontuação do bolão.
- Foi criado um novo bloco `Divergências em aberto`, que destaca automaticamente os pontos mais importantes do duelo, incluindo:
  - séries em que os dois divergem;
  - diferenças de cravada/número de jogos;
  - jogos em que só um palpitou ou em que os vencedores escolhidos são diferentes.
- Cada divergência destacada agora mostra:
  - o confronto;
  - o contexto da rodada;
  - a escolha de cada participante;
  - o swing máximo possível para cada lado.
- O resumo de séries também ficou mais rico e agora separa:
  - concordâncias;
  - divergências de vencedor;
  - diferenças no número de jogos;
  - situações em que só um palpitou.

### Resultado prático
- A aba `Compare` ficou mais parecida com uma central de duelo do que com uma simples tela de conferência.
- Agora dá para entender mais rápido:
  - onde os dois realmente se separam;
  - quem está assumindo mais risco;
  - se o líder está confortável ou pressionado;
  - quais séries e jogos ainda podem virar o confronto.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- A tela `Compare` compilou normalmente após a entrada da nova camada analítica, do cálculo de swing e do bloco de divergências automáticas.

### Pendências
- Se você quiser, a próxima evolução pode ser adicionar ranking de ousadia contra o campo inteiro e um modo de comparação com compartilhamento por link.

## 2026-04-13 11:58 - Home refinada como painel principal do bolão

### Objetivo
- Transformar a `Home` em um painel principal mais claro e mais orientado à ação, reduzindo a sensação de cards soltos e organizando melhor o que é status, próximo passo e acompanhamento.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O antigo bloco explicativo da `Home` foi substituído por um novo `Pulso do dia`, mais útil para operação diária.
- O novo `Pulso do dia` resume, logo no início:
  - quantas séries já estão prontas para palpitar;
  - quantas ainda pedem ação;
  - a posição atual do participante.
- A Home ganhou um novo bloco `Acessos Rápidos`, com atalhos diretos para:
  - `Jogos`;
  - `Análise`;
  - `Comparar brackets`.
- Esse bloco foi desenhado para funcionar melhor como hub de decisão rápida, em vez de depender só do menu inferior ou de cards espalhados.
- A ordem de leitura da Home foi reorganizada para ficar mais coerente:
  - resultados recentes;
  - hero principal;
  - pulso do dia;
  - próximo passo do participante;
  - acessos rápidos;
  - acompanhamento da chave oficial.
- No desktop, a distribuição entre colunas ficou mais limpa:
  - coluna esquerda para ranking e estatísticas;
  - centro para o fluxo principal da Home;
  - coluna direita para meus palpites e séries recentes.
- No mobile, a pilha principal ficou mais objetiva e o conteúdo lateral foi trazido para a sequência de leitura sem duplicações desnecessárias.

### Resultado prático
- A `Home` ficou mais parecida com um painel de comando do bolão do que com uma coleção de widgets.
- O usuário agora entende mais rápido:
  - como está o dia;
  - o que ainda precisa resolver;
  - qual rota abrir em seguida.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- A `Home` compilou normalmente após a troca da hierarquia, a entrada do `Pulso do dia` e a nova reorganização entre desktop e mobile.

### Pendências
- Se você quiser, a próxima etapa natural é deixar o topo da `Home` ainda mais “portal esportivo”, com estado de jogos ao vivo e uma faixa superior mais rica quando os dados reais entrarem.

## 2026-04-13 11:42 - Aba Jogos ganha filtros, foco de palpites e prioridade operacional

### Objetivo
- Fortalecer a aba `Jogos` para ela funcionar mais como painel operacional da rodada, facilitando navegação por urgência, palpites pendentes e séries já cobertas.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O hero da página `Jogos` passou a destacar também:
  - quantas séries ainda pedem ação;
  - quantas séries já estão em estado urgente.
- Foi criado um card de `Seus palpites em foco`, trazendo os jogos mais relevantes do momento com:
  - confronto;
  - pick atual;
  - status operacional;
  - ordenação puxando primeiro o que está aberto ou travando em breve.
- A página ganhou uma barra de filtros rápidos para navegar entre:
  - todas as séries;
  - séries sem palpite;
  - séries urgentes;
  - séries com pick salvo;
  - séries encerradas.
- A lista principal de séries agora respeita o filtro ativo e exibe estado vazio amigável quando não houver resultados no recorte escolhido.
- Cada card de série passou a sinalizar melhor a prioridade da rodada:
  - selo de `PRIORIDADE` para séries urgentes;
  - destaque visual para séries recém-atualizadas após salvar um palpite.
- O topo de métricas da página e a navegação entre séries ficaram mais orientados à ação diária, sem mexer no fluxo já existente de salvar picks, revelar picks e usar `Vai na fé`.

### Resultado prático
- A aba `Jogos` ficou mais rápida para quem quer resolver a rodada sem percorrer tudo manualmente.
- O usuário consegue identificar com mais facilidade:
  - onde ainda falta palpite;
  - o que fecha em breve;
  - o que acabou de ser salvo;
  - quais séries já podem ser ignoradas.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- O chunk `Games` compilou normalmente após a entrada dos novos filtros, cards de foco e destaques por prioridade.

### Pendências
- Se você quiser, a próxima rodada pode evoluir essa página com filtros persistidos entre acessos, busca por time/série e um histórico visual mais rico dos palpites já fechados.

## 2026-04-13 11:16 - Loader do app passa a usar SVG oficial de assets

### Objetivo
- Trocar o símbolo de carregamento atual pelo SVG fornecido em `assets`, reaproveitando a nova arte em todos os pontos do app que já usam o componente de loading.

### Arquivos alterados
- `frontend/public/loading-basketball.svg`
- `frontend/src/components/LoadingBasketball.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O SVG de loading foi levado para `frontend/public/loading-basketball.svg`, permitindo uso estável em qualquer rota do frontend.
- O componente `LoadingBasketball` deixou de desenhar a bola manualmente em SVG inline.
- O loader agora usa a arte oficial via `<img>` mantendo:
  - controle por `size`;
  - rotação com `animate-spin`;
  - acessibilidade com `role="status"` e `aria-label`.
- Foi adicionado um `drop-shadow` sutil para melhorar presença visual do novo loader sobre fundos escuros do produto.

### Resultado prático
- Todas as telas que já usam `LoadingBasketball` passam automaticamente a exibir o novo símbolo.
- O app ganha um loading mais coerente com a arte fornecida e mais fácil de manter no futuro.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- O novo asset público e o `LoadingBasketball` atualizado compilaram normalmente e passaram a atender todas as telas que já usam o componente.

### Pendências
- Se você quiser, numa próxima rodada dá para criar uma segunda variação do loader para telas grandes, com escala maior e animação complementar.

## 2026-04-13 11:02 - Home troca faixa seca por resumo rico da última noite

### Objetivo
- Deixar o topo da Home mais informativo e mais próximo do bloco forte que já existia em `Análise`, em vez de manter uma faixa de placar rápido mais resumida.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Analysis.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O topo da `Home` deixou de usar a faixa enxuta de placar rápido.
- A `Home` passou a exibir um bloco mais rico de `Jogos da última noite`, com:
  - confronto;
  - badge de rodada;
  - placar final;
  - nota curta de contexto.
- O bloco equivalente foi removido da aba `Análise` para evitar duplicação entre páginas.
- A `Análise` foi ajustada para continuar útil sem esse resumo, mantendo foco em:
  - próximos confrontos;
  - odds;
  - lesões;
  - atalhos relacionados.

### Resultado prático
- A `Home` agora abre com uma base de rodada mais forte e legível.
- O usuário recebe mais contexto logo no início da navegação diária.
- A aba `Análise` continua complementar, sem repetir o mesmo conteúdo do topo da Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `Home` e `Análise` compilaram normalmente após a troca do bloco de resultados e a remoção da duplicação.

### Pendências
- Se você quiser, a próxima evolução pode ser tornar esse bloco da Home híbrido: resultados recentes reais quando existirem e fallback simulado quando ainda não houver dados completos.

## 2026-04-13 10:48 - Home ganha atalho direto para comparar brackets

### Objetivo
- Dar acesso mais rápido à tela de comparação sem transformar a navbar inferior em uma barra poluída no mobile.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O antigo card de atalho isolado para `Análise` foi evoluído para um pequeno hub de atalhos na `Home`.
- O card agora oferece dois acessos diretos:
  - `Análise`
  - `Comparar brackets`
- O texto do card foi ajustado para explicar que esses fluxos continuam acessíveis sem sobrecarregar a navegação principal inferior.
- O atalho de `Compare` ganhou tratamento visual próprio para diferenciar leitura/contexto de comparação entre participantes.

### Resultado prático
- `Compare` ficou mais acessível a partir da `Home`.
- A navbar inferior continua enxuta, preservando área de toque e legibilidade no mobile.
- A navegação passa a ter uma camada principal mais limpa e uma camada secundária de atalhos úteis dentro da própria Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- A `Home` compilou normalmente com o novo hub de atalhos para `Análise` e `Comparar brackets`.

### Pendências
- Se o uso de `Compare` crescer muito no futuro, aí sim pode fazer sentido reavaliar a presença dele como item fixo da navegação principal.

## 2026-04-13 10:35 - Home ganha faixa de placar rápido no topo

### Objetivo
- Trazer para a Home uma base visual semelhante à navegação de portais esportivos, mostrando jogos recentes, jogos em andamento e próximos confrontos logo no topo da página.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criado um componente `GamesPulseStrip` no topo da `Home`.
- A nova faixa busca os jogos reais em `games` e cruza com `teams` para montar os confrontos com abreviações corretas.
- O strip prioriza a ordem visual:
  - jogos em andamento;
  - jogos futuros;
  - jogos recentes/finalizados.
- Cada card da faixa mostra:
  - status (`AO VIVO`, `FIM` ou horário);
  - times;
  - placar, quando disponível.
- Jogos que já passaram do `tip_off_at` e ainda não estão marcados como `played` aparecem como “ao vivo”, funcionando como uma aproximação útil até existir um status mais refinado no backend.
- O componente também escuta mudanças em `games` via realtime para reagir a atualizações da rodada.

### Resultado prático
- A Home ganhou uma base de acompanhamento rápido logo no topo, antes do hero principal.
- O usuário consegue bater o olho em resultados e andamento da rodada sem sair do painel principal.
- A navegação fica mais próxima do padrão de sites esportivos sem reintroduzir toda a densidade antiga no corpo da Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- A `Home` compilou normalmente com a nova faixa de placar rápido no topo e preservou a separação em chunk da rota.

### Pendências
- Quando o backend tiver um status explícito de jogo ao vivo, vale trocar a heurística baseada em horário por um sinal real de “live”.
- Se você quiser evoluir essa faixa depois, dá para incluir logos, período do jogo e link para a tela de jogos.

## 2026-04-13 10:28 - Aba Análise separa radar da Home

### Objetivo
- Tirar da Home os blocos de leitura contextual que estavam competindo com o fluxo principal do bolão e mover esse conteúdo para uma aba dedicada de análise.

### Arquivos alterados
- `frontend/src/App.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Analysis.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criada a nova página `Analysis` com foco em leitura e radar da rodada.
- A nova rota `/analysis` foi adicionada ao app.
- O navbar principal ganhou a aba `Análise`.
- A `Home` foi simplificada e passou a priorizar:
  - hero e status do participante;
  - progresso e ação principal;
  - ranking;
  - estatísticas;
  - meus palpites;
  - bracket oficial;
  - séries recentes.
- Os blocos de contexto foram movidos para `Análise`, incluindo:
  - próximos confrontos;
  - resultados recentes;
  - odds;
  - lesões e notícias.
- A `Home` ganhou um card de atalho para a nova aba `Análise`, mantendo a navegação clara sem reintroduzir densidade no miolo principal.
- O banner de contexto da `Home` foi ajustado para explicar explicitamente que esse conteúdo agora vive em uma aba própria.

### Resultado prático
- A Home ficou mais coerente como painel operacional do bolão.
- A navegação ganhou uma separação mais clara entre “agir” e “acompanhar/ler”.
- A nova aba `Análise` cria espaço para evoluir conteúdo editorial ou radar da rodada sem voltar a poluir a Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- O build gerou um chunk dedicado para `Analysis` e reduziu ainda mais o peso da `Home`.

### Pendências
- Quando os dados reais de radar entrarem, a aba `Análise` deve ser o lugar natural para conectar API e enriquecer esses cards.

## 2026-04-13 10:05 - Home reorganizada para foco real do bolão

### Objetivo
- Reduzir a poluição visual da Home, melhorar a ordem de leitura em mobile e desktop e deixar o conteúdo real do bolão mais importante do que o contexto simulado.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A `Home` foi reorganizada para priorizar o que o participante realmente usa no dia a dia:
  - hero principal;
  - status/contexto do painel;
  - bloco de ação imediata;
  - próximos jogos e meus palpites;
  - ranking e estatísticas;
  - bracket oficial e séries recentes.
- O banner `HomeContextBanner` foi reescrito para comunicar com mais clareza a diferença entre:
  - dados reais do bolão;
  - radar de NBA ainda simulado.
- Em telas menores, os blocos simulados deixaram de competir com o conteúdo principal e passaram para uma seção recolhível `Radar NBA Simulado`.
- Em desktop largo, a Home passou a ter uma distribuição mais funcional:
  - coluna esquerda com ranking e estatísticas;
  - coluna central com foco de ação e acompanhamento real do bolão;
  - coluna direita dedicada ao radar simulado.
- `NextGamesCard` e `MyPicksCard` ganharam mais prioridade prática no fluxo principal.
- O antigo ticker e o conteúdo de contexto simulado saíram do miolo principal da página e foram reposicionados como camada secundária.

### Resultado prático
- Mobile mais direto e menos cansativo para rolagem.
- Desktop com separação mais clara entre informação operacional e conteúdo complementar.
- Home menos “landing page cheia” e mais “painel de uso diário”.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- A nova composição da `Home` compilou sem regressão estrutural e preservou o chunk separado da rota após o code splitting já aplicado.

### Pendências
- A `Home.tsx` continua grande e ainda merece uma rodada futura de extração de componentes menores.
- Quando os dados reais de jogos/odds/lesões entrarem, vale revisar novamente a hierarquia para possivelmente remover a seção de radar simulado.

## 2026-04-12 - Loader do app vira bola de basquete dourada

### Objetivo
- Trocar o spinner circular genérico por um carregamento mais alinhado à identidade visual do bolão.

### Arquivos alterados
- `frontend/src/components/LoadingBasketball.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/components/GamePickModal.tsx`
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/pages/OfficialBracket.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/pages/SimulationLab.tsx`
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Admin.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criado um componente reutilizável `LoadingBasketball` com visual de bola de basquete dourada.
- Os principais estados de carregamento do app passaram a usar esse novo loader em vez do círculo com borda girando.
- A troca foi aplicada em autenticação, rotas protegidas, ranking, jogos, Home, Admin, bracket e relatórios.

### Resultado prático
- O carregamento ficou mais temático e coerente com o branding novo do site.
- A experiência visual agora usa um elemento único e reconhecível em vez de vários spinners diferentes.

## 2026-04-12 - Logo é otimizado para uso real no site e no favicon

### Objetivo
- Transformar a arte bruta do logo em assets adequados para web, com fundo transparente, tamanhos separados e peso muito menor para navegação real.

### Arquivos alterados
- `frontend/public/logo-bolao-nba-transparent.png`
- `frontend/public/logo-bolao-nba-512.png`
- `frontend/public/apple-touch-icon.png`
- `frontend/public/favicon-64.png`
- `frontend/public/favicon-32.png`
- `frontend/public/favicon.ico`
- `frontend/src/pages/Login.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/index.html`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi gerada uma versão do logo com fundo transparente.
- O site deixou de usar o PNG bruto pesado e passou a usar a versão otimizada `512x512`.
- Foram gerados arquivos específicos para:
  - uso principal do logo no site;
  - `apple-touch-icon`;
  - favicon em PNG;
  - favicon em `.ico`.
- Login, navegação e Home foram atualizados para usar a versão mais leve e apropriada da marca.
- O `index.html` passou a referenciar os favicons corretos em vez de apontar para o PNG grande.

### Resultado prático
- `logo-bolao-nba-512.png`: ~`120 KB`
- `apple-touch-icon.png`: ~`28 KB`
- `favicon-64.png`: ~`6.7 KB`
- `favicon-32.png`: ~`2.3 KB`
- `favicon.ico`: ~`14.5 KB`

### Observação
- O arquivo bruto original foi mantido no projeto apenas como referência (`logo-bolao-nba.png`), mas o site já não depende mais dele.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-12 - Logo oficial passa a compor a identidade visual do produto

### Objetivo
- Incorporar a nova marca visual do bolão na experiência do site, em vez de usar apenas texto e favicon padrão do Vite.

### Arquivos alterados
- `frontend/public/logo-bolao-nba.png`
- `frontend/src/pages/Login.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/index.html`
- `updates/codex-changelog.md`

### Mudanças feitas
- O logo foi adicionado como asset público oficial do frontend.
- A tela de login passou a exibir a marca acima do lockup textual do produto.
- O menu rápido da navegação agora usa o logo como referência visual da marca.
- A Home ganhou o logo no topo do hero, reforçando identidade sem poluir a interface.
- O favicon e o `apple-touch-icon` passaram a apontar para a nova arte em vez do ícone padrão do Vite.

### Impacto esperado
- O produto ganha presença de marca mais forte e coerente.
- Login, navegação e browser passam a ter identidade visual própria.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Aba Admin evolui para painel operacional completo

### Objetivo
- Transformar a primeira versão da aba Admin em um painel realmente útil para operação cotidiana do bolão, concentrando gestão de acesso, privilégios, sync e saúde do sistema.

### Arquivos alterados
- `backend/src/routes/admin.ts`
- `frontend/src/pages/Admin.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O backend administrativo ganhou novos endpoints para:
  - listar `allowed_emails`;
  - adicionar email liberado;
  - remover email liberado;
  - promover e rebaixar admin;
  - entregar um `overview` com métricas e inconsistências do bolão.
- O `overview` passou a consolidar:
  - total de participantes e admins;
  - volume de `series_picks` e `game_picks`;
  - contagem de séries e jogos resolvidos;
  - modo operacional atual (`fictício` ou `real`, conforme env);
  - nomes duplicados, emails duplicados, participantes sem acesso, emails sem participante e picks órfãos.
- A aba `Admin` no frontend foi ampliada com:
  - bloco de saúde do bolão;
  - bloco de inconsistências com detalhes úteis;
  - gestão visual de `allowed_emails`;
  - promoção/rebaixamento de admins;
  - botão visual de `Sync`;
  - histórico local das últimas ações administrativas;
  - manutenção da remoção completa de participante e das operações de backup/rescore.

### Impacto esperado
- A área administrativa deixa de ser só uma tela de remoção e vira um centro operacional real do produto.
- Fica muito mais simples detectar problemas de consistência e agir sem depender de painel bruto do Supabase ou terminal para tudo.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Produto ganha aba Admin para gestão operacional do bolão

### Objetivo
- Tirar tarefas críticas do terminal e do painel bruto do Supabase, criando uma área administrativa visual para operar o bolão com mais segurança.

### Arquivos alterados
- `backend/src/routes/admin.ts`
- `frontend/src/lib/adminApi.ts`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Admin.tsx`
- `frontend/src/App.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O backend ganhou a operação visual de backup:
  - novo endpoint `POST /admin/backup`
  - reaproveitando o exportador operacional já existente.
- O frontend ganhou um client administrativo autenticado:
  - envia o `Bearer token` da sessão atual para o backend;
  - centraliza chamadas admin em `adminApi.ts`.
- Foi criada a nova página `Admin`:
  - lista participantes com nome, email, id e status de admin;
  - destaca nomes duplicados;
  - permite remover participantes de forma completa com confirmação;
  - protege contra auto-remoção do próprio admin pela interface;
  - oferece botões para `Recalcular ranking` e `Gerar backup operacional`;
  - mostra health do backend e métricas rápidas do painel.
- A navegação agora exibe o atalho `Admin` apenas para usuários com `isAdmin = true`.
- A proteção de rota foi ampliada para suportar `requireAdmin`, impedindo acesso direto à URL por usuários comuns.

### Impacto esperado
- A administração do bolão fica bem mais prática para tarefas recorrentes.
- Casos como participante duplicado deixam de depender de terminal ou exclusão manual incompleta no banco.
- O produto começa a ganhar um painel operacional real, em vez de depender apenas de scripts.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Remoção completa de participante vira rotina operacional do bolão

### Objetivo
- Parar de depender de exclusão manual incompleta no Supabase e criar uma forma confiável de remover um participante do bolão inteiro, sem deixar picks órfãos nem duplicatas aparecendo na interface.

### Arquivos alterados
- `backend/src/admin/removeParticipant.ts`
- `backend/src/routes/admin.ts`
- `backend/src/scripts/removeParticipant.ts`
- `backend/package.json`
- `supabase/user-management-guide.md`
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi criada a rotina `removeParticipantCompletely`, que localiza um participante por:
  - `participantId`
  - `email`
  - ou `userId`
- A remoção agora limpa de forma explícita:
  - `series_picks`
  - `game_picks`
  - `simulation_series_picks`
  - `simulation_game_picks`
  - o registro em `participants`
  - e o email em `allowed_emails`
- O backend ganhou o endpoint administrativo:
  - `POST /admin/participants/remove`
- Também foi criado um script operacional para uso direto no terminal:
  - `npm run remove:participant -- --email email@exemplo.com`
- O guia de usuários do Supabase foi atualizado para parar de recomendar `delete from participants` como fluxo principal.

### Observação operacional
- Essa rotina remove a pessoa do bolão, mas não apaga a conta dela no Supabase Auth.
- A ideia é impedir reaparecimento funcional no app sem assumir a responsabilidade de excluir credenciais de autenticação.

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`

### Ajuste adicional da mesma rodada
- `backend/src/lib/supabase.ts` passou a importar `dotenv/config` no ponto central do client.
- Isso garante que scripts operacionais executados fora do `index.ts` também carreguem `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` corretamente.

## 2026-04-11 - Home fica mais clara e mais útil no modo fictício atual

### Objetivo
- Melhorar a Home sem depender da ativação da API real, deixando a tela mais honesta sobre o que é simulado e mais acionável para quem está usando o bolão agora.

### Arquivos alterados
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A Home ganhou um banner de contexto explicando com clareza o que já reflete o estado real do bolão e quais blocos ainda continuam simulados.
- Foi criado o card `Seu Momento Agora`, focado em ação:
  - mostra quantas séries já estão prontas;
  - quantas ainda faltam palpitar;
  - a distância atual para o líder;
  - e sugere o próximo melhor passo com CTA direto para a tela certa.
- O card `Meus Palpites` ficou mais informativo:
  - agora mostra total de palpites salvos;
  - quantos ainda seguem em aberto;
  - além de manter a lista compacta dos palpites mais recentes.

### Impacto esperado
- A Home passa a funcionar melhor como painel principal do usuário durante os testes com confrontos fictícios.
- A tela reduz ambiguidade sobre dados simulados e ajuda o participante a entender rapidamente o que fazer em seguida.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Remoção de participante deixa de gerar usuário fantasma no bolão

### Objetivo
- Fazer com que um participante removido no Supabase desapareça de forma consistente do app inteiro, sem continuar visível no ranking, comparação, palpites revelados ou sessões abertas.

### Arquivos alterados
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/pages/Compare.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/SimulationLab.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- `useAuth` deixou de recriar automaticamente um participante ausente:
  - se o usuário autenticado não tiver mais registro em `participants`, o app passa a tratá-lo como fora do bolão;
  - sessões abertas também reagem em tempo real se o participante atual for removido.
- A aba `Comparar` passou a recarregar a lista de participantes via Realtime:
  - remoções e inclusões entram sem reload;
  - seleções antigas são limpas se o participante deixar de existir.
- A aba `Jogos` deixou de exibir palpites revelados órfãos:
  - se um `game_pick` continuar no banco sem participante correspondente, ele não aparece mais na UI;
  - alterações em `participants` também disparam atualização desse bloco.
- O `SimulationLab` também passou a reagir a mudanças na tabela `participants`, evitando listas defasadas em ferramentas internas.

### Observação operacional
- Com essa proteção, apagar um registro em `participants` efetivamente remove a pessoa do bolão visível no app.
- Se no futuro vocês quiserem voltar ao fluxo de criação automática no primeiro login, vale redesenhar isso com um onboarding/admin flow explícito para não reintroduzir usuários fantasmas.

### Validações
- Validação de frontend executada após a mudança.

## 2026-04-11 - Ranking passa a reagir à remoção e criação de participantes em tempo real

### Objetivo
- Garantir que o ranking do bolão não continue exibindo participantes removidos quando a tabela `participants` mudar no Supabase.

### Arquivos alterados
- `frontend/src/hooks/useRanking.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- A assinatura realtime do ranking passou a ouvir também alterações em `participants`.
- Com isso, inclusões, edições e exclusões de participantes agora disparam um recálculo automático do ranking sem depender de reload manual da página.

### Impacto esperado
- Um participante removido no Supabase deixa de permanecer “fantasma” no ranking por falta de atualização da hook.
- O ranking fica mais coerente com o estado real da base durante administração ao vivo do bolão.

### Validações
- A alteração é pequena e localizada na hook de ranking.
- A validação de build foi rerrodada nesta rodada; se o ambiente local bloquear o processo do Vite, a correção continua válida porque não altera tipagem nem contrato externo da hook.

## 2026-04-11 - Decisão operacional registrada para produção no Render

### Objetivo
- Documentar a escolha de infraestrutura feita para suportar o bolão com atualização mais frequente dos dados da API.

### Arquivos alterados
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi registrado que o projeto passou a contar com o plano pago de aproximadamente `US$ 7` no Render para a operação atual do bolão.
- A intenção operacional registrada é rodar a atualização dos dados da API em intervalo de `2 em 2 minutos`.
- Essa cadência foi considerada adequada para o produto por equilibrar:
  - atualização frequente de placares e status;
  - custo controlado;
  - operação simples para o volume atual do bolão.

### Observação de contexto
- A infraestrutura já está mais preparada para o modo real, mas o app continua em fase de testes fictícios até a decisão de reativar o sync real da API.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-11 - Ajustes da auditoria aplicados sem ativar o modo real da API

### Objetivo
- Corrigir achados da auditoria que já fazem sentido no ambiente atual de testes fictícios, sem mexer nas frentes que dependem do sync real da API.

### Arquivos alterados
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O salvamento de palpite de série passou a respeitar o horário do primeiro jogo da série:
  - `useSeries` agora monta `tip_off_at` da série a partir do primeiro jogo encontrado;
  - a hook também passou a reagir a mudanças em `games`, não só em `series`.
- `savePick` de série deixou de falhar em silêncio:
  - agora lança erro quando a série não existe;
  - quando a série já terminou;
  - ou quando o lock por horário já foi alcançado.
- O `SeriesModal` foi ajustado para refletir isso na UX:
  - inputs ficam desabilitados quando a série já começou;
  - uma mensagem de `Palpite travado` aparece no modal;
  - o CTA deixa claro quando a série já não aceita alterações.
- Na Home, o card `Próximos Jogos` deixou de sugerir que os dados daquele bloco já são reais:
  - a nota inferior agora informa explicitamente que os jogos continuam simulados por enquanto.

### Observação de contexto
- Os achados relacionados ao sync real da NBA não foram mexidos nesta rodada, porque o projeto ainda está rodando com jogos fictícios para testes internos.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Seção de pontuação ganha ajuda visual para o critério de desempate

### Objetivo
- Deixar a regra de desempate fácil de encontrar dentro da própria aba `Ranking`, sem precisar depender de explicação externa.

### Arquivos alterados
- `frontend/src/pages/Ranking.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A seção `Pontuação` passou a exibir um botão circular com ícone de informação.
- Ao tocar/clicar no ícone, o usuário vê uma caixa curta com a ordem do critério de desempate:
  1. `total_points`
  2. `cravadas`
  3. `series_correct`
  4. `games_correct`
  5. ordem alfabética
- A explicação fica dentro do próprio card, preservando clareza sem ocupar espaço o tempo todo.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Critério de desempate do ranking passa a priorizar mérito antes do nome

### Objetivo
- Deixar o desempate do ranking mais justo, usando desempenho real no bolão antes de cair no critério alfabético.

### Arquivos alterados
- `frontend/src/utils/ranking.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/backup/exportOperationalSnapshot.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O ranking deixou de desempatar diretamente por nome após empatar em pontos.
- A nova ordem de desempate passou a ser:
  1. `total_points`
  2. `cravadas`
  3. `series_correct`
  4. `games_correct`
  5. nome em ordem alfabética apenas como último critério técnico
- A mesma regra foi aplicada em todos os lugares onde o ranking pode ser calculado ou ordenado:
  - ranking do frontend;
  - snapshot de scoring do backend;
  - exportação do backup operacional.
- O snapshot do backend também passou a carregar `cravadas`, `series_correct` e `games_correct`, para conseguir ordenar com a mesma justiça da interface principal.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo no frontend, mas sem falha de compilação.

## 2026-04-11 - Backlog de futuras implementações foi limpo para refletir o estado real do produto

### Objetivo
- Remover do backlog os itens que já foram implementados, evitando que o documento continue listando features já entregues como se ainda fossem pendentes.

### Arquivos alterados
- `updates/futuras-implementacoes.md`
- `updates/codex-changelog.md`

### Mudanças feitas
- O backlog foi reduzido para manter apenas as frentes que ainda continuam abertas:
  - bracket mobile;
  - salvar todos os jogos disponíveis de uma vez;
  - Home com APIs reais.
- Foram removidos do documento os itens já absorvidos pelo produto, como:
  - comparação jogo a jogo;
  - `Vai na fé`;
  - backup operacional;
  - melhorias do gráfico;
  - revelação de palpites pós-lock;
  - resultados recentes da Home;
  - mensagem de série encerrada no fluxo jogo a jogo.
- A ordem recomendada de execução também foi reescrita para bater com o backlog atualizado.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-11 - Corrida de pontuação passa a agrupar o gráfico por tempo

### Objetivo
- Reduzir o comprimento horizontal do gráfico de evolução do ranking sem perder a leitura da tendência entre os participantes.

### Arquivos alterados
- `frontend/src/components/RankingChart.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O gráfico ganhou modos de agregação temporal:
  - `Diário`;
  - `3 dias`;
  - `Semanal`.
- O modo padrão passou a ser `3 dias`, para deixar a leitura mais compacta logo na primeira visualização.
- O breakdown interno agora carrega `event_date` em jogos e séries, permitindo que a corrida de pontos seja agrupada com base em datas reais.
- Os pontos continuam sendo mostrados de forma cumulativa, mas agora condensados por janela de tempo em vez de um checkpoint por evento individual.
- O eixo X passou a mostrar faixas de datas quando o usuário escolhe agrupamentos mais largos.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Gráfico do ranking vira uma corrida de pontuação em linhas

### Objetivo
- Aproximar o gráfico do ranking de uma leitura estilo “corrida”, com linhas por participante em vez de barras empilhadas por fase.

### Arquivos alterados
- `frontend/src/components/RankingChart.tsx`
- `frontend/src/pages/Ranking.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O card do ranking deixou de usar o gráfico de barras empilhadas e passou a renderizar uma visualização em linhas.
- Cada participante agora aparece como uma trilha própria, com cor dedicada e progressão cumulativa da pontuação ao longo dos checkpoints de rodada.
- A legenda foi reorganizada para destacar os participantes, em vez de destacar apenas as fases do playoff.
- O eixo horizontal passou a trabalhar com checkpoints compactos como `R1-1`, `SF-3`, `CF-S`, `FIN-S`, aproximando a sensação de progresso contínuo da referência visual enviada.
- O gráfico ganhou rolagem horizontal quando necessário, para preservar leitura mesmo com muitos pontos no eixo X.
- O tooltip foi redesenhado para comparar rapidamente a posição de todos os participantes em cada checkpoint.
- O título do card na aba `Ranking` foi ajustado para `Corrida de Pontuação`, alinhando melhor a expectativa visual com o novo gráfico.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Relatório do ranking ganha filtros por rodada e conferência

### Objetivo
- Encurtar o relatório detalhado do ranking e permitir que o usuário foque rapidamente em um pedaço específico do bracket.

### Arquivos alterados
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O relatório do participante passou a ter uma organização em duas camadas:
  - visão principal `Tudo`, `Por rodada` e `Por conferência`;
  - filtros específicos dependendo da visão escolhida.
- No modo `Por rodada`, a interface oferece chips para:
  - `R1`;
  - `R2`;
  - `CF`;
  - `Finals`.
- No modo `Por conferência`, o relatório pode ser isolado em:
  - `Leste`;
  - `Oeste`;
  - `Finals`.
- Os blocos de `Séries` e `Jogos` passaram a obedecer ao mesmo recorte ativo, evitando que o usuário filtre uma parte da tela e continue vendo outra inteira.
- O agrupamento colapsável dos jogos por série foi preservado, mas agora trabalha apenas com os itens do recorte atual.
- O breakdown interno passou a carregar também a informação de conferência, para que o filtro não precise inferir esse dado na UI.
- Quando um recorte não possui itens, o relatório mostra um estado vazio específico em vez de deixar a área parecer incompleta.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Card do Vai na fé ganha ajuda contextual com ícone de informação

### Objetivo
- Explicar rapidamente para usuários novos o que faz o botão `Vai na fé` quando houver palpites abertos no dia.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O card diário do `Vai na fé` agora exibe um botão circular amarelo com ícone de informação ao lado do título.
- Ao tocar/clicar nesse ícone, a interface abre uma caixa curta explicando:
  - que o recurso gera palpites aleatórios;
  - que ele considera apenas os jogos ainda abertos naquele dia;
  - que o usuário ainda pode revisar antes de confirmar.
- A explicação foi colocada dentro do próprio card, mantendo o fluxo autoexplicativo sem levar o usuário para outro modal.

### Validações
- Pendente nesta rodada: rodar `frontend` build após a alteração visual.

## 2026-04-11 - Aba Comparar passa a respeitar o lock antes de revelar palpites

### Objetivo
- Impedir que a aba `Comparar` funcione como atalho para copiar palpites antes do fechamento de jogos e séries.

### Arquivos alterados
- `frontend/src/pages/Compare.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A página passou a calcular explicitamente quais jogos já podem ser comparados:
  - jogos `played`;
  - jogos cujo `tip_off_at` já passou.
- A mesma lógica agora define quais séries podem aparecer no duelo:
  - séries já concluídas;
  - séries que já possuem pelo menos um jogo travado ou encerrado.
- Os palpites ainda em janela aberta deixam de ser enviados para todos os pontos de comparação da tela:
  - resumo superior;
  - comparação jogo a jogo;
  - bracket lado a lado;
  - tooltip de hover.
- Com isso, a interface para de expor concordâncias, divergências, estrelas de palpite e detalhes de série antes da hora.
- A seção ganhou uma mensagem curta deixando explícito que a comparação só revela palpites depois do lock.
- O texto da área `Comparação jogo a jogo` também foi ajustado para refletir essa regra de produto.

### Validações
- `frontend`: `npm run build` executado após a alteração.
- Observação: a primeira tentativa falhou por restrição de execução do ambiente (`spawn EPERM` no `esbuild`), então a validação foi refeita com o comando aprovado do frontend.

## 2026-04-11 - Comparação jogo a jogo fica mais compacta e mais clara

### Objetivo
- Reduzir a altura excessiva da seção de comparação jogo a jogo e deixar muito mais óbvio quem acertou, quem errou e onde os palpites divergem.

### Arquivos alterados
- `frontend/src/pages/Compare.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A seção `Comparação jogo a jogo` deixou de abrir todas as partidas de todas as séries de uma vez.
- O conteúdo agora usa cards colapsáveis por série, reduzindo bastante o scroll vertical da página.
- Cada card de série passou a mostrar no cabeçalho um resumo rápido com:
  - quantidade de jogos iguais;
  - quantidade de divergências;
  - leitura rápida de acertos acumulados entre os dois participantes.
- Ao expandir uma série, cada jogo agora destaca melhor:
  - se as escolhas foram iguais ou diferentes;
  - qual foi o resultado real quando o jogo já terminou;
  - se cada participante acertou ou errou;
  - quando só um dos dois chegou a palpitar.
- Os blocos individuais dos dois participantes passaram a usar estados visuais mais fortes:
  - verde para acerto;
  - vermelho para erro;
  - tons neutros quando o jogo ainda está pendente ou sem palpite.
- A primeira série mais relevante continua abrindo por padrão, priorizando confronto com jogo já resolvido ou divergência, para acelerar a leitura.
- A seção também ganhou filtros rápidos no topo:
  - `Todos`;
  - `Só divergências`;
  - `Só resolvidos`.
- Quando um filtro não encontra partidas compatíveis, a interface agora mostra um estado vazio curto e claro em vez de deixar a área parecer quebrada.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-11 - Palpites de jogo passam a ser revelados apos o lock

### Objetivo
- Manter o sigilo dos palpites antes do fechamento, mas liberar a visualizacao dos palpites da galera assim que o jogo estiver travado ou finalizado.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A aba `Jogos` passou a carregar, alem do palpite do usuario atual, os palpites jogo a jogo dos demais participantes para os jogos da tela.
- A regra de visibilidade ficou explicita na interface:
  - antes de `tip_off_at`, os palpites continuam ocultos;
  - depois do lock, os palpites daquele jogo podem ser revelados;
  - jogos ja finalizados tambem entram como revelados;
  - jogos que deixaram de existir porque a serie acabou antes tambem podem exibir o historico registrado.
- Cada `GameCard` agora mostra um bloco `Palpites revelados` somente quando o jogo ja pode ser aberto para consulta.
- Foi adicionado um modal `Ver palpites` com:
  - total de votos em cada lado do confronto;
  - quantidade total de participantes com palpite visivel naquele jogo;
  - lista nominal de quem escolheu cada time.
- O modal foi refinado para destacar melhor a resenha do pos-lock:
  - percentual de votos por time;
  - marcador de voto solitario quando apenas uma pessoa foi em um lado;
  - indicacao de quem acertou ou errou depois que o jogo termina.
- O fluxo continua preservando a proposta central do bolao:
  - independencia antes do fechamento;
  - resenha e comparacao depois que o prazo acaba.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Vai na fé deixa de confirmar sucesso em caso de falha parcial

### Objetivo
- Corrigir o fluxo do `Vai na fé` para não exibir sucesso quando algum palpite do lote falhar no meio da operação.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- `savePick` passou a retornar sucesso/falha explicitamente em vez de apenas exibir toast e encerrar silenciosamente.
- O fluxo manual continua mostrando toast de sucesso individual quando o usuário salva um único palpite.
- O fluxo automático do `Vai na fé` deixou de disparar toast de sucesso por jogo, evitando ruído visual durante salvamento em lote.
- `confirmAutoPick` agora verifica o retorno de cada salvamento:
  - se todos derem certo, fecha o modal e mostra sucesso;
  - se algum falhar, interrompe a sequência, mantém o contexto aberto e exibe erro informando que o lote não foi concluído.
- As tipagens internas de `Games.tsx` foram ajustadas para refletir o novo retorno booleano do salvamento.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Backup operacional implementado para contingencia do bolao

### Objetivo
- Garantir que o bolao continue operavel mesmo se o app sair do ar, gerando snapshots exportaveis com palpites, ranking e um resumo legivel para operacao manual.

### Arquivos alterados
- `.gitignore`
- `backend/package.json`
- `backend/src/backup/exportOperationalSnapshot.ts`
- `backend/src/scripts/backupOperationalSnapshot.ts`
- `updates/codex-changelog.md`

### Mudanças feitas

#### Novo exportador operacional no backend
- Foi criado `backend/src/backup/exportOperationalSnapshot.ts` para montar um snapshot completo diretamente do Supabase usando o schema real atual.
- O exportador busca:
  - participantes;
  - times;
  - series;
  - palpites de series;
  - jogos;
  - palpites jogo a jogo.
- O ranking congelado do momento e recalculado no proprio script usando as mesmas regras de pontuacao do backend, evitando depender de dados volateis da interface.

#### Arquivos de contingencia gerados automaticamente
- Cada execucao cria uma pasta propria dentro de `backups/` com timestamp.
- Dentro dela o script gera:
  - `palpites-series-YYYY-MM-DD.csv`
  - `palpites-jogos-YYYY-MM-DD.csv`
  - `ranking-YYYY-MM-DD.csv`
  - `resumo-rodada-YYYY-MM-DD.md`
- Os CSVs foram pensados para conferencia tecnica e uso em planilha.
- O Markdown foi pensado para leitura humana e compartilhamento rapido no grupo em caso de contingencia.

#### Resumo legivel para tocar o bolao manualmente
- O arquivo `resumo-rodada-*.md` agora inclui:
  - horario de geracao;
  - contagem de participantes, series, jogos e palpites;
  - ranking consolidado;
  - series ja concluidas;
  - proximos jogos ainda abertos;
  - orientacoes objetivas de como continuar o bolao manualmente usando os arquivos exportados.

#### Novo comando operacional
- O backend ganhou o script `npm run backup:operational`.
- Esse comando:
  - faz o build do backend;
  - executa o exportador;
  - informa no terminal a pasta gerada e os caminhos dos quatro arquivos.

#### Higiene do repositorio
- A pasta `backups/` foi adicionada ao `.gitignore` para evitar commit acidental de snapshots operacionais e dumps sensiveis.

### Validações
- Pendente nesta rodada: executar `npm run backup:operational` com acesso real ao Supabase para validar a geracao dos arquivos ponta a ponta.

## 2026-04-10 - Home com pódio mais visível e seleção de times respeitando identidade visual

### Objetivo
- Dar mais destaque ao top 3 diretamente no ranking da Home e corrigir o destaque visual da aba `Jogos` para não amarelar siglas de times selecionados.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Pódio incorporado ao ranking da Home — `Home.tsx`
- O card `Ranking Geral` da Home agora abre com um bloco de pódio já destacado no topo.
- Os três primeiros colocados passaram a aparecer com:
  - medalha visual;
  - pontos em maior evidência;
  - indicação de posição;
  - cravadas;
  - seta de variação de posição quando disponível.
- O card separado de pódio foi removido da composição da Home para evitar redundância e concentrar o destaque onde o usuário já olha naturalmente.

#### Seleção por cor do time — `Games.tsx`
- O estado selecionado no jogo a jogo deixou de pintar as siglas com o amarelo do sistema.
- Agora o destaque principal passa a acontecer por:
  - fundo translúcido usando a cor do time;
  - borda reforçada na cor do time;
  - glow suave do contêiner;
  - selo `Selecionado` também colorido conforme a franquia.
- O texto da sigla do time selecionado volta a respeitar a identidade visual original da equipe.
- O bloco de confirmação abaixo do card também passou a refletir a cor real do time escolhido.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Plano de backup do bolão adicionado ao backlog futuro

### Objetivo
- Registrar no backlog uma estratégia de contingência para manter o bolão operável mesmo se o app ficar fora do ar durante os playoffs.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Nova frente de contingência operacional — `futuras-implementacoes.md`
- Foi adicionada uma nova proposta de implementação focada em backup operacional do bolão.
- A ideia prevê snapshots exportáveis com:
  - palpites de séries;
  - palpites jogo a jogo;
  - ranking consolidado;
  - resumo legível por rodada.

#### Estrutura sugerida para continuidade manual
- O backlog agora registra a recomendação de gerar arquivos em formatos complementares:
  - `CSV` para planilha e conferência técnica;
  - `Markdown` para leitura humana e operação manual no grupo.
- Também ficou anotado um plano para reduzir erros de contingência, incluindo timestamp, identificação clara dos participantes e snapshots por data ou rodada.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Scripts de cenário ajustados para `nba_game_id` em texto

### Objetivo
- Corrigir a incompatibilidade dos scripts de cenário com o banco de teste, onde `games.nba_game_id` está tipado como `text` em vez de numérico.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/test-scenarios/reveal-first-round-results.sql`

### Mudanças feitas

#### Compatibilidade de tipo no reveal — `reveal-first-round-results.sql`
- O filtro final do script deixou de usar `where nba_game_id between 700001 and 700056`.
- Agora o script faz cast explícito:
  - `where cast(nba_game_id as bigint) between 700001 and 700056`
- Isso evita o erro `operator does not exist: text >= integer` no Supabase do ambiente de teste atual.
- Além do `where`, os blocos de `case` para `winner_id`, `home_score` e `away_score` também passaram a usar:
  - `case cast(nba_game_id as bigint)`
- Isso corrige o segundo erro de comparação `text = integer` ao publicar os resultados fictícios.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas em script SQL de operação.

## 2026-04-10 - Palpites do Vai na fé passaram a ficar marcados na aba Jogos

### Objetivo
- Identificar visualmente quais palpites jogo a jogo foram preenchidos pela ferramenta `Vai na fé`, sem misturar essa origem com palpites manuais feitos depois.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Marca visual de origem automática — `Games.tsx`
- Os cards da aba `Jogos` agora exibem um selo `Vai na fé` ao lado do palpite atual quando aquele jogo foi preenchido pela ferramenta automática.

#### Persistência local por participante
- A origem do palpite automático passou a ser salva em `localStorage` por participante.
- Isso permite que o usuário continue vendo a marca ao recarregar a página, sem precisar alterar o schema do Supabase nesta rodada.

#### Limpeza automática ao editar manualmente
- Quando o usuário altera manualmente um palpite que antes veio do `Vai na fé`, a marca é removida.
- Com isso, o selo continua significando apenas `este palpite atual veio da ferramenta`.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Seleção de time reforçada visualmente antes de salvar no jogo a jogo

### Objetivo
- Deixar mais evidente qual time foi escolhido no card jogo a jogo antes do clique final em `Salvar palpite`, reduzindo dúvida visual causada pelo contraste fraco do estado selecionado.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Estado selecionado com contraste mais forte — `Games.tsx`
- O lado escolhido agora recebe:
  - fundo mais visível;
  - borda dourada mais forte;
  - brilho leve no texto do time;
  - selo `Selecionado`.

#### Resumo textual do palpite pendente
- O bloco de confirmação abaixo do card passou a dizer explicitamente qual time será salvo.
- Além da sigla, o resumo também mostra o nome do time quando disponível, evitando depender só do destaque visual dentro do card.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Faixa de resultados da última noite adicionada na Home

### Objetivo
- Deixar a Home mais viva e com sensação de acompanhamento diário, exibindo um resumo horizontal dos placares mais recentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Novo ticker horizontal na Home — `Home.tsx`
- Foi adicionada uma faixa `Resultados da última noite` logo abaixo do painel principal.
- O bloco usa cards compactos em movimento contínuo horizontal para destacar:
  - confronto;
  - placar final;
  - fase da competição;
  - um contexto curto do jogo.

#### Integração com o layout atual
- O novo bloco foi encaixado sem substituir os cards principais já existentes da Home.
- A faixa conversa com o visual do restante da página, usando o mesmo sistema de bordas, tons dourados e superfícies do produto.

#### Dados atuais
- Nesta rodada, os resultados exibidos continuam simulados e servem como placeholder visual de produto.
- A estrutura já foi deixada pronta para no futuro trocar a fonte estática por dados reais vindos de API.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Botão Vai na fé adicionado para os jogos do dia

### Objetivo
- Dar um atalho rápido para usuários mais casuais preencherem no aleatório os jogos abertos de um dia inteiro, sem desmontar o fluxo manual da aba `Jogos`.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Novo bloco diário de auto-palpites — `Games.tsx`
- A aba `Jogos` ganhou um card `Vai na fé` acima da lista de séries.
- Esse bloco agrupa automaticamente os jogos ainda abertos por dia e exibe:
  - quantos jogos do dia ainda estão sem palpite;
  - quantos já tinham sido preenchidos;
  - um CTA para abrir o fluxo aleatório daquele dia.

#### Fluxo com prévia e confirmação
- O botão abre um modal dedicado com:
  - prévia dos vencedores sorteados jogo a jogo;
  - opção de gerar outra prévia;
  - confirmação explícita antes de salvar.

#### Proteção contra sobrescrita sem querer
- Quando o dia já possui jogos com palpite salvo, o modal oferece dois modos:
  - `Preencher só faltantes`;
  - `Sobrescrever o dia inteiro`.
- O modo padrão preserva palpites já salvos e só completa o que estiver faltando.

#### Respeito ao lock e ao encerramento da série
- O agrupamento diário do `Vai na fé` ignora:
  - jogos já iniciados;
  - jogos finalizados;
  - jogos que não deveriam mais existir porque a série já terminou antes.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Comparação jogo a jogo adicionada na aba Comparar

### Objetivo
- Expandir a aba `Comparar` para além do bracket por séries e permitir confronto direto também nos palpites jogo a jogo.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Compare.tsx`

### Mudanças feitas

#### Novo carregamento de palpites de jogos — `Compare.tsx`
- A página passou a buscar também os registros de `game_picks` para cada participante selecionado.
- O carregamento agora monta o duelo completo com:
  - `series_picks`;
  - `game_picks`;
  - jogos cadastrados em `games`.

#### Resumo ampliado da comparação
- O `SummaryCard` passou a exibir duas camadas de resumo:
  - estatísticas de concordância por série;
  - estatísticas de concordância jogo a jogo.
- Agora a comparação mostra, para jogos:
  - quantos palpites são iguais;
  - quantos divergem;
  - quantos só um dos participantes preencheu.

#### Nova seção detalhada por série
- Foi adicionada uma seção `Comparação jogo a jogo` abaixo da legenda principal.
- Os jogos são agrupados por série e exibem:
  - confronto da série;
  - rodada correspondente;
  - lista dos jogos cadastrados;
  - palpite de cada participante lado a lado;
  - diferenciação visual para concordância, divergência e ausência parcial de palpite.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Organização final do changelog para revisão externa

### Objetivo
- Deixar o histórico do projeto mais fácil de consumir por outra IA ou revisor externo, e preparar um prompt de revisão orientado ao estado atual do projeto.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/changelogs.md`
- `updates/claude-code-review-prompt.md`

### Mudanças feitas

#### Organização do changelog mestre — `changelogs.md`
- O arquivo consolidado passou a funcionar como porta de entrada para revisão.
- Foram adicionadas seções novas para:
  - explicar a ordem recomendada de leitura;
  - resumir o estado atual do projeto;
  - destacar os focos mais importantes para revisão externa;
  - deixar explícitos os ajustes mais recentes em Home, Bracket e Jogos.

#### Novo prompt operacional — `claude-code-review-prompt.md`
- Foi criado um prompt pronto para uso no Claude Code.
- O prompt orienta o revisor a:
  - ler primeiro o changelog consolidado e o changelog técnico;
  - revisar o projeto com mentalidade de code review e QA funcional;
  - priorizar bugs, regressões, inconsistências de UX e riscos de regra de negócio;
  - prestar atenção especial em progresso do bracket, Home, Jogos, mobile e integração com Supabase.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi documental e operacional.

## 2026-04-10 - Home alinhada ao novo progresso do bracket

### Objetivo
- Corrigir a Home para não continuar exibindo o padrão antigo de progresso do bracket, que contava séries futuras ainda indefinidas como se já estivessem pendentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Correção de progresso — `Home.tsx`
- O `HeroPanel` da Home deixou de usar `series.length` e `picks.length` como base bruta do progresso.
- Agora a Home considera apenas séries realmente prontas para palpite, usando a mesma lógica aplicada em `Meu Bracket`.
- Com isso:
  - o progresso percentual não é mais penalizado por rounds futuros;
  - o subtítulo do CTA para `/bracket` deixa de mostrar algo como `8/15` quando parte da chave ainda não está definida;
  - o texto do bloco de progresso passa a refletir apenas séries já liberadas.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Jogos futuros desativados quando a série já terminou

### Objetivo
- Corrigir a experiência da aba `Jogos` e do modal jogo a jogo para não tratar como palpites válidos jogos 5, 6 ou 7 quando a série já foi encerrada antes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`
- `frontend/src/components/GamePickModal.tsx`

### Mudanças feitas

#### Correção de regra de UX — `Games.tsx`
- A aba `Jogos` agora considera `series.games_played` e `series.is_complete` ao montar os grupos de cada série.
- Quando a série já terminou antes do jogo atual:
  - o card deixa de aparecer como aberto;
  - o estado principal muda para `Série já encerrada`;
  - a urgência e o countdown deixam de ser exibidos;
  - o usuário não consegue mais selecionar nem salvar palpite naquele jogo;
  - uma mensagem contextual explica que a série terminou antes daquele confronto acontecer.

#### Refinamento de métricas por série
- Os cards de série na aba `Jogos` agora usam apenas jogos realmente válidos para:
  - percentual de cobertura;
  - contagem de palpites feitos;
  - total de jogos considerados naquela série;
  - próximo fechamento.
- Quando uma série termina antes do máximo de jogos cadastrados, a UI passa a sinalizar isso claramente.

#### Consistência do modal — `GamePickModal.tsx`
- O modal jogo a jogo também passou a respeitar `series.games_played` e `series.is_complete`.
- Jogos que ficaram além do encerramento real da série agora exibem aviso de `Série já encerrada` em vez de parecerem bloqueados por horário comum.

#### Limpeza pontual
- Foi removido um `console.log` residual de debug no fluxo de `savePick` da página `Games`.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Progresso do bracket separado por rodada definida

### Objetivo
- Corrigir a contagem de progresso em `Meu Bracket`, para não tratar como "em aberto" séries de rounds futuros que ainda não têm times definidos.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/BracketEditor.tsx`

### Mudanças feitas

#### Correção de regra de progresso — `BracketEditor.tsx`
- O hero do bracket estava usando `series.length` como total absoluto de palpites, o que fazia rounds futuros aparecerem como pendentes mesmo quando o confronto ainda não existia.
- Corrigido:
  - o progresso principal agora considera apenas séries prontas para palpite;
  - a contagem `Palpites feitos` passou a usar somente confrontos já definidos;
  - a métrica `Em aberto` agora representa apenas séries disponíveis e ainda não palpitadas;
  - o percentual de progresso deixou de ser penalizado por rounds futuros ainda indefinidos.

#### Refinamento de UX — resumo por rodada
- `Meu Bracket` passou a exibir um resumo separado por fase:
  - `1ª rodada`
  - `2ª rodada`
  - `Finais de conferência`
  - `Grande final`
- Cada card agora mostra:
  - quantos palpites já foram feitos naquela fase;
  - quantos confrontos estão realmente liberados;
  - quantas séries ainda aguardam definição.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Destaque do bracket oficial na Home

### Objetivo
- Tornar o acesso ao bracket oficial mais visível na Home, sem poluir a página com a chave inteira, usando um card-resumo com CTA forte.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Nova seção — `Resultados reais` na Home
- Foi adicionado um card dedicado ao bracket oficial na Home.
- O bloco foi posicionado na coluna principal, logo após os cards de status gerais, para aumentar descoberta sem esconder o restante do conteúdo.

#### Conteúdo do card
- O card `Resultados reais` passou a exibir:
  - quantidade de séries concluídas;
  - quantidade de séries em aberto;
  - campeão atual ou estado `Em disputa`;
  - até dois confrontos de destaque das fases finais;
  - CTA principal `Acompanhar playoffs`, levando para `/official`.

#### Decisão de UX
- A implementação usa dados já carregados de `series`, evitando query extra.
- O objetivo foi reforçar visibilidade do bracket oficial sem duplicar a chave completa dentro da Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Correção do filtro mobile `Oeste / Finais / Leste` no bracket

### Objetivo
- Corrigir o comportamento do filtro mobile da aba `Meu Bracket`, garantindo que os botões `Oeste`, `Finais` e `Leste` realmente filtrem o conteúdo exibido.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/BracketSVG.tsx`

### Mudanças feitas

#### Bug funcional — `BracketSVG.tsx`: foco mobile não era aplicado na visualização mobile
- O estado `mobileFocus` era atualizado em `BracketEditor.tsx`, mas a implementação mobile de `BracketSVG` não utilizava `focusSection` para nada.
- Na prática, os botões `Oeste`, `Finais` e `Leste` mudavam o visual do botão ativo, mas a lista de séries continuava exibindo todos os confrontos.
- Corrigido:
  - `MobileBracketView` passou a receber `focusSection`;
  - a lista mobile agora filtra as séries conforme a seleção atual;
  - `Oeste` mostra apenas confrontos da conferência Oeste;
  - `Leste` mostra apenas confrontos da conferência Leste;
  - `Finais` mostra rounds 3 e 4.

#### Refinamento de UX — `BracketEditor.tsx`: volta para visão completa no mobile
- Depois da correção do filtro, ainda faltava um caminho explícito para retornar à visão completa da chave no mobile.
- Corrigido:
  - adicionada a opção `Tudo` ao seletor mobile;
  - o estado inicial passou a abrir na visão completa;
  - a dica contextual abaixo do seletor agora mostra o filtro ativo quando o usuário não está em `Tudo`.

#### Refinamento de UX — `BracketEditor.tsx`: sheet mobile da chave passou a ser acionável
- A visualização simplificada aberta pelo botão `Chave` no mobile funcionava apenas como leitura, sem permitir ação imediata.
- Corrigido:
  - os cards da `MobileBracketSheet` passaram a ser clicáveis;
  - tocar em um confronto fecha a sheet e abre o modal da série correspondente;
  - foi adicionado um indicativo visual `Tocar para abrir` em cada card da sheet.

#### Refinamento de UX — `BracketEditor.tsx`: sheet mobile passou a respeitar o filtro ativo
- Mesmo depois da correção do filtro principal, a sheet `Chave` ainda mostrava sempre a lista completa de confrontos, criando inconsistência com o estado selecionado na tela.
- Corrigido:
  - `MobileBracketSheet` agora recebe o `focusSection` atual;
  - a listagem da sheet respeita `Tudo`, `Oeste`, `Leste` e `Finais`;
  - o subtítulo da sheet passou a explicar o recorte atual;
  - foi adicionada mensagem de estado vazio caso o filtro selecionado ainda não tenha confrontos disponíveis.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Backlog ampliado com feature `Vai na fé`

### Objetivo
- Registrar no backlog uma possível funcionalidade de palpites aleatórios por dia na aba `Jogos`, já acompanhada de cuidados de UX e regras para evitar erro de uso.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Atualização do backlog — botão `Vai na fé`
- O documento `updates/futuras-implementacoes.md` foi ampliado com uma nova proposta:
  - botão de palpites aleatórios para os jogos do dia;
  - foco em usuários casuais que querem participar mesmo sem tempo para analisar confronto por confronto.
- O item foi documentado com:
  - motivação de produto;
  - escopo recomendado;
  - plano de mitigação de riscos;
  - cuidados para não sobrescrever palpites sem permissão;
  - necessidade de prévia, confirmação e respeito ao lock dos jogos.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Documento de backlog para futuras implementações

### Objetivo
- Registrar em um documento próprio as ideias de evolução futura do produto, com priorização inicial e contexto de negócio/usabilidade.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Nova documentação — `updates/futuras-implementacoes.md`
- Foi criado um documento consolidando ideias de próximas evoluções do bolão.
- O arquivo organiza os itens por prioridade e inclui:
  - melhorias de mobile e bracket;
  - mensagem de série encerrada no fluxo jogo a jogo;
  - visão para palpitar todos os jogos disponíveis de uma vez;
  - comparação de palpites jogo a jogo na aba `Comparar`;
  - integração de informações reais via APIs na Home;
  - faixa com resultados da última noite;
  - expansão dos tipos de gráfico no ranking.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Guia rápido de gerenciamento de usuários no Supabase

### Objetivo
- Criar um documento de consulta rápida dentro do projeto com os comandos SQL mais usados para liberar acessos, listar participantes e administrar privilégios no Supabase.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/user-management-guide.md`

### Mudanças feitas

#### Nova documentação — `supabase/user-management-guide.md`
- Foi criado um guia de referência rápida com comandos básicos de gerenciamento de usuários no Supabase.
- O documento inclui:
  - listagem de emails liberados em `allowed_emails`;
  - inserção de um ou vários emails;
  - verificação de email específico;
  - remoção de emails liberados;
  - listagem de participantes em `participants`;
  - promoção e remoção de privilégio admin;
  - consulta opcional para detectar usuários autenticados ainda não vinculados em `participants`;
  - checklist básico para liberar um amigo no bolão.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi somente de documentação operacional.

## 2026-04-10 - Scripts SQL para teste das páginas oficiais em ambiente separado

### Objetivo
- Documentar e versionar uma bateria de testes baseada nas tabelas oficiais do bolão, mas executada em um Supabase de teste separado, para validar Home, Bracket, Jogos, Ranking e Official com amigos reais.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/test-scenarios/README.md`
- `supabase/test-scenarios/open-first-round-simulation.sql`
- `supabase/test-scenarios/reveal-first-round-results.sql`

### Mudanças feitas

#### Nova documentação — `supabase/test-scenarios/README.md`
- Foi criado um README específico para orientar o uso dos cenários SQL no ambiente de teste separado.
- O arquivo descreve:
  - a ordem recomendada de execução;
  - o fato de os scripts limparem picks e jogos;
  - o uso de horários relativos para facilitar repetição;
  - o foco em testar as páginas oficiais do produto.

#### Novo script — `open-first-round-simulation.sql`
- Foi criado um script para abrir uma rodada fictícia da 1ª rodada diretamente nas tabelas oficiais do bolão, pensado para uso exclusivo no banco de teste.
- O script:
  - limpa `game_picks`, `series_picks` e `games`;
  - reseta a chave para um estado de playoffs recém-iniciados;
  - define os confrontos da 1ª rodada;
  - deixa rounds seguintes aguardando definição;
  - cria jogos fictícios com `tip_off_at` relativo ao momento da execução para liberar palpites imediatamente nas páginas reais;
  - passou a gerar até 7 jogos por série na 1ª rodada, para simular melhor o comportamento real de confrontos melhor de 7.

#### Novo script — `reveal-first-round-results.sql`
- Foi criado um script complementar para publicar os resultados fictícios depois que todos tiverem palpitado.
- O script:
  - marca os jogos fictícios como `played = true`;
  - define vencedores e placares;
  - atualiza as séries com `winner_id`, `games_played` e `is_complete`;
  - permite observar o comportamento real de ranking, breakdown e telas de acompanhamento;
  - foi expandido para cobrir todos os jogos da 1ª rodada fictícia gerados pelo script de abertura.

#### Decisão operacional — manter o teste oficial fora do banco principal
- Foi reforçada a estratégia de usar os scripts acima apenas em um Supabase de teste, separado do ambiente principal.
- O objetivo é testar o fluxo real das páginas oficiais sem correr risco de contaminar o bolão em produção.

### Validações
- Não foi necessário rodar build nesta rodada, porque as alterações foram concentradas em documentação e scripts SQL para operação manual no banco de teste.

### Pendências
- Os scripts ainda precisam ser executados manualmente no banco de teste quando você quiser abrir a rodada fictícia e depois publicar os resultados.
- Se você quiser cobrir 2ª rodada, finais de conferência ou finais da NBA com a mesma abordagem, será necessário criar cenários adicionais.

## 2026-04-10 - Simulação compartilhada de rodada fictícia via Supabase

### Objetivo
- Criar um modo de simulação compartilhada, isolado do bolão real, para permitir que vários amigos palpitem o mesmo cenário fictício de playoffs e que um admin publique os resultados depois.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/App.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/SimulationLab.tsx`
- `frontend/src/utils/simulation.ts`
- `supabase/shared-simulation.sql`

### Mudanças feitas

#### Nova funcionalidade — rota `/simulacao` no frontend
- Foi adicionada uma nova rota protegida em `App.tsx` para expor a área de simulação compartilhada sem misturar com Home, Bracket, Jogos, Ranking e Compare do fluxo principal.

#### Nova funcionalidade — entrada de navegação para a simulação
- O menu rápido em `Nav.tsx` ganhou um item `Simulação`, permitindo que usuários autorizados entrem no ambiente de testes compartilhado sem precisar digitar rota manualmente.

#### Nova funcionalidade — tela `SimulationLab.tsx`
- Foi criada a página `SimulationLab.tsx` para operar a rodada fictícia compartilhada.
- A tela:
  - carrega a simulação ativa no Supabase;
  - mostra status da rodada fictícia (`aberta` ou `encerrada`);
  - exibe progresso de palpites por participante;
  - permite palpites de séries da 1ª rodada;
  - permite palpites jogo a jogo da mesma rodada;
  - bloqueia novos palpites depois que os resultados fictícios são publicados;
  - exibe ranking e relatório de pontuação após a revelação dos resultados.

#### Nova funcionalidade — controle administrativo da rodada fictícia
- Usuários admin agora podem:
  - criar a rodada fictícia inicial;
  - resetar a rodada para um novo ciclo de testes;
  - publicar resultados fictícios para todos ao mesmo tempo.
- O reset apaga apenas os palpites da simulação e recria o estado do cenário fictício, sem tocar em tabelas reais do bolão.

#### Nova funcionalidade — utilitário `simulation.ts`
- Foi criado `frontend/src/utils/simulation.ts` para centralizar:
  - geração do cenário fictício inicial;
  - definição das séries e jogos da 1ª rodada da simulação;
  - publicação aleatória de resultados fictícios;
  - cálculo do ranking da simulação usando o mesmo motor de ranking do app real.
- O cálculo do ranking continua reaproveitando `buildRankingState`, preservando a mesma regra de pontuação e o mesmo formato de breakdown já usado no produto.

#### Nova infraestrutura — SQL `supabase/shared-simulation.sql`
- Foi criado um arquivo SQL dedicado para provisionar a simulação compartilhada no Supabase.
- O script adiciona:
  - função `current_participant_id()`;
  - função `is_current_participant_admin()`;
  - tabela `simulation_runs`;
  - tabela `simulation_series_picks`;
  - tabela `simulation_game_picks`;
  - policies RLS para leitura autenticada e escrita limitada ao próprio participante;
  - bloqueio de escrita quando a simulação já foi publicada;
  - permissão administrativa para criar, resetar e publicar a rodada.

#### Decisão de arquitetura — isolamento total do bolão real
- A abordagem anterior de simulação local em `localStorage` foi substituída por uma simulação compartilhada no Supabase.
- A implementação final não reutiliza `series`, `games`, `series_picks` ou `game_picks` reais.
- Toda a rodada fictícia passa a existir em tabelas próprias, reduzindo risco de contaminação do bolão oficial.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- O SQL em `supabase/shared-simulation.sql` ainda precisa ser executado manualmente no SQL Editor do Supabase para que a funcionalidade compartilhada fique operacional.
- A publicação de resultados fictícios hoje gera vencedores e placares de forma aleatória; se você quiser cenários controlados, isso pode virar uma segunda rodada.
- A simulação compartilhada atual cobre a 1ª rodada como ambiente de teste; rounds seguintes seguem presentes no bracket apenas como estrutura visual.

## 2026-04-10 - Auditoria completa e correção de 17 bugs (Claude Code)

### Objetivo
- Realizar auditoria técnica integral do projeto e corrigir todos os bugs identificados, cobrindo falhas críticas de runtime, comportamentos incorretos no sync, vulnerabilidades de bloqueio de palpites, instabilidade no ranking em tempo real e inconsistências menores de qualidade.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/useGamePicks.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/utils/scoring.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/routes/admin.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/scoring/rules.ts`

### Mudanças feitas

#### Bug crítico — `useAuth.ts`: crash em runtime no primeiro login de novo usuário
- Se o insert na tabela `participants` falhasse silenciosamente (erro de constraint, RLS ou rede), `created` era `null` e o código prosseguia com `participant!.id` e `participant!.is_admin`, gerando crash de runtime imediato.
- Corrigido: adicionado check `if (createError || !created)` após o insert. Caso a criação falhe, o estado é definido como `unauthenticated` em vez de crashar.

#### Bug crítico — `useAuth.ts`: erro de banco de dados silenciado na verificação de acesso
- As queries `allowed_emails` e `participants` não desestruturavam `error`. Qualquer falha de banco (timeout, RLS, indisponibilidade) resultava em `data = null`, fazendo o app tratar o usuário como não autorizado e bloqueando todo acesso durante instabilidades do Supabase.
- Corrigido: `error` agora é desestruturado em ambas as queries. Erros com código diferente de `PGRST116` (nenhuma linha encontrada — comportamento esperado) redirecionam para `unauthenticated` e registram o erro no console, sem mascarar falhas reais como decisão de autorização.

#### Bug crítico — `syncNBA.ts` + `nba.ts`: `tip_off_at` armazenado como data pura sem horário
- O campo `date` da API balldontlie.io é uma string de data pura ("2026-04-19"), sem horário. O sync gravava esse valor diretamente em `tip_off_at`, fazendo com que `new Date("2026-04-19")` fosse avaliado como meia-noite UTC (21h BRT do dia anterior). Palpites de jogo ficavam bloqueados 18–20 horas antes do tip-off real.
- Corrigido: adicionada função `parseTipOffAt(date, status)` que extrai o horário real do campo `status` da BDL API, que para jogos não iniciados contém strings como `"7:30 pm ET"`. A função converte para UTC considerando EDT (UTC-4, vigente durante os playoffs de abril a junho). Casos em que o status não contém horário (ex.: jogo em andamento) retornam `null`, mantendo o jogo desbloqueado até o sync marcar `played = true`. `isFinalStatus` também foi expandido para aceitar variações como `"Final/OT"`.

#### Bug crítico — `syncNBA.ts`: série marcada como encerrada prematuramente quando `home_team_id` é null
- Se uma série existia no banco sem `home_team_id` ou `away_team_id` (série criada antes do seed), `winner_id === null` era `true` para jogos não finalizados. Com 4 ou mais jogos cadastrados sem resultado, `isComplete` poderia ser `true` com `winner_id` nulo, corrompendo a série.
- Corrigido: `homeWins` e `awayWins` retornam 0 quando o respectivo `team_id` é null. `isComplete` só é `true` se ambos os times estiverem definidos na série.

#### Bug alto — `useGamePicks.ts`: bloqueio de jogo validado apenas no cliente
- A verificação de `tip_off_at` existia somente no frontend. O backend não validava, e as policies RLS do Supabase também não. Um usuário com acesso direto à API do Supabase poderia gravar palpites após o início do jogo.
- Corrigido: `saveGamePick` agora verifica `game.played` antes de qualquer outra coisa, rejeitando imediatamente picks em jogos já finalizados. `isGameLocked` também retorna `true` para `game.played === true`, mantendo consistência entre a lógica de save e a lógica de exibição.

#### Bug alto — `useRanking.ts`: sem debounce nas subscriptions Realtime
- As 4 subscriptions Realtime (`series`, `series_picks`, `game_picks`, `games`) chamavam `computeRanking` diretamente. Durante um sync, múltiplas tabelas são atualizadas em sequência, disparando dezenas de execuções paralelas de `computeRanking`, cada uma com 6 queries ao Supabase. Isso gerava carga excessiva e potencial inconsistência de estado por execuções fora de ordem.
- Corrigido: substituído o callback direto por `scheduleCompute()`, que usa `setTimeout` de 1,5 segundos com cancelamento do timer anterior. O timer é limpo no retorno do `useEffect`.

#### Bug alto — `admin.ts`: sync e rescore retornavam sucesso antes de executar
- As rotas `/admin/sync` e `/admin/rescore` respondiam `{ ok: true }` imediatamente e disparavam o processo com `.catch(console.error)`. Se o sync falhasse, o admin recebia "Sync started" sem nenhuma indicação de erro.
- Corrigido: ambas as rotas agora aguardam `await`. Sucesso retorna mensagem de conclusão; falha retorna status 500 com a mensagem de erro.

#### Bug alto — `Games.tsx`: função `brt()` gerava ISO string inválida ao cruzar meia-noite UTC
- `brt('2026-04-20', 21)` produzia `T24:00:00Z`, que é um ISO inválido. `new Date(...)` retornaria `Invalid Date`, quebrando cálculos de lock e countdown.
- Corrigido: quando `hBrt + 3 >= 24`, o dia é avançado corretamente usando `Date.setUTCDate`, e a hora é calculada com `% 24`.

#### Bug alto — `useGamePicks.ts`: array `games` como dependência de `useEffect` causava refetch desnecessário
- `games` (array) criava nova referência a cada `setGames`, acionando o efeito de `fetchPicks` em toda re-renderização.
- Corrigido: dependência alterada de `games` para `games.length`.

#### Bug alto — `syncNBA.ts`: `game_number` calculado por `length` em vez de `MAX`
- `(existingGames?.length ?? 0) + 1` era incorreto quando jogos haviam sido deletados ou quando syncs ocorriam em paralelo, podendo gerar valores duplicados.
- Corrigido: `game_number` agora é calculado como `MAX(game_number) + 1` a partir dos jogos carregados da série.

#### Bug médio — `useRanking.ts`: falha silenciosa sem feedback ao usuário
- Queries com falha ou dados ausentes resultavam em retorno silencioso, deixando a tela de ranking vazia sem nenhuma mensagem.
- Corrigido: adicionado estado `error` no hook, populado em caso de erro de DB ou dados incompletos. `Ranking.tsx` exibe um banner vermelho com a mensagem de erro quando presente.

#### Bug médio — `scoring.ts` / `rules.ts`: dois arquivos de pontuação independentes sem aviso
- Os valores de `SCORING_CONFIG` (frontend) e `SCORING` (backend) eram idênticos mas sem nenhum mecanismo de sincronização. Uma alteração futura em um dos arquivos divergiria silenciosamente.
- Corrigido: adicionado comentário de aviso explícito no topo de ambos os arquivos indicando que alterações devem ser espelhadas manualmente no arquivo correspondente.

#### Bug baixo — `BracketSVG.tsx`: emoji `🏆` hardcoded no JSX
- Substituído pelo componente `<Trophy>` do Lucide React, já presente como dependência do projeto. Evita problemas de encoding e mantém consistência visual.

#### Bug baixo — `engine.ts`: `console.table` em produção
- `console.table(ranking.slice(0, 10))` gerava saída verbosa nos logs do Render a cada sync (a cada 15 minutos). Substituído por `console.log` com formatação legível por linha.

#### Bug baixo — `BracketSVG.tsx`: non-null assertion em `getSlot()`
- `getSlot()` usava `!` para assertar que o ID sempre existia em `SLOT_DEFS`. Embora seguro com as constantes atuais, um ID incorreto em `CONNECTIONS` causaria crash silencioso.
- Corrigido: retorno alterado para `SlotDef | undefined`; `renderConnections` faz early return se `from` ou `to` for `undefined`.

#### Bug baixo — `useSeries.ts`: `savePick` não verificava `is_complete`
- O hook `savePick` não guardava contra séries já encerradas. A SeriesModal desabilita o botão, mas a função aceitaria chamadas diretas em séries completas.
- Corrigido: adicionada guarda no início da função que retorna sem ação se a série não existir ou já estiver completa.

### Validações
- `frontend`: `npm run build` concluído com sucesso — sem erros de TypeScript. Warning de chunk grande do Vite permanece mas sem falha de compilação.
- `backend`: `npm run build` concluído com sucesso — sem erros de TypeScript.
- `backend`: `npm run test:scoring` concluído com sucesso — todos os testes passaram.

### Pendências não corrigidas nesta rodada
- Validação de `tip_off_at` no lado do servidor: o bloqueio de picks após tip-off ainda depende do frontend e de data correta no banco. Uma Edge Function no Supabase ou rota no backend que rejeite inserts após o horário seria a solução definitiva, mas requer mudanças na arquitetura de persistência de picks.
- Políticas RLS do Supabase para `game_picks`: garantir que cada usuário só consiga inserir/atualizar os próprios picks ainda depende de revisão manual das policies no painel do Supabase.
- `SERIES_ID_BY_TEAMS` em `syncNBA.ts`: mapeamento estático continua hardcoded para a temporada 2024-25. Temporadas futuras precisarão atualizar este mapa.

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

## 2026-04-13 09:58 - Divisão de bundle nas rotas principais

### Objetivo
- Reduzir o peso do carregamento inicial do frontend carregando páginas mais pesadas sob demanda, sem mudar o comportamento do app.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/App.tsx`

### Mudanças feitas
- `frontend/src/App.tsx` passou a usar `lazy()` para carregar sob demanda as páginas:
  - `Home`
  - `BracketEditor`
  - `OfficialBracket`
  - `Ranking`
  - `Compare`
  - `Games`
  - `SimulationLab`
  - `Admin`
- Foi adicionado um fallback central com `Suspense` usando o `LoadingBasketball`, mantendo a experiência visual consistente durante o carregamento assíncrono das rotas.
- As regras de autenticação e autorização permaneceram iguais:
  - login continua separado;
  - usuários não autenticados continuam indo para `/login`;
  - usuários sem permissão continuam bloqueados;
  - a rota de admin continua protegida por `requireAdmin`.
- A mudança foi concentrada no ponto de entrada das rotas, evitando espalhar lógica de carregamento por múltiplos arquivos.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- O build passou a gerar chunks separados por rota, incluindo arquivos específicos para `Admin`, `Games`, `Home`, `Compare`, `SimulationLab`, `BracketEditor` e `Ranking`.
- O chunk principal caiu para cerca de `390 kB`, mas a rota `Ranking` ainda gera um chunk alto por causa da área de gráfico/relatórios.

### Pendências
- Se quiser aprofundar essa otimização depois, faz sentido avaliar divisão adicional por bibliotecas pesadas, especialmente gráficos e telas administrativas.

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

## 2026-04-13 15:02 - Sync real corrige confrontos antigos e atualiza jogos da rodada atual

### Objetivo
- Corrigir o sync que ainda estava preso em confrontos antigos do playoff e impedir que `Home`, `Bracket` e `Games` continuassem mostrando séries defasadas no Supabase.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/src/lib/nba.ts`
- `backend/src/jobs/syncNBA.ts`

### Mudanças feitas
- `backend/src/jobs/syncNBA.ts` deixou de depender do mapa estático `SERIES_ID_BY_TEAMS`, que ainda refletia combinações antigas como `OKC x MEM`.
- O sync agora:
  - agrupa os jogos reais da Ball Don't Lie por confronto;
  - tenta reaproveitar séries já compatíveis no banco;
  - reassina séries de primeira rodada quando o par antigo não existe mais na temporada atual;
  - remove jogos locais cujo `nba_game_id` não pertence mais ao feed real atual, limpando resíduos antigos da tabela `games`.
- A leitura do horário do jogo foi corrigida para suportar o formato atual da Ball Don't Lie, que já entrega `datetime/status` em ISO. Com isso, `tip_off_at` volta a ser gravado corretamente para jogos futuros.
- O sync passou a garantir a presença dos times necessários antes de inserir jogos, usando os metadados vindos da própria API.
- A recomputação das séries ficou iterativa:
  - recalcula vencedor/placar de cada série a partir dos jogos reais;
  - propaga vencedores para as rodadas seguintes (`W2`, `E2`, finais de conferência e finais);
  - persiste no Supabase apenas os campos realmente alterados.
- Durante a validação, foi necessário inserir `TOR` diretamente na tabela `teams` do Supabase para destravar o primeiro sync real, porque o schema exigia `seed` e o banco ainda não tinha esse time cadastrado.

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- `backend`: execução real de `syncNBA()` com a `.env` local concluída com sucesso
- Resultado validado no Supabase após sync:
  - `games` passou a conter os jogos reais de 18/04/2026
  - `series` deixou de exibir combinações antigas como `OKC x MEM`
  - `tip_off_at` ficou preenchido com os horários reais dos jogos vindos da API

### Pendências
- O backend publicado no Render ainda precisa receber deploy com esse patch; sem isso, o sync automático remoto continuará rodando a lógica antiga.
- A tabela `teams` do Supabase merece uma revisão para cobrir todos os times possíveis sem depender de inserção corretiva pontual.

## 2026-04-13 15:18 - Home deixa de mascarar falta de placares reais com fallback fictício

### Objetivo
- Impedir que a Home continuasse exibindo resultados estáticos antigos no bloco `Jogos da última noite` quando o banco ainda não tinha jogos finalizados reais da pós-temporada.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas
- Removido o array estático `LAST_NIGHT_RESULTS` da Home.
- O componente `LastNightRecap` agora trabalha em dois estados honestos:
  - se houver jogos finalizados reais no `Supabase`, renderiza o recap normalmente;
  - se ainda não houver finais reais, mostra um estado vazio explicando que a pós-temporada ainda não teve resultados sincronizados.
- Quando ainda não existem finais reais, a Home passa a mostrar o próximo jogo confirmado da rodada usando `upcomingGames`, em vez de inventar um placar.
- O texto auxiliar do card foi atualizado para deixar explícito que o bloco só mostra dados reais vindos da API/sync.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`

### Pendências
- O título `Jogos da última noite` pode ser refinado no futuro para algo adaptativo, como `Últimos resultados` ou `Radar da rodada`, caso você queira que ele sirva melhor tanto antes quanto depois do primeiro jogo encerrado.

## 2026-04-13 15:31 - Aba Analise passa a refletir o estado real das integrações

### Objetivo
- Limpar a aba `Análise` de dados mockados e alinhá-la com o que realmente está conectado hoje no projeto.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Analysis.tsx`

### Mudanças feitas
- Removidos os arrays estáticos de:
  - `INJURIES`
  - `NEXT_GAMES`
  - `LAST_NIGHT_RESULTS`
  - `ODDS`
- A aba `Análise` agora usa apenas dados reais do `useGameFeed` para:
  - próximos confrontos
  - resultados recentes
- Os blocos de `odds` e `lesões` deixaram de mostrar conteúdo fictício e viraram cards de status operacional, explicando claramente por que ainda estão indisponíveis.
- O hero da página foi reescrito para mostrar:
  - quantidade real de jogos futuros
  - quantidade real de resultados sincronizados
  - quantas seções já estão prontas de fato
  - quantos bloqueios ainda existem por limitação de API/plano
- O card de contexto agora deixa explícito que:
  - `jogos/agenda` já usam Ball Don't Lie + backend + Supabase
  - `odds` e `player_injuries` estão bloqueados pela chave atual

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Teste prático da chave atual da Ball Don't Lie:
  - `GET /v1/player_injuries` retornou `401`
  - `GET /v2/odds` retornou `401`

### Pendências
- Para manter tudo em uma única API, a Ball Don't Lie precisa de plano com acesso a:
  - `player_injuries`: pelo menos `ALL-STAR`
  - `odds`: `GOAT`
- Se você não quiser subir de plano na Ball Don't Lie, aí sim será necessária uma segunda API para odds e/ou lesões.

## 2026-04-13 16:02 - Segunda camada de APIs entra no backend para odds e lesões

### Objetivo
- Integrar provedores separados para `odds` e `lesões`, mantendo a Ball Don’t Lie responsável apenas por `jogos` e `placares`.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/.env.example`
- `backend/src/index.ts`
- `backend/src/lib/odds.ts`
- `backend/src/lib/injuries.ts`
- `backend/src/routes/analysis.ts`
- `frontend/src/hooks/useAnalysisInsights.ts`
- `frontend/src/pages/Analysis.tsx`

### Mudanças feitas
- Criada a integração de `odds` no backend via `The Odds API` em `backend/src/lib/odds.ts`.
- Criada a integração de `lesões` no backend via `SportsDataIO` em `backend/src/lib/injuries.ts`.
- Adicionada a rota pública `GET /analysis/insights` em `backend/src/routes/analysis.ts`, que devolve:
  - status operacional dos provedores
  - lista de odds disponíveis
  - lista de lesões disponíveis
- O backend principal passou a expor essa rota em `backend/src/index.ts`.
- A `Analysis` do frontend foi ligada ao backend através do novo hook `frontend/src/hooks/useAnalysisInsights.ts`.
- A página `frontend/src/pages/Analysis.tsx` agora:
  - continua usando `useGameFeed` para jogos/resultados reais;
  - consome `odds` e `lesões` do backend;
  - cruza odds com os confrontos reais da rodada;
  - cruza lesões com os times dos próximos jogos;
  - mostra mensagens operacionais claras quando faltam env vars ou quando o provedor externo estiver indisponível.
- `backend/.env.example` ganhou as variáveis novas:
  - `ODDS_API_KEY`
  - `ODDS_API_REGIONS`
  - `ODDS_API_MARKETS`
  - `SPORTSDATAIO_API_KEY`
  - `SPORTSDATAIO_BASE_URL`

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Validação sem chaves configuradas:
  - `fetchNBAGameOdds()` retornou status operacional com `ODDS_API_KEY não configurada.`
  - `fetchNBAInjuries()` retornou status operacional com `SPORTSDATAIO_API_KEY não configurada.`

### Configuração necessária
- Para ativar `odds`, configurar `ODDS_API_KEY` no backend/Render.
- Para ativar `lesões`, configurar `SPORTSDATAIO_API_KEY` no backend/Render.
- Se você usar a base padrão da SportsDataIO, manter:
  - `SPORTSDATAIO_BASE_URL=https://api.sportsdata.io/v3/nba/scores/json`

### Pendências
- Ainda falta inserir as chaves reais no `.env` local e no Render para ativar as duas integrações em produção.
- Dependendo do plano contratado na SportsDataIO, o endpoint `/Players` pode exigir ajuste de feed/permissão.

## 2026-04-13 16:21 - Scheduler inteligente substitui cron fixo do sync NBA

### Objetivo
- Preparar o backend para o plano `Starter` da Render com um sync mais inteligente, agressivo em dia de jogo e leve fora da janela.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/.env.example`
- `backend/src/index.ts`
- `backend/src/scheduler/nbaSyncScheduler.ts`

### Mudanças feitas
- O cron fixo de `15 em 15 minutos` em horário fechado saiu de `backend/src/index.ts`.
- Entrou um scheduler dedicado em `backend/src/scheduler/nbaSyncScheduler.ts`, rodando uma checagem por minuto com quatro modos:
  - `live`: quando existe jogo iniciado e ainda não finalizado no banco
  - `pregame`: quando existe jogo próximo dentro da janela configurada
  - `daily`: quando existe jogo nas próximas 24 horas
  - `idle`: quando não há jogo próximo
- Cadência padrão configurada:
  - `live`: 2 minutos
  - `pregame`: 5 minutos
  - `daily`: 15 minutos
  - `idle`: 60 minutos
- O scheduler ganhou trava contra execução concorrente, evitando dois `syncNBA()` ao mesmo tempo.
- O endpoint `GET /health` agora devolve também o snapshot do scheduler:
  - modo atual
  - intervalo vigente
  - motivo da decisão
  - último sync
  - último erro
  - estado `isRunning`
- `backend/.env.example` passou a documentar as variáveis de ajuste fino:
  - `NBA_SYNC_INTERVAL_LIVE_MINUTES`
  - `NBA_SYNC_INTERVAL_PREGAME_MINUTES`
  - `NBA_SYNC_INTERVAL_DAILY_MINUTES`
  - `NBA_SYNC_INTERVAL_IDLE_MINUTES`
  - `NBA_SYNC_LIVE_LOOKBACK_MINUTES`
  - `NBA_SYNC_PREGAME_LOOKAHEAD_MINUTES`
  - `NBA_SYNC_DAILY_LOOKAHEAD_MINUTES`

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- Confirmado no `dist/index.js` que o backend compilado passou a iniciar `startNBASyncScheduler()` e expor `scheduler` no `/health`

### Pendências
- Para o comportamento novo valer em produção, o backend precisa ser redeployado no Render com esse patch.
- O ganho real deste scheduler depende do backend não dormir; por isso esta mudança combina melhor com o plano `Starter`.

## 2026-04-13 16:33 - Odds passam a exibir formato decimal na aba Analise

### Objetivo
- Melhorar a leitura das odds para um formato mais familiar, como `1.50` / `2.50`, sem perder a referência original americana.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Analysis.tsx`

### Mudanças feitas
- A exibição principal de `moneyline` na aba `Análise` deixou de priorizar o formato americano puro e passou a mostrar odds decimais.
- Mantive o formato americano como linha auxiliar `US`, para não perder rastreabilidade com o dado original vindo da API.
- Também passei a mostrar:
  - preço decimal do `spread`
  - preço decimal de `over/under`

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`

### Pendências
- Se você quiser, numa próxima rodada dá para escolher um padrão único:
  - só decimal
  - só americano
  - ou um toggle entre os dois formatos

## 2026-04-13 16:41 - Aba Analise avisa quando o feed de lesões está embaralhado no trial

### Objetivo
- Evitar que o usuário interprete os dados de lesões da SportsDataIO trial como confiáveis quando o retorno vier marcado como `scrambled`.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Analysis.tsx`

### Mudanças feitas
- A área de `Lesões e Notícias` agora detecta registros com indicação de `scrambled`.
- Quando isso acontece, a aba mostra um aviso claro de que:
  - a integração técnica está funcionando;
  - mas o feed está em modo trial embaralhado;
  - portanto não deve ser tratado como fonte oficial de produção.
- Os itens embaralhados passaram a receber indicação visual própria com badge `trial`.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`

### Pendências
- Quando a SportsDataIO sair do modo trial embaralhado, esse aviso continuará útil como proteção, mas deve aparecer com menos frequência ou deixar de aparecer por completo.

## 2026-04-13 17:05 - Cards de jogos recebem odds resumidas com cache econômico

### Objetivo
- Levar um resumo de odds para os cards da aba `Jogos` sem que cada card passe a consumir créditos da API separadamente.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/src/lib/odds.ts`
- `backend/src/routes/analysis.ts`
- `frontend/src/hooks/useOddsSummary.ts`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas
- O backend ganhou um modo de consulta resumida de odds em `backend/src/lib/odds.ts`:
  - usa apenas o mercado `h2h`
  - compartilha cache em memória por padrão de 10 minutos
  - evita puxar `spreads` e `totals` quando a necessidade é só um número rápido no card
- A rota `GET /analysis/odds-summary` passou a expor esse resumo enxuto para o frontend.
- A nova hook `frontend/src/hooks/useOddsSummary.ts` centraliza esse fetch e reaproveita a mesma resposta para toda a tela.
- A aba `Jogos` passou a cruzar os jogos reais do Supabase com as odds resumidas da NBA e mostrar nos cards:
  - bookmaker de referência
  - odd decimal resumida de cada lado
  - destaque visual para o favorito

### Impacto em créditos
- O fluxo anterior completo de odds usa `h2h,spreads,totals`, o que consome mais crédito por chamada.
- O resumo dos cards usa só `h2h`, reduzindo bastante o custo operacional.
- Como a resposta fica em cache no backend por 10 minutos, vários acessos ao app reaproveitam a mesma chamada externa.
- Esse desenho foi feito especificamente para proteger uma cota enxuta como `500 créditos/mês`.

### Validações
- Pendente de validação por build após o fechamento do encadeamento na tela `Jogos`

### Pendências
- Se você quiser depois, dá para estender o mesmo resumo para `Home` ou `Compare`, mantendo a mesma estratégia econômica.
- O backlog futuro também ganhou a frente operacional de automatizar a extração diária de dados de participantes, hoje dependente do PC de casa, registrada em `updates/futuras-implementacoes.md`.
- O backlog futuro também passou a incluir a geração automática de um resumo textual diário dos palpites para conferência no grupo após o último fechamento do dia.

## 2026-04-13 17:26 - Loader troca de SVG e ganha animação mais minimalista

### Objetivo
- Melhorar o ícone de loading com um SVG mais coerente com a identidade do site e uma animação menos agressiva.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/public/loading-basketball.svg`
- `frontend/src/components/LoadingBasketball.tsx`
- `frontend/src/index.css`

### Mudanças feitas
- O loader público passou a usar o SVG de `assets/loading.svg`, que combina melhor com a paleta atual do produto.
- Ajustei o tom laranja principal para mais perto do `west` já usado no app e mantive o aro dourado.
- O componente `LoadingBasketball` deixou de depender do `animate-spin` genérico e passou a usar classes próprias.
- A animação ficou em duas camadas:
  - rotação mais suave e contínua;
  - pulso discreto no SVG, para evitar sensação de ícone “apagado” ou duro demais.

### Validações
- Pendente de build do frontend

### Pendências
- Se você ainda trocar esse SVG depois, o componente já ficou pronto para reaproveitar a mesma animação com outra arte.

## 2026-04-13 17:34 - Loader troca rotação por animação de quique

### Objetivo
- Deixar o loading mais temático de basquete e menos genérico do que um spinner girando.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/LoadingBasketball.tsx`
- `frontend/src/index.css`

### Mudanças feitas
- O loader deixou de girar continuamente.
- A animação agora usa um quique curto e suave no SVG, com compressão leve ao tocar o “chão”.
- Adicionei uma sombra elíptica animada para reforçar a sensação de movimento sem pesar visualmente.
- Mantive a implementação simples, reaproveitando o mesmo SVG público já ajustado.

### Validações
- Pendente de build do frontend

### Pendências
- Se você quiser depois, dá para fazer uma versão ainda mais refinada com duas alturas de quique conforme o tamanho do loader.
## 2026-04-17 00:30:19

### Home - repaginação premium da seção Resultados reais
- redesenhei a seção `Resultados reais` em `frontend/src/pages/Home.tsx` com uma hierarquia visual nova, menos microtexto e mais presença de marca;
- transformei cada lado do confronto em um painel próprio com logo ampliado, sigla maior e contexto de lesão embutido no bloco do time;
- aumentei tipografia, espaçamento, cartões-resumo e CTA do playoff real para a seção ficar mais editorial e menos “apertada”;
- mantive a lógica existente de radar da chave, impacto do confronto e estados de série, mas com distribuição visual mais premium.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 14:28:00

### Home - polimento premium da games rail
- refinei a rail horizontal de jogos em `frontend/src/pages/Home.tsx` com chips-resumo para `Encerrados`, `Ao vivo` e `Próximos`;
- adicionei controles laterais no desktop para avançar ou voltar a faixa sem depender só do drag;
- apliquei fades nas bordas para reforçar a sensação de continuidade da rail e deixar o recorte mais próximo de uma seção editorial finalizada;
- dei mais destaque visual aos cards ao vivo, com largura maior, sombra leve e separador interno para melhorar a leitura do placar;
- mantive o auto-scroll lento com pausa na interação, agora combinado com navegação manual mais confortável.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 13:35:00

### Live scoring - fase 1 e 2 de atualização de placar e resultado
- reduzi o ritmo padrão do sync ao vivo para `1` minuto em `backend/src/scheduler/nbaSyncScheduler.ts` e alinhei `backend/.env.example`;
- o sync da NBA em `backend/src/jobs/syncNBA.ts` agora tenta persistir também `game_state`, `status_text`, `current_period` e `clock`, com fallback automático caso a SQL nova ainda não tenha sido aplicada;
- adicionei a migração `supabase/live-game-status.sql` para criar os campos de jogo ao vivo no banco;
- `frontend/src/hooks/useGameFeed.ts` passou a separar `liveGames` de `upcomingGames`, corrigindo a leitura da Home para jogos realmente em andamento;
- `frontend/src/pages/Home.tsx` agora mostra melhor jogos ao vivo nos `Resultados reais`, incluindo placar parcial e contexto do status do jogo;
- `frontend/src/pages/Games.tsx` agora exibe placar parcial durante a partida, troca o estado para `Ao vivo/Intervalo` quando aplicável e esconde sinais de pré-jogo como odds/horário seco quando a bola já subiu;
- a aba `Jogos` também ganhou subscribe realtime para `games`, `series` e `teams`, melhorando a atualização visual de placar sem depender de reload manual.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## 2026-04-17 14:10:00

### Home - nova faixa horizontal de jogos no estilo NBA.com
- substituí o bloco `Jogos da última noite` por uma rail horizontal de jogos em `frontend/src/pages/Home.tsx`, com estrutura inspirada na faixa do site da NBA;
- a nova seção agora mistura jogos encerrados, ao vivo e próximos em uma timeline única por dia, com cards compactos, horário no topo, times empilhados e estado visual do jogo;
- adicionei auto-scroll lento, pausa ao hover e navegação por drag para desktop e touch, mantendo a leitura mais próxima de uma “games rail” real;
- priorizei a identidade visual do bolão nas cores e acabamento, mas preservei a hierarquia horizontal e compacta típica do NBA.com;
- deixei o play-in para a próxima etapa dessa mesma seção, sem misturar agora na primeira implementação.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 - UI: polimento final de Resultados reais + pendência do backup automático

### Home - Resultados reais mais alinhados
- refinei a seção `Resultados reais` em `frontend/src/pages/Home.tsx` para melhorar a hierarquia visual do topo, com CTA mais consistente junto ao título;
- deixei os cards de status (`Concluídas`, `Em aberto`, `Campeão`) com altura e distribuição interna mais estáveis;
- reancorei o bloco central do confronto (`VS` / status da série) entre os dois times;
- corrigi o alinhamento do card do time da direita, prendendo melhor logo, sigla e textos auxiliares no eixo direito do confronto.

### Pendência operacional registrada
- ficou registrado como próximo passo ativar de fato o backup automático em produção;
- para isso ainda falta configurar os secrets `BACKEND_BASE_URL` e `BACKUP_CRON_SECRET` no GitHub Actions e o `BACKUP_CRON_SECRET` no backend implantado, depois disparando o workflow `Operational Backup` manualmente uma vez para validação.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 - Ops: backup automático diário via GitHub Actions

### Automação operacional
- adicionei a rota interna `POST /admin/internal/backup/run` em `backend/src/routes/admin.ts`, protegida por `BACKUP_CRON_SECRET`;
- essa rota gera `backup` e, por padrão, já roda `verify-backup` em sequência, registrando tudo na trilha operacional;
- deixei `backend/.env.example` atualizado com a nova env `BACKUP_CRON_SECRET`.

### GitHub Actions
- criei o workflow [operational-backup.yml](C:\Dev\pessoal\projetos\nba-bolao\.github\workflows\operational-backup.yml);
- ele roda diariamente e também aceita disparo manual por `workflow_dispatch`;
- o job chama o backend com `BACKEND_BASE_URL` e `BACKUP_CRON_SECRET`, sem depender de login humano.

### Validação
- `npm --prefix backend run build`

## 2026-04-17 - UX: Playbook operacional incorporado ao Admin

### Admin - roteiro de uso por cenário
- adicionei uma seção `Playbook Operacional` em `frontend/src/pages/Admin.tsx`;
- o painel agora orienta a operação em quatro frentes: `Pré-jogo`, `Durante rodada`, `Pós-jogo` e `Emergência`;
- cada card traz sequência prática de ações e um pequeno status contextual puxado do próprio histórico operacional, reduzindo improviso em momentos críticos.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 - Feature: Endurecimento operacional com Storage, persistência Supabase e verificação formal de backup

### Centro operacional e persistência durável
- ampliei a trilha administrativa para persistir também em Supabase com `admin_operation_runs` e `admin_operation_artifacts`, mantendo o arquivo local como fallback;
- o backend agora reidrata links assinados de artefatos espelhados no Storage ao listar operações, deixando o histórico mais auditável entre reinícios e deploys;
- adicionei a base SQL em `supabase/admin-operations.sql` para provisionar as tabelas operacionais.

### Storage e artefatos administrativos
- backups operacionais, `Resumo do dia` e `Lembrete de palpites` agora tentam subir seus artefatos para o bucket `operational-artifacts` no Supabase Storage;
- os descritores passaram a registrar `storageBucket`, `storagePath`, `storageStatus`, `storageError` e `downloadUrl`, além do caminho local.

### Verificação formal de backup
- criei `backend/src/backup/verifyOperationalSnapshot.ts` para validar manifesto, existência local, tamanho, checksum e disponibilidade no Storage dos artefatos de um backup;
- expus a nova rota `POST /admin/backup/verify` em `backend/src/routes/admin.ts`;
- o fluxo de backup agora também registra `backupId` no metadata da operação, facilitando rechecagem posterior pelo painel.

### Admin - UX operacional refinada
- evoluí `frontend/src/pages/Admin.tsx` para mostrar status de Storage e links assinados no modal de backup;
- adicionei o botão `Verificar último` no card de backup e um modal próprio com relatório detalhado da verificação formal;
- enriqueci `Atividade Recente` com categoria, artefatos, `backupId`, diretório e alertas, tornando a trilha operacional mais útil em produção.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`
## 2026-04-17 11:25:00

### Onboarding - tour global e mais completo
- transformei o onboarding em um tour global multi-página em `frontend/src/components/OnboardingTour.tsx`, cobrindo `Home`, `Jogos`, `Ranking`, `Análise` e `Comparar`;
- o tour agora navega entre rotas, mantém progresso da etapa atual durante a jornada e só marca como concluído no fechamento final ou skip;
- movi a montagem do tour para `frontend/src/App.tsx`, para a primeira entrada do usuário funcionar no app inteiro e não só na `Home`;
- ampliei os tipos locais de `driver.js` em `frontend/src/driverjs.d.ts` para suportar callbacks de próxima/anterior/fechar e controle de steps;
- atualizei `frontend/src/hooks/useOnboarding.ts` para limpar também o progresso de rota ao reiniciar ou concluir o tour;
- adicionei anchors de tutorial em `frontend/src/components/Nav.tsx`, `frontend/src/pages/Home.tsx`, `frontend/src/pages/Games.tsx`, `frontend/src/pages/Analysis.tsx`, `frontend/src/pages/Ranking.tsx` e `frontend/src/pages/Compare.tsx`, cobrindo os blocos principais de cada tela.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 03:49:25

### Home, Perfil e Comparar - nova camada de leitura executiva
- adicionei `Pós-Rodada` em `frontend/src/pages/Home.tsx` para resumir quem mais subiu, qual jogo puxou a noite e quem lidera em cravadas;
- enriqueci `frontend/src/pages/Profile.tsx` com o bloco `Perfil Competitivo`, destacando momento recente, melhor trecho e principal zona de atenção da campanha;
- complementei `frontend/src/pages/Compare.tsx` com `Corredor crítico do duelo`, apontando a divergência mais sensível ainda em aberto entre os dois brackets.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 03:18:40

### Análise - sua vantagem na rodada
- adicionei a seção `Sua vantagem na rodada` em `frontend/src/pages/Analysis.tsx` para personalizar a leitura da rodada com base na cartela do participante;
- o novo bloco cruza séries abertas, palpites já feitos e lesões relevantes para destacar:
  - janela de ataque antes do lock;
  - risco real na cartela quando o lado escolhido entra pressionado;
  - próximo palpite pendente com urgência operacional;
- mantive esse insight dentro da aba `Análise`, evitando poluir a Home com mais contexto competitivo.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 02:02:10

### Home / Performance - resumo executivo, insights personalizados e pós-jogo mais forte
- adicionei `ExecutiveSummaryStrip` em `frontend/src/pages/Home.tsx` para abrir a Home com um resumo mais direto sobre ação imediata, rodada real e disputa do bolão;
- criei `AdvantageInsightsCard` em `frontend/src/pages/Home.tsx` para cruzar sua cartela com lesões, séries prontas e próximos locks;
- reforcei o carrossel `Jogos da última noite` em `frontend/src/pages/Home.tsx` com destaque de `jogador da noite` quando os stats do jogo estiverem disponíveis;
- configurei `manualChunks` em `frontend/vite.config.ts` para separar Recharts, D3, Motion, Supabase e ícones em bundles dedicados, reduzindo o peso do chunk principal.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 01:34:22

### Home / Jogos / Ranking - nova camada de inteligência operacional
- transformei `Meus Palpites` em um bloco mais estratégico em `frontend/src/pages/Home.tsx`, com leitura de janelas de ataque, próximo lock e oportunidades sensíveis por contexto de elenco;
- expandi o hero de `frontend/src/pages/Games.tsx` com radar de ação, cobertura dos jogos de hoje e confirmação do último movimento salvo;
- adicionei `CompetitivePulse` em `frontend/src/pages/Ranking.tsx` para reforçar leitura de pódio, rival imediato e nome quente da corrida.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 01:15:03

### Análise - microinterações refinadas nos cards
- apliquei motion consistente em `frontend/src/pages/Analysis.tsx` nos cards de resultados, odds, notícias, blocos editoriais e atalhos relacionados;
- a aba agora responde com hover mais vivo, leve elevação visual e stagger suave entre os atalhos, alinhando melhor com o restante do app;
- também corrigi os fechamentos JSX que ficaram quebrados durante a conversão dos blocos para `motion.div` e `motion.section`.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:46:41

### Home - resultados reais com leitura editorial por série
- adicionei headlines curtas por confronto na seção `Resultados reais` em `frontend/src/pages/Home.tsx`, para cada card explicar o momento da série em linguagem mais clara;
- os cards agora mostram uma linha editorial abaixo dos painéis dos times, combinando status da série, agenda do dia e peso dos desfalques;
- a leitura da chave ficou mais imediata: além do impacto visual, cada confronto passou a “contar a história” do momento sem depender só de badges.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:49:20

### Home - painel principal mais orientado a ação
- evoluí o `HeroPanel` em `frontend/src/pages/Home.tsx` para funcionar como radar do dia, não só como bloco institucional;
- adicionei um resumo contextual no topo explicando a prioridade atual do usuário: fechar picks, acompanhar jogo ao vivo, olhar agenda do dia ou monitorar alertas de elenco;
- incluí três novos cards de foco operacional no painel principal:
  - `Palpites urgentes`
  - `Jogos de hoje` / `Jogos ao vivo`
  - `Radar de alerta`
- conectei esses cards aos dados reais da Home, cruzando jogos do dia, séries prontas sem pick e confrontos sensíveis por lesão.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:51:51
## 2026-04-17 13:31:00

### Home - rail de jogos agora mostra o estado da série
- enriqueci a nova faixa de `Jogos` em `frontend/src/pages/Home.tsx` para exibir não só o `Game X`, mas também como a série chega naquele confronto;
- os cards agora mostram leituras como `série empatada 1-1`, `BOS lidera 2-1` ou `DEN fecha 4-2`, dependendo do estágio do confronto;
- para jogos ao vivo e próximos, a rail mostra o placar agregado de entrada da série; para jogos finalizados, ela passa a mostrar o estado após o resultado daquele jogo;
- também alinhei `frontend/src/hooks/usePostseasonRailExtras.ts` com os novos campos (`series_id` e `round`) usados para calcular esse contexto.

### Validação
- `npm --prefix frontend run build`
- `npm --prefix backend run build`

## 2026-04-17 13:18:00

### Home - correção de classificação indevida como Play-In na rail
- corrigi a rota `GET /games/rail` em `backend/src/routes/games.ts` para não marcar automaticamente como `Play-In` todo jogo extra de pós-temporada fora da base local;
- a classificação agora cruza o par de times com as séries locais e reaproveita a rodada correta (`R1`, `R2`, `CF`, `Finals`) quando o confronto já pertence a uma chave do bolão;
- também passei a inferir melhor o `game_number` desses jogos extras dentro da série, evitando cards com contexto errado na nova faixa de jogos da Home.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## 2026-04-17 13:05:00

### Home - rail de jogos refinada para mobile
- refinei a nova faixa horizontal de `Jogos` em `frontend/src/pages/Home.tsx` para funcionar melhor em telas estreitas, sem perder a estrutura inspirada na NBA.com;
- os cards de dia e de jogo ficaram mais compactos no celular, com tipografia, logos, badges e espaçamentos ajustados para leitura mais limpa;
- o cabeçalho da rail agora se reorganiza melhor no mobile, os chips viram uma linha horizontal navegável e a dica de interação ficou mais natural para toque;
- também adicionei `scroll snap` leve no mobile e reduzi os fades laterais, deixando a navegação por arraste mais confortável.

### Validação
- `npm --prefix frontend run build`

## 2026-04-17 12:45:00

### Home - faixa de jogos agora também puxa play-in para a timeline
- adicionei `backend/src/routes/games.ts` com a rota pública `GET /games/rail`, que busca jogos de pós-temporada ainda fora da base local e expõe uma trilha complementar para a Home;
- criei `frontend/src/hooks/usePostseasonRailExtras.ts` para buscar esses jogos extras no backend e manter a rail atualizada;
- ajustei a nova faixa horizontal de `Jogos` em `frontend/src/pages/Home.tsx` para misturar corretamente playoffs e play-in, inclusive nos contadores, no próximo jogo e nos rótulos do card;
- os cards agora deixam de forçar `Game X` quando o confronto extra é play-in, usando `Play-In` como contexto editorial e preservando a identidade visual da rail.

### Validação
- `npm --prefix backend run build`
- `npm --prefix frontend run build`


### Home - acessos rápidos refinados para a nova coluna esquerda
- evoluí `HomeQuickDeck` em `frontend/src/pages/Home.tsx` para ficar mais coerente com a coluna esquerda no desktop;
- converti os atalhos em uma lista configurável, com ícones mais presentes, cards mais altos no modo vertical e melhor hierarquia de texto;
- adicionei uma linha de contexto no topo do bloco, para os acessos rápidos parecerem parte do painel e não um grid solto;
- mantive o comportamento responsivo: no desktop `xl` o bloco continua vertical na coluna esquerda, e no mobile segue no fluxo central.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:53:21

### Home - ranking com leitura competitiva mais forte
- evoluí o `RankingCard` em `frontend/src/pages/Home.tsx` com um `Radar competitivo` no topo do bloco;
- o card agora resume distância para o líder, situação em relação ao top 3 e identifica o rival direto do participante;
- também passei a destacar visualmente o rival direto dentro da lista quando ele aparece no top 5, melhorando a sensação de disputa.

### Ajuste técnico
- substituí o uso de `.at(-1)` por uma forma compatível com o target atual do TypeScript do projeto.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:55:30

### Home - ranking com camada de momentum
- complementei o `RankingCard` em `frontend/src/pages/Home.tsx` com uma leitura de momentum no `Radar competitivo`;
- o bloco agora explica se o participante está subindo, pressionando o top 3 ou se outro jogador virou o nome quente do momento;
- também adicionei selos visuais discretos na lista para marcar `rival` e entradas que `subiram`, deixando o ranking menos estático.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 00:59:38

### Análise - primeira camada editorial da rodada
- adicionei um bloco editorial em `frontend/src/pages/Analysis.tsx` logo abaixo do hero da aba `Análise`;
- a página agora abre com:
  - `Headline da rodada`
  - `Confronto em foco`
  - `Termômetro do mercado`
  - `Times mais sensíveis`
- esse bloco cruza agenda, odds, notícias e lesões para dar uma leitura mais premium e menos “lista de cards”.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 01:01:28

### Análise - camada contextual de pressão da rodada
- adicionei `AnalysisPressureDeck` em `frontend/src/pages/Analysis.tsx` para destacar onde a rodada pesa mais;
- a aba agora aponta até 3 confrontos sob maior pressão, cruzando agenda, lesões, odds e notícias;
- cada card dessa nova seção explica por que o duelo está sensível e resume os sinais que puxam essa leitura.

### Validação
- `npm --prefix frontend run build`
## 2026-04-17 01:05:34

### UX - estados vazios mais premium em Home e Análise
- criei `InsightEmptyState` em `frontend/src/pages/Analysis.tsx` para padronizar os estados vazios da aba `Análise`;
- os blocos de próximos confrontos, resultados, odds, notícias e lesões agora mostram mensagens mais elegantes e orientadas ao contexto da rodada;
- também refinei o empty state do bloco `Jogos da última noite` em `frontend/src/pages/Home.tsx`, com visual mais alinhado ao restante da Home.

### Validação
- `npm --prefix frontend run build`
- o tour de primeira entrada agora também termina na aba `Perfil`, usando o perfil do próprio participante autenticado para fechar o onboarding mostrando leitura competitiva e DNA da cartela.
- endureci a aba `Análise` com error boundaries por seção para evitar tela preta caso algum bloco receba dado inesperado em runtime.

## 2026-04-17 - Bugfix: Tour de onboarding fechando prematuramente na aba Análise

### Problema
A aba `Análise` abria por ~1 segundo e fechava durante o tour de novos usuários. O driver.js era destruído logo após iniciar, sem interação do usuário.

### Causa raiz
Dois problemas encadeados:
1. `complete()` em `frontend/src/hooks/useOnboarding.ts` era recriada a cada render do `App` por não estar em `useCallback`;
2. `onComplete` estava no array de dependências do `useEffect` em `frontend/src/components/OnboardingTour.tsx` — qualquer re-render do `App` (incluindo o Suspense resolvendo o chunk lazy do `Analysis.tsx`, que é o maior bundle de página) recriava a referência, disparava o cleanup do efeito e destruía o driver antes de o tour completar.

### Correção
- `frontend/src/hooks/useOnboarding.ts`: envolveu `complete` em `useCallback([], [])` para garantir referência estável entre renders;
- `frontend/src/components/OnboardingTour.tsx`: moveu `onComplete` para um `useRef` (`onCompleteRef`) e removeu a prop do array de dependências do `useEffect`, eliminando completamente o acoplamento entre re-renders do `App` e o ciclo de vida do driver.

### Validação
- `npm --prefix frontend run build`
