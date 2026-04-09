# Relatorio Completo das Alteracoes

## Objetivo

Este documento registra as alteracoes realizadas para reduzir o risco de lancar o bolao para os usuarios sem sofrer com problemas de seguranca, sincronizacao incorreta, exibicao de dados falsos em producao ou bugs de pontuacao e ranking durante a competicao.

O foco principal foi:

- proteger operacoes administrativas;
- corrigir o comportamento do sync com a API externa;
- impedir que dados simulados aparecam em producao;
- deixar a regra de pontuacao mais confiavel e testavel;
- estabilizar o ranking em cenarios de empate.

## Contexto do Projeto

Este app esta sendo desenvolvido para uma brincadeira privada entre amigos de confianca, e nao como produto comercial aberto ao publico.

Por causa disso, as decisoes tecnicas foram priorizadas assim:

- confiabilidade da pontuacao;
- estabilidade do ranking;
- boa experiencia no mobile;
- clareza visual e facilidade de uso;
- protecoes basicas para evitar bagunca acidental.

A seguranca foi tratada em nivel suficiente para reduzir erros e acionamentos indevidos, mas sem a necessidade de endurecimento extremo de um produto publico em escala.

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
- reforco visual da pagina de jogos com resumo e urgencia de palpites;
- reforco visual da navegacao inferior para melhorar uso no mobile;
- reforco visual da pagina de comparacao com arena de duelo e selecao mais clara;
- reforco visual do bracket do usuario e do bracket oficial com paineis-resumo;
- reforco premium do ranking com hero e destaque para o top 3;
- reforco dos cards de jogos com estados mais claros de palpite;
- reforco da Home com destaque para o proximo foco de palpites;
- reforco do compare com placar-resumo de duelo;
- inicio da otimizacao mobile com navegacao inferior mais leve e grids menos densos;
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
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Compare.tsx`
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

### 11. Reforco visual da pagina de jogos com resumo e urgencia

Arquivo:

- `frontend/src/pages/Games.tsx`

Antes:

- a pagina de jogos era funcional, mas a abertura era mais simples e os cards nao destacavam bem urgencia e contexto geral;
- faltava uma visao resumida de quantos jogos estavam abertos, quantos palpites faltavam e quais fechavam em breve.

Depois:

- foi criado um painel principal no topo da pagina de jogos;
- esse painel passou a mostrar:
  - quantidade de jogos abertos;
  - quantos jogos ainda estao sem palpite;
  - quantos fecham em breve;
  - o proximo fechamento;
- os cards de jogos ganharam faixa de urgencia para partidas proximas do bloqueio;
- os grupos por data passaram a exibir destaque de `Hoje` e `Amanha` quando aplicavel.

Impacto:

- melhora a leitura rapida da pagina;
- ajuda o usuario a priorizar palpites urgentes;
- deixa a experiencia de jogos mais viva e orientada para acao.

### 12. Reforco visual da navegacao inferior

Arquivo:

- `frontend/src/components/Nav.tsx`

Antes:

- a navegacao inferior era funcional, mas tinha um estado ativo discreto e um bloco de perfil mais solto visualmente;
- no mobile, a barra tinha menos sensacao de produto acabado.

Depois:

- a navegacao passou a usar um container mais refinado, com fundo mais forte e acabamento visual melhor;
- o item ativo ficou mais destacado;
- os icones e labels ficaram mais equilibrados visualmente;
- o bloco de perfil e sair foi integrado ao conjunto com um acabamento mais consistente.

Impacto:

- melhora a percepcao de qualidade do app no mobile;
- aumenta a clareza da navegacao ativa;
- deixa o rodape mais coeso com o restante da interface.

### 13. Reforco visual da pagina de comparacao

Arquivo:

- `frontend/src/pages/Compare.tsx`

Antes:

- a pagina de comparacao funcionava, mas a abertura era mais seca e o fluxo de escolha dos participantes parecia mais tecnico do que visual;
- faltava um contexto claro de duelo, status da comparacao e uma apresentacao mais forte para incentivar o uso da pagina.

Depois:

- foi criado um hero no topo da pagina com status atual da comparacao;
- a tela passou a mostrar uma `arena de comparacao` com resumo do modo duelo, quantidade de participantes e objetivo da tela;
- a area de selecao dos dois participantes ganhou acabamento visual melhor, com hierarquia mais clara entre os lados e foco maior na comparacao frente a frente;
- o conjunto ficou mais consistente com o estilo das outras paginas que ja tinham recebido reforco visual.

Impacto:

- melhora a leitura e a apresentacao da pagina;
- deixa o fluxo de selecao mais intuitivo;
- reforca a sensacao de duelo entre os brackets comparados;
- aumenta a consistencia visual geral do app.

### 14. Reforco visual do bracket do usuario e do bracket oficial

Arquivos:

- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/OfficialBracket.tsx`

Antes:

- as telas de bracket eram funcionais, mas a abertura de ambas era mais simples e com pouca contextualizacao;
- faltava um resumo visual mais forte para ajudar o usuario a entender rapidamente progresso, estado geral da chave e proximo foco de uso.

Depois:

- a tela `Meu Bracket` passou a ter um hero com contexto mais claro, indicadores de progresso e cards-resumo para palpites feitos, series em aberto e percentual preenchido;
- a mesma tela ganhou um bloco de progresso e legenda mais integrados ao topo, deixando a leitura do bracket mais organizada;
- a tela `Bracket Oficial` passou a usar um painel-resumo com series concluidas, series ainda em aberto e status do campeao atual;
- o botao de sync admin foi integrado visualmente ao hero do bracket oficial para ficar mais natural dentro da pagina.

Impacto:

- melhora a leitura rapida das telas de bracket;
- deixa mais claro o que o usuario ja preencheu e o que ainda falta;
- reforca a diferenca entre acompanhar o bracket oficial e editar o proprio bracket;
- aumenta a consistencia visual do produto nas paginas principais.

### 15. Reforco premium da pagina de ranking

Arquivo:

- `frontend/src/pages/Ranking.tsx`

Antes:

- a pagina de ranking era funcional, mas a abertura ainda era mais direta e com menos sensacao de competicao;
- faltava um destaque forte para o top 3 e um resumo mais claro da situacao atual do usuario em relacao ao lider.

Depois:

- foi criado um hero no topo do ranking com contexto da disputa, situacao atual do usuario e resumo do lider;
- a pagina passou a destacar o top 3 em cards premium, com mais presenca visual;
- os cards do topo agora mostram pontuacao, cravadas e aproveitamento de series para os primeiros colocados.

Impacto:

- o ranking ficou mais social e mais interessante de acompanhar;
- melhora a percepcao de competicao entre os participantes;
- valoriza os lideres e deixa a pagina com mais cara de produto final.

### 16. Reforco dos cards de jogos com estados mais claros

Arquivo:

- `frontend/src/pages/Games.tsx`

Antes:

- os cards de jogos ja estavam melhores, mas ainda faltava comunicar com mais clareza o estado operacional de cada palpite;
- o usuario precisava interpretar mais elementos para entender se o jogo estava aberto, salvo, bloqueado ou pronto para salvar.

Depois:

- cada card passou a ter uma faixa superior com rodada e estado do palpite;
- foram adicionados estados visuais como `Palpite salvo`, `Pronto para salvar`, `Bloqueado` e `Finalizado`;
- quando existe uma alteracao pendente, o card mostra uma area de confirmacao mais clara antes do botao salvar;
- quando o jogo ainda esta aberto e ja existe palpite salvo, o card mostra esse palpite atual de forma explicita.

Impacto:

- reduz ambiguidade na tela de jogos;
- melhora a confianca do usuario na hora de palpitar;
- deixa o fluxo de salvar mais claro e mais orientado.

### 17. Reforco da Home com foco no proximo palpite

Arquivo:

- `frontend/src/pages/Home.tsx`

Antes:

- a Home ja tinha um painel principal forte, mas o bloco de proximos jogos ainda era mais linear;
- faltava um destaque maior para o proximo jogo que merece atencao imediata.

Depois:

- a area de proximos jogos ganhou um destaque principal de `proximo foco`;
- esse bloco passou a evidenciar o jogo mais imediato, com horario e CTA direto para a pagina de palpites.

Impacto:

- a Home ficou mais orientada para acao;
- ajuda o usuario a entender rapidamente qual e o proximo passo relevante dentro do bolao.

### 18. Reforco do compare com placar-resumo de duelo

Arquivo:

- `frontend/src/pages/Compare.tsx`

Antes:

- a pagina de compare ja tinha uma boa base visual, mas ainda faltava um quadro mais direto mostrando quem estava na frente e o tamanho das divergencias;
- boa parte dessa leitura dependia de interpretar o restante da pagina.

Depois:

- o resumo do compare passou a trazer um placar superior com:
  - quem esta na frente;
  - quantas series os dois concordam;
  - quantas series divergem;
  - quantas series tiveram palpite de apenas um participante.

Impacto:

- acelera a leitura do duelo;
- deixa a comparacao mais competitiva e divertida;
- melhora a utilidade da pagina sem exigir analise detalhada imediata.

### 19. Primeira rodada de otimizacao mobile

Arquivos:

- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/Compare.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/pages/BracketEditor.tsx`

Antes:

- a experiencia mobile ainda mantinha alguns padroes mais proximos do desktop, com densidade horizontal alta;
- a barra inferior concentrava muitas acoes na mesma faixa;
- varios resumos usavam grades com 3 ou 4 colunas mesmo em telas pequenas;
- o bracket ainda dependia de descoberta visual para o usuario perceber a rolagem lateral.

Depois:

- a navegacao inferior foi simplificada para quatro destinos principais;
- `Comparar` e `Sair` passaram para um menu rapido acionado pelo avatar/menu, reduzindo poluicao na barra inferior;
- os resumos de `Ranking`, `Compare` e `Bracket` passaram a empilhar melhor no mobile, com menos colunas em telas pequenas;
- o `Bracket` ganhou uma dica explicita de rolagem lateral no mobile.

Impacto:

- melhora conforto de toque na navegacao inferior;
- reduz a sensacao de tela apertada em celulares;
- melhora a leitura dos cards-resumo e dos dados principais;
- deixa o bracket mais facil de entender no primeiro uso mobile.

### 20. Segunda rodada de otimizacao mobile

Arquivos:

- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/components/RankingChart.tsx`

Antes:

- no mobile, a Home ainda deixava o proximo jogo importante um pouco abaixo do ideal;
- a tela de jogos ainda usava um topo mais denso em celulares;
- o grafico do ranking competia demais com o espaco visivel em telas pequenas.

Depois:

- a Home passou a puxar o bloco de proximos jogos para cima no mobile, deixando o proximo foco de palpite mais rapido de encontrar;
- a pagina de jogos passou a usar resumo superior menos apertado em telas pequenas;
- o grafico do ranking passou a se adaptar ao mobile com:
  - menos participantes exibidos;
  - altura reduzida;
  - eixos mais compactos;
  - espacamento mais apropriado para celular.

Impacto:

- melhora a descoberta do proximo passo importante na Home;
- reduz competicao visual no topo da tela de jogos;
- torna o grafico do ranking mais legivel no mobile;
- deixa o app mais focado em acao rapida em vez de excesso de informacao acima da dobra.

### 21. Terceira rodada de otimizacao mobile

Arquivos:

- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Unauthorized.tsx`

Antes:

- algumas telas de entrada e suporte ainda estavam menos consistentes com o restante da experiencia mobile;
- a Home ainda podia priorizar um pouco melhor os blocos mais importantes no celular;
- a tela de jogos podia ganhar mais conforto em toque e leitura em detalhes pequenos.

Depois:

- a tela de login passou a usar largura mais fluida, tipografia mais equilibrada e um card mais apropriado para celulares;
- a tela de acesso negado passou a usar card central mais consistente com o restante do app;
- na Home, o ranking resumido foi trazido para cima no mobile antes de blocos mais secundarios;
- a tela de jogos ganhou pequenos ajustes de conforto em cabecalho de data, largura do bloco de proximo fechamento e dimensoes internas dos cards.

Impacto:

- melhora a consistencia do app no mobile desde a entrada;
- reduz sensacao de tela espremida em login e acesso negado;
- deixa a Home mais orientada ao que importa primeiro no celular;
- melhora leitura e toque nos cards de jogos.

### 22. Rodada final de acabamento mobile em bracket e compare

Arquivos:

- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/Compare.tsx`

Antes:

- o bracket mobile ja estava mais claro, mas ainda podia orientar melhor o usuario em primeiro uso;
- o compare mobile ainda precisava de pequenos ajustes para ficar mais leve e didatico em telas pequenas.

Depois:

- o `Bracket` ganhou um CTA mais forte para abrir o bracket oficial mesmo no mobile;
- a tela passou a mostrar pequenas dicas contextuais antes da chave, reforcando como usar a pagina no celular;
- o `Compare` recebeu ajustes no bloco de status e no resumo superior para caber melhor em telas menores;
- a tela de compare tambem ganhou uma dica dedicada de rolagem horizontal no mobile para os brackets lado a lado.

Impacto:

- melhora onboarding visual do bracket no celular;
- reduz friccao inicial em paginas com rolagem horizontal;
- deixa o compare mais facil de interpretar no mobile;
- fecha a experiencia mobile com mais consistencia entre orientacao, toque e leitura.

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
- `npm run build` no frontend apos reforcar visualmente a pagina de jogos com resumo e urgencia.
- `npm run build` no frontend apos reforcar visualmente a navegacao inferior.
- `npm run build` no frontend apos reforcar visualmente a pagina de comparacao.
- `npm run build` no frontend apos reforcar visualmente o bracket do usuario e o bracket oficial.
- `npm run build` no frontend apos reforcar premium da pagina de ranking.
- `npm run build` no frontend apos reforcar os cards de jogos com estados de palpite.
- `npm run build` no frontend apos reforcar a Home com foco no proximo palpite.
- `npm run build` no frontend apos reforcar o compare com placar-resumo de duelo.
- `npm run build` no frontend apos a primeira rodada de otimizacao mobile.
- `npm run build` no frontend apos a segunda rodada de otimizacao mobile.
- `npm run build` no frontend apos a terceira rodada de otimizacao mobile.
- `npm run build` no frontend apos a rodada final de acabamento mobile em bracket e compare.

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
