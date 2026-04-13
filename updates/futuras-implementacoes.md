# Futuras Implementações

Este documento reúne apenas as frentes que continuam pendentes depois das implementações já concluídas no produto.

## Prioridade alta

### 1. Melhorar layout mobile e corrigir botões do bracket

Motivo:
- atualmente ainda existem interações no bracket mobile que não respondem como esperado;
- isso afeta diretamente a experiência de uso e passa sensação de funcionalidade quebrada.

Objetivos:
- revisar todos os botões e CTAs do bracket mobile;
- remover botões sem ação real;
- corrigir fluxos de toque e navegação;
- deixar o bracket mais confiável em telas pequenas.

### 2. Permitir palpitar todos os jogos disponíveis de uma vez

Motivo:
- alguns usuários preferem resolver todos os palpites jogo a jogo em uma única sessão, sem precisar entrar série por série ou dia por dia.

Objetivos:
- criar uma visão consolidada com todos os jogos abertos;
- permitir salvar palpites em lote;
- reduzir atrito operacional para usuários que querem preencher tudo rapidamente.

## Prioridade alta / produto

### 3. Trazer informações reais para a Home via APIs

Motivo:
- a Home pode virar um painel muito mais vivo se usar dados externos atualizados.

Objetivos:
- mostrar dados reais de jogos, resultados e próximos confrontos;
- aumentar utilidade da Home no dia a dia;
- aproximar o produto de uma central real de acompanhamento dos playoffs.

Observação:
- essa frente deve ser ativada no momento em que o produto deixar de depender dos jogos fictícios de teste.

## Prioridade alta / operação

### 4. Automatizar a extração diária de dados de participantes

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

### 5. Gerar resumo textual diário dos palpites para envio no grupo

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
- melhorias do gráfico do ranking;
- resultados recentes na Home;
- mensagens de série encerrada no fluxo jogo a jogo.

## Ordem recomendada de execução

1. Melhorar layout mobile e corrigir botões do bracket
2. Permitir palpitar todos os jogos disponíveis de uma vez
3. Trazer informações reais para a Home via APIs
4. Automatizar a extração diária de dados de participantes
5. Gerar resumo textual diário dos palpites para envio no grupo
