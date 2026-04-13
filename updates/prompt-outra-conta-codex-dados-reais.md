# Prompt Para Outra Conta do Codex

Quero que você assuma este projeto já em modo de execução, com foco principal em integrar dados reais via API no app. Quero trabalho de alto nível técnico, mas com pragmatismo: avance no código, não fique só em análise.

Antes de implementar qualquer coisa, leia estes arquivos nesta ordem:

1. `C:\Dev\pessoal\projetos\nba-bolao\updates\codex-handoff-dados-reais.md`
2. `C:\Dev\pessoal\projetos\nba-bolao\updates\codex-changelog.md`
3. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\App.tsx`
4. `C:\Dev\pessoal\projetos\nba-bolao\backend\src\jobs\syncNBA.ts`
5. `C:\Dev\pessoal\projetos\nba-bolao\backend\src\routes\admin.ts`
6. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\pages\Home.tsx`
7. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\pages\Analysis.tsx`
8. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\pages\Games.tsx`
9. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\hooks\useSeries.ts`
10. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\hooks\useRanking.ts`
11. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\utils\ranking.ts`
12. `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\utils\scoring.ts`
13. `C:\Dev\pessoal\projetos\nba-bolao\backend\src\scoring\rules.ts`

## Stack e infraestrutura atual

- Banco de dados e autenticação: `Supabase`
- Fonte principal de dados externos da NBA: `Ball Don't Lie`
- Backend/API do projeto: `Node + Express`
- Hospedagem atual do backend: `Render`
- Frontend: `React + Vite`

## Importante

- assuma que o estado persistido do produto fica no `Supabase`
- assuma que a API externa principal hoje é a `Ball Don't Lie`
- assuma que qualquer estratégia de sync, processamento ou automação deve considerar o ambiente do `Render`
- se a integração atual com `Ball Don't Lie` estiver incompleta, frágil ou mal distribuída, melhore a arquitetura
- se houver mistura entre dado real e mock, trate isso explicitamente

## Contexto de produto

- o app já foi bastante reorganizado
- a `Home` virou painel principal do participante
- existe uma aba `Análise` separada
- a aba `Jogos` está mais operacional
- a tela `Compare` ficou mais analítica
- o `Admin` já tem ações operacionais como sync manual, rescore e health
- ainda existem blocos simulados/placeholders no frontend
- o próximo grande objetivo é conectar dados reais de forma confiável

## Prioridade máxima

Integrar dados reais com começo em jogos, placares e próximos confrontos.

## Ordem de prioridade

1. jogos e placares reais
2. próximos confrontos reais
3. odds reais
4. lesões ou notícias operacionais
5. estado ao vivo e atualização automática

## Modo de execução desejado

1. primeiro audite profundamente a pipeline atual de sync em `backend/src/jobs/syncNBA.ts`
2. descubra exatamente como `Supabase`, `Ball Don't Lie` e `Render` estão conectados hoje
3. identifique gargalos, fragilidades, dados faltantes e riscos de inconsistência
4. depois disso, implemente a primeira camada sólida da integração real
5. adapte o frontend para consumir os dados reais onde fizer sentido imediato
6. registre absolutamente tudo no changelog

## Quero explicitamente que você responda estas perguntas durante o trabalho

1. hoje o sync já funciona de verdade ou está parcial?
2. quais dados reais já entram no banco e quais ainda não entram?
3. quais telas ainda dependem de mock?
4. o backend atual está preparado para rodar sync confiável no `Render`?
5. o schema atual do `Supabase` é suficiente?
6. qual é a melhor primeira entrega real de valor para o usuário?

## O que eu quero que você faça

1. analisar a arquitetura atual de dados
2. auditar a job `syncNBA.ts`
3. mapear o fluxo completo:
   `Ball Don't Lie -> backend no Render -> Supabase -> frontend`
4. corrigir ou reforçar esse fluxo
5. implementar a primeira entrega real com impacto visível
6. reduzir placeholders onde já for possível
7. melhorar a capacidade operacional do admin se necessário
8. atualizar:
   `C:\Dev\pessoal\projetos\nba-bolao\updates\codex-changelog.md`

## Documentação obrigatória que eu também quero na resposta final

Além de implementar, eu quero documentação prática e operacional completa.

Você deve me entregar, no final da rodada:

1. passo a passo completo do que foi feito
2. passo a passo completo do que ainda preciso configurar manualmente
3. onde exatamente colocar cada chave e variável de ambiente
4. quais APIs usar para cada tipo de dado
5. qual API será usada para:
   - jogos e placares
   - próximos confrontos
   - odds
   - lesões
   - notícias, se fizer sentido
6. quais endpoints externos você escolheu e por quê
7. quais arquivos do projeto consomem essas integrações
8. como testar tudo localmente
9. como validar tudo no `Render`
10. como validar tudo no `Supabase`
11. como rodar sync manualmente
12. como saber se o sync quebrou
13. quais limitações, custos ou rate limits dessas APIs eu preciso conhecer

## Requisitos específicos sobre chaves, envs e provedores

Também quero que você documente claramente:

- onde colocar a chave da `Ball Don't Lie`
- se será necessário adicionar outra API para `odds`
- se será necessário adicionar outra API para `lesões`
- em qual arquivo `.env` ou variável do `Render` cada chave deve ficar
- quais variáveis precisam existir no frontend
- quais variáveis precisam existir no backend

Se você escolher provedores novos para `odds` ou `lesões`:

- explique qual escolheu
- explique por que escolheu
- mostre exatamente como configurar
- mostre o nome exato das env vars sugeridas

## Regras de trabalho

- não pare na análise se houver caminho seguro para implementar
- se houver decisão técnica relevante, explique de forma curta e siga
- prefira mudanças coesas e completas
- não reverta mudanças existentes sem necessidade
- não use comandos destrutivos de git
- use `apply_patch` para editar arquivos
- sempre atualize o changelog
- ao final valide com build/teste do que for aplicável
- se precisar alterar schema, SQL, rotas ou estrutura de sync, faça isso do jeito correto
- se detectar que algo está conceitualmente ruim, arrume em vez de contornar

## Pontos críticos

- a lógica de scoring está duplicada entre frontend e backend:
  - `C:\Dev\pessoal\projetos\nba-bolao\frontend\src\utils\scoring.ts`
  - `C:\Dev\pessoal\projetos\nba-bolao\backend\src\scoring\rules.ts`
- qualquer mudança de regra precisa manter consistência total
- a fase agora é de confiabilidade operacional, não só de UI
- o painel admin em `C:\Dev\pessoal\projetos\nba-bolao\backend\src\routes\admin.ts` já é um ponto natural para sync manual, rescore e observabilidade operacional

## Resultado esperado desta rodada

- diagnóstico claro da pipeline atual
- diagnóstico claro da integração entre `Supabase`, `Ball Don't Lie` e `Render`
- primeira implementação real de dados conectados
- menos dependência de mock no frontend
- sync/admin mais preparado para operar esses dados
- changelog atualizado com tudo que foi feito
- validação final por build/teste

## Formato obrigatório da resposta final

1. diagnóstico da pipeline atual
2. o que foi implementado
3. passo a passo de configuração
4. variáveis de ambiente necessárias
5. APIs escolhidas para cada tipo de dado
6. endpoints escolhidos e por que
7. arquivos principais alterados
8. como testar localmente
9. como validar no `Render`
10. como validar no `Supabase`
11. como rodar sync manualmente
12. como identificar falhas no sync
13. validações executadas
14. riscos, custos e próximos passos imediatos

Pode começar.
