# BOLÃO NBA 2026 — PROMPT COMPLETO v4 FINAL

## OBJETIVO
Crie do zero o projeto completo Bolão NBA 2026 — sistema de bolão para os Playoffs da NBA entre amigos. App com autenticação Google, acesso restrito ao grupo, dois sistemas de palpite independentes (série e jogo a jogo), ranking em tempo real via Supabase Realtime, e dados automáticos via balldontlie.io.

## STACK

### Frontend
- React 18 + TypeScript + Vite
- Zustand (UI state)
- Tailwind CSS
- Recharts (gráficos)
- Supabase JS SDK (auth + banco + realtime)
- Lucide React (ícones)
- Fontes: Bebas Neue + Barlow + Barlow Condensed (Google Fonts)
- Deploy: Vercel

### Backend
- Node.js + Express + TypeScript
- Supabase JS SDK (service role)
- node-cron (sync job)
- axios (API NBA)
- Deploy: Render.com

### Banco + Auth
- Supabase (PostgreSQL + Auth + Realtime)
- URL: https://skxjeijxrzagmzllmtiv.supabase.co

## ESTRUTURA DO PROJETO

```
bolao-nba-2026/
├── frontend/
│   ├── src/
│   │   ├── types/index.ts
│   │   ├── lib/supabase.ts
│   │   ├── data/
│   │   │   ├── teams2025.ts
│   │   │   └── seed2025.ts
│   │   ├── store/useUIStore.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useRanking.ts
│   │   │   ├── useSeries.ts
│   │   │   └── useGamePicks.ts
│   │   ├── utils/scoring.ts
│   │   ├── components/
│   │   │   ├── BracketSVG.tsx
│   │   │   ├── SeriesModal.tsx
│   │   │   ├── GamePickModal.tsx
│   │   │   ├── RankingTable.tsx
│   │   │   ├── RankingChart.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Nav.tsx
│   │   │   ├── CountdownTimer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Unauthorized.tsx
│   │       ├── Home.tsx
│   │       ├── BracketEditor.tsx
│   │       ├── OfficialBracket.tsx
│   │       ├── Ranking.tsx
│   │       └── Compare.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
└── backend/
    ├── src/
    │   ├── index.ts
    │   ├── lib/
    │   │   ├── supabase.ts
    │   │   └── nba.ts
    │   ├── jobs/syncNBA.ts
    │   ├── scoring/engine.ts
    │   └── routes/admin.ts
    ├── package.json
    └── .env
```

## IMPORTANTE — BANCO JÁ CRIADO
O banco Supabase já está configurado com todas as tabelas, RLS e Realtime ativado. NÃO rodar SQL de criação de tabelas.

## VARIÁVEIS DE AMBIENTE

### frontend/.env
```
VITE_SUPABASE_URL=https://skxjeijxrzagmzllmtiv.supabase.co
VITE_SUPABASE_ANON_KEY=PREENCHER
```

### backend/.env
```
SUPABASE_URL=https://skxjeijxrzagmzllmtiv.supabase.co
SUPABASE_SERVICE_KEY=PREENCHER
BALLDONTLIE_API_KEY=PREENCHER
PORT=3001
```

## AUTENTICAÇÃO (frontend/src/hooks/useAuth.ts)

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; email: string }
  | { status: 'authorized'; user: User; participantId: string }

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handleUser(data.session.user)
      else setAuth({ status: 'unauthenticated' })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) handleUser(session.user)
      else setAuth({ status: 'unauthenticated' })
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleUser(user: User) {
    const email = user.email!

    const { data: allowed } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email)
      .single()

    if (!allowed) {
      setAuth({ status: 'unauthorized', email })
      return
    }

    let { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      const { data: created } = await supabase
        .from('participants')
        .insert({
          user_id: user.id,
          name: user.user_metadata.full_name ?? email.split('@')[0],
          email,
        })
        .select('id')
        .single()
      participant = created
    }

    setAuth({ status: 'authorized', user, participantId: participant!.id })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAuth({ status: 'unauthenticated' })
  }

  return { auth, signInWithGoogle, signOut }
}
```

## LÓGICA DE PONTUAÇÃO (frontend/src/utils/scoring.ts)

```typescript
export const SCORING_CONFIG = {
  pointsPerGame: { 1: 1, 2: 2, 3: 3, 4: 4 },
  pointsPerSeries: { 1: 3, 2: 6, 3: 9, 4: 12 },
  pointsPerCravada: { 1: 6, 2: 12, 3: 20, 4: 25 },
  championBonus: 0,
} as const

// CRÍTICO: Cravada SUBSTITUI série, nunca soma
export function calculateSeriesPickPoints(
  pick: { winnerId: string; gamesCount: number },
  series: { winnerId?: string; gamesPlayed: number; isComplete: boolean; round: number }
): number {
  if (!series.isComplete || !series.winnerId) return 0
  if (pick.winnerId !== series.winnerId) return 0
  const round = series.round as 1 | 2 | 3 | 4
  const cravada = pick.gamesCount === series.gamesPlayed
  return cravada
    ? SCORING_CONFIG.pointsPerCravada[round]
    : SCORING_CONFIG.pointsPerSeries[round]
}

export function calculateGamePickPoints(
  pick: { winnerId: string },
  game: { winnerId?: string; played: boolean; round: number }
): number {
  if (!game.played || !game.winnerId) return 0
  if (pick.winnerId !== game.winnerId) return 0
  return SCORING_CONFIG.pointsPerGame[game.round as 1 | 2 | 3 | 4]
}
```

## DESIGN SYSTEM

```css
:root {
  --nba-bg: #0a0a0f;
  --nba-surface: #13131a;
  --nba-surface-2: #1c1c26;
  --nba-gold: #c8963c;
  --nba-gold-light: #e8b45a;
  --nba-text: #f0f0f0;
  --nba-text-muted: #888899;
  --nba-border: rgba(200, 150, 60, 0.15);
  --nba-east: #4a90d9;
  --nba-west: #e05c3a;
  --nba-success: #2ecc71;
  --nba-danger: #e74c3c;
}
```

- Títulos: Bebas Neue — tracking amplo, uppercase
- Corpo: Barlow
- Números: Barlow Condensed
- Cards: background var(--nba-surface), border 1px solid var(--nba-border), border-radius 8px
- Hover: border dourada rgba(200,150,60,0.4)
- Botão primário: background var(--nba-gold), texto escuro

## PÁGINAS

### Login.tsx
- Fundo escuro com linhas de quadra SVG sutis
- Logo "Bolão NBA 2026" em Bebas Neue dourado
- Botão "Entrar com Google" (branco, logo SVG do Google)
- Texto "Acesso restrito aos participantes do bolão"

### Home.tsx
- Pódio top 3 com medalhas ouro/prata/bronze
- Cards de estatísticas: total participantes, séries completas, jogos hoje
- Lista dos últimos resultados
- Animação de subida/descida no ranking (↑↓ com cor)

### BracketEditor.tsx
- Bracket SVG interativo mostrando as 15 séries
- Clique em série → SeriesModal (escolher vencedor + nº jogos)
- Clique em jogo → GamePickModal (bloqueado após tip-off)
- Verde = acertou, vermelho = errou, cinza = aguardando

### OfficialBracket.tsx
- Bracket com resultados reais
- Botão admin (só is_admin = true) para forçar sync manual

### Ranking.tsx
- Tabela: posição, nome, pts totais, pts por rodada, cravadas, % acerto
- Gráfico de barras segmentado por rodada (Recharts)
- Animação quando rank muda em tempo real

### Compare.tsx
- Dois dropdowns para selecionar participantes
- Brackets lado a lado com overlay de diferenças

### Nav.tsx
- Bottom navigation bar fixa
- Ícones: Home, Bracket, Ranking, Comparar
- Avatar do usuário logado + botão de logout

## TIMES 2025

```typescript
export const TEAMS_2025 = [
  { id: 'OKC', name: 'Oklahoma City Thunder', abbreviation: 'OKC', conference: 'West', seed: 1, primary_color: '#007AC1' },
  { id: 'HOU', name: 'Houston Rockets', abbreviation: 'HOU', conference: 'West', seed: 2, primary_color: '#CE1141' },
  { id: 'GSW', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'West', seed: 3, primary_color: '#1D428A' },
  { id: 'DEN', name: 'Denver Nuggets', abbreviation: 'DEN', conference: 'West', seed: 4, primary_color: '#0E2240' },
  { id: 'LAC', name: 'LA Clippers', abbreviation: 'LAC', conference: 'West', seed: 5, primary_color: '#C8102E' },
  { id: 'LAL', name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'West', seed: 6, primary_color: '#552583' },
  { id: 'MIN', name: 'Minnesota Timberwolves', abbreviation: 'MIN', conference: 'West', seed: 7, primary_color: '#0C2340' },
  { id: 'MEM', name: 'Memphis Grizzlies', abbreviation: 'MEM', conference: 'West', seed: 8, primary_color: '#5D76A9' },
  { id: 'CLE', name: 'Cleveland Cavaliers', abbreviation: 'CLE', conference: 'East', seed: 1, primary_color: '#860038' },
  { id: 'BOS', name: 'Boston Celtics', abbreviation: 'BOS', conference: 'East', seed: 2, primary_color: '#007A33' },
  { id: 'NYK', name: 'New York Knicks', abbreviation: 'NYK', conference: 'East', seed: 3, primary_color: '#F58426' },
  { id: 'IND', name: 'Indiana Pacers', abbreviation: 'IND', conference: 'East', seed: 4, primary_color: '#002D62' },
  { id: 'MIL', name: 'Milwaukee Bucks', abbreviation: 'MIL', conference: 'East', seed: 5, primary_color: '#00471B' },
  { id: 'DET', name: 'Detroit Pistons', abbreviation: 'DET', conference: 'East', seed: 6, primary_color: '#C8102E' },
  { id: 'MIA', name: 'Miami Heat', abbreviation: 'MIA', conference: 'East', seed: 7, primary_color: '#98002E' },
  { id: 'ORL', name: 'Orlando Magic', abbreviation: 'ORL', conference: 'East', seed: 8, primary_color: '#0077C0' },
]
```

## BRACKET OFICIAL 2025 (seed data)

```
OKC 4x0 MEM (R1 Oeste)
GSW 4x1 HOU (R1 Oeste)
DEN 4x3 LAC (R1 Oeste)
MIN 4x2 LAL (R1 Oeste)
CLE 4x1 ORL (R1 Leste)
BOS 4x1 MIA (R1 Leste)
NYK 4x1 DET (R1 Leste)
IND 4x2 MIL (R1 Leste)
OKC 4x1 GSW (R2 Oeste)
OKC 4x1 DEN (Conf Finals Oeste)
IND 4x2 NYK (R2 Leste)
IND 4x3 CLE (Conf Finals Leste)
OKC 4x3 IND (NBA Finals) — CAMPEÃO: OKC Thunder
```

## RANKING SEED 2025
- 1º Victor (~130 pts) — acertou OKC campeão, muitas cravadas
- 1º Luís (~130 pts) — acertou OKC campeão, muitas cravadas
- 3º Thiago (~115 pts)
- 4º Matheus (~108 pts)
- 5º Pedro (~100 pts)
- 6º Rafael (~95 pts)
- 7º Bruno (~88 pts)
- 8º Carlos (~80 pts)
- 9º Milton (~65 pts) — último, errou a maioria

## SYNC JOB (backend)
Roda a cada 15 minutos entre 21h–04h UTC:
1. Buscar jogos em balldontlie.io (/v1/games?postseason=true)
2. Para cada jogo com status "Final" não registrado:
   a. Atualizar tabela games (winner_id, scores, played=true)
   b. Verificar se a série encerrou (4 vitórias)
   c. Se encerrou: atualizar series (winner_id, games_played, is_complete=true)
3. Recalcular pontuação de todos os participantes
4. Atualizar ranks
5. Supabase Realtime notifica todos os browsers automaticamente

## NOTAS CRÍTICAS
1. Implementar na ordem: tipos → auth → frontend → backend
2. Testar login Google antes de qualquer outra coisa
3. CRAVADA SUBSTITUI série, nunca soma — isso é crítico
4. Palpite de jogo é opcional e independente do palpite de série
5. Palpite de jogo bloqueado após tip_off_at
6. allowed_emails é a única barreira de acesso
7. Seed 2025 serve como demo e teste da pontuação
8. O banco já está criado — NÃO recriar tabelas