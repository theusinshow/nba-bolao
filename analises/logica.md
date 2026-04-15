# Auditoria Backend e Pontuação — Bolão NBA 2026

Data: 2026-04-15

## 1. Resumo Executivo

A arquitetura atual funciona para um bolão pequeno, mas não está no nível de segurança e determinismo esperado para cálculo crítico.  
A lógica de pontuação em si é simples e correta nos casos básicos, porém o ecossistema ao redor (sync, concorrência, validação de escrita, idempotência e observabilidade) abre espaço para inconsistências reais.

- Nota técnica (lógica + arquitetura): **5,9/10**
- Risco atual de erro de pontuação: **alto** (principalmente operacional/concurrency)
- Risco de injustiça no ranking: **real**

## 2. Problemas Críticos (P0/P1)

- **P0 — Sync sem transação atômica**
  - Onde: `backend/src/jobs/syncNBA.ts`
  - Problema: atualiza `games`, `series`, remove stale games, propaga bracket e recalcula sem proteção transacional fim-a-fim.
  - Impacto: estado intermediário no banco pode gerar ranking incorreto e troca injusta de colocação.

- **P0 — Trava de palpite principalmente no cliente**
  - Onde: `frontend/src/hooks/useSeries.ts`, `frontend/src/hooks/useGamePicks.ts`
  - Problema: bloqueio por `tip_off_at` está no frontend; sem enforcement hard no banco, cliente malicioso pode gravar fora do prazo.
  - Impacto: palpites pós-fechamento podem alterar pontuação.

- **P0 — Configuração de pontuação duplicada no frontend e backend**
  - Onde: `frontend/src/utils/scoring.ts`, `backend/src/scoring/rules.ts`
  - Problema: fonte de verdade duplicada e manual.
  - Impacto: divergência silenciosa entre ranking exibido e ranking de backend.

- **P1 — Falha de recálculo pode passar como sucesso**
  - Onde: `backend/src/scoring/engine.ts`
  - Problema: `recalculateAllScores()` captura erro e não propaga.
  - Impacto: operação pode falhar sem sinalização consistente para scheduler/admin.

- **P1 — Falta garantia contra duplicidade de picks no cálculo**
  - Onde: `backend/src/scoring/engine.ts`
  - Problema: se houver múltiplos picks do mesmo participante para jogo/série, todos são somados.
  - Impacto: pontuação inflada indevidamente.

- **P1 — Concorrência entre instâncias do scheduler**
  - Onde: `backend/src/scheduler/nbaSyncScheduler.ts`
  - Problema: lock de execução (`isRunning`) é apenas em memória local.
  - Impacto: múltiplas réplicas podem processar sync em paralelo.

- **P1 — `game_number` sujeito a corrida**
  - Onde: `backend/src/jobs/syncNBA.ts`
  - Problema: define `maxGameNumber + 1` sem lock distribuído/transacional global.
  - Impacto: numeração inconsistente e reprocessamento imprevisível.

## 3. Falhas na Lógica de Negócio

### Regras de Pontuação

- Regra de cravada substituindo série está correta.
- Risco central está na governança da regra (duplicidade FE/BE), não na fórmula atual.

### Cálculos

- Baixo risco de overflow/float (pontuação inteira e pequena).
- Falta validação hard de domínio para `round` fora de 1..4 no backend.

### Validações

- Ausência de defesa robusta no backend para garantir unicidade lógica de pick por participante+jogo/série antes do cálculo.
- Casos anômalos de feed (ex.: jogo final com dados inconsistentes) não são tratados com política explícita de erro operacional.

### Fluxos do Bolão

- Ranking live é recalculado no frontend, sem snapshot oficial persistido no backend.
- Perde-se auditabilidade forense de ranking por instante.

### Desempates

- Critério é determinístico (pontos > cravadas > séries > jogos > ordem alfabética).
- Cobertura de teste insuficiente para combinações complexas de empate.

## 4. Problemas de Integração com APIs

- Sem retry/backoff/circuit breaker no feed principal da NBA.
- Sem validação formal de schema nas respostas externas.
- Conversão de horário ET com offset fixo em `parseTipOffAt` é frágil para DST.
- Tratamento de rate limit e telemetria operacional ainda limitado.
- Em parte dos casos, fallback retorna vazio sem classificação clara de severidade.

## 5. Sugestões de Refatoração e Melhoria Arquitetural

### A) Fonte única da regra de pontuação no backend

**Antes**
- Config de score duplicada no frontend e backend.

**Depois**
- Backend como fonte única (policy/versionada), frontend apenas consome snapshot oficial.

```ts
// backend domain
export interface ScoringPolicy { /* versionada */ }
export function scorePick(policy: ScoringPolicy, input: ScoreInput): ScoreResult { /* determinístico */ }
```

### B) Sync atômico e idempotente

- Encapsular ciclo crítico em transação SQL/RPC.
- Adotar lock distribuído (ex.: advisory lock no Postgres).

### C) Enforcement de lock de palpite no banco

- Criar RPC/policy que rejeita escrita quando `tip_off_at <= now()`.
- Cliente apenas exibe erro; não decide regra.

### D) Restrições de unicidade estruturais

- Garantir unique para:
  - `series_picks(participant_id, series_id)`
  - `game_picks(participant_id, game_id)`

### E) Erro operacional explícito

- `recalculateAllScores()` deve propagar exceção.
- Scheduler e rotas admin devem tratar falha como falha real.

## 6. Recomendações de Testes e Garantia de Correção

- **Unitários por regra**
  - acerto/erro de série
  - cravada vs série simples
  - acerto/erro de jogo por rodada
  - desempate completo

- **Property-based testing**
  - invariantes de pontuação (não negativa, determinismo, monotonicidade esperada)
  - ordenação de ranking estável

- **Golden tests**
  - dataset fixo de temporada + ranking esperado
  - falha de 1 ponto deve quebrar CI

- **Integração com banco**
  - corrida de escrita simultânea de picks
  - tentativa de pick após lock
  - sync interrompido no meio + retry idempotente

- **Contract tests de APIs externas**
  - validação de schema mínimo do payload
  - cenários 429/500/timeout

- **Testes de tempo**
  - casos de DST/ET para janela de lock de palpites

## 7. Próximos Passos Priorizados

1. Enforce de integridade no banco (constraints + lock de pick por `tip_off_at`).
2. Refatorar sync para execução transacional com lock distribuído.
3. Centralizar cálculo no backend com snapshot oficial versionado.
4. Tornar recálculo fail-fast e instrumentar alertas/métricas operacionais.
5. Implementar suíte robusta de testes (unit, property, golden e integração).
6. Fortalecer integração externa (schema validation, retry/backoff, timezone robusto com DST).

