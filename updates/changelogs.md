# Changelogs

## Como Usar Este Documento

Este arquivo agora deve ser tratado como a melhor porta de entrada para leitura do histórico do projeto.

Ordem recomendada para qualquer revisão externa:

1. Ler este arquivo inteiro para entender contexto, objetivos e frentes principais.
2. Depois abrir `updates/codex-changelog.md` para o histórico técnico detalhado.
3. Consultar os arquivos citados no changelog técnico apenas quando necessário confirmar implementação, risco ou regressão.

## Estado Atual

Neste momento, os pontos mais recentes e mais importantes do projeto são:

- o progresso do bracket foi corrigido para não contar séries futuras ainda indefinidas;
- a Home foi alinhada à mesma lógica, evitando o antigo padrão de `8/15` quando a chave ainda não está formada;
- a aba `Jogos` e o modal jogo a jogo agora reconhecem quando uma série já terminou antes do jogo 5, 6 ou 7;
- o bracket mobile foi bastante refinado e o filtro `Oeste / Finais / Leste / Tudo` passou a funcionar corretamente;
- a Home ganhou um card `Resultados reais` para dar destaque ao bracket oficial;
- existe uma estrutura de testes em banco separado e uma simulação isolada via Supabase para não contaminar o bolão real.

## Consolidacao

Este documento unifica os dois registros principais de historico do projeto:

- `updates/codex-changelog.md`
- `updates/relatorio_codexv1.md`

Ele foi organizado para manter, em um unico lugar:

- o historico tecnico detalhado das alteracoes;
- o relatorio executivo consolidado das decisoes e impactos.

## 2026-04-10 - Consolidacao dos changelogs

### Objetivo

- centralizar em um unico documento o historico tecnico e o relatorio executivo do projeto;
- facilitar consulta futura sem depender de dois arquivos separados;
- preservar o contexto detalhado e a leitura resumida em um mesmo lugar.

### Documentos consolidados

- `updates/codex-changelog.md`
- `updates/relatorio_codexv1.md`

### Estrutura adotada

- `Parte 1`: changelog tecnico detalhado e cronologico;
- `Parte 2`: relatorio executivo consolidado das alteracoes.

---

## Parte 1 - Changelog Tecnico Detalhado

Consulte o registro tecnico completo em:

- `updates/codex-changelog.md`

Este bloco continua sendo a referencia mais detalhada para:

- arquivos alterados;
- bugs corrigidos;
- decisoes de arquitetura;
- validacoes executadas;
- pendencias abertas por rodada.

### Resumo tecnico consolidado

As principais frentes registradas no changelog tecnico ate aqui foram:

- alinhamento do frontend e backend ao schema real do Supabase;
- reforco do motor de pontuacao e do ranking;
- auditoria e correcao de bugs criticos de autenticacao, sync, picks e ranking;
- agrupamento da aba `Jogos` por serie;
- criacao de relatorio de pontuacao detalhado no ranking;
- placeholders de play-in e bloqueio de picks antes da definicao do confronto;
- volta do backend ao modo real da API;
- simulacao compartilhada isolada via Supabase em `/simulacao`;
- scripts SQL para testar as paginas oficiais em ambiente separado;
- guia de gerenciamento de usuarios no Supabase;
- backlog de futuras implementacoes;
- refinamentos fortes no mobile, especialmente no bracket;
- card `Resultados reais` na Home para destacar o bracket oficial;
- correção do progresso do bracket e da Home para contar apenas séries definidas;
- correção da aba `Jogos` para desativar jogos futuros quando a série já terminou.

### Referencia de leitura

Se a necessidade for entender:

- **o que mudou exatamente no codigo**: use primeiro `codex-changelog.md`;
- **por que as mudancas foram feitas e qual o impacto esperado**: use a Parte 2 deste documento.

---

## Parte 2 - Relatorio Executivo Consolidado

### Objetivo

Este bloco resume as alteracoes realizadas para reduzir risco de lancamento, melhorar confiabilidade da pontuacao, estabilizar o ranking e deixar a experiencia do bolao mais pronta para uso real entre amigos.

### Contexto do projeto

Este app esta sendo desenvolvido para uma brincadeira privada entre amigos de confianca, e nao como produto comercial aberto ao publico.

Por causa disso, as prioridades tecnicas foram tratadas assim:

- confiabilidade da pontuacao;
- estabilidade do ranking;
- boa experiencia no mobile;
- clareza visual e facilidade de uso;
- protecoes suficientes para evitar bagunca acidental.

### Resumo executivo

As mudancas mais importantes consolidadas foram:

- protecao das rotas administrativas no backend;
- ajuste da temporada usada no sync da API balldontlie;
- remocao de fallback com jogos simulados em producao;
- centralizacao da regra de pontuacao em uma camada isolada;
- reforco visual da Home, Jogos, Compare, Ranking e Brackets;
- melhorias sucessivas de mobile;
- criacao de teste automatizado de scoring;
- definicao de desempate deterministico no ranking;
- criacao de simulacao isolada para testes;
- criacao de scripts SQL para teste das paginas oficiais em banco separado.

### Frentes de alteracao

#### 1. Seguranca e operacao administrativa

- rotas administrativas do backend passaram a exigir autenticacao com token Bearer;
- validacao de admin agora consulta o usuario autenticado e o `participants.is_admin`;
- o frontend oficial passou a enviar o token corretamente ao acionar `sync`.

#### 2. Sync da API e confiabilidade dos dados

- a temporada usada no sync deixou de ser fixa;
- o backend passou a aceitar configuracao por ambiente e fallback por data atual;
- o fluxo voltou a trabalhar com dados reais sem depender de mocks de producao;
- o projeto passou a registrar melhor os dados reais de jogos e series.

#### 3. Pontuacao e ranking

- a regra de pontuacao foi centralizada;
- o engine foi reorganizado para usar funcoes dedicadas;
- o frontend passou a ordenar ranking com desempate deterministico;
- foi criado teste automatizado cobrindo cenarios sensiveis de scoring;
- o ranking ganhou explicacao visual e relatorio detalhado por participante.

#### 4. UX e apresentacao do produto

- a Home ganhou painel principal, foco no proximo palpite e agora destaque para `Resultados reais`;
- a pagina de Jogos ficou mais orientada a urgencia e contexto;
- o Compare ficou mais claro, mais competitivo e mais legivel;
- o Ranking ficou mais explicavel e mais social;
- o bracket do usuario e o oficial ganharam paineis-resumo;
- o mobile recebeu varias rodadas de refinamento.

#### 5. Testes e operacao controlada

- foi criada simulacao compartilhada isolada do bolao real;
- foram criados scripts SQL para abrir e fechar uma rodada ficticia nas tabelas oficiais de um banco de teste separado;
- foi criado guia operacional para gerenciamento de usuarios no Supabase;
- foi criado backlog de evolucao futura.

### Arquivos e areas impactadas

As alteracoes consolidadas atingiram principalmente:

- `backend/src/routes/admin.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/selftest.ts`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/pages/Compare.tsx`
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/OfficialBracket.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/hooks/useRanking.ts`
- `supabase/shared-simulation.sql`
- `supabase/test-scenarios/*`
- `supabase/user-management-guide.md`
- `updates/futuras-implementacoes.md`

### Validacoes consolidadas

Foram registradas validacoes recorrentes ao longo das rodadas:

- `npm run build` no frontend;
- `npm run build` no backend;
- `npm run test:scoring` no backend;
- execucao manual de SQL no Supabase para cenarios de simulacao e banco de teste.

### Riscos reduzidos

Os principais riscos mitigados com esse conjunto de alteracoes foram:

- acesso indevido a rotas administrativas;
- sync buscando temporada incorreta;
- exibicao de jogos simulados em producao;
- divergencia silenciosa na regra de pontuacao;
- instabilidade do ranking em cenarios de empate;
- travamentos ou inconsistencias em fluxos de picks;
- baixa clareza sobre como a pontuacao funciona;
- dificuldade de testar com amigos sem contaminar o bolao principal.

### Pendencias relevantes

Apesar do avanco, seguem pontos importantes de acompanhamento:

- revisar RLS do Supabase quando quiser endurecer mais o ambiente;
- validar completamente o fluxo `sync -> rescore -> ranking` no modo oficial;
- seguir refinando lock por horario real de tip-off;
- revisar mapeamentos estaticos de series em futuras temporadas;
- continuar a evolucao visual e mobile conforme o backlog.

### Avaliacao atual

O sistema esta bem mais maduro, mais previsivel e mais preparado para um lancamento controlado do que estava no inicio destas rodadas. A base principal foi estabilizada, os bugs mais perigosos foram tratados e o produto ganhou cara mais pronta para uso real entre amigos.

### Proximos passos recomendados

Ordem sugerida de continuidade:

1. concluir os testes ativos com os amigos;
2. seguir no polimento visual e mobile;
3. implementar melhorias de UX de picks e comparacao;
4. aproximar a Home de dados reais via API;
5. preparar a virada final para a operacao oficial dos playoffs.

---

## Foco Para Revisao Externa

Se outra IA ou outro desenvolvedor for revisar o projeto agora, os focos mais valiosos sao:

- verificar regressao nas regras de progresso do bracket e da Home;
- verificar se a aba `Jogos` nao permite palpites em jogos posteriores a uma série já encerrada;
- revisar se o mobile do bracket ficou consistente depois das ultimas rodadas;
- validar que a Home, o Bracket, os Jogos, o Ranking e o Official continuam coerentes entre si;
- apontar bugs, riscos de regra de negocio, inconsistencias visuais e oportunidades de simplificacao.

---

## Observacao Final

Os arquivos originais foram preservados por enquanto para nao perder historico e facilitar comparacao:

- `updates/codex-changelog.md`
- `updates/relatorio_codexv1.md`

Se voce quiser, no proximo passo eu tambem posso:

- mover todo o historico para este arquivo como fonte unica;
- ou apagar/arquivar os dois antigos para deixar so `updates/changelogs.md`.
