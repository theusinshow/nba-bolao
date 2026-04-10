# Cenários SQL para ambiente de teste separado

Estes scripts foram criados para uso em um Supabase de teste, separado do bolão principal.

## Fluxo recomendado

1. Rodar `open-first-round-simulation.sql`
2. Pedir para todo mundo palpitar nas páginas oficiais (`/bracket`, `/games`, `/ranking`, `/official`)
3. Rodar `reveal-first-round-results.sql`
4. Conferir ranking, breakdown, Home, Bracket e Jogos com os resultados fictícios

## Observações

- Os scripts abaixo limpam `series_picks`, `game_picks` e `games`, então são para ambiente de teste separado.
- Os horários dos jogos são relativos ao momento da execução do SQL, para facilitar repetição sem editar datas manualmente.
- O cenário abre a 1ª rodada completa para palpites e deixa as fases seguintes aguardando definição.
