# Relatorio Completo das Alteracoes

## Objetivo

Este documento registra as alteracoes realizadas para reduzir o risco de lancar o bolao para os usuarios sem sofrer com problemas de seguranca, sincronizacao incorreta, exibicao de dados falsos em producao ou bugs de pontuacao e ranking durante a competicao.

O foco principal foi:

- proteger operacoes administrativas;
- corrigir o comportamento do sync com a API externa;
- impedir que dados simulados aparecam em producao;
- deixar a regra de pontuacao mais confiavel e testavel;
- estabilizar o ranking em cenarios de empate.

## Resumo Executivo

Foram implementadas melhorias em duas frentes:

1. Seguranca e comportamento de producao.
2. Confiabilidade da pontuacao e estabilidade do ranking.

As mudancas mais importantes foram:

- protecao das rotas administrativas no backend;
- ajuste da temporada usada no sync da API balldontlie;
- remocao do fallback com jogos simulados em producao;
- centralizacao da regra de pontuacao em uma camada isolada;
- reforco visual da Home com painel principal focado no usuario;
- inclusao de uma secao visual explicando a pontuacao na aba de ranking;
- criacao de teste automatizado de scoring;
- definicao de desempate deterministico no ranking.

## Arquivos Alterados

### Arquivos modificados

- `backend/src/routes/admin.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/scoring/engine.ts`
- `backend/package.json`
- `frontend/src/pages/OfficialBracket.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/hooks/useRanking.ts`

### Arquivos criados

- `backend/src/scoring/rules.ts`
- `backend/src/scoring/selftest.ts`

## Detalhamento das Alteracoes

### 1. Protecao das rotas administrativas

Arquivo:

- `backend/src/routes/admin.ts`

Antes:

- qualquer pessoa que conhecesse as URLs podia acionar `/admin/sync`, `/admin/rescore` e `/admin/seed`;
- o frontend escondia o botao para nao-admin, mas isso nao protegia a API.

Depois:

- foi criada uma middleware `requireAdmin`;
- o backend agora exige um token Bearer no cabecalho `Authorization`;
- o token e validado com `supabase.auth.getUser(token)`;
- o participante autenticado e consultado na tabela `participants`;
- o backend verifica se `is_admin` e verdadeiro;
- se o token estiver ausente ou invalido, retorna `401`;
- se o usuario nao for admin, retorna `403`.

Impacto:

- usuarios comuns nao conseguem mais disparar sync ou rescore manualmente;
- o risco de manipulacao indevida das operacoes administrativas foi significativamente reduzido.

### 2. Envio do token no frontend para o sync

Arquivo:

- `frontend/src/pages/OfficialBracket.tsx`

Antes:

- o frontend fazia a chamada `POST /admin/sync` sem autenticacao;
- isso ficava incoerente com a necessidade de proteger a rota no backend.

Depois:

- o frontend recupera a sessao atual do Supabase;
- envia o `access_token` no cabecalho `Authorization: Bearer ...`;
- mostra mensagem amigavel se a sessao estiver expirada;
- tenta exibir a mensagem real de erro retornada pelo backend.

Impacto:

- o fluxo de administracao ficou correto de ponta a ponta;
- somente admins autenticados conseguem iniciar o sync pela interface.

### 3. Ajuste da temporada usada no sync

Arquivo:

- `backend/src/jobs/syncNBA.ts`

Antes:

- o sync chamava `fetchPostseasonGames(2024)` fixo no codigo;
- isso era um risco direto de sincronizar a temporada errada.

Depois:

- foi criada a funcao `getDefaultSeason()`;
- o sync usa a variavel `BALLDONTLIE_SEASON` se ela estiver definida;
- caso contrario, calcula automaticamente a temporada com base na data atual;
- o backend registra em log qual temporada esta usando.

Impacto:

- o app nao fica preso em uma temporada antiga;
- voce pode controlar manualmente a temporada se quiser;
- reduz fortemente o risco de puxar jogos incorretos.

Observacao:

- como a API trabalha com o ano inicial da temporada, para abril de 2026 a temporada padrao fica em `2025`, o que corresponde a temporada 2025-26.

### 4. Remocao de jogos simulados em producao

Arquivo:

- `frontend/src/pages/Games.tsx`

Antes:

- se o banco nao retornasse jogos, a tela usava `MOCK_GAMES`;
- isso podia mascarar erros reais de sync, leitura de banco ou seed.

Depois:

- o fallback com mock foi mantido apenas em ambiente de desenvolvimento;
- em producao:
  - se houver erro de carregamento, a tela mostra mensagem de indisponibilidade;
  - se nao houver jogos reais, a tela mostra estado vazio real;
- foi adicionado um estado `loadError` para distinguir falta de dados de falha real.

Impacto:

- usuarios nao veem mais jogos falsos em producao;
- falhas reais ficam visiveis, o que facilita diagnostico e evita confusao no bolao.

### 5. Centralizacao da regra de pontuacao

Arquivo criado:

- `backend/src/scoring/rules.ts`

Foi criada uma camada isolada contendo:

- configuracao de pontuacao;
- calculo de pontos para series;
- calculo de pontos para jogos;
- funcao de comparacao para ordenacao do ranking.

Funcoes criadas:

- `calculateSeriesPickPoints`
- `calculateGamePickPoints`
- `compareRankingEntries`

Impacto:

- a regra critica saiu de dentro do motor principal;
- agora ela pode ser testada de forma direta;
- ficou mais facil revisar, manter e evitar regressao.

### 6. Refatoracao do motor de pontuacao

Arquivo:

- `backend/src/scoring/engine.ts`

Antes:

- a regra de pontuacao ficava embutida no arquivo;
- o ranking era ordenado apenas por pontos;
- em empate, a ordem podia variar.

Depois:

- o engine passou a usar `calculateSeriesPickPoints`;
- o engine passou a usar `calculateGamePickPoints`;
- o ranking passou a usar `compareRankingEntries`;
- o backend agora busca `id` e `name` dos participantes para permitir desempate por nome.

Impacto:

- reducao de duplicacao de regra;
- maior previsibilidade no ranking;
- melhor manutencao do codigo;
- menor risco de bugs silenciosos na pontuacao.

### 7. Ranking com desempate deterministico no frontend

Arquivo:

- `frontend/src/hooks/useRanking.ts`

Antes:

- o frontend ordenava o ranking apenas por pontos;
- empates podiam gerar ordem instavel.

Depois:

- foi adicionada uma funcao de comparacao com desempate alfabetico por nome;
- a ordenacao do frontend ficou coerente com a do backend.

Impacto:

- evita variacao aleatoria de posicao entre usuarios empatados;
- melhora a consistencia da experiencia para os participantes.

### 8. Criacao de teste automatizado de scoring

Arquivo criado:

- `backend/src/scoring/selftest.ts`

Script adicionado:

- `test:scoring` em `backend/package.json`

Casos cobertos:

- serie correta com cravada;
- serie correta sem cravada;
- serie errada;
- serie incompleta;
- jogo correto;
- jogo errado;
- jogo nao jogado;
- desempate de ranking por nome.

Impacto:

- agora existe uma validacao automatizada para a parte mais sensivel da aplicacao;
- sempre que houver alteracao em scoring, voce pode rodar um teste rapido antes de subir para producao.

### 9. Inclusao de uma secao explicativa de pontuacao na tela de ranking

Arquivo:

- `frontend/src/pages/Ranking.tsx`

Antes:

- a tela de ranking mostrava o grafico e a classificacao, mas nao deixava explicito para os usuarios quantos pontos eram ganhos por acerto em cada rodada;
- isso podia gerar duvidas sobre a diferenca entre jogo, serie e cravada.

Depois:

- foi adicionada uma secao chamada `Como Funciona a Pontuacao`;
- essa secao mostra por rodada:
  - pontos por acerto de jogo;
  - pontos por acerto de serie;
  - pontos por cravada;
- a secao usa a configuracao real do app em `frontend/src/utils/scoring.ts`;
- tambem foi incluida uma observacao explicando que a cravada substitui a pontuacao da serie e nao soma por cima.
- posteriormente, a secao foi reorganizada para funcionar como uma caixa lateral a esquerda da area principal do ranking;
- a largura util da pagina tambem foi ampliada para preservar o fluxo central do grafico e da tabela sem empurrar o conteudo para baixo.
- para o mobile, a tela passou a usar um botao dedicado que abre a pontuacao em um painel lateral sobreposto, evitando que a explicacao ocupe espaco demais no fluxo principal.

Impacto:

- melhora a transparencia da regra para os participantes;
- reduz duvidas sobre como o ranking e calculado;
- melhora a experiencia de uso na tela de ranking;
- organiza melhor a hierarquia visual da pagina;
- mantem a leitura do ranking mais limpa no centro da tela;
- melhora a usabilidade da pagina em telas pequenas.

### 10. Reforco visual da Home com painel principal e atalhos rapidos

Arquivo:

- `frontend/src/pages/Home.tsx`

Antes:

- a Home tinha boas informacoes, mas a abertura da pagina era mais simples e menos orientada para a acao imediata;
- faltava um bloco principal que resumisse rapidamente situacao, progresso e proximos passos do usuario.

Depois:

- foi criado um painel principal em destaque no topo da Home;
- esse painel passou a mostrar:
  - posicao atual do usuario;
  - pontuacao atual;
  - progresso do preenchimento do bracket;
  - atalhos rapidos para bracket, jogos e ranking;
- a abertura da Home ficou mais forte visualmente e com foco em orientar o usuario para a proxima acao importante.

Impacto:

- melhora a primeira impressao da pagina;
- aumenta a clareza sobre o estado atual do usuario no bolao;
- deixa a Home mais util e mais proxima de um dashboard real.

## Validacoes Executadas

Foram executadas as seguintes validacoes:

- `npm run build` no frontend;
- `npm run build` no backend;
- `npm run test:scoring` no backend.
- `npm run build` no frontend apos a alteracao da aba de ranking.
- `npm run build` no frontend apos reorganizar a explicacao de pontuacao para uma caixa lateral.
- `npm run build` no frontend apos reposicionar a caixa de pontuacao para a esquerda e ajustar a largura da pagina.
- `npm run build` no frontend apos adicionar o botao mobile e o painel lateral de pontuacao.
- `npm run build` no frontend apos reforcar visualmente a Home com painel principal e atalhos rapidos.

Resultado:

- todas as validacoes passaram com sucesso.

## Riscos Reduzidos

Os principais riscos mitigados com essas alteracoes foram:

- acesso indevido a rotas administrativas;
- sync buscando temporada incorreta;
- producao exibindo jogos simulados;
- divergencia silenciosa na regra de pontuacao;
- instabilidade do ranking em cenarios de empate;
- falta de clareza para os usuarios sobre como a pontuacao e calculada;
- ausencia de testes automatizados na parte critica do app.

## Pendencias Relevantes

Apesar das melhorias implementadas, ainda existem pontos importantes antes de considerar o sistema totalmente blindado:

- revisar as politicas RLS do Supabase;
- garantir que cada usuario so consiga ler e alterar os proprios palpites;
- realizar ensaio completo com 3 a 5 contas reais de teste;
- validar o fluxo `sync -> rescore -> ranking` com dados controlados;
- testar bloqueio de palpites exatamente no horario do tip-off;
- validar falhas da API externa em ambiente real;
- revisar o mapeamento `SLOT_BY_TEAMS` contra a temporada exata em uso.

## Avaliacao Atual

O sistema esta mais seguro, mais previsivel e mais preparado para lancamento do que antes. Os riscos mais graves e imediatos foram tratados. Ainda assim, a recomendacao e fazer um pre-lancamento controlado, com alguns usuarios de teste, antes de abrir o bolao para todos.

## Proximos Passos Recomendados

Ordem sugerida:

1. Revisar seguranca e RLS no Supabase.
2. Fazer ensaio final com contas reais de teste.
3. Validar manualmente a pontuacao com cenarios controlados.
4. Testar fechamento de palpites em horario real.
5. So depois disso, abrir para os amigos.

## Conclusao

Foi realizada uma intervencao focada nos pontos mais criticos para um lancamento com menos risco:

- protecao das rotas admin;
- correcao de temporada no sync;
- remocao de mock em producao;
- centralizacao da regra de pontuacao;
- estabilidade de ranking em empate;
- explicacao visual da regra de pontuacao na aba de ranking;
- criacao de teste automatizado de scoring.

Com isso, o projeto ficou em uma condicao muito melhor para um lancamento controlado. O maior ganho agora viria de uma validacao operacional final com usuarios e dados reais de teste.
