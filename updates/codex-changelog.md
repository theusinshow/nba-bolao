# Codex Changelog

## 2026-04-11 - Decisão operacional registrada para produção no Render

### Objetivo
- Documentar a escolha de infraestrutura feita para suportar o bolão com atualização mais frequente dos dados da API.

### Arquivos alterados
- `updates/codex-changelog.md`

### Mudanças feitas
- Foi registrado que o projeto passou a contar com o plano pago de aproximadamente `US$ 7` no Render para a operação atual do bolão.
- A intenção operacional registrada é rodar a atualização dos dados da API em intervalo de `2 em 2 minutos`.
- Essa cadência foi considerada adequada para o produto por equilibrar:
  - atualização frequente de placares e status;
  - custo controlado;
  - operação simples para o volume atual do bolão.

### Observação de contexto
- A infraestrutura já está mais preparada para o modo real, mas o app continua em fase de testes fictícios até a decisão de reativar o sync real da API.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-11 - Ajustes da auditoria aplicados sem ativar o modo real da API

### Objetivo
- Corrigir achados da auditoria que já fazem sentido no ambiente atual de testes fictícios, sem mexer nas frentes que dependem do sync real da API.

### Arquivos alterados
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/pages/Home.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O salvamento de palpite de série passou a respeitar o horário do primeiro jogo da série:
  - `useSeries` agora monta `tip_off_at` da série a partir do primeiro jogo encontrado;
  - a hook também passou a reagir a mudanças em `games`, não só em `series`.
- `savePick` de série deixou de falhar em silêncio:
  - agora lança erro quando a série não existe;
  - quando a série já terminou;
  - ou quando o lock por horário já foi alcançado.
- O `SeriesModal` foi ajustado para refletir isso na UX:
  - inputs ficam desabilitados quando a série já começou;
  - uma mensagem de `Palpite travado` aparece no modal;
  - o CTA deixa claro quando a série já não aceita alterações.
- Na Home, o card `Próximos Jogos` deixou de sugerir que os dados daquele bloco já são reais:
  - a nota inferior agora informa explicitamente que os jogos continuam simulados por enquanto.

### Observação de contexto
- Os achados relacionados ao sync real da NBA não foram mexidos nesta rodada, porque o projeto ainda está rodando com jogos fictícios para testes internos.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Seção de pontuação ganha ajuda visual para o critério de desempate

### Objetivo
- Deixar a regra de desempate fácil de encontrar dentro da própria aba `Ranking`, sem precisar depender de explicação externa.

### Arquivos alterados
- `frontend/src/pages/Ranking.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A seção `Pontuação` passou a exibir um botão circular com ícone de informação.
- Ao tocar/clicar no ícone, o usuário vê uma caixa curta com a ordem do critério de desempate:
  1. `total_points`
  2. `cravadas`
  3. `series_correct`
  4. `games_correct`
  5. ordem alfabética
- A explicação fica dentro do próprio card, preservando clareza sem ocupar espaço o tempo todo.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Critério de desempate do ranking passa a priorizar mérito antes do nome

### Objetivo
- Deixar o desempate do ranking mais justo, usando desempenho real no bolão antes de cair no critério alfabético.

### Arquivos alterados
- `frontend/src/utils/ranking.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/backup/exportOperationalSnapshot.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O ranking deixou de desempatar diretamente por nome após empatar em pontos.
- A nova ordem de desempate passou a ser:
  1. `total_points`
  2. `cravadas`
  3. `series_correct`
  4. `games_correct`
  5. nome em ordem alfabética apenas como último critério técnico
- A mesma regra foi aplicada em todos os lugares onde o ranking pode ser calculado ou ordenado:
  - ranking do frontend;
  - snapshot de scoring do backend;
  - exportação do backup operacional.
- O snapshot do backend também passou a carregar `cravadas`, `series_correct` e `games_correct`, para conseguir ordenar com a mesma justiça da interface principal.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo no frontend, mas sem falha de compilação.

## 2026-04-11 - Backlog de futuras implementações foi limpo para refletir o estado real do produto

### Objetivo
- Remover do backlog os itens que já foram implementados, evitando que o documento continue listando features já entregues como se ainda fossem pendentes.

### Arquivos alterados
- `updates/futuras-implementacoes.md`
- `updates/codex-changelog.md`

### Mudanças feitas
- O backlog foi reduzido para manter apenas as frentes que ainda continuam abertas:
  - bracket mobile;
  - salvar todos os jogos disponíveis de uma vez;
  - Home com APIs reais.
- Foram removidos do documento os itens já absorvidos pelo produto, como:
  - comparação jogo a jogo;
  - `Vai na fé`;
  - backup operacional;
  - melhorias do gráfico;
  - revelação de palpites pós-lock;
  - resultados recentes da Home;
  - mensagem de série encerrada no fluxo jogo a jogo.
- A ordem recomendada de execução também foi reescrita para bater com o backlog atualizado.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-11 - Corrida de pontuação passa a agrupar o gráfico por tempo

### Objetivo
- Reduzir o comprimento horizontal do gráfico de evolução do ranking sem perder a leitura da tendência entre os participantes.

### Arquivos alterados
- `frontend/src/components/RankingChart.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O gráfico ganhou modos de agregação temporal:
  - `Diário`;
  - `3 dias`;
  - `Semanal`.
- O modo padrão passou a ser `3 dias`, para deixar a leitura mais compacta logo na primeira visualização.
- O breakdown interno agora carrega `event_date` em jogos e séries, permitindo que a corrida de pontos seja agrupada com base em datas reais.
- Os pontos continuam sendo mostrados de forma cumulativa, mas agora condensados por janela de tempo em vez de um checkpoint por evento individual.
- O eixo X passou a mostrar faixas de datas quando o usuário escolhe agrupamentos mais largos.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Gráfico do ranking vira uma corrida de pontuação em linhas

### Objetivo
- Aproximar o gráfico do ranking de uma leitura estilo “corrida”, com linhas por participante em vez de barras empilhadas por fase.

### Arquivos alterados
- `frontend/src/components/RankingChart.tsx`
- `frontend/src/pages/Ranking.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O card do ranking deixou de usar o gráfico de barras empilhadas e passou a renderizar uma visualização em linhas.
- Cada participante agora aparece como uma trilha própria, com cor dedicada e progressão cumulativa da pontuação ao longo dos checkpoints de rodada.
- A legenda foi reorganizada para destacar os participantes, em vez de destacar apenas as fases do playoff.
- O eixo horizontal passou a trabalhar com checkpoints compactos como `R1-1`, `SF-3`, `CF-S`, `FIN-S`, aproximando a sensação de progresso contínuo da referência visual enviada.
- O gráfico ganhou rolagem horizontal quando necessário, para preservar leitura mesmo com muitos pontos no eixo X.
- O tooltip foi redesenhado para comparar rapidamente a posição de todos os participantes em cada checkpoint.
- O título do card na aba `Ranking` foi ajustado para `Corrida de Pontuação`, alinhando melhor a expectativa visual com o novo gráfico.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Relatório do ranking ganha filtros por rodada e conferência

### Objetivo
- Encurtar o relatório detalhado do ranking e permitir que o usuário foque rapidamente em um pedaço específico do bracket.

### Arquivos alterados
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `updates/codex-changelog.md`

### Mudanças feitas
- O relatório do participante passou a ter uma organização em duas camadas:
  - visão principal `Tudo`, `Por rodada` e `Por conferência`;
  - filtros específicos dependendo da visão escolhida.
- No modo `Por rodada`, a interface oferece chips para:
  - `R1`;
  - `R2`;
  - `CF`;
  - `Finals`.
- No modo `Por conferência`, o relatório pode ser isolado em:
  - `Leste`;
  - `Oeste`;
  - `Finals`.
- Os blocos de `Séries` e `Jogos` passaram a obedecer ao mesmo recorte ativo, evitando que o usuário filtre uma parte da tela e continue vendo outra inteira.
- O agrupamento colapsável dos jogos por série foi preservado, mas agora trabalha apenas com os itens do recorte atual.
- O breakdown interno passou a carregar também a informação de conferência, para que o filtro não precise inferir esse dado na UI.
- Quando um recorte não possui itens, o relatório mostra um estado vazio específico em vez de deixar a área parecer incompleta.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning já conhecido de chunk grande do Vite continua aparecendo, mas sem falha de compilação.

## 2026-04-11 - Card do Vai na fé ganha ajuda contextual com ícone de informação

### Objetivo
- Explicar rapidamente para usuários novos o que faz o botão `Vai na fé` quando houver palpites abertos no dia.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- O card diário do `Vai na fé` agora exibe um botão circular amarelo com ícone de informação ao lado do título.
- Ao tocar/clicar nesse ícone, a interface abre uma caixa curta explicando:
  - que o recurso gera palpites aleatórios;
  - que ele considera apenas os jogos ainda abertos naquele dia;
  - que o usuário ainda pode revisar antes de confirmar.
- A explicação foi colocada dentro do próprio card, mantendo o fluxo autoexplicativo sem levar o usuário para outro modal.

### Validações
- Pendente nesta rodada: rodar `frontend` build após a alteração visual.

## 2026-04-11 - Aba Comparar passa a respeitar o lock antes de revelar palpites

### Objetivo
- Impedir que a aba `Comparar` funcione como atalho para copiar palpites antes do fechamento de jogos e séries.

### Arquivos alterados
- `frontend/src/pages/Compare.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A página passou a calcular explicitamente quais jogos já podem ser comparados:
  - jogos `played`;
  - jogos cujo `tip_off_at` já passou.
- A mesma lógica agora define quais séries podem aparecer no duelo:
  - séries já concluídas;
  - séries que já possuem pelo menos um jogo travado ou encerrado.
- Os palpites ainda em janela aberta deixam de ser enviados para todos os pontos de comparação da tela:
  - resumo superior;
  - comparação jogo a jogo;
  - bracket lado a lado;
  - tooltip de hover.
- Com isso, a interface para de expor concordâncias, divergências, estrelas de palpite e detalhes de série antes da hora.
- A seção ganhou uma mensagem curta deixando explícito que a comparação só revela palpites depois do lock.
- O texto da área `Comparação jogo a jogo` também foi ajustado para refletir essa regra de produto.

### Validações
- `frontend`: `npm run build` executado após a alteração.
- Observação: a primeira tentativa falhou por restrição de execução do ambiente (`spawn EPERM` no `esbuild`), então a validação foi refeita com o comando aprovado do frontend.

## 2026-04-11 - Comparação jogo a jogo fica mais compacta e mais clara

### Objetivo
- Reduzir a altura excessiva da seção de comparação jogo a jogo e deixar muito mais óbvio quem acertou, quem errou e onde os palpites divergem.

### Arquivos alterados
- `frontend/src/pages/Compare.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A seção `Comparação jogo a jogo` deixou de abrir todas as partidas de todas as séries de uma vez.
- O conteúdo agora usa cards colapsáveis por série, reduzindo bastante o scroll vertical da página.
- Cada card de série passou a mostrar no cabeçalho um resumo rápido com:
  - quantidade de jogos iguais;
  - quantidade de divergências;
  - leitura rápida de acertos acumulados entre os dois participantes.
- Ao expandir uma série, cada jogo agora destaca melhor:
  - se as escolhas foram iguais ou diferentes;
  - qual foi o resultado real quando o jogo já terminou;
  - se cada participante acertou ou errou;
  - quando só um dos dois chegou a palpitar.
- Os blocos individuais dos dois participantes passaram a usar estados visuais mais fortes:
  - verde para acerto;
  - vermelho para erro;
  - tons neutros quando o jogo ainda está pendente ou sem palpite.
- A primeira série mais relevante continua abrindo por padrão, priorizando confronto com jogo já resolvido ou divergência, para acelerar a leitura.
- A seção também ganhou filtros rápidos no topo:
  - `Todos`;
  - `Só divergências`;
  - `Só resolvidos`.
- Quando um filtro não encontra partidas compatíveis, a interface agora mostra um estado vazio curto e claro em vez de deixar a área parecer quebrada.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-11 - Palpites de jogo passam a ser revelados apos o lock

### Objetivo
- Manter o sigilo dos palpites antes do fechamento, mas liberar a visualizacao dos palpites da galera assim que o jogo estiver travado ou finalizado.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- A aba `Jogos` passou a carregar, alem do palpite do usuario atual, os palpites jogo a jogo dos demais participantes para os jogos da tela.
- A regra de visibilidade ficou explicita na interface:
  - antes de `tip_off_at`, os palpites continuam ocultos;
  - depois do lock, os palpites daquele jogo podem ser revelados;
  - jogos ja finalizados tambem entram como revelados;
  - jogos que deixaram de existir porque a serie acabou antes tambem podem exibir o historico registrado.
- Cada `GameCard` agora mostra um bloco `Palpites revelados` somente quando o jogo ja pode ser aberto para consulta.
- Foi adicionado um modal `Ver palpites` com:
  - total de votos em cada lado do confronto;
  - quantidade total de participantes com palpite visivel naquele jogo;
  - lista nominal de quem escolheu cada time.
- O modal foi refinado para destacar melhor a resenha do pos-lock:
  - percentual de votos por time;
  - marcador de voto solitario quando apenas uma pessoa foi em um lado;
  - indicacao de quem acertou ou errou depois que o jogo termina.
- O fluxo continua preservando a proposta central do bolao:
  - independencia antes do fechamento;
  - resenha e comparacao depois que o prazo acaba.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Vai na fé deixa de confirmar sucesso em caso de falha parcial

### Objetivo
- Corrigir o fluxo do `Vai na fé` para não exibir sucesso quando algum palpite do lote falhar no meio da operação.

### Arquivos alterados
- `frontend/src/pages/Games.tsx`
- `updates/codex-changelog.md`

### Mudanças feitas
- `savePick` passou a retornar sucesso/falha explicitamente em vez de apenas exibir toast e encerrar silenciosamente.
- O fluxo manual continua mostrando toast de sucesso individual quando o usuário salva um único palpite.
- O fluxo automático do `Vai na fé` deixou de disparar toast de sucesso por jogo, evitando ruído visual durante salvamento em lote.
- `confirmAutoPick` agora verifica o retorno de cada salvamento:
  - se todos derem certo, fecha o modal e mostra sucesso;
  - se algum falhar, interrompe a sequência, mantém o contexto aberto e exibe erro informando que o lote não foi concluído.
- As tipagens internas de `Games.tsx` foram ajustadas para refletir o novo retorno booleano do salvamento.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Backup operacional implementado para contingencia do bolao

### Objetivo
- Garantir que o bolao continue operavel mesmo se o app sair do ar, gerando snapshots exportaveis com palpites, ranking e um resumo legivel para operacao manual.

### Arquivos alterados
- `.gitignore`
- `backend/package.json`
- `backend/src/backup/exportOperationalSnapshot.ts`
- `backend/src/scripts/backupOperationalSnapshot.ts`
- `updates/codex-changelog.md`

### Mudanças feitas

#### Novo exportador operacional no backend
- Foi criado `backend/src/backup/exportOperationalSnapshot.ts` para montar um snapshot completo diretamente do Supabase usando o schema real atual.
- O exportador busca:
  - participantes;
  - times;
  - series;
  - palpites de series;
  - jogos;
  - palpites jogo a jogo.
- O ranking congelado do momento e recalculado no proprio script usando as mesmas regras de pontuacao do backend, evitando depender de dados volateis da interface.

#### Arquivos de contingencia gerados automaticamente
- Cada execucao cria uma pasta propria dentro de `backups/` com timestamp.
- Dentro dela o script gera:
  - `palpites-series-YYYY-MM-DD.csv`
  - `palpites-jogos-YYYY-MM-DD.csv`
  - `ranking-YYYY-MM-DD.csv`
  - `resumo-rodada-YYYY-MM-DD.md`
- Os CSVs foram pensados para conferencia tecnica e uso em planilha.
- O Markdown foi pensado para leitura humana e compartilhamento rapido no grupo em caso de contingencia.

#### Resumo legivel para tocar o bolao manualmente
- O arquivo `resumo-rodada-*.md` agora inclui:
  - horario de geracao;
  - contagem de participantes, series, jogos e palpites;
  - ranking consolidado;
  - series ja concluidas;
  - proximos jogos ainda abertos;
  - orientacoes objetivas de como continuar o bolao manualmente usando os arquivos exportados.

#### Novo comando operacional
- O backend ganhou o script `npm run backup:operational`.
- Esse comando:
  - faz o build do backend;
  - executa o exportador;
  - informa no terminal a pasta gerada e os caminhos dos quatro arquivos.

#### Higiene do repositorio
- A pasta `backups/` foi adicionada ao `.gitignore` para evitar commit acidental de snapshots operacionais e dumps sensiveis.

### Validações
- Pendente nesta rodada: executar `npm run backup:operational` com acesso real ao Supabase para validar a geracao dos arquivos ponta a ponta.

## 2026-04-10 - Home com pódio mais visível e seleção de times respeitando identidade visual

### Objetivo
- Dar mais destaque ao top 3 diretamente no ranking da Home e corrigir o destaque visual da aba `Jogos` para não amarelar siglas de times selecionados.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Pódio incorporado ao ranking da Home — `Home.tsx`
- O card `Ranking Geral` da Home agora abre com um bloco de pódio já destacado no topo.
- Os três primeiros colocados passaram a aparecer com:
  - medalha visual;
  - pontos em maior evidência;
  - indicação de posição;
  - cravadas;
  - seta de variação de posição quando disponível.
- O card separado de pódio foi removido da composição da Home para evitar redundância e concentrar o destaque onde o usuário já olha naturalmente.

#### Seleção por cor do time — `Games.tsx`
- O estado selecionado no jogo a jogo deixou de pintar as siglas com o amarelo do sistema.
- Agora o destaque principal passa a acontecer por:
  - fundo translúcido usando a cor do time;
  - borda reforçada na cor do time;
  - glow suave do contêiner;
  - selo `Selecionado` também colorido conforme a franquia.
- O texto da sigla do time selecionado volta a respeitar a identidade visual original da equipe.
- O bloco de confirmação abaixo do card também passou a refletir a cor real do time escolhido.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Plano de backup do bolão adicionado ao backlog futuro

### Objetivo
- Registrar no backlog uma estratégia de contingência para manter o bolão operável mesmo se o app ficar fora do ar durante os playoffs.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Nova frente de contingência operacional — `futuras-implementacoes.md`
- Foi adicionada uma nova proposta de implementação focada em backup operacional do bolão.
- A ideia prevê snapshots exportáveis com:
  - palpites de séries;
  - palpites jogo a jogo;
  - ranking consolidado;
  - resumo legível por rodada.

#### Estrutura sugerida para continuidade manual
- O backlog agora registra a recomendação de gerar arquivos em formatos complementares:
  - `CSV` para planilha e conferência técnica;
  - `Markdown` para leitura humana e operação manual no grupo.
- Também ficou anotado um plano para reduzir erros de contingência, incluindo timestamp, identificação clara dos participantes e snapshots por data ou rodada.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Scripts de cenário ajustados para `nba_game_id` em texto

### Objetivo
- Corrigir a incompatibilidade dos scripts de cenário com o banco de teste, onde `games.nba_game_id` está tipado como `text` em vez de numérico.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/test-scenarios/reveal-first-round-results.sql`

### Mudanças feitas

#### Compatibilidade de tipo no reveal — `reveal-first-round-results.sql`
- O filtro final do script deixou de usar `where nba_game_id between 700001 and 700056`.
- Agora o script faz cast explícito:
  - `where cast(nba_game_id as bigint) between 700001 and 700056`
- Isso evita o erro `operator does not exist: text >= integer` no Supabase do ambiente de teste atual.
- Além do `where`, os blocos de `case` para `winner_id`, `home_score` e `away_score` também passaram a usar:
  - `case cast(nba_game_id as bigint)`
- Isso corrige o segundo erro de comparação `text = integer` ao publicar os resultados fictícios.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas em script SQL de operação.

## 2026-04-10 - Palpites do Vai na fé passaram a ficar marcados na aba Jogos

### Objetivo
- Identificar visualmente quais palpites jogo a jogo foram preenchidos pela ferramenta `Vai na fé`, sem misturar essa origem com palpites manuais feitos depois.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Marca visual de origem automática — `Games.tsx`
- Os cards da aba `Jogos` agora exibem um selo `Vai na fé` ao lado do palpite atual quando aquele jogo foi preenchido pela ferramenta automática.

#### Persistência local por participante
- A origem do palpite automático passou a ser salva em `localStorage` por participante.
- Isso permite que o usuário continue vendo a marca ao recarregar a página, sem precisar alterar o schema do Supabase nesta rodada.

#### Limpeza automática ao editar manualmente
- Quando o usuário altera manualmente um palpite que antes veio do `Vai na fé`, a marca é removida.
- Com isso, o selo continua significando apenas `este palpite atual veio da ferramenta`.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Seleção de time reforçada visualmente antes de salvar no jogo a jogo

### Objetivo
- Deixar mais evidente qual time foi escolhido no card jogo a jogo antes do clique final em `Salvar palpite`, reduzindo dúvida visual causada pelo contraste fraco do estado selecionado.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Estado selecionado com contraste mais forte — `Games.tsx`
- O lado escolhido agora recebe:
  - fundo mais visível;
  - borda dourada mais forte;
  - brilho leve no texto do time;
  - selo `Selecionado`.

#### Resumo textual do palpite pendente
- O bloco de confirmação abaixo do card passou a dizer explicitamente qual time será salvo.
- Além da sigla, o resumo também mostra o nome do time quando disponível, evitando depender só do destaque visual dentro do card.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Faixa de resultados da última noite adicionada na Home

### Objetivo
- Deixar a Home mais viva e com sensação de acompanhamento diário, exibindo um resumo horizontal dos placares mais recentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Novo ticker horizontal na Home — `Home.tsx`
- Foi adicionada uma faixa `Resultados da última noite` logo abaixo do painel principal.
- O bloco usa cards compactos em movimento contínuo horizontal para destacar:
  - confronto;
  - placar final;
  - fase da competição;
  - um contexto curto do jogo.

#### Integração com o layout atual
- O novo bloco foi encaixado sem substituir os cards principais já existentes da Home.
- A faixa conversa com o visual do restante da página, usando o mesmo sistema de bordas, tons dourados e superfícies do produto.

#### Dados atuais
- Nesta rodada, os resultados exibidos continuam simulados e servem como placeholder visual de produto.
- A estrutura já foi deixada pronta para no futuro trocar a fonte estática por dados reais vindos de API.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Botão Vai na fé adicionado para os jogos do dia

### Objetivo
- Dar um atalho rápido para usuários mais casuais preencherem no aleatório os jogos abertos de um dia inteiro, sem desmontar o fluxo manual da aba `Jogos`.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Novo bloco diário de auto-palpites — `Games.tsx`
- A aba `Jogos` ganhou um card `Vai na fé` acima da lista de séries.
- Esse bloco agrupa automaticamente os jogos ainda abertos por dia e exibe:
  - quantos jogos do dia ainda estão sem palpite;
  - quantos já tinham sido preenchidos;
  - um CTA para abrir o fluxo aleatório daquele dia.

#### Fluxo com prévia e confirmação
- O botão abre um modal dedicado com:
  - prévia dos vencedores sorteados jogo a jogo;
  - opção de gerar outra prévia;
  - confirmação explícita antes de salvar.

#### Proteção contra sobrescrita sem querer
- Quando o dia já possui jogos com palpite salvo, o modal oferece dois modos:
  - `Preencher só faltantes`;
  - `Sobrescrever o dia inteiro`.
- O modo padrão preserva palpites já salvos e só completa o que estiver faltando.

#### Respeito ao lock e ao encerramento da série
- O agrupamento diário do `Vai na fé` ignora:
  - jogos já iniciados;
  - jogos finalizados;
  - jogos que não deveriam mais existir porque a série já terminou antes.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Comparação jogo a jogo adicionada na aba Comparar

### Objetivo
- Expandir a aba `Comparar` para além do bracket por séries e permitir confronto direto também nos palpites jogo a jogo.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Compare.tsx`

### Mudanças feitas

#### Novo carregamento de palpites de jogos — `Compare.tsx`
- A página passou a buscar também os registros de `game_picks` para cada participante selecionado.
- O carregamento agora monta o duelo completo com:
  - `series_picks`;
  - `game_picks`;
  - jogos cadastrados em `games`.

#### Resumo ampliado da comparação
- O `SummaryCard` passou a exibir duas camadas de resumo:
  - estatísticas de concordância por série;
  - estatísticas de concordância jogo a jogo.
- Agora a comparação mostra, para jogos:
  - quantos palpites são iguais;
  - quantos divergem;
  - quantos só um dos participantes preencheu.

#### Nova seção detalhada por série
- Foi adicionada uma seção `Comparação jogo a jogo` abaixo da legenda principal.
- Os jogos são agrupados por série e exibem:
  - confronto da série;
  - rodada correspondente;
  - lista dos jogos cadastrados;
  - palpite de cada participante lado a lado;
  - diferenciação visual para concordância, divergência e ausência parcial de palpite.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Organização final do changelog para revisão externa

### Objetivo
- Deixar o histórico do projeto mais fácil de consumir por outra IA ou revisor externo, e preparar um prompt de revisão orientado ao estado atual do projeto.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/changelogs.md`
- `updates/claude-code-review-prompt.md`

### Mudanças feitas

#### Organização do changelog mestre — `changelogs.md`
- O arquivo consolidado passou a funcionar como porta de entrada para revisão.
- Foram adicionadas seções novas para:
  - explicar a ordem recomendada de leitura;
  - resumir o estado atual do projeto;
  - destacar os focos mais importantes para revisão externa;
  - deixar explícitos os ajustes mais recentes em Home, Bracket e Jogos.

#### Novo prompt operacional — `claude-code-review-prompt.md`
- Foi criado um prompt pronto para uso no Claude Code.
- O prompt orienta o revisor a:
  - ler primeiro o changelog consolidado e o changelog técnico;
  - revisar o projeto com mentalidade de code review e QA funcional;
  - priorizar bugs, regressões, inconsistências de UX e riscos de regra de negócio;
  - prestar atenção especial em progresso do bracket, Home, Jogos, mobile e integração com Supabase.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi documental e operacional.

## 2026-04-10 - Home alinhada ao novo progresso do bracket

### Objetivo
- Corrigir a Home para não continuar exibindo o padrão antigo de progresso do bracket, que contava séries futuras ainda indefinidas como se já estivessem pendentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Correção de progresso — `Home.tsx`
- O `HeroPanel` da Home deixou de usar `series.length` e `picks.length` como base bruta do progresso.
- Agora a Home considera apenas séries realmente prontas para palpite, usando a mesma lógica aplicada em `Meu Bracket`.
- Com isso:
  - o progresso percentual não é mais penalizado por rounds futuros;
  - o subtítulo do CTA para `/bracket` deixa de mostrar algo como `8/15` quando parte da chave ainda não está definida;
  - o texto do bloco de progresso passa a refletir apenas séries já liberadas.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Jogos futuros desativados quando a série já terminou

### Objetivo
- Corrigir a experiência da aba `Jogos` e do modal jogo a jogo para não tratar como palpites válidos jogos 5, 6 ou 7 quando a série já foi encerrada antes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`
- `frontend/src/components/GamePickModal.tsx`

### Mudanças feitas

#### Correção de regra de UX — `Games.tsx`
- A aba `Jogos` agora considera `series.games_played` e `series.is_complete` ao montar os grupos de cada série.
- Quando a série já terminou antes do jogo atual:
  - o card deixa de aparecer como aberto;
  - o estado principal muda para `Série já encerrada`;
  - a urgência e o countdown deixam de ser exibidos;
  - o usuário não consegue mais selecionar nem salvar palpite naquele jogo;
  - uma mensagem contextual explica que a série terminou antes daquele confronto acontecer.

#### Refinamento de métricas por série
- Os cards de série na aba `Jogos` agora usam apenas jogos realmente válidos para:
  - percentual de cobertura;
  - contagem de palpites feitos;
  - total de jogos considerados naquela série;
  - próximo fechamento.
- Quando uma série termina antes do máximo de jogos cadastrados, a UI passa a sinalizar isso claramente.

#### Consistência do modal — `GamePickModal.tsx`
- O modal jogo a jogo também passou a respeitar `series.games_played` e `series.is_complete`.
- Jogos que ficaram além do encerramento real da série agora exibem aviso de `Série já encerrada` em vez de parecerem bloqueados por horário comum.

#### Limpeza pontual
- Foi removido um `console.log` residual de debug no fluxo de `savePick` da página `Games`.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Progresso do bracket separado por rodada definida

### Objetivo
- Corrigir a contagem de progresso em `Meu Bracket`, para não tratar como "em aberto" séries de rounds futuros que ainda não têm times definidos.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/BracketEditor.tsx`

### Mudanças feitas

#### Correção de regra de progresso — `BracketEditor.tsx`
- O hero do bracket estava usando `series.length` como total absoluto de palpites, o que fazia rounds futuros aparecerem como pendentes mesmo quando o confronto ainda não existia.
- Corrigido:
  - o progresso principal agora considera apenas séries prontas para palpite;
  - a contagem `Palpites feitos` passou a usar somente confrontos já definidos;
  - a métrica `Em aberto` agora representa apenas séries disponíveis e ainda não palpitadas;
  - o percentual de progresso deixou de ser penalizado por rounds futuros ainda indefinidos.

#### Refinamento de UX — resumo por rodada
- `Meu Bracket` passou a exibir um resumo separado por fase:
  - `1ª rodada`
  - `2ª rodada`
  - `Finais de conferência`
  - `Grande final`
- Cada card agora mostra:
  - quantos palpites já foram feitos naquela fase;
  - quantos confrontos estão realmente liberados;
  - quantas séries ainda aguardam definição.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Destaque do bracket oficial na Home

### Objetivo
- Tornar o acesso ao bracket oficial mais visível na Home, sem poluir a página com a chave inteira, usando um card-resumo com CTA forte.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Home.tsx`

### Mudanças feitas

#### Nova seção — `Resultados reais` na Home
- Foi adicionado um card dedicado ao bracket oficial na Home.
- O bloco foi posicionado na coluna principal, logo após os cards de status gerais, para aumentar descoberta sem esconder o restante do conteúdo.

#### Conteúdo do card
- O card `Resultados reais` passou a exibir:
  - quantidade de séries concluídas;
  - quantidade de séries em aberto;
  - campeão atual ou estado `Em disputa`;
  - até dois confrontos de destaque das fases finais;
  - CTA principal `Acompanhar playoffs`, levando para `/official`.

#### Decisão de UX
- A implementação usa dados já carregados de `series`, evitando query extra.
- O objetivo foi reforçar visibilidade do bracket oficial sem duplicar a chave completa dentro da Home.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Correção do filtro mobile `Oeste / Finais / Leste` no bracket

### Objetivo
- Corrigir o comportamento do filtro mobile da aba `Meu Bracket`, garantindo que os botões `Oeste`, `Finais` e `Leste` realmente filtrem o conteúdo exibido.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/BracketSVG.tsx`

### Mudanças feitas

#### Bug funcional — `BracketSVG.tsx`: foco mobile não era aplicado na visualização mobile
- O estado `mobileFocus` era atualizado em `BracketEditor.tsx`, mas a implementação mobile de `BracketSVG` não utilizava `focusSection` para nada.
- Na prática, os botões `Oeste`, `Finais` e `Leste` mudavam o visual do botão ativo, mas a lista de séries continuava exibindo todos os confrontos.
- Corrigido:
  - `MobileBracketView` passou a receber `focusSection`;
  - a lista mobile agora filtra as séries conforme a seleção atual;
  - `Oeste` mostra apenas confrontos da conferência Oeste;
  - `Leste` mostra apenas confrontos da conferência Leste;
  - `Finais` mostra rounds 3 e 4.

#### Refinamento de UX — `BracketEditor.tsx`: volta para visão completa no mobile
- Depois da correção do filtro, ainda faltava um caminho explícito para retornar à visão completa da chave no mobile.
- Corrigido:
  - adicionada a opção `Tudo` ao seletor mobile;
  - o estado inicial passou a abrir na visão completa;
  - a dica contextual abaixo do seletor agora mostra o filtro ativo quando o usuário não está em `Tudo`.

#### Refinamento de UX — `BracketEditor.tsx`: sheet mobile da chave passou a ser acionável
- A visualização simplificada aberta pelo botão `Chave` no mobile funcionava apenas como leitura, sem permitir ação imediata.
- Corrigido:
  - os cards da `MobileBracketSheet` passaram a ser clicáveis;
  - tocar em um confronto fecha a sheet e abre o modal da série correspondente;
  - foi adicionado um indicativo visual `Tocar para abrir` em cada card da sheet.

#### Refinamento de UX — `BracketEditor.tsx`: sheet mobile passou a respeitar o filtro ativo
- Mesmo depois da correção do filtro principal, a sheet `Chave` ainda mostrava sempre a lista completa de confrontos, criando inconsistência com o estado selecionado na tela.
- Corrigido:
  - `MobileBracketSheet` agora recebe o `focusSection` atual;
  - a listagem da sheet respeita `Tudo`, `Oeste`, `Leste` e `Finais`;
  - o subtítulo da sheet passou a explicar o recorte atual;
  - foi adicionada mensagem de estado vazio caso o filtro selecionado ainda não tenha confrontos disponíveis.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

## 2026-04-10 - Backlog ampliado com feature `Vai na fé`

### Objetivo
- Registrar no backlog uma possível funcionalidade de palpites aleatórios por dia na aba `Jogos`, já acompanhada de cuidados de UX e regras para evitar erro de uso.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Atualização do backlog — botão `Vai na fé`
- O documento `updates/futuras-implementacoes.md` foi ampliado com uma nova proposta:
  - botão de palpites aleatórios para os jogos do dia;
  - foco em usuários casuais que querem participar mesmo sem tempo para analisar confronto por confronto.
- O item foi documentado com:
  - motivação de produto;
  - escopo recomendado;
  - plano de mitigação de riscos;
  - cuidados para não sobrescrever palpites sem permissão;
  - necessidade de prévia, confirmação e respeito ao lock dos jogos.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Documento de backlog para futuras implementações

### Objetivo
- Registrar em um documento próprio as ideias de evolução futura do produto, com priorização inicial e contexto de negócio/usabilidade.

### Arquivos alterados
- `updates/codex-changelog.md`
- `updates/futuras-implementacoes.md`

### Mudanças feitas

#### Nova documentação — `updates/futuras-implementacoes.md`
- Foi criado um documento consolidando ideias de próximas evoluções do bolão.
- O arquivo organiza os itens por prioridade e inclui:
  - melhorias de mobile e bracket;
  - mensagem de série encerrada no fluxo jogo a jogo;
  - visão para palpitar todos os jogos disponíveis de uma vez;
  - comparação de palpites jogo a jogo na aba `Comparar`;
  - integração de informações reais via APIs na Home;
  - faixa com resultados da última noite;
  - expansão dos tipos de gráfico no ranking.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi apenas documental.

## 2026-04-10 - Guia rápido de gerenciamento de usuários no Supabase

### Objetivo
- Criar um documento de consulta rápida dentro do projeto com os comandos SQL mais usados para liberar acessos, listar participantes e administrar privilégios no Supabase.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/user-management-guide.md`

### Mudanças feitas

#### Nova documentação — `supabase/user-management-guide.md`
- Foi criado um guia de referência rápida com comandos básicos de gerenciamento de usuários no Supabase.
- O documento inclui:
  - listagem de emails liberados em `allowed_emails`;
  - inserção de um ou vários emails;
  - verificação de email específico;
  - remoção de emails liberados;
  - listagem de participantes em `participants`;
  - promoção e remoção de privilégio admin;
  - consulta opcional para detectar usuários autenticados ainda não vinculados em `participants`;
  - checklist básico para liberar um amigo no bolão.

### Validações
- Não foi necessário rodar build nesta rodada, porque a alteração foi somente de documentação operacional.

## 2026-04-10 - Scripts SQL para teste das páginas oficiais em ambiente separado

### Objetivo
- Documentar e versionar uma bateria de testes baseada nas tabelas oficiais do bolão, mas executada em um Supabase de teste separado, para validar Home, Bracket, Jogos, Ranking e Official com amigos reais.

### Arquivos alterados
- `updates/codex-changelog.md`
- `supabase/test-scenarios/README.md`
- `supabase/test-scenarios/open-first-round-simulation.sql`
- `supabase/test-scenarios/reveal-first-round-results.sql`

### Mudanças feitas

#### Nova documentação — `supabase/test-scenarios/README.md`
- Foi criado um README específico para orientar o uso dos cenários SQL no ambiente de teste separado.
- O arquivo descreve:
  - a ordem recomendada de execução;
  - o fato de os scripts limparem picks e jogos;
  - o uso de horários relativos para facilitar repetição;
  - o foco em testar as páginas oficiais do produto.

#### Novo script — `open-first-round-simulation.sql`
- Foi criado um script para abrir uma rodada fictícia da 1ª rodada diretamente nas tabelas oficiais do bolão, pensado para uso exclusivo no banco de teste.
- O script:
  - limpa `game_picks`, `series_picks` e `games`;
  - reseta a chave para um estado de playoffs recém-iniciados;
  - define os confrontos da 1ª rodada;
  - deixa rounds seguintes aguardando definição;
  - cria jogos fictícios com `tip_off_at` relativo ao momento da execução para liberar palpites imediatamente nas páginas reais;
  - passou a gerar até 7 jogos por série na 1ª rodada, para simular melhor o comportamento real de confrontos melhor de 7.

#### Novo script — `reveal-first-round-results.sql`
- Foi criado um script complementar para publicar os resultados fictícios depois que todos tiverem palpitado.
- O script:
  - marca os jogos fictícios como `played = true`;
  - define vencedores e placares;
  - atualiza as séries com `winner_id`, `games_played` e `is_complete`;
  - permite observar o comportamento real de ranking, breakdown e telas de acompanhamento;
  - foi expandido para cobrir todos os jogos da 1ª rodada fictícia gerados pelo script de abertura.

#### Decisão operacional — manter o teste oficial fora do banco principal
- Foi reforçada a estratégia de usar os scripts acima apenas em um Supabase de teste, separado do ambiente principal.
- O objetivo é testar o fluxo real das páginas oficiais sem correr risco de contaminar o bolão em produção.

### Validações
- Não foi necessário rodar build nesta rodada, porque as alterações foram concentradas em documentação e scripts SQL para operação manual no banco de teste.

### Pendências
- Os scripts ainda precisam ser executados manualmente no banco de teste quando você quiser abrir a rodada fictícia e depois publicar os resultados.
- Se você quiser cobrir 2ª rodada, finais de conferência ou finais da NBA com a mesma abordagem, será necessário criar cenários adicionais.

## 2026-04-10 - Simulação compartilhada de rodada fictícia via Supabase

### Objetivo
- Criar um modo de simulação compartilhada, isolado do bolão real, para permitir que vários amigos palpitem o mesmo cenário fictício de playoffs e que um admin publique os resultados depois.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/App.tsx`
- `frontend/src/components/Nav.tsx`
- `frontend/src/pages/SimulationLab.tsx`
- `frontend/src/utils/simulation.ts`
- `supabase/shared-simulation.sql`

### Mudanças feitas

#### Nova funcionalidade — rota `/simulacao` no frontend
- Foi adicionada uma nova rota protegida em `App.tsx` para expor a área de simulação compartilhada sem misturar com Home, Bracket, Jogos, Ranking e Compare do fluxo principal.

#### Nova funcionalidade — entrada de navegação para a simulação
- O menu rápido em `Nav.tsx` ganhou um item `Simulação`, permitindo que usuários autorizados entrem no ambiente de testes compartilhado sem precisar digitar rota manualmente.

#### Nova funcionalidade — tela `SimulationLab.tsx`
- Foi criada a página `SimulationLab.tsx` para operar a rodada fictícia compartilhada.
- A tela:
  - carrega a simulação ativa no Supabase;
  - mostra status da rodada fictícia (`aberta` ou `encerrada`);
  - exibe progresso de palpites por participante;
  - permite palpites de séries da 1ª rodada;
  - permite palpites jogo a jogo da mesma rodada;
  - bloqueia novos palpites depois que os resultados fictícios são publicados;
  - exibe ranking e relatório de pontuação após a revelação dos resultados.

#### Nova funcionalidade — controle administrativo da rodada fictícia
- Usuários admin agora podem:
  - criar a rodada fictícia inicial;
  - resetar a rodada para um novo ciclo de testes;
  - publicar resultados fictícios para todos ao mesmo tempo.
- O reset apaga apenas os palpites da simulação e recria o estado do cenário fictício, sem tocar em tabelas reais do bolão.

#### Nova funcionalidade — utilitário `simulation.ts`
- Foi criado `frontend/src/utils/simulation.ts` para centralizar:
  - geração do cenário fictício inicial;
  - definição das séries e jogos da 1ª rodada da simulação;
  - publicação aleatória de resultados fictícios;
  - cálculo do ranking da simulação usando o mesmo motor de ranking do app real.
- O cálculo do ranking continua reaproveitando `buildRankingState`, preservando a mesma regra de pontuação e o mesmo formato de breakdown já usado no produto.

#### Nova infraestrutura — SQL `supabase/shared-simulation.sql`
- Foi criado um arquivo SQL dedicado para provisionar a simulação compartilhada no Supabase.
- O script adiciona:
  - função `current_participant_id()`;
  - função `is_current_participant_admin()`;
  - tabela `simulation_runs`;
  - tabela `simulation_series_picks`;
  - tabela `simulation_game_picks`;
  - policies RLS para leitura autenticada e escrita limitada ao próprio participante;
  - bloqueio de escrita quando a simulação já foi publicada;
  - permissão administrativa para criar, resetar e publicar a rodada.

#### Decisão de arquitetura — isolamento total do bolão real
- A abordagem anterior de simulação local em `localStorage` foi substituída por uma simulação compartilhada no Supabase.
- A implementação final não reutiliza `series`, `games`, `series_picks` ou `game_picks` reais.
- Toda a rodada fictícia passa a existir em tabelas próprias, reduzindo risco de contaminação do bolão oficial.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- O SQL em `supabase/shared-simulation.sql` ainda precisa ser executado manualmente no SQL Editor do Supabase para que a funcionalidade compartilhada fique operacional.
- A publicação de resultados fictícios hoje gera vencedores e placares de forma aleatória; se você quiser cenários controlados, isso pode virar uma segunda rodada.
- A simulação compartilhada atual cobre a 1ª rodada como ambiente de teste; rounds seguintes seguem presentes no bracket apenas como estrutura visual.

## 2026-04-10 - Auditoria completa e correção de 17 bugs (Claude Code)

### Objetivo
- Realizar auditoria técnica integral do projeto e corrigir todos os bugs identificados, cobrindo falhas críticas de runtime, comportamentos incorretos no sync, vulnerabilidades de bloqueio de palpites, instabilidade no ranking em tempo real e inconsistências menores de qualidade.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/useGamePicks.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/Ranking.tsx`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/utils/scoring.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/routes/admin.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/scoring/rules.ts`

### Mudanças feitas

#### Bug crítico — `useAuth.ts`: crash em runtime no primeiro login de novo usuário
- Se o insert na tabela `participants` falhasse silenciosamente (erro de constraint, RLS ou rede), `created` era `null` e o código prosseguia com `participant!.id` e `participant!.is_admin`, gerando crash de runtime imediato.
- Corrigido: adicionado check `if (createError || !created)` após o insert. Caso a criação falhe, o estado é definido como `unauthenticated` em vez de crashar.

#### Bug crítico — `useAuth.ts`: erro de banco de dados silenciado na verificação de acesso
- As queries `allowed_emails` e `participants` não desestruturavam `error`. Qualquer falha de banco (timeout, RLS, indisponibilidade) resultava em `data = null`, fazendo o app tratar o usuário como não autorizado e bloqueando todo acesso durante instabilidades do Supabase.
- Corrigido: `error` agora é desestruturado em ambas as queries. Erros com código diferente de `PGRST116` (nenhuma linha encontrada — comportamento esperado) redirecionam para `unauthenticated` e registram o erro no console, sem mascarar falhas reais como decisão de autorização.

#### Bug crítico — `syncNBA.ts` + `nba.ts`: `tip_off_at` armazenado como data pura sem horário
- O campo `date` da API balldontlie.io é uma string de data pura ("2026-04-19"), sem horário. O sync gravava esse valor diretamente em `tip_off_at`, fazendo com que `new Date("2026-04-19")` fosse avaliado como meia-noite UTC (21h BRT do dia anterior). Palpites de jogo ficavam bloqueados 18–20 horas antes do tip-off real.
- Corrigido: adicionada função `parseTipOffAt(date, status)` que extrai o horário real do campo `status` da BDL API, que para jogos não iniciados contém strings como `"7:30 pm ET"`. A função converte para UTC considerando EDT (UTC-4, vigente durante os playoffs de abril a junho). Casos em que o status não contém horário (ex.: jogo em andamento) retornam `null`, mantendo o jogo desbloqueado até o sync marcar `played = true`. `isFinalStatus` também foi expandido para aceitar variações como `"Final/OT"`.

#### Bug crítico — `syncNBA.ts`: série marcada como encerrada prematuramente quando `home_team_id` é null
- Se uma série existia no banco sem `home_team_id` ou `away_team_id` (série criada antes do seed), `winner_id === null` era `true` para jogos não finalizados. Com 4 ou mais jogos cadastrados sem resultado, `isComplete` poderia ser `true` com `winner_id` nulo, corrompendo a série.
- Corrigido: `homeWins` e `awayWins` retornam 0 quando o respectivo `team_id` é null. `isComplete` só é `true` se ambos os times estiverem definidos na série.

#### Bug alto — `useGamePicks.ts`: bloqueio de jogo validado apenas no cliente
- A verificação de `tip_off_at` existia somente no frontend. O backend não validava, e as policies RLS do Supabase também não. Um usuário com acesso direto à API do Supabase poderia gravar palpites após o início do jogo.
- Corrigido: `saveGamePick` agora verifica `game.played` antes de qualquer outra coisa, rejeitando imediatamente picks em jogos já finalizados. `isGameLocked` também retorna `true` para `game.played === true`, mantendo consistência entre a lógica de save e a lógica de exibição.

#### Bug alto — `useRanking.ts`: sem debounce nas subscriptions Realtime
- As 4 subscriptions Realtime (`series`, `series_picks`, `game_picks`, `games`) chamavam `computeRanking` diretamente. Durante um sync, múltiplas tabelas são atualizadas em sequência, disparando dezenas de execuções paralelas de `computeRanking`, cada uma com 6 queries ao Supabase. Isso gerava carga excessiva e potencial inconsistência de estado por execuções fora de ordem.
- Corrigido: substituído o callback direto por `scheduleCompute()`, que usa `setTimeout` de 1,5 segundos com cancelamento do timer anterior. O timer é limpo no retorno do `useEffect`.

#### Bug alto — `admin.ts`: sync e rescore retornavam sucesso antes de executar
- As rotas `/admin/sync` e `/admin/rescore` respondiam `{ ok: true }` imediatamente e disparavam o processo com `.catch(console.error)`. Se o sync falhasse, o admin recebia "Sync started" sem nenhuma indicação de erro.
- Corrigido: ambas as rotas agora aguardam `await`. Sucesso retorna mensagem de conclusão; falha retorna status 500 com a mensagem de erro.

#### Bug alto — `Games.tsx`: função `brt()` gerava ISO string inválida ao cruzar meia-noite UTC
- `brt('2026-04-20', 21)` produzia `T24:00:00Z`, que é um ISO inválido. `new Date(...)` retornaria `Invalid Date`, quebrando cálculos de lock e countdown.
- Corrigido: quando `hBrt + 3 >= 24`, o dia é avançado corretamente usando `Date.setUTCDate`, e a hora é calculada com `% 24`.

#### Bug alto — `useGamePicks.ts`: array `games` como dependência de `useEffect` causava refetch desnecessário
- `games` (array) criava nova referência a cada `setGames`, acionando o efeito de `fetchPicks` em toda re-renderização.
- Corrigido: dependência alterada de `games` para `games.length`.

#### Bug alto — `syncNBA.ts`: `game_number` calculado por `length` em vez de `MAX`
- `(existingGames?.length ?? 0) + 1` era incorreto quando jogos haviam sido deletados ou quando syncs ocorriam em paralelo, podendo gerar valores duplicados.
- Corrigido: `game_number` agora é calculado como `MAX(game_number) + 1` a partir dos jogos carregados da série.

#### Bug médio — `useRanking.ts`: falha silenciosa sem feedback ao usuário
- Queries com falha ou dados ausentes resultavam em retorno silencioso, deixando a tela de ranking vazia sem nenhuma mensagem.
- Corrigido: adicionado estado `error` no hook, populado em caso de erro de DB ou dados incompletos. `Ranking.tsx` exibe um banner vermelho com a mensagem de erro quando presente.

#### Bug médio — `scoring.ts` / `rules.ts`: dois arquivos de pontuação independentes sem aviso
- Os valores de `SCORING_CONFIG` (frontend) e `SCORING` (backend) eram idênticos mas sem nenhum mecanismo de sincronização. Uma alteração futura em um dos arquivos divergiria silenciosamente.
- Corrigido: adicionado comentário de aviso explícito no topo de ambos os arquivos indicando que alterações devem ser espelhadas manualmente no arquivo correspondente.

#### Bug baixo — `BracketSVG.tsx`: emoji `🏆` hardcoded no JSX
- Substituído pelo componente `<Trophy>` do Lucide React, já presente como dependência do projeto. Evita problemas de encoding e mantém consistência visual.

#### Bug baixo — `engine.ts`: `console.table` em produção
- `console.table(ranking.slice(0, 10))` gerava saída verbosa nos logs do Render a cada sync (a cada 15 minutos). Substituído por `console.log` com formatação legível por linha.

#### Bug baixo — `BracketSVG.tsx`: non-null assertion em `getSlot()`
- `getSlot()` usava `!` para assertar que o ID sempre existia em `SLOT_DEFS`. Embora seguro com as constantes atuais, um ID incorreto em `CONNECTIONS` causaria crash silencioso.
- Corrigido: retorno alterado para `SlotDef | undefined`; `renderConnections` faz early return se `from` ou `to` for `undefined`.

#### Bug baixo — `useSeries.ts`: `savePick` não verificava `is_complete`
- O hook `savePick` não guardava contra séries já encerradas. A SeriesModal desabilita o botão, mas a função aceitaria chamadas diretas em séries completas.
- Corrigido: adicionada guarda no início da função que retorna sem ação se a série não existir ou já estiver completa.

### Validações
- `frontend`: `npm run build` concluído com sucesso — sem erros de TypeScript. Warning de chunk grande do Vite permanece mas sem falha de compilação.
- `backend`: `npm run build` concluído com sucesso — sem erros de TypeScript.
- `backend`: `npm run test:scoring` concluído com sucesso — todos os testes passaram.

### Pendências não corrigidas nesta rodada
- Validação de `tip_off_at` no lado do servidor: o bloqueio de picks após tip-off ainda depende do frontend e de data correta no banco. Uma Edge Function no Supabase ou rota no backend que rejeite inserts após o horário seria a solução definitiva, mas requer mudanças na arquitetura de persistência de picks.
- Políticas RLS do Supabase para `game_picks`: garantir que cada usuário só consiga inserir/atualizar os próprios picks ainda depende de revisão manual das policies no painel do Supabase.
- `SERIES_ID_BY_TEAMS` em `syncNBA.ts`: mapeamento estático continua hardcoded para a temporada 2024-25. Temporadas futuras precisarão atualizar este mapa.

## 2026-04-10 - Correção de bugs críticos identificados em auditoria

### Objetivo
- Corrigir bugs encontrados em revisão manual completa do projeto: times trocados no modal de palpite de jogo, side-effect proibido no hook de ranking, game_number duplicado no sync da NBA, falha silenciosa no resultado da série, CORS aberto no backend e logs de debug em produção.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/GamePickModal.tsx`
- `frontend/src/hooks/useRanking.ts`
- `backend/src/jobs/syncNBA.ts`
- `frontend/src/components/SeriesModal.tsx`
- `backend/src/index.ts`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas

#### Bug crítico — `GamePickModal.tsx`: times trocados quando mandante do jogo difere da série
- A NBA alterna o mandante em cada jogo da série (ex.: jogos 1-2 em OKC, 3-4 em MEM). O modal usava `teamA/teamB` fixos da *série*, mas `homeId/awayId` vinham do *jogo*. Para o jogo 3, o botão exibia "OKC" mas salvava `MEM` como `winner_id` — palpite gravado errado.
- Corrigido: cada botão agora resolve o time pelo `id` do próprio jogo via `getTeam(homeId) ?? teamA` e `getTeam(awayId) ?? teamB`, garantindo que a abreviação exibida e o ID salvo sempre se refiram ao mesmo time.

#### Bug crítico — `useRanking.ts`: side-effect dentro de state updater do React
- `setBreakdowns(nextBreakdowns)` era chamado dentro do updater de `setRanking((previousRanking) => { ... })`. Em React 18 Strict Mode, updaters podem ser executados duas vezes, causando `breakdowns` e `ranking` dessincronizados por um ciclo de render.
- Corrigido: substituída a abordagem de updater por `useRef<RankingEntry[]>` para guardar o ranking anterior. `buildRankingState` é chamado fora do updater usando `previousRankingRef.current`; após o cálculo, o ref é atualizado e `setRanking`/`setBreakdowns` são chamados separadamente no mesmo flush.

#### Bug alto — `syncNBA.ts`: `game_number` duplicado em sync inicial com múltiplos jogos
- Quando vários jogos novos de uma mesma série eram inseridos numa única passagem do sync, a query de `existingGames` era feita antes de qualquer inserção. Todos os novos jogos calculavam `game_number = 1` (ou outro mesmo valor), gerando duplicatas.
- Corrigido: eliminada a query separada por `nba_game_id`. Os jogos existentes da série são carregados uma única vez com `select('id, nba_game_id, ...')`, e o `existingGame` é encontrado por `existingGames.find(g => g.nba_game_id === bdlGame.id)`. Dessa forma o `game_number` de jogos já existentes é preservado, e novos jogos recebem `existingGames.length + 1` correto considerando as inserções anteriores da mesma passagem.

#### Bug médio — `SeriesModal.tsx`: `getTeam(series.winner_id)` pode retornar `undefined`
- O resultado da série exibia `getTeam(series.winner_id)?.abbreviation`, mas `getTeam` consulta a lista estática de times. Se `winner_id` fosse de um time do play-in ou não mapeado, a abreviação seria `undefined` na tela.
- Corrigido: expressão alterada para `(series.winner ?? getTeam(series.winner_id))?.abbreviation ?? series.winner_id`, priorizando o objeto joined `series.winner` que já vem populado pelo hook `useSeries`.

#### Bug de segurança — `backend/src/index.ts`: CORS sem restrição de origem
- `app.use(cors())` sem configuração permite que qualquer domínio faça requisições ao backend, incluindo os endpoints `/admin/sync` e `/admin/rescore`.
- Corrigido: adicionada configuração `origin: process.env.FRONTEND_URL ?? 'http://localhost:5173'`. A variável `FRONTEND_URL` deve ser definida no ambiente de produção do Render apontando para o domínio Vercel do frontend.

#### Qualidade — `Games.tsx`: 12 instruções de `console.log/warn` em código de produção
- Logs de debug (`'time selecionado'`, `'[GameCard] handleSave chamado'`, `'[savePick] chamado'`, `'[savePick] pick existente'`, `'[savePick] update result'`, `'[savePick] insert result'`, `'[savePick] sucesso!'` e outros) estavam presentes em `GameCard` e `savePick`, aparecendo no console do usuário final.
- Removidos todos os logs de debug. Mantido apenas o `console.error` no bloco `catch` de `savePick`, que registra exceções inesperadas sem expor detalhes desnecessários ao usuário.

### Validações
- `frontend`: `npm run build` concluído com sucesso — sem erros de TypeScript, warning de chunk grande do Vite permanece mas sem falha de compilação.
- `backend`: `npm run build` concluído com sucesso — sem erros de TypeScript.

### Pendências não corrigidas (decisão de produto ou escopo)
- `BracketEditor.tsx`: `gamePickSeries` e `setGamePickSeries` existem mas o modal de palpite de jogo não tem gatilho de abertura a partir do bracket. Requer decisão de produto sobre o fluxo de navegação (ex.: botão "Palpitar jogos" dentro do `SeriesModal`).
- `Compare.tsx` e `RankingTable.tsx`: funções `nameToColor`, `initials` e o componente `Avatar` estão duplicados em dois arquivos com implementações ligeiramente diferentes. Sem impacto funcional, mas candidatos a extração em `frontend/src/components/Avatar.tsx`.
- `SERIES_ID_BY_TEAMS` em `syncNBA.ts`: mapeamento estático de confrontos hardcoded para a temporada 2024-25. Temporadas futuras precisarão atualizar este mapa ou adotar um mapeamento dinâmico via tabela no banco.

## 2026-04-09 22:30 - Alinhamento com schema real do Supabase

### Objetivo
- Corrigir o desalinhamento entre frontend, backend e o schema real validado no Supabase, com foco em scoring, ranking, sync, seed e fluxo de jogos.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/types/index.ts`
- `frontend/src/utils/bracket.ts`
- `frontend/src/utils/scoring.ts`
- `frontend/src/hooks/useSeries.ts`
- `frontend/src/hooks/useGamePicks.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/components/BracketSVG.tsx`
- `frontend/src/components/GamePickModal.tsx`
- `frontend/src/pages/BracketEditor.tsx`
- `frontend/src/pages/Games.tsx`
- `frontend/src/pages/OfficialBracket.tsx`
- `backend/src/utils/bracket.ts`
- `backend/src/scoring/rules.ts`
- `backend/src/scoring/engine.ts`
- `backend/src/jobs/syncNBA.ts`
- `backend/src/routes/seedData.ts`
- `backend/src/routes/admin.ts`

### Mudanças feitas
- Changelog incremental criado para registrar todas as mudanças realizadas pelo Codex.
- Tipos do frontend alinhados ao schema real do Supabase:
  - `Series` agora reflete `position`, `nba_series_id` e trata `slot` como alias opcional.
  - `Game` agora usa `home_score`, `away_score`, `nba_game_id` e aceita aliases derivados para compatibilidade da UI.
  - `SeriesPick` e `GamePick` deixam `points` opcional, porque o banco real não persiste esses campos.
- Helper de normalização criado no frontend (`frontend/src/utils/bracket.ts`) para:
  - converter IDs antigos de bracket (`W-R1-1`, `FINALS`) para o formato canônico (`W1-1`, `FIN`);
  - derivar `round` de série/jogo quando o banco não traz isso em `games`;
  - normalizar jogos reais para o shape usado pela interface.
- Hook `useSeries` atualizado para popular `slot` derivado a partir do `id` real da série, preservando o funcionamento do bracket e das telas que ainda exibem slot.
- Hook `useGamePicks` atualizado para carregar jogos com `round` derivado da série, evitando dependência de `games.round`.
- Hook `useRanking` corrigido para:
  - calcular pontos de jogo usando `round` derivado da série;
  - parar de depender implicitamente de `games.round` persistido;
  - preencher `prev_rank` com base no ranking anterior em memória da sessão atual.
- `BracketSVG`, `BracketEditor` e `OfficialBracket` atualizados para trabalhar com slot normalizado, incluindo correção do campeão das finais (`FIN`).
- `GamePickModal` ajustado para usar `home_team_id`, `away_team_id`, `home_score` e `away_score`, mantendo compatibilidade com jogos normalizados.
- Página `Games` atualizada para:
  - enriquecer jogos com `round` da série;
  - manter o fluxo real de `game_picks` no schema atual;
  - exibir também jogos sem `tip_off_at` em uma seção própria, em vez de escondê-los.
- Helper de normalização criado no backend (`backend/src/utils/bracket.ts`) para unificar IDs de séries e inferência de round.
- Regras de scoring do backend ajustadas para tolerar jogo sem `round` persistido.
- `backend/src/scoring/engine.ts` refeito para o schema real:
  - não tenta mais atualizar colunas inexistentes (`participants.total_points`, `participants.rank`, `series_picks.points`, `game_picks.points`);
  - calcula um snapshot coerente do ranking usando `series.round`;
  - deriva round dos jogos pela série;
  - registra snapshot em log em vez de gravar campos inexistentes no banco.
- `backend/src/jobs/syncNBA.ts` corrigido para o schema real:
  - usa IDs canônicos de série;
  - busca série por `id`, não por `slot`;
  - usa `nba_game_id`, `home_team_id`, `away_team_id`, `home_score`, `away_score`, `tip_off_at`;
  - atualiza ou cria jogos no formato real da tabela `games`;
  - recalcula o encerramento da série com base nas vitórias registradas.
- Seed do backend migrado para o schema real:
  - usa `id`, `position`, `home_team_id`, `away_team_id`, `nba_series_id`;
  - abandona `team_a_id`, `team_b_id` e `slot` antigo.
- Rota `/admin/seed` atualizada para fazer upsert lógico por `series.id`, não por `slot`.

### Validações
- `backend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\backend`
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o build do frontend continua emitindo warning de chunk grande do Vite, mas sem falha de compilação.

### Pendências
- O fluxo de `GamePickModal` continua sem gatilho explícito a partir do `BracketEditor`; o modal existe e foi alinhado ao schema, mas a navegação para ele ainda merece decisão de produto.
- O ranking segue sendo um snapshot em memória no frontend e um snapshot em log no backend; se você quiser persistência histórica real de ranking/variação, será preciso definir novas colunas ou uma tabela própria no banco.
- O banco pode conter séries já criadas com IDs antigos; a UI agora tolera aliases, mas vale conferir se você quer migrar esses IDs para o padrão canônico.

## 2026-04-09 23:35 - Relatório de pontuação dentro do ranking

### Objetivo
- Adicionar um relatório explicável de pontuação dentro da tela de ranking, permitindo abrir o breakdown de qualquer participante sem criar rota nova.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/types/index.ts`
- `frontend/src/utils/ranking.ts`
- `frontend/src/hooks/useRanking.ts`
- `frontend/src/components/RankingTable.tsx`
- `frontend/src/components/ParticipantScoreReport.tsx`
- `frontend/src/pages/Ranking.tsx`

### Mudanças feitas
- Novos tipos adicionados em `frontend/src/types/index.ts` para suportar o relatório:
  - `ScoreBreakdownSummary`
  - `SeriesScoreBreakdownItem`
  - `GameScoreBreakdownItem`
  - `ParticipantScoreBreakdown`
- Novo util compartilhado criado em `frontend/src/utils/ranking.ts` para centralizar:
  - ordenação do ranking;
  - cálculo do ranking;
  - cálculo do breakdown de pontuação por participante;
  - subtotais de séries, jogos, rodadas e cravadas;
  - labels de confronto e vencedores para relatório.
- `useRanking` foi refatorado para usar o util compartilhado e agora expõe:
  - `ranking`
  - `breakdowns`
  - `getBreakdownForParticipant`
  - `loading`
  - `refetch`
- `RankingTable` foi expandida para suportar:
  - linha selecionada para o participante atualmente inspecionado;
  - callback `onParticipantClick`;
  - coluna/botão `Relatório` por participante;
  - clique na linha para abrir o breakdown.
- Novo componente `ParticipantScoreReport` criado para renderizar o relatório detalhado:
  - hero com nome do participante;
  - cards de resumo: total, séries, jogos, cravadas;
  - pontos por rodada;
  - seção detalhada de séries com status (`cravada`, `vencedor`, `erro`, `pendente`);
  - seção detalhada de jogos com status (`acertou`, `errou`, `pendente`).
- `Ranking.tsx` foi atualizado para incorporar o relatório no fluxo atual:
  - desktop: card fixo abaixo da tabela com o relatório do participante selecionado;
  - mobile: bottom sheet com o relatório;
  - participante logado vem selecionado por padrão;
  - qualquer linha da tabela pode trocar o relatório exibido.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- O relatório usa o mesmo snapshot em memória do ranking; se você quiser links compartilháveis, histórico ou persistência por data, será preciso desenhar isso em outra rodada.
- O desktop hoje mostra o relatório abaixo da tabela, não em painel lateral fixo; a implementação priorizou encaixe rápido e coerente com a página atual.

## 2026-04-09 23:55 - Jogos agrupados por série com expansão

### Objetivo
- Reduzir o scroll excessivo da aba `Jogos` agrupando os cards por série e exibindo o jogo a jogo apenas sob demanda.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/pages/Games.tsx`

### Mudanças feitas
- A tela `Jogos` deixou de renderizar uma lista longa de jogos soltos e passou a organizar o conteúdo em cards por série.
- Cada card de série agora mostra um resumo compacto com:
  - confronto;
  - rodada;
  - quantidade de jogos cadastrados;
  - quantidade de jogos abertos;
  - quantidade de palpites feitos;
  - pontos acumulados naquela série de jogos;
  - próximo fechamento, quando existir.
- Ao tocar/clicar em uma série, o card expande e revela os jogos daquela série usando os `GameCard`s existentes.
- A ordenação das séries prioriza:
  - séries com jogos ainda abertos;
  - séries com fechamento mais próximo;
  - depois rodada e id da série.
- A primeira série relevante abre automaticamente por padrão, reduzindo fricção para o usuário.
- O fluxo de salvar palpites jogo a jogo foi preservado; a mudança foi concentrada na organização visual da página.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- Se você quiser reduzir ainda mais o tamanho vertical, dá para fazer uma segunda rodada compactando o próprio `GameCard`.
- A tela ainda usa muitos blocos ricos visualmente; a principal melhora desta rodada foi estrutural, não de densidade extrema.

## 2026-04-10 00:05 - Relatório de pontuação com jogos agrupados por série

### Objetivo
- Reduzir a altura do relatório de pontuação agrupando os jogos por série, em vez de listar todos os jogos em sequência plana.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/components/ParticipantScoreReport.tsx`

### Mudanças feitas
- A seção `Jogos` do relatório de pontuação passou a agrupar o breakdown por série/confronto.
- Cada grupo agora mostra um card-resumo com:
  - rodada;
  - confronto;
  - subtotal de pontos daquela série de jogos;
  - quantidade de acertos;
  - quantidade de jogos concluídos;
  - expansão/recolhimento por série.
- Ao expandir a série, o usuário vê os jogos individuais daquela série com:
  - número do jogo;
  - status (`acertou`, `errou`, `pendente`);
  - palpite feito;
  - vencedor real;
  - pontos gerados.
- A primeira série do relatório abre automaticamente por padrão para manter leitura rápida.
- A seção ficou consistente com a nova organização da aba `Jogos`, reforçando a mesma lógica mental no produto.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`
- Observação: o warning de chunk grande do Vite permanece, mas sem falha de compilação.

### Pendências
- Se quiser, numa próxima rodada dá para aplicar o mesmo padrão de agrupamento por série também à seção de `Séries`, usando expansão para detalhes extras de palpites.

## 2026-04-10 00:40 - Retorno ao modo real da API no backend

### Objetivo
- Preparar o backend para sair do modo de teste com jogos fictícios e voltar a operar com dados reais da API, sem quebrar o ranking por tentar escrever colunas inexistentes.

### Arquivos alterados
- `updates/codex-changelog.md`
- `backend/src/scoring/engine.ts`
- `backend/src/jobs/syncNBA.ts`

### Mudanças feitas
- `backend/src/scoring/engine.ts` deixou de tentar persistir `total_points` e `rank` em `participants`, já que essas colunas não existem no schema real atual do Supabase.
- O rescore do backend agora computa o snapshot do ranking e registra o resultado em log, mantendo o frontend como fonte da verdade da exibição do ranking ao vivo.
- `backend/src/jobs/syncNBA.ts` foi ajustado para processar todos os jogos de pós-temporada retornados pela API, não apenas os `Final`.
- O sync agora faz upsert também de jogos futuros/agendados, preenchendo:
  - `series_id`
  - `game_number`
  - `home_team_id`
  - `away_team_id`
  - `tip_off_at`
  - `nba_game_id`
  - `played`
  - `winner_id`
  - `home_score`
  - `away_score`
- Para jogos ainda não finalizados, o sync passa a gravar `played = false` e `winner_id = null`, permitindo que a agenda de palpites volte a aparecer sem depender de seed manual de jogos.
- A atualização da série passou a usar a quantidade real de jogos jogados (`played = true`) em vez de contar todo jogo cadastrado, evitando inflar `games_played` quando a série já tem jogos futuros agendados.

### Validações
- Pendente nesta rodada: rodar `backend` build e `test:scoring` após a alteração.

### Pendências
- Ainda será necessário limpar do Supabase os dados fictícios antes de religar totalmente a operação real.
- O mapeamento `SERIES_ID_BY_TEAMS` continua estático; ele funciona para a chave esperada, mas não substitui um mapeamento dinâmico de bracket em futuras temporadas.

## 2026-04-10 01:05 - Placeholder de play-in no bracket com bloqueio de palpite

### Objetivo
- Permitir exibir séries ainda indefinidas com texto de placeholder do play-in, sem liberar palpites antes do confronto real estar formado.

### Arquivos alterados
- `updates/codex-changelog.md`
- `frontend/src/utils/bracket.ts`
- `frontend/src/components/SeriesModal.tsx`
- `frontend/src/components/BracketSVG.tsx`

### Mudanças feitas
- `frontend/src/utils/bracket.ts` ganhou helpers para:
  - detectar se uma série já está pronta para receber palpite;
  - montar labels de placeholder para séries ainda indefinidas;
  - mostrar “Seed 7/8 / play-in” na primeira rodada quando o adversário ainda não estiver fechado;
  - mostrar fallback do tipo “Vencedor de W1-1” nas rodadas seguintes quando o participante ainda depende de uma série anterior.
- `SeriesModal` agora reconhece séries incompletas de confronto:
  - mostra um bloco explicando que a série ainda aguarda definição;
  - desabilita escolha de vencedor e quantidade de jogos;
  - bloqueia o botão de salvar até o confronto existir de verdade.
- `BracketSVG` foi ajustado em desktop e mobile para:
  - renderizar `PI` / `TBD` quando um lado da série ainda não existe;
  - exibir texto explicativo do placeholder no card mobile;
  - marcar visualmente séries ainda aguardando play-in;
  - manter a chave navegável sem fingir que o confronto já está pronto.

### Validações
- `frontend`: `npm run build` concluído com sucesso em `C:\Dev\pessoal\projetos\nba-bolao\frontend`

### Pendências
- Os placeholders desta rodada são genéricos por estrutura da chave, não por nomes reais dos times do play-in.
- Se você quiser textos como “OKC vs LAL/MIN” com candidatos reais, isso pode entrar numa segunda rodada com uma camada específica para o estado do play-in.
