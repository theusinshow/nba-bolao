# Prompt Para Revisao no Claude Code

Use o prompt abaixo no Claude Code:

```text
Quero que você faça uma revisão completa deste projeto com foco em bugs, regressões e inconsistências de comportamento.

Antes de qualquer análise no código, leia estes arquivos nesta ordem:

1. updates/changelogs.md
2. updates/codex-changelog.md
3. updates/futuras-implementacoes.md

Depois disso, revise o projeto inteiro com mentalidade de code review e QA funcional.

Prioridades da revisão:

- identificar bugs reais ou riscos prováveis;
- encontrar regressões entre páginas e fluxos;
- validar coerência entre Home, Meu Bracket, Bracket Oficial, Jogos, Ranking, Compare e simulação;
- procurar problemas de regra de negócio em palpites, bloqueios, progresso, ranking e scoring;
- procurar inconsistências de UX, principalmente em mobile;
- apontar qualquer coisa que pareça quebrada, incompleta, enganosa ou confusa para o usuário.

Quero atenção especial para estes pontos:

- progresso do bracket por rodada definida;
- progresso da Home, que deve seguir a mesma lógica do bracket;
- jogos futuros de uma série já encerrada, que não devem aceitar palpite;
- filtro mobile do bracket (`Tudo`, `Oeste`, `Finais`, `Leste`);
- destaque de `Resultados reais` na Home;
- possíveis inconsistências entre dados reais, testes fictícios e simulação isolada;
- riscos em sync, rescore, ranking e leitura de séries/jogos do Supabase.

Formato da resposta:

1. Liste primeiro os achados, ordenados por severidade.
2. Para cada achado, informe:
   - severidade;
   - arquivo(s) envolvidos;
   - descrição do problema;
   - impacto prático;
   - sugestão objetiva de correção.
3. Depois dos achados, traga:
   - dúvidas ou hipóteses que você assumiu;
   - riscos residuais;
   - áreas que merecem novos testes.

Se não encontrar problemas relevantes, diga isso explicitamente e informe apenas riscos residuais e lacunas de teste.

Não quero um resumo superficial. Quero revisão crítica de verdade.
```
