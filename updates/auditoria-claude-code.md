# Auditoria Técnica — Bolão NBA 2026

> Gerado por Claude Code em 2026-04-11  
> Branch: `main` — commit `7ef5e34`

---

## Resumo Executivo

O projeto está funcionalmente operacional: autenticação, ranking em tempo real, palpites de série e jogo a jogo, bracket SVG e comparação entre participantes todos estão implementados. A arquitetura geral é coerente. Contudo, a auditoria encontrou **um bug crítico que inviabiliza o sync a partir da R2**, além de seis achados de severidade média com potencial real de impacto em produção. A maioria dos demais problemas são dívidas técnicas ou comportamentos que podem confundir usuários.

**Nível de risco geral: MÉDIO-ALTO** — o projeto sobrevive na R1 mas tem um bloqueio estrutural para R2+.

---

## Achados Críticos

---

### [ALTA] `SERIES_ID_BY_TEAMS` no sync tem matchups errados para R2+

**Arquivo:** `backend/src/jobs/syncNBA.ts` — linhas 22–38

**Problema:**  
O job de sincronização usa um mapa estático de `"TIME_A-TIME_B" → series_id` para saber em qual série registrar cada jogo da BDL. Os matchups de R2, WCF e ECF foram hardcodados com base em quem *se esperava* avançar (os favoritos), não com base em quem *realmente* avançou.

Conforme o próprio backup de 2026-04-10, os resultados reais da R1 foram:

| Slot  | Confronto Real         | Vencedor |
|-------|------------------------|----------|
| W1-2  | HOU vs **LAL**         | LAL      |
| W1-4  | MIN vs **GSW**         | MIN      |
| E1-4  | IND vs MIL             | **MIL**  |

Portanto a R2 real do Oeste é `OKC vs MIN` (W2-1) e `LAL vs DEN` (W2-2). Porém o mapa diz:

```typescript
'OKC-GSW': 'W2-1', 'GSW-OKC': 'W2-1',  // GSW foi eliminado na R1
'DEN-MIN': 'W2-2', 'MIN-DEN': 'W2-2',   // MIN vai para W2-1, não W2-2
```

Quando a BDL enviar jogos de `OKC-MIN`, o sync vai logar `[syncNBA] Unknown matchup: OKC-MIN` e pular. **A R2 inteira não será sincronizada automaticamente.**

O mesmo vale para ECF (`IND-CLE` está errado se MIL avançou no Leste) e para FIN.

**Impacto prático:**  
A partir da R2, nenhum jogo será atualizado automaticamente. O ranking ficará congelado. O admin terá que registrar resultados manualmente ou corrigir o mapa em produção.

**Sugestão de correção:**  
Substituir o mapa estático por uma lógica dinâmica que consulta a tabela `series` no banco para descobrir quais times compõem cada série, em vez de confiar em previsão de chaveamento. Alternativa de curto prazo: atualizar o mapa antes de cada rodada com base nos resultados reais.

---

### [ALTA] Constantes de pontuação duplicadas manualmente entre frontend e backend

**Arquivos:** `frontend/src/utils/scoring.ts` (L4–8) e `backend/src/scoring/rules.ts` (L4–8)

**Problema:**  
`SCORING_CONFIG` (frontend) e `SCORING` (backend) são cópias literais uma da outra. Ambos os arquivos contêm o aviso "Any change here MUST be manually mirrored there". Não há single source of truth, nenhum teste automatizado que compare os dois, e nenhum mecanismo que impeça a divergência.

**Impacto prático:**  
Se um desenvolvedor alterar pontuações no frontend sem atualizar o backend (ou vice-versa), o ranking exibido na UI divergirá silenciosamente do ranking computado nos logs do backend e nos CSVs de backup. Como o frontend é a "fonte da verdade" para display mas o backend é "fonte da verdade" para backup, os dois ficarão fora de sincronia sem nenhum alerta.

**Sugestão de correção:**  
Criar um pacote/módulo compartilhado para as constantes de pontuação, ou gerar um `rules.json` que ambos importam. Ao mínimo, adicionar um teste no selftest.ts do backend que compare os valores explicitamente.

---

### [ALTA] `recalculateAllScores` não persiste nada no banco

**Arquivo:** `backend/src/scoring/engine.ts` — linhas 120–135

**Problema:**  
O método `recalculateAllScores()` calcula o ranking mas apenas imprime o resultado no console. O comentário interno confirma: *"the backend publishes a computed snapshot through logs while the frontend remains the source of truth"*. O endpoint `POST /admin/rescore` chama esse método — o admin aciona um rescore que não produz nenhum efeito persistente.

**Impacto prático:**  
1. O botão "Rescore" na rota `/admin/rescore` é inútil em produção (nada muda no banco).  
2. O Realtime do Supabase não é acionado porque nenhuma linha é escrita.  
3. Logs de produção em Render.com ficam poluídos com snapshots de ranking sem serventia.

**Sugestão de correção:**  
Ou persistir o ranking calculado em uma tabela (`ranking_snapshots`) para que o Realtime notifique os clientes, ou remover o endpoint `/admin/rescore` se ele realmente não serve para nada, para não criar expectativa falsa de que "rescorear manualmente" tem efeito.

---

### [ALTA] Lock de palpite de série é apenas client-side e sem tip_off_at

**Arquivo:** `frontend/src/hooks/useSeries.ts` — linhas 63–65

**Problema:**  
```typescript
async function savePick(seriesId: string, winnerId: string, gamesCount: number) {
  if (!participantId) return
  const currentSeries = getSeriesById(seriesId)
  if (!currentSeries || currentSeries.is_complete) return  // única verificação
```

O único lock de série é `is_complete`. Não há verificação de `tip_off_at` (horário do primeiro jogo). Um participante pode mudar o palpite de série enquanto o jogo 1, 2 ou 3 já está em andamento, desde que a série não esteja completa.

Além disso, essa verificação é puramente client-side. Se não houver RLS no Supabase para `series_picks`, um usuário pode fazer chamadas diretas à API (via `curl` ou Supabase client) e alterar palpites a qualquer momento, inclusive após resultados conhecidos.

**Impacto prático:**  
Permite trapaça: um participante que acompanha o jogo pode, antes do último game terminar, alterar o palpite de série para o time que está vencendo a série. Por exemplo, com a série em 3-2, o palpite pode ser alterado para o time favorito antes do jogo 6.

**Sugestão de correção:**  
Adicionar lock baseado em `tip_off_at` do primeiro jogo da série (ou de uma coluna `locked_at` na tabela `series`), tanto no client quanto em RLS.

---

### [MÉDIA] All game_picks de todos os participantes são carregados no frontend

**Arquivo:** `frontend/src/hooks/useRanking.ts` — linha 50

**Problema:**  
```typescript
supabase.from('game_picks').select('*')
```

Para computar o ranking, o hook carrega **todos os palpites de jogo de todos os participantes** na sessão do browser. Isso significa que qualquer participante autenticado pode, via DevTools → Network, inspecionar os palpites de jogo de todos os outros para jogos ainda não realizados.

O mesmo ocorre com `series_picks` na linha 52.

**Impacto prático:**  
Um participante esperto pode ver os palpites dos adversários antes do tip-off e ajustar os próprios palpites estrategicamente. A UI esconde os palpites de outros usando `isGameComparisonVisible`, mas os dados já estão no browser.

**Nota:** este é um trade-off arquitetural (ranking client-side exige os dados todos). A solução real seria mover o cálculo para o backend com uma API que retorna apenas o ranking calculado.

**Sugestão de curto prazo:**  
Adicionar RLS no Supabase para `game_picks` que exija `played = true` OU `tip_off_at <= now()` antes de permitir leitura de palpites de outros participantes. Isso bloqueia o acesso direto mas não impede que o frontend quebre (pois ele não conseguiria mais buscar todos os picks para o ranking).

---

### [MÉDIA] Dois participantes com o mesmo nome no banco

**Evidência:** `backups/2026-04-10_23-55-29/resumo-rodada-2026-04-10.md` — linhas 19–21

```
| 1 | Matheus Mendes | 56 | 8 | 56 |
| 2 | Victor Hugo Dagnoni | 56 | 8 | 56 |
| 3 | Matheus Mendes | 47 | 8 | 56 |
```

**Problema:**  
Dois participants distintos com o nome "Matheus Mendes" existem no banco. O ranking exibe os dois com nomes idênticos, sem distinção visual. O desempate alfabético do `compareRankingEntries` pode produzir ordenação não-determinística entre os dois.

**Impacto prático:**  
O relatório de backup e o ranking na UI não permitem distinguir quem é quem. O participante com menos pontos pode sentir que sua posição está sendo "roubada" visualmente.

**Sugestão de correção:**  
Adicionar um segundo identificador visual (email, avatar determinístico por `user_id`, ou sobrenome único). No `compareRankingEntries`, desempate final por `participant_id` em vez de nome garante ordem estável.

---

### [MÉDIA] Home.tsx exibe dados completamente falsos como se fossem reais

**Arquivo:** `frontend/src/pages/Home.tsx` — linhas 18–48

**Problema:**  
As seções "Lesões", "Próximos jogos" e "Resultados de ontem" são dados 100% estáticos e fictícios hardcodados no componente:

```typescript
const INJURIES: ... = [
  { player: 'Nikola Jokic', team: 'DEN', status: 'questionable', ... },
  { player: 'Victor Wembanyama', team: 'SAS', status: 'probable', ... },
  ...
]
const LAST_NIGHT_RESULTS = [
  { home: 'BOS', away: 'NYK', homeScore: 112, awayScore: 105, ... },
  { home: 'LAL', away: 'HOU', homeScore: 118, awayScore: 114, ... },
  ...
]
```

Vários dados são factualmente inconsistentes com o estado real do torneio:
- Jokic aparece como "Questionável" mas DEN está na R2
- LAL × HOU aparece como resultado recente mas LAL ganhou sua série (HOU foi eliminado)
- Wembanyama/SAS não estão no playoff 2025/2026

**Impacto prático:**  
Usuários sem acesso a outras fontes podem acreditar que estas informações são reais. Erosão de confiança quando perceberem que são fabricadas.

**Sugestão de correção:**  
Remover as seções ou adicionar um aviso claro "Dados de demonstração — não correspondem ao playoff real". Se o objetivo é ter dados reais, buscar de uma API externa ou de `balldontlie.io`.

---

## Achados por Área

---

### Frontend

#### [BAIXA] `useGamePicks` não subscreve ao Realtime

**Arquivo:** `frontend/src/hooks/useGamePicks.ts`

`useGamePicks` não cria nenhum canal Supabase Realtime. Se um jogo for atualizado (resultado registrado, `played` vira `true`), o `GamePickModal` aberto não reflete a mudança. O usuário precisa fechar e reabrir o modal.

---

#### [BAIXA] `useSeries` não subscreve a mudanças em `games` ou `teams`

**Arquivo:** `frontend/src/hooks/useSeries.ts` — linha 16

O canal Realtime só observa `series`. Mudanças em `games` (horário de tip-off atualizado, jogo adicionado) ou `teams` não disparam re-fetch. Impacta a exibição do CountdownTimer e do status de lock.

---

#### [BAIXA] `useGamePicks` dependência frágil em `games.length`

**Arquivo:** `frontend/src/hooks/useGamePicks.ts` — linhas 18–20

```typescript
useEffect(() => {
  if (participantId && games.length > 0) fetchPicks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [participantId, games.length])
```

Usar `games.length` como dependência em vez de `games` significa que se os dados de um jogo mudarem sem adicionar/remover jogos (ex: `tip_off_at` atualizado), os picks não são rebuscados. O `eslint-disable` esconde o problema.

---

#### [BAIXA] `CountdownTimer` mostra "Iniciado" indefinidamente após tip-off

**Arquivo:** `frontend/src/components/CountdownTimer.tsx` — linhas 25–31

Quando `diff === 0`, renderiza "Iniciado". Se o usuário abrir o modal horas depois do jogo começar, verá "Iniciado" em vez do estado real do jogo. Seria mais informativo mostrar "Em andamento" ou "Encerrado" dependendo do estado de `game.played`.

---

#### [BAIXA] `ROUND_LABEL` nos modais não protege contra round inválido

**Arquivos:** `SeriesModal.tsx` linha 30, `GamePickModal.tsx` linha 43

```typescript
const roundLabel = ['R1', 'R2', 'Conf Finals', 'NBA Finals'][series.round - 1]
```

Se `series.round` for `0`, `5` ou `undefined`, o resultado é `undefined` e renderiza em branco. Edge case improvável mas possível durante seed/setup.

---

#### [BAIXA] `MobileBracketSheet` — filtro 'finals' inclui R3 e R4

**Arquivo:** `frontend/src/pages/BracketEditor.tsx` — linha 54

```typescript
if (focusSection === 'finals') return item.round >= 3
```

A aba rotulada "Finais" exibe Conference Finals (R3) + NBA Finals (R4). O label pode confundir usuários que esperam ver apenas o jogo final. Considerar renomear para "Finais e CF" ou separar em duas abas.

---

### Backend

#### [MÉDIA] CORS hardcodado para `localhost` em produção se env não setado

**Arquivo:** `backend/src/index.ts` — linha 11

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}))
```

Se `FRONTEND_URL` não estiver configurada no Render.com, todas as requisições do frontend em produção (Vercel) serão bloqueadas por CORS. Não há fallback para aceitar a origem de produção. O erro seria silencioso do ponto de vista do usuário (requests falham sem mensagem clara).

---

#### [MÉDIA] Sem concurrency guard no endpoint de sync

**Arquivo:** `backend/src/routes/admin.ts` — linha 43

`POST /admin/sync` não tem mutex nem lock. Dois cliques simultâneos ou dois cron jobs sobrepostos podem executar dois `syncNBA()` concorrentes, causando:
- Tentativa de inserir o mesmo jogo duas vezes (conflito de `nba_game_id`)
- `game_number` calculado com base em `maxGameNumber` que pode ser o mesmo em ambos os processos

---

#### [BAIXA] `parseTipOffAt` presume EDT (UTC-4) para todos os jogos

**Arquivo:** `backend/src/jobs/syncNBA.ts` — linha 79

```typescript
// EDT = UTC-4 (playoffs run April–June)
const utcHours = hours + 4
```

Hardcodado como UTC-4. Correto para playoffs de abril a junho (EDT), mas quebraria se houvesse jogo em março/novembro (EST = UTC-5). Robusto o suficiente para o caso de uso atual, mas frágil se a temporada mudar.

---

#### [BAIXA] `__dirname` pode falhar em builds ESM

**Arquivo:** `backend/src/backup/exportOperationalSnapshot.ts` — linha 490

```typescript
const repoRoot = path.resolve(__dirname, '../../..')
```

`__dirname` não é disponível em módulos ESM nativo. Se `tsconfig.json` for configurado para output ESM no futuro, o script de backup quebrará. Atualmente com CommonJS está OK.

---

### Ranking e Pontuação

#### Pontuação: lógica está correta

A regra "cravada SUBSTITUI série, nunca soma" está implementada corretamente em `calculateSeriesPickPoints` nas duas cópias (frontend e backend). O `selftest.ts` valida os casos principais.

O cálculo de `cravadas` no backup (`exportOperationalSnapshot.ts`, linha 228) não re-verifica `winner_id`, mas é coberto pelo `if (points > 0)` que já garante o acerto do vencedor.

#### [BAIXA] Desempate por nome pode ser não-determinístico com nomes idênticos

**Arquivo:** `frontend/src/utils/ranking.ts` — linha 33

```typescript
return a.participant_name.localeCompare(b.participant_name, 'pt-BR', { sensitivity: 'base' })
```

Com dois participantes com o mesmo nome (caso real no banco), o `localeCompare` retorna 0, e a função de sort do JavaScript não é estável em todos os ambientes. O ranking pode ordenar os dois de maneiras diferentes em renders distintos.

**Sugestão:** desempate final por `participant_id` (string UUID) que é único e produz ordem estável.

---

### Comparação e Sigilo de Palpites

#### [MÉDIA] Proteção de sigilo é apenas na UI

**Arquivo:** `frontend/src/pages/Compare.tsx` — linhas 282–291

`isGameComparisonVisible` e `isSeriesComparisonVisible` controlam se os palpites são *exibidos*. Porém os dados já estão em memória (buscados pelo `useRanking` e pelas queries específicas da Compare). Um usuário pode inspecionar os dados no console ou via Network tab antes do tip-off.

---

#### [BAIXA] `SummaryCard` exibe "Na frente" como "Empate" apenas quando pts > 0

**Arquivo:** `frontend/src/pages/Compare.tsx` — linha 488

```typescript
const tied = pts1 === pts2 && pts1 > 0
```

Se ambos tiverem 0 pontos, `tied` é `false`, e `duelLead` cai em `'Empate'` de qualquer jeito (pois `p1Winning` e `p2Winning` são ambos false). Resultado correto acidentalmente, mas a lógica é confusa.

---

### Jogos e Locks

#### [BAIXA] `saveGamePick` em `useGamePicks` — lock é só client-side

**Arquivo:** `frontend/src/hooks/useGamePicks.ts` — linhas 61–65

```typescript
if (game.played) return { error: 'Game already finished' }
if (game.tip_off_at && new Date(game.tip_off_at) <= new Date()) {
  return { error: 'Game already started' }
}
```

Verificações corretas no client, mas dependentes dos dados locais. Se `game.tip_off_at` for `null` (jogo não tem horário cadastrado), o lock não é aplicado. Sem RLS no Supabase para garantir isso no servidor.

---

#### [BAIXA] `Games.tsx` mock data temporária pode persisitir em produção

**Arquivo:** `frontend/src/pages/Games.tsx` — linhas 62–171

O componente define `MOCK_GAMES` com jogos fixos de abril/2026 (play-in). Quando não há jogos reais cadastrados, esses mocks são exibidos. Não está claro se esses mocks são removidos automaticamente após a data passada ou se ficam visíveis indefinidamente.

Os times nos mocks incluem `SAS` (San Antonio Spurs), que não está no playoff 2025/2026. O mock assume um cenário de play-in que pode não corresponder à realidade.

---

### Bracket

#### Bracket SVG: implementação correta

As conexões em `CONNECTIONS` na `BracketSVG.tsx` estão no sentido visual correto para o formato de bracket "duas metades convergindo para o centro". A distinção `'left'`/`'right'` controla de qual lado sai/entra o conector SVG, não a direção do avanço dos times.

---

#### [BAIXA] `BracketEditor` — seleção 'finals' no mobile inclui CF

**Arquivo:** `frontend/src/pages/BracketEditor.tsx` — linha 54

Ver achado correspondente na seção Frontend acima.

---

### Home

Ver achado de dados falsos na seção Achados Críticos (severidade: MÉDIA).

---

### Backup Operacional

#### Backup está funcionalmente correto

O `exportOperationalSnapshot.ts` e o `backupOperationalSnapshot.ts` produzem CSVs bem estruturados com CSV-escaping correto, timestamps em BRT e ranking calculado com os mesmos critérios do frontend. Os arquivos gerados em `backups/` confirmam que o script rodou com sucesso.

#### [BAIXA] Resumo markdown usa acentuação "normalizada" mas títulos sem acentos

**Arquivo:** `backend/src/backup/exportOperationalSnapshot.ts` — linha 442

```typescript
'# Backup Operacional do Bolao NBA',
```

Os textos do markdown gerado não têm acentos intencionalmente (para compatibilidade), mas o campo `human` usa `BRT` e alguns campos do CSV mantêm acentos. Inconsistente mas não crítico.

---

### Mobile

#### [BAIXA] `MobileBracketSheet` — botão de card tem `button` aninhado

**Arquivo:** `frontend/src/pages/BracketEditor.tsx` — linhas 156–230

O card de série no mobile usa `<button>` como container. Dentro há outros elementos interativos (badges). HTML semântico não permite `<button>` dentro de `<button>`. Browsers geralmente lidam bem, mas pode causar comportamentos imprevistos em leitores de tela.

---

#### [BAIXA] `TeamSide` — `direction: 'rtl'` para o lado direito

**Arquivo:** `frontend/src/pages/Games.tsx` — linha 1130

```typescript
direction: side === 'right' ? 'rtl' : 'ltr',
```

`direction: rtl` afeta a ordem de texto dentro do elemento. Para nomes de times em português/inglês, isso pode fazer nomes como "Oklahoma City Thunder" aparecerem truncados pela esquerda em vez da direita em telas pequenas.

---

### Riscos Arquiteturais

#### 1. Frontend como única fonte da verdade para ranking

O ranking é calculado integralmente no browser usando queries brutas do Supabase. Isso causa:
- **Carga:** cada abertura do ranking busca todos os participants, series, games, picks de toda a base. Com muitos participantes e jogos, pode ser lento.
- **Inconsistência backend-frontend:** o backend calcula ranking apenas para log, não para persistência. Não há garantia de paridade.
- **Visibilidade de dados:** todos os picks ficam no browser.

#### 2. Sem testes automatizados no frontend

Não há nenhum arquivo de teste (`.test.ts`, `.spec.ts`) em `frontend/src/`. A lógica de pontuação e ranking só é testada pelo `selftest.ts` do backend. Uma regressão no `buildRankingState` ou `compareRankingEntries` seria detectada apenas manualmente.

#### 3. Sync de jogos completamente dependente de mapeamento estático

O `SERIES_ID_BY_TEAMS` no sync exige que os times corretos sejam mapeados antes de cada rodada. Como não há lógica dinâmica de bracket (quem avança → qual série), cada rodada requer intervenção manual no código.

#### 4. Sem tratamento de erros parciais no sync

Em `syncNBA`, se um jogo individual falhar no `supabase.from('games').update()`, o loop continua sem marcar erro. A série pode ficar em estado inconsistente (parcialmente atualizada). Não há transação atômica.

---

## Itens Sem Problemas Relevantes

As seguintes áreas foram revisadas e não apresentam problemas relevantes:

- **`useAuth.ts`** — tratamento correto de erros Supabase (`PGRST116` para row-not-found), fluxo de onboarding de novo participante robusto, isAdmin passado corretamente.
- **`calculateSeriesPickPoints` e `calculateGamePickPoints`** — lógica de pontuação está correta nas duas implementações, incluindo a regra "cravada substitui série".
- **`compareRankingEntries`** — critérios de desempate consistentes entre frontend e backend (exceto o edge case de nome idêntico).
- **`parseTipOffAt`** — tratamento de crossing de midnight UTC correto.
- **`exportOperationalSnapshot`** — CSV escaping seguro, timestamps corretos, ranking recalculado.
- **`ProtectedRoute`** — verificação de auth state correta.
- **`BracketSVG`** — layout e conexões coerentes para o formato bracket.
- **`CountdownTimer`** — lógica de countdown correta, urgência em <1h funcional.
- **`SeriesModal`** — `canSave` cobre todos os casos: série completa, sem times definidos, sem seleção.
- **Backup operacional** — CSVs gerados em `backups/` estão completos e corretos.

---

## Prioridades Recomendadas

### Top 5 correções mais importantes

1. **Corrigir `SERIES_ID_BY_TEAMS` para R2+ com os matchups reais** — sem isso, a R2 não sincroniza. Precisa ser feito antes do início da R2 e re-feito manualmente a cada rodada enquanto o mapeamento for estático.

2. **Implementar lock de série baseado em `tip_off_at` do primeiro jogo** — impedir alteração de palpites de série após o início dos jogos (atualmente permite mudança até `is_complete`, o que pode ser explorado com a série em 3-2).

3. **Unificar constantes de pontuação** — criar um módulo compartilhado ou pelo menos um teste automatizado que garanta paridade entre `SCORING_CONFIG` e `SCORING`.

4. **Configurar `FRONTEND_URL` no Render.com e validar CORS em produção** — checar se a variável está setada; sem ela, o backend rejeita todas as requisições do frontend em produção.

5. **Remover ou sinalizar claramente os dados falsos na Home** — as seções de lesões, próximos jogos e resultados de ontem são fictícias e podem induzir usuários ao erro.

---

## Arquivos inspecionados

```
frontend/src/App.tsx
frontend/src/types/index.ts
frontend/src/lib/supabase.ts
frontend/src/utils/scoring.ts
frontend/src/utils/ranking.ts
frontend/src/utils/bracket.ts
frontend/src/utils/simulation.ts
frontend/src/hooks/useAuth.ts
frontend/src/hooks/useRanking.ts
frontend/src/hooks/useSeries.ts
frontend/src/hooks/useGamePicks.ts
frontend/src/store/useUIStore.ts
frontend/src/components/BracketSVG.tsx
frontend/src/components/SeriesModal.tsx
frontend/src/components/GamePickModal.tsx
frontend/src/components/RankingTable.tsx
frontend/src/components/CountdownTimer.tsx
frontend/src/components/ProtectedRoute.tsx
frontend/src/pages/Home.tsx
frontend/src/pages/BracketEditor.tsx
frontend/src/pages/OfficialBracket.tsx
frontend/src/pages/Ranking.tsx
frontend/src/pages/Compare.tsx
frontend/src/pages/Games.tsx
frontend/src/pages/SimulationLab.tsx
frontend/src/pages/Login.tsx
backend/src/index.ts
backend/src/jobs/syncNBA.ts
backend/src/lib/nba.ts
backend/src/routes/admin.ts
backend/src/routes/seedData.ts
backend/src/scoring/engine.ts
backend/src/scoring/rules.ts
backend/src/scoring/selftest.ts
backend/src/utils/bracket.ts
backend/src/backup/exportOperationalSnapshot.ts
backups/2026-04-10_23-55-29/resumo-rodada-2026-04-10.md
```
