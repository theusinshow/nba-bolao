# Handoff para Codex — sessão Claude Code 2026-04-13

Todas as alterações abaixo foram feitas exclusivamente no **frontend**.
Nenhuma tabela, RLS, edge function, backend ou schema foi tocado.
Build final: `npm run build` ✓ zero erros em todos os checkpoints.

---

## CONTEXTO GERAL DA SESSÃO

Sessão focada em **melhorias visuais e correções de layout** — sem alterar lógica de negócio,
hooks, rotas ou integrações (Supabase, balldontlie, analysis backend).

---

## 1. Efeitos visuais e animações globais

**Arquivo:** `frontend/src/index.css`

- `font-size: 17px` adicionado a `html, body, #root` — escala toda a tipografia rem proporcionalmente
- `@keyframes fadeInUp` + classes `.animate-in`, `.animate-in-1` a `.animate-in-5` — entrada escalonada de blocos ao carregar páginas
- `@keyframes pulseGoldText` + `.title-glow` — título na Login pulsa brilho dourado
- `@keyframes glowGold/Silver/Bronze` + `.podium-gold/silver/bronze` — aura animada por posição no Ranking
- `@keyframes courtFade` + `.court-lines` — linhas de quadra SVG na Login respiram entre 4%–8% de opacidade
- `.card:hover` aprimorado: `transform: translateY(-2px)` + `box-shadow` (efeito lift em todos os cards)
- `.glass` adicionado: `backdrop-filter: blur(14px)` para glassmorphism opcional

**Arquivo:** `frontend/src/pages/Login.tsx`

- SVG quadra de fundo: `opacity-5` → classe `.court-lines`
- Título: `textShadow` inline → classe `.title-glow`
- Container principal: adicionado `.animate-in`

**Arquivo:** `frontend/src/pages/Ranking.tsx`

- `RankingHero` encapsulado em `.animate-in`
- `TopThreeCards` encapsulado em `.animate-in-2`
- Cards do pódio recebem `.podium-gold`, `.podium-silver`, `.podium-bronze` no className

---

## 2. Fusão do hero da Home em bloco único

**Arquivo:** `frontend/src/pages/Home.tsx`

- **Removidos:** componentes `PanelPulseBar` e `MyMomentCard` (duplicavam informação do HeroPanel)
- **`HeroPanel` reescrito** para absorver tudo: label, título, saudação, 3 chips de stat (posição/pontos/distância do líder), barra de progresso do bracket, CTA inteligente
  - CTA dourado se há picks pendentes, azul se está atrás do líder, verde se está em dia
  - Props adicionadas: `totalSeries`, `leaderPoints`
- Render principal: de 5 wrappers para 3 (`LastNightRecap`, `HeroPanel`, `HomeQuickDeck`) com stagger `.animate-in-1/2/3`

---

## 3. Estilização do top 3 no card Ranking Geral da Home

**Arquivo:** `frontend/src/pages/Home.tsx`

- Array `podium` local no `RankingCard` com cor/bg/border por posição (ouro `#ffd166`, prata `#c9d1d9`, bronze `#d68c45`)
- 1º/2º/3º: medalha emoji (🥇🥈🥉) no lugar do número, fundo colorido, borda colorida, fonte maior e negrito
- 4º/5º: estilo compacto mantido com número e cor muted
- Layout trocou de `<Divider />` para `gap: 6` no grid

---

## 4. Countdown, número do jogo e alerta de lesões na Home

**Arquivo:** `frontend/src/pages/Home.tsx`

- **`useCountdown(targetDate)`**: hook local com interval de 30s; exibe `"em Xh Ymin"`, `"em Ymin"`, data formatada ou `"Agora"`
- Header do `LastNightRecap`: texto estático → pill dourado com countdown do próximo jogo
- `sourceGames` no `LastNightRecap`: adicionado `gameNumber: game.game_number`; cada card exibe `"J1"`, `"J2"` etc.
- **`InjuryAlertPill`**: novo componente que chama `useAnalysisInsights` internamente; exibe banner vermelho com contagem de lesões e link para aba Análise; retorna `null` se sem dados
- `InjuryAlertPill` renderizado entre `HeroPanel` e `HomeQuickDeck` com `.animate-in-3`
- `HomeQuickDeck`: removido parágrafo descritivo desnecessário
- Imports adicionados: `useEffect`, `useState`, `Zap`, `useAnalysisInsights`

---

## 5. Melhorias e correções na aba Análise

**Arquivo:** `frontend/src/pages/Analysis.tsx`

### Hero (`AnalysisHero`)
- Reescrito com gradiente diagonal azul→dourado→escuro
- 4 chips de status: Próximos jogos, Resultados, Odds, Lesões
- Footer com pills das 3 fontes (Ball Don't Lie / The Odds API / SportsDataIO) + `X/3 frentes ativas` + timestamp
- Bug corrigido: contagem mostrava `/4` em vez de `/3`
- Extraídos: componente `AnalysisHeroFooter`, constante `SOURCE_PILLS`

### Componentes removidos/alterados
- **`AnalysisContextCard` removido** — redundante com o novo hero
- **`NextGamesCard`**: lista usa `sourceGames.slice(1)` para não duplicar o jogo em destaque
- **`RecentResultsCard`**: `sourceGames` inclui `homeWon`, `awayWon`, `homeColor`, `awayColor`, `gameNumber`; vencedor em negrito na cor do time; badge `J1/J2` adicionado
- **`OddsCard`**: prop `unfiltered?: boolean` + banner de aviso amarelo; typo `"Preco"` → `"Preço"`; favorito em negrito; azarão em muted
- **`InjuriesCard`**: aviso de dados embaralhados comprimido para 1 linha; em desktop aparece na sidebar direita (`hidden xl:block`); em mobile aparece antes dos cards principais (`xl:hidden`)
- `AlertTriangle` removido dos imports (não estava mais em uso)

### Fallback de filtro
- `oddsToShow` e `injuriesToShow`: quando o filtro por time retorna vazio, exibe todos os dados sem filtro + banner de aviso

### Correção de build — smart quotes
- Bloco `AnalysisHero` havia sido escrito com aspas tipográficas (U+2018/U+2019/U+201C/U+201D)
- Replace global feito via Node.js: todos substituídos por aspas ASCII retas

---

## 6. Melhorias visuais na página Bracket

**Arquivo:** `frontend/src/components/BracketSVG.tsx`

### Desktop — SVG responsivo
- SVG: `width: VB_W` (fixo ~1332px) → `width: '100%', minWidth: VB_W`
- Viewport menor que 1332px: scroll horizontal (minWidth garante legibilidade)
- Viewport maior: bracket preenche o espaço proporcionalmente via viewBox
- Removido `display: flex; justifyContent: 'safe center'` do container (causava dependência circular)

### Mobile — `MobileSeriesCard`
- Barra de cor topo (3px) dividida 50/50 pelas cores primárias dos dois times
- Background: `var(--nba-surface)` sólido → gradiente lateral sutil com cores dos times (`${colorA}12`)
- `borderRadius`: 8px → 10px
- `minHeight`: 80 → 82px

### Mobile — `MobileBracketView`
- Constante `ROUND_COLOR`: azul (R1), roxo (R2), laranja (CF), dourado (Finals)
- Headers de rodada: badge circular colorido com `R1`/`R2`/`CF`/`★` + cor por fase + contagem de séries
- R1 e R2: `grid-cols-1 sm:grid-cols-2` (2 colunas em sm+)
- CF e Finals: coluna única (mais destaque)

**Arquivo:** `frontend/src/pages/BracketEditor.tsx`

- Wrapper do SVG: `px-2` → `px-2 md:px-6 lg:px-10` (breathing room nas laterais em desktop)
- Removidos: bloco de duas tiles de dica ("Dica"/"Leitura"), pill "Arraste lateralmente", fade-gradient da borda direita

---

## 7. Contraste de cores de times

**Arquivo:** `frontend/src/data/teams2025.ts`

Substituição das cores primárias de 4 times com cores near-black ilegíveis no tema escuro:

| Time | Antes | Depois | Motivo |
|------|-------|--------|--------|
| MIN | `#0C2340` | `#78BE20` | Navy quase-preto; igual ao DEN → verde lima icônico dos Wolves |
| DEN | `#0E2240` | `#FFC627` | Navy quase-preto; igual ao MIN → dourado icônico dos Nuggets |
| IND | `#002D62` | `#FDBB30` | Navy escuro → dourado icônico dos Pacers |
| MIL | `#00471B` | `#00B04F` | Verde escuro → verde vibrante, ainda identifica os Bucks |

**Arquivo:** `frontend/src/utils/teamColors.ts` *(novo)*

```typescript
export function getTeamTextColor(primaryColor: string | null | undefined): string
```

- Calcula luminosidade percebida (ITU-R BT.601)
- Se abaixo de 112 → mistura linear com branco até atingir legibilidade (fator 1.35x para cores muito escuras)
- Cores já legíveis retornadas sem modificação
- **Usar apenas em texto** — backgrounds/borders com opacidade usam `primary_color` diretamente

**Arquivo:** `frontend/src/components/BracketSVG.tsx`

- SVG desktop: `fill` das abreviações → `getTeamTextColor(tA/tB?.primary_color)`
- Mobile `MobileSeriesCard`: `color` das abreviações → `getTeamTextColor(...)`
- Barras de acento e gradientes mantêm `primary_color` direto

**Arquivo:** `frontend/src/pages/Games.tsx`

- Linha de votação (contagem home/away): `color: primary_color` → `getTeamTextColor(...)`
- Pick badge (abreviação): texto → `getTeamTextColor(...)`
- Componente de seleção: `color: selectedTeam?.primary_color` → `getTeamTextColor(...)` (2 lugares)
- Card de histórico "Seu pick": → `getTeamTextColor(...)`
- `teamTint` (background tint) mantém `primary_color` original com opacidade

---

## ARQUIVOS TOCADOS NESTA SESSÃO (resumo)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `frontend/src/index.css` | Animações globais, tamanho base de fonte |
| `frontend/src/pages/Login.tsx` | Classes CSS, remove inline style |
| `frontend/src/pages/Home.tsx` | Hero fundido, countdown, injury pill, top 3 medals |
| `frontend/src/pages/Ranking.tsx` | Classes de animação, podium glow |
| `frontend/src/pages/Analysis.tsx` | Hero reescrito, remoção de card, fallback odds, layout lesões |
| `frontend/src/pages/Games.tsx` | `getTeamTextColor` em textos de times |
| `frontend/src/components/BracketSVG.tsx` | SVG responsivo, cards mobile, grid 2-col, `getTeamTextColor` |
| `frontend/src/pages/BracketEditor.tsx` | Padding wrapper, limpeza hints mobile |
| `frontend/src/data/teams2025.ts` | 4 cores substituídas (MIN/DEN/IND/MIL) |
| `frontend/src/utils/teamColors.ts` | **Novo** — utilitário `getTeamTextColor` |

---

## O QUE NÃO FOI TOCADO

- Nenhum hook (`useAuth`, `useRanking`, `useSeries`, `useGameFeed`, `useAnalysisInsights`, etc.)
- Nenhuma rota ou `App.tsx`
- Nenhum componente de modal (`SeriesModal`, `GamePickModal`)
- Nenhum utilitário de scoring ou bracket logic
- Backend inteiramente intocado
- Banco de dados / Supabase intocado
- Variáveis de ambiente intocadas
