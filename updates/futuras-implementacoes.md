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
