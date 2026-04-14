# Futuras Implementações

Este documento reúne apenas as frentes que continuam pendentes depois das implementações já concluídas no produto.

## Concluído recentemente

### 1. Melhorar layout mobile e corrigir botões do bracket

Status:
- concluído

Resumo:
- o bracket recebeu rodadas de refinamento visual e de interação;
- houve correções de contraste, mobile e comportamento de elementos da tela;
- essa frente não deve mais permanecer como pendência principal do produto.

### 2. Permitir palpitar todos os jogos disponíveis de uma vez

Status:
- concluído

Resumo:
- o produto já conta com fluxo operacional para resolver palpites jogo a jogo de forma mais prática;
- a necessidade original de reduzir atrito para preenchimento em lote foi absorvida pelas melhorias já entregues.

### 3. Trazer informações reais para a Home via APIs

Status:
- concluído

Resumo:
- a Home já consome feed real de jogos, resultados recentes e próximos confrontos;
- a tela deixou de depender do modelo antigo baseado apenas em blocos estáticos.

## Prioridade alta / operação

### 1. Automatizar a extração diária de dados de participantes

Motivo:
- hoje a extração de dados de participantes depende da function configurada apenas no PC de casa;
- isso cria risco operacional se houver problema na máquina local;
- o ideal é ter uma cópia automática diária depois do fechamento principal dos palpites.

Objetivos:
- mover essa rotina para a infraestrutura oficial do projeto;
- executar a extração automaticamente todos os dias em horário fixo após os palpites;
- salvar o arquivo em um local persistente, sem depender de disco local;
- manter também uma forma manual de disparar a extração pelo admin, como redundância.

Direção recomendada:
- backend no Render gera o snapshot;
- arquivo salvo no Supabase Storage;
- registro de data/hora e status da última execução;
- retenção simples para não acumular backups indefinidamente.

Observação:
- essa automação tende a ter custo operacional baixo porque não depende de APIs externas e roda só uma vez por dia.

### 2. Gerar resumo textual diário dos palpites para envio no grupo

Motivo:
- depois do último fechamento do dia, faz sentido ter um texto consolidado para conferência coletiva;
- isso aumenta transparência, reduz dúvidas e ainda gera engajamento no grupo.

Objetivos:
- gerar automaticamente um texto com os palpites já travados de cada participante;
- organizar a saída por jogo, com leitura simples para WhatsApp ou grupo;
- permitir conferência rápida dos palpites após o fechamento final do dia.

Formato desejado:
- título do dia/rodada;
- lista de jogos considerados;
- abaixo de cada jogo, os participantes e seus respectivos palpites;
- extras opcionais:
  - unanimidade;
  - voto solitário;
  - divisão percentual entre os lados.

Direção recomendada:
- usar a mesma base operacional do scheduler pós-fechamento;
- gerar o texto no backend;
- salvar histórico do resumo;
- idealmente deixar pronto para copiar ou enviar ao grupo.

Observação:
- essa frente combina muito bem com a automação diária de backup e pode compartilhar a mesma janela operacional.

## Contexto importante

Boa parte do backlog original já foi absorvida no produto:
- comparação jogo a jogo;
- revelação de palpites pós-lock;
- `Vai na fé`;
- backup operacional;
- melhorias de mobile e confiabilidade do bracket;
- Home com dados reais;
- melhorias do gráfico do ranking;
- resultados recentes na Home;
- mensagens de série encerrada no fluxo jogo a jogo.

## Ordem recomendada de execução

1. Automatizar a extração diária de dados de participantes
2. Gerar resumo textual diário dos palpites para envio no grupo
