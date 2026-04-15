# **🛡️ Relatório de Auditoria Técnica: NBA Bolão 2026**

**Status do Projeto:** Operacional (R1) / Risco Crítico (R2+)

**Data da Auditoria:** 14 de Abril de 2026

## 1. Erros Críticos (Bloqueadores de Operação)

### 1.1 O Bug do Mapeamento Estático (Sincronização R2+)

- **Localização:** `backend/src/jobs/syncNBA.ts` (Constante `SERIES_ID_BY_TEAMS`).
- **Descrição:** O sistema utiliza um mapa fixo de "TimeA-TimeB" para identificar as séries. Como os confrontos da Rodada 2 dependem dos vencedores da Rodada 1, o código atual falhará ao tentar sincronizar jogos de séries que não foram previstas (ex: se um azarão vencer).
- **Impacto:** Interrupção total da atualização automática de placares e ranking assim que a primeira rodada terminar.
- **Prioridade:** Urgente.

### 1.2 Duplicação da "Fonte da Verdade" no Scoring

- **Localização:** `frontend/src/utils/scoring.ts` e `backend/src/scoring/rules.ts`.
- **Descrição:** As regras de pontuação (Cravada, Jogo, Série) estão escritas manualmente em dois lugares. Não há um mecanismo que garanta que ambos sejam iguais.
- **Impacto:** Se um valor for alterado em um arquivo e esquecido no outro, o ranking exibido ao usuário será diferente do ranking processado nos backups e logs, gerando desconfiança e erros de premiação.
- **Prioridade:** Alta.

### 1.3 Vulnerabilidade no Lock de Palpites de Série

- **Localização:** `frontend/src/hooks/useSeries.ts`.
- **Descrição:** O sistema só impede a alteração de um palpite de série quando ela está marcada como `is_complete`. Não há verificação do horário do primeiro jogo (`tip_off_at`).
- **Impacto:** Um usuário pode alterar quem ele acha que vence a série após o Jogo 1 ou Jogo 2 já terem ocorrido, desde que a série ainda não tenha um vencedor definitivo (4 vitórias).
- **Prioridade:** Alta.

---

## 2. Riscos de Segurança e Privacidade

### 2.1 Vazamento de Palpites (Privacidade Zero)

- **Localização:** `frontend/src/hooks/useRanking.ts`.
- **Descrição:** Para calcular o ranking no navegador, o sistema faz o download de **todos** os `game_picks` e `series_picks` de todos os usuários.
- **Impacto:** Um usuário com conhecimento básico de "Inspecionar Elemento" (aba Network) consegue ver os palpites de todos os adversários antes mesmo dos jogos começarem, eliminando o sigilo estratégico.
- **Prioridade:** Média-Alta.

### 2.2 Configuração de CORS e Ambiente

- **Localização:** `backend/src/index.ts`.
- **Descrição:** O CORS está configurado com fallback para `localhost` caso a variável `FRONTEND_URL` não esteja setada no servidor de produção.
- **Impacto:** Risco do backend rejeitar conexões do site oficial em produção se a variável de ambiente não for configurada corretamente no Render.com.
- **Prioridade:** Média.

---

## 3. Desempenho e Arquitetura

### 3.1 Cálculo de Ranking Client-Side

- **Descrição:** O peso computacional de processar milhares de palpites para gerar o ranking recai sobre o celular/computador do usuário.
- **Risco:** Conforme o bolão cresce, a página de Ranking ficará cada vez mais lenta e consumirá mais dados móveis dos participantes.
- **Melhoria:** Mover o cálculo para o Backend e persistir o resultado no Banco de Dados.

### 3.2 Limites de APIs Gratuitas

- **Descrição:** O uso de serviços como *MyMemory* (tradução) e *The Odds API* em planos gratuitos possui limites rígidos (ex: 5.000 caracteres/dia).
- **Risco:** Notícias podem parar de ser traduzidas ou Odds podem parar de aparecer no meio de um dia de grande volume de acessos.
- **Melhoria:** Implementar cache mais agressivo ou monitoramento de quota.

---

## 4. Melhorias Sugeridas (Roadmap)

1. **Dinamicidade no Sync:** Alterar o `syncNBA.ts` para buscar o ID da série no banco através dos times em campo, eliminando o mapa estático.
2. **Single Source of Truth:** Mover as constantes de pontuação para um arquivo JSON central que seja importado por ambos os projetos (Front/Back).
3. **Segurança RLS:** Implementar *Row Level Security* no Supabase para impedir a leitura de palpites de terceiros enquanto o jogo não for "travado".
4. **Higiene de Dados na Home:** Substituir os dados estáticos de lesões e resultados (que hoje são mocks) pelos dados reais vindos das novas integrações de API implementadas.