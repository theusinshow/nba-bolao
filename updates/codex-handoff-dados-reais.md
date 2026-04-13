# Handoff Codex - Projeto NBA Bolao

## Objetivo deste documento

Este arquivo existe para contextualizar rapidamente uma nova conta do Codex antes de iniciar a fase de integracao de dados reais via API.

O foco agora nao e mais layout ou organizacao de navegacao. O foco passa a ser:

- conectar dados reais de jogos e placares
- alimentar Home, Analise e Jogos com dados confiaveis
- preparar sincronizacao operacional segura
- manter compatibilidade com o bolao real e com o painel admin

---

## Estado atual do produto

O projeto deixou de ser um app simples de bracket e hoje funciona como uma plataforma de bolao com quatro frentes principais:

- autenticacao e acesso
- operacao do bolao real
- simulacao isolada
- administracao operacional

### Rotas principais do frontend

Arquivo central: `frontend/src/App.tsx`

Rotas atuais:

- `/` -> Home
- `/analysis` -> Analise
- `/bracket` -> BracketEditor
- `/games` -> Jogos
- `/official` -> Chave oficial
- `/ranking` -> Ranking
- `/compare` -> Comparacao de brackets
- `/simulacao` -> Laboratorio de simulacao
- `/admin` -> Painel admin

As rotas pesadas ja estao com lazy loading.

---

## O que cada tela faz hoje

### Home

Arquivo: `frontend/src/pages/Home.tsx`

Estado atual:

- funciona como painel principal do participante
- topo com recap de jogos da ultima noite ainda em base simulada
- hero principal com posicao, pontos e progresso
- bloco `Pulso do dia`
- bloco `Seu Momento Agora`
- bloco `Acessos Rapidos`
- bloco `Resultados reais`
- cards laterais com ranking, estatisticas, meus palpites e series recentes

Importante:

- a Home esta orientada ao uso operacional do bolao
- radar complementar saiu da Home e foi movido para Analise
- ainda ha conteudo estatico/simulado no topo

### Analise

Arquivo: `frontend/src/pages/Analysis.tsx`

Estado atual:

- concentra leitura complementar
- proximo passo natural e receber dados reais de:
  - proximos confrontos
  - odds
  - lesoes
  - radar da rodada

### Jogos

Arquivo: `frontend/src/pages/Games.tsx`

Estado atual:

- virou painel operacional da rodada
- possui filtros por estado
- possui card de `palpites em foco`
- destaca urgencia e series pedindo acao
- ja lida com bloqueio por tipoff, series encerradas e picks revelados

Essa tela e uma das mais prontas para consumir dados reais de jogos.

### Compare

Arquivo: `frontend/src/pages/Compare.tsx`

Estado atual:

- comparacao mais visual entre dois participantes
- destaque automatico de divergencias
- leitura de `quem esta mais ousado`
- indicador de `potencial de virada`
- usa regras reais de pontuacao para estimar swing restante

### Ranking

Arquivo: `frontend/src/pages/Ranking.tsx`

Estado atual:

- ranking geral
- regras de desempate explicitas
- parte visual mais pesada por causa de graficos e relatorios

### Admin

Arquivos principais:

- `frontend/src/pages/Admin.tsx`
- `backend/src/routes/admin.ts`

Estado atual:

- health check
- overview operacional
- whitelist de emails
- promover/remover admin
- remover participante
- sync manual
- rescore manual
- backup operacional

Importante:

- o painel admin ja e o melhor lugar para concentrar syncs manuais, reprocessamento e diagnostico de dados reais

---

## Backend e logica de negocio

### Pontuacao

Arquivos principais:

- `frontend/src/utils/scoring.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/engine.ts`

Observacao critica:

- a configuracao de scoring esta duplicada entre frontend e backend por design
- qualquer mudanca em uma precisa ser espelhada na outra
- isso e um ponto sensivel do projeto

### Ranking

Arquivos principais:

- `frontend/src/utils/ranking.ts`
- `frontend/src/hooks/useRanking.ts`

O ranking ja recalcula a partir de:

- participantes
- series
- series_picks
- games
- game_picks
- teams

### Autenticacao e acesso

Arquivos relevantes:

- `frontend/src/hooks/useAuth.ts`
- `frontend/src/components/ProtectedRoute.tsx`

Logica atual:

- usuario autenticado via Supabase Auth
- acesso depende de whitelist
- participacao depende de vinculo em `participants`
- admin depende de `is_admin`

---

## Base de dados e tabelas que ja importam

Pelo estado atual do projeto, as tabelas mais relevantes para a fase de dados reais sao:

- `teams`
- `series`
- `games`
- `participants`
- `series_picks`
- `game_picks`
- `allowed_emails`
- tabelas de simulacao separadas

Para a integracao de dados reais, o centro da operacao sera:

- `games`
- `series`
- possivelmente novas tabelas ou colunas auxiliares para odds, injuries e sync metadata

---

## O que ja foi melhorado recentemente

Resumo das rodadas mais recentes:

- code splitting nas rotas principais
- Home reorganizada como painel principal
- criacao da aba Analise
- Home com bloco superior de jogos da ultima noite
- Jogos fortalecida como painel operacional
- Compare fortalecida como duelo analitico
- loader padronizado com SVG em `frontend/public/loading-basketball.svg`

O historico detalhado esta em:

- `updates/codex-changelog.md`

---

## Proxima grande fase: dados reais via API

### Prioridade recomendada

Executar nesta ordem:

1. jogos e placares reais
2. proximos confrontos reais
3. odds reais
4. lesoes ou noticias operacionais
5. estado ao vivo e atualizacao automatica

### Por que esta ordem

- jogos e placares destravam Home e Jogos imediatamente
- proximos confrontos reforcam Analise e Home
- odds e lesoes agregam leitura, mas sao camada secundaria
- ao vivo exige mais cuidado operacional e de frequencia de sync

---

## Estrategia recomendada para a nova conta do Codex

### Objetivo da nova rodada

Construir pipeline confiavel de dados reais, sem quebrar o bolao e sem misturar dado real com placeholder de forma opaca.

### Ordem de trabalho sugerida

1. mapear o schema atual de `games` e `series`
2. localizar a job atual de sync em `backend/src/jobs/syncNBA.ts`
3. entender de onde o projeto ja tenta puxar dados hoje
4. decidir se a API principal continua a mesma ou se sera trocada
5. implementar sync robusto de jogos e series
6. adicionar metadados de sync e logs no admin
7. adaptar Home, Analise e Jogos para consumirem dados reais

### O que a nova conta do Codex deve investigar primeiro

- `backend/src/jobs/syncNBA.ts`
- `backend/src/routes/admin.ts`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Analysis.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/utils/ranking.ts`
- qualquer SQL em `supabase/`

---

## Perguntas tecnicas que a nova conta deve responder cedo

Antes de codar forte, a nova conta deve esclarecer:

1. qual API sera a fonte primaria de verdade para jogos e placares?
2. essa API cobre playoffs completos com tipoff, status e score final?
3. ela tambem cobre odds?
4. ela cobre lesoes ou sera necessario um segundo provider?
5. qual frequencia de sync o projeto aguenta?
6. o sync sera cron, manual via admin ou hibrido?
7. quais campos faltam hoje no banco para suportar essa camada real?

---

## Riscos e cuidados

### Risco 1: misturar dado real com mock sem sinalizacao clara

Hoje ainda existem blocos simulados no frontend.

A nova conta deve:

- identificar cada bloco ainda simulado
- substituir ou sinalizar explicitamente
- evitar deixar o usuario sem saber o que e real e o que e placeholder

### Risco 2: regras de pontuacao divergirem

Ja existe duplicacao entre frontend e backend.

A nova conta nao deve mexer em pontuacao sem revisar:

- `frontend/src/utils/scoring.ts`
- `backend/src/scoring/rules.ts`

### Risco 3: sync criar inconsistencias em `series` e `games`

A nova conta deve validar:

- se serie encerrada bloqueia jogos posteriores corretamente
- se o winner da serie bate com a soma dos jogos
- se os rounds estao consistentes

### Risco 4: impacto visual

Com dado real entrando, algumas telas vao mudar de densidade e frequencia de atualizacao.

A nova conta deve evitar:

- recarregamentos visuais ruins
- flicker em cards principais
- estados vazios confusos

---

## Resultado esperado da proxima fase

Ao final da integracao de dados reais, o app deve conseguir:

- mostrar placares reais recentes na Home
- mostrar proximos confrontos reais
- alimentar Jogos com dados reais e atualizados
- reduzir dependencias de dados simulados em Home e Analise
- rodar sync manual pelo Admin
- preparar caminho para cron ou sync automatico confiavel

---

## Prompt inicial sugerido para a outra conta do Codex

Use algo perto disto:

```text
Leia primeiro:
- updates/codex-handoff-dados-reais.md
- updates/codex-changelog.md

Contexto:
- o projeto ja foi reorganizado em Home, Analise, Jogos, Compare e Admin
- agora a prioridade maxima e conectar dados reais via API
- quero atacar primeiro jogos, placares e proximos confrontos reais

Tarefa:
1. analise como o projeto hoje busca e armazena jogos/series
2. identifique a estrategia mais segura para integrar dados reais
3. implemente a primeira camada da integracao
4. registre tudo no changelog em updates/codex-changelog.md
```

---

## Observacao final

Se a nova conta tiver pouco contexto, o mais importante nao e ler o repo inteiro.

O caminho mais eficiente e:

1. ler este handoff
2. ler o changelog
3. abrir `App.tsx`
4. abrir `syncNBA.ts`
5. abrir `Home.tsx`, `Analysis.tsx` e `Games.tsx`
6. decidir a primeira entrega real de dados

