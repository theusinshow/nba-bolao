# Futuras Implementações

Este documento reúne ideias de evolução do produto, melhorias de usabilidade e integrações futuras discutidas durante o desenvolvimento do bolão.

## Prioridade alta

### 1. Melhorar layout mobile e corrigir botões do bracket

Motivo:
- atualmente existem interações no bracket mobile que não respondem como esperado;
- isso afeta diretamente a experiência de uso e passa sensação de funcionalidade quebrada.

Objetivos:
- revisar todos os botões e CTAs do bracket mobile;
- remover botões sem ação real;
- corrigir fluxos de toque e navegação;
- deixar o bracket mais confiável em telas pequenas.

### 2. Exibir mensagem de série encerrada no jogo a jogo

Motivo:
- quando uma série termina em 4, 5 ou 6 jogos, não faz sentido continuar mostrando jogos posteriores como se ainda pudessem receber palpite;
- isso gera confusão no fluxo jogo a jogo.

Objetivos:
- ao invés de sugerir palpites para jogos que não deveriam mais existir operacionalmente, exibir mensagem do tipo:
  - `Série já encerrada`
  - `Não haverá jogo 5`
  - `Não haverá jogo 6`
  - `Não haverá jogo 7`

### 3. Permitir palpitar todos os jogos disponíveis de uma vez

Motivo:
- alguns usuários preferem resolver todos os palpites jogo a jogo em uma única sessão, sem precisar entrar série por série ou dia por dia.

Objetivos:
- criar uma visão consolidada com todos os jogos abertos;
- permitir salvar palpites em lote;
- reduzir atrito operacional para usuários que querem preencher tudo rapidamente.

## Prioridade alta / produto

### 4. Adicionar comparação de palpites jogo a jogo na aba `Comparar`

Motivo:
- a comparação atual por séries já ajuda, mas a comparação jogo a jogo tornaria a disputa mais rica e divertida.

Objetivos:
- mostrar onde dois participantes concordam ou divergem em cada jogo;
- ampliar o aspecto social e competitivo do bolão;
- complementar a comparação de bracket/séries.

### 5. Trazer informações reais para a Home via APIs

Motivo:
- a Home pode virar um painel muito mais vivo se usar dados externos atualizados.

Objetivos:
- mostrar dados reais de jogos, resultados, próximos confrontos e eventualmente odds ou notícias;
- aumentar utilidade da Home no dia a dia;
- aproximar o produto de uma central real de acompanhamento dos playoffs.

## Prioridade média

### 6. Mostrar resultados da última noite na Home com animação horizontal

Motivo:
- pode deixar a Home mais dinâmica e com sensação de produto “ao vivo”.

Objetivos:
- exibir placares recentes da última noite;
- usar animação horizontal de forma leve;
- evitar excesso visual ou ruído.

Observação:
- implementar com cuidado para não prejudicar legibilidade nem performance.

### 7. Melhorar o gráfico do ranking com vários modos de visualização

Motivo:
- usuários diferentes podem preferir leituras diferentes da evolução do ranking.

Objetivos:
- disponibilizar mais de um tipo de gráfico;
- permitir alternar visualizações;
- enriquecer análise de desempenho dos participantes.

Observação:
- essa frente é valiosa, mas menos urgente que fluxo, mobile e clareza de palpites.

## Ideia com identidade de produto

### 8. Botão `Vai na fé` para palpites aleatórios dos jogos do dia

Motivo:
- alguns usuários participam mais pela resenha do que pela análise detalhada;
- em dias corridos, a pessoa pode querer palpitar rapidamente sem estudar confronto por confronto;
- a aba `Jogos` já organiza o fluxo por dia, então essa funcionalidade faz mais sentido no contexto diário do que em toda a rodada.

Conceito:
- criar um botão por bloco diário na aba `Jogos`, algo como:
  - `Vai na fé hoje`
  - `Aleatório para hoje`
  - `Resolver hoje no aleatório`
- o botão gera palpites aleatórios apenas para os jogos abertos daquele dia.

Escopo recomendado:
- aplicar apenas aos jogos ainda abertos;
- considerar apenas os jogos do dia visível no agrupamento da aba `Jogos`;
- permitir uso rápido sem sair do fluxo da página.

Plano para evitar erros de UX e regra de negócio:

1. Deixar explícito que os palpites são aleatórios
- o texto do botão e do modal de confirmação devem deixar claro que não existe análise inteligente por trás;
- evitar qualquer wording que sugira recomendação especializada.

2. Mostrar prévia antes de salvar
- gerar os palpites e exibir a lista antes da confirmação final;
- destacar visualmente quais palpites foram preenchidos pelo modo aleatório.

3. Não sobrescrever palpites existentes sem consentimento
- se o usuário já tiver palpites manuais em parte dos jogos do dia, oferecer duas opções:
  - preencher apenas jogos sem palpite;
  - sobrescrever todos os jogos do dia.

4. Respeitar bloqueio de horário
- ignorar jogos já iniciados ou bloqueados;
- atuar apenas sobre jogos com `tip_off_at` ainda no futuro e `played = false`.

5. Confirmar antes de persistir
- evitar salvar instantaneamente no primeiro clique;
- usar um passo intermediário de confirmação para reduzir arrependimento.

6. Dar feedback claro após salvar
- mostrar toast de sucesso;
- refletir os palpites gerados imediatamente na lista de jogos.

7. Manter o tom casual e divertido
- tratar a feature como ferramenta opcional de resenha;
- preservar espaço para quem prefere palpitar manualmente.

Riscos principais:
- usuário não entender que era aleatório;
- sobrescrever palpites manuais sem perceber;
- aplicar em jogos bloqueados;
- falta de confiança se a UI não mostrar claramente o que foi salvo.

Mitigação:
- clareza no texto;
- prévia;
- confirmação;
- respeito ao lock;
- diferenciação visual dos palpites gerados.

## Contexto importante

Durante o teste de pontuação simulada, o fluxo geral foi considerado bem-sucedido, mas essas melhorias surgiram como próximos passos naturais para amadurecer o produto.

## Ordem recomendada de execução

1. Melhorar layout mobile e corrigir botões do bracket
2. Exibir mensagem de série encerrada no jogo a jogo
3. Permitir palpitar todos os jogos disponíveis de uma vez
4. Adicionar comparação de palpites jogo a jogo na aba `Comparar`
5. Trazer informações reais para a Home via APIs
6. Botão `Vai na fé` para palpites aleatórios dos jogos do dia
7. Mostrar resultados da última noite na Home com animação horizontal
8. Melhorar o gráfico do ranking com vários modos de visualização
