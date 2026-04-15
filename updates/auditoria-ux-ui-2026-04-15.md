# Auditoria UX/UI — Bolão NBA 2026

Data: 2026-04-15

## 1. Resumo Executivo

A UX/UI do projeto está em um nível intermediário-alto: visual forte, identidade consistente, boa ambição de produto e riqueza de informação.
O principal problema é o desbalanceamento entre sofisticação visual e base técnica de UX: há dívida importante em acessibilidade, semântica e manutenibilidade (principalmente por excesso de inline styles e padrões de interação não padronizados).

Nota geral: **6,7/10**.

## 2. Problemas Críticos (P0/P1)

- **P0 — Modais sem padrão acessível de diálogo**
  - Onde: `SeriesModal`, `GamePickModal`, modais internos em `Games`, sheet mobile em `BracketEditor`, drawer mobile em `Ranking`.
  - Problema: ausência de `role="dialog"`, `aria-modal`, foco inicial, trap de foco e fechamento por `Esc`.
  - Impacto: usuários de teclado/leitor de tela podem ficar presos ou navegar no conteúdo de fundo sem contexto.

- **P1 — Interações críticas não plenamente keyboard-friendly**
  - Onde: `RankingTable`, cards clicáveis e componentes com feedback dependente de hover.
  - Problema: uso recorrente de `onMouseEnter/onMouseLeave` e áreas clicáveis sem semântica explícita de botão/link.
  - Impacto: inconsistência entre mouse, touch e teclado; piora de acessibilidade e usabilidade.

- **P1 — Carga realtime com refetch total em cascata**
  - Onde: `useRanking`.
  - Problema: eventos realtime disparam refetch completo de múltiplas tabelas e alternância frequente de loading.
  - Impacto: jitter visual, sensação de lentidão e custo alto de rede/render em picos.

- **P1 — Ausência de política global de redução de movimento**
  - Onde: `index.css`.
  - Problema: animações contínuas sem fallback via `prefers-reduced-motion`.
  - Impacto: desconforto para usuários sensíveis a movimento e custo de render contínuo.

- **P1 — Multiplicação de timers por componente**
  - Onde: `CountdownTimer` em listas e cards.
  - Problema: cada instância cria seu próprio `setInterval`.
  - Impacto: aumento de consumo de CPU/bateria em mobile e telas com muitos jogos.

- **P1 — Toast sem anúncio acessível**
  - Onde: `Toast`.
  - Problema: ausência de `aria-live` / `role="status"`.
  - Impacto: feedback importante (erro/sucesso) pode não ser percebido por tecnologias assistivas.

## 3. Oportunidades de Melhoria de UX/UI

### Navegação

- Adicionar landmark semântico (`main`, `nav` com `aria-label`) e skip link para conteúdo.
- Diferenciar de forma consistente ações (`button`) de navegação (`Link`).
- Padronizar foco visível para todos os controles interativos.

### Formulários e escolhas

- Nos fluxos de palpite, exibir validação contextual próxima ao campo/controle afetado.
- Unificar estados visuais: `default`, `hover`, `focus`, `selected`, `disabled`, `locked`, `error`, `success`.

### Feedbacks e estados

- Preferir skeleton local em blocos de dados em vez de spinner global sempre que possível.
- Exibir progresso parcial em ações batch (como salvar vários palpites).

### Design System

- Reduzir uso de inline style e migrar para primitives reutilizáveis.
- Consolidar tokens de cor, spacing, raio, borda, sombra e timing.
- Criar base de componentes: `AppCard`, `SectionHeader`, `StatusBadge`, `IconButton`, `ModalShell`, `InteractiveRow`.

### Responsividade

- Diminuir densidade informacional em mobile nas telas mais carregadas (`Games`, `Home`, `Ranking`).
- Garantir alvo mínimo de toque (44x44) para ícones e botões pequenos.

### Acessibilidade

- Padronizar acessibilidade de overlays (modal/sheet/drawer).
- Revisar contraste de textos muted em fundos escuros.
- Garantir ordem de tab lógica em todos os fluxos principais.

### Micro-interações

- Trocar mutação de estilo via eventos por classes com `hover`, `focus-visible`, `active`, `disabled`.
- Reduzir animações ornamentais contínuas e priorizar motion contextual.

### Percepção de performance

- Separar claramente `loading inicial` de `atualização em segundo plano`.
- Evitar alternância agressiva de loading em cada evento realtime.

## 4. Sugestões de Refatoração de Código

### A) Base única de modal acessível

**Antes**
- Vários modais com `<div className="fixed inset-0 ...">` sem semântica de diálogo.

**Depois**
- Criar `ModalShell` reutilizável:

```tsx
<ModalShell
  title="Palpite da Série"
  isOpen={open}
  onClose={onClose}
  initialFocusRef={closeButtonRef}
>
  ...
</ModalShell>
```

Comportamentos internos obrigatórios:
- `role="dialog"`, `aria-modal`, `aria-labelledby`
- foco inicial
- trap de tab
- fechamento por `Esc`
- restore de foco ao fechar

### B) Semântica de tabela interativa

**Antes**
- `tr` clicável com `onClick`.

**Depois**
- `tr` permanece estrutural e a ação fica em `button`/`Link` explícito na célula:

```tsx
<td>
  <button className="interactive-row-button" onClick={...}>
    {participantName}
  </button>
</td>
```

### C) Ranking realtime incremental

**Antes**
- refetch total de várias tabelas a cada evento.

**Depois**
- carga inicial completa;
- patch incremental por tipo de evento;
- refetch total apenas em fallback de consistência.

### D) Timer compartilhado

**Antes**
- `setInterval` por `CountdownTimer`.

**Depois**
- `useNowTick(1000)` global + cálculo derivado por componente.

### E) Eliminar mutação imperativa de estilo

**Antes**
- `onMouseEnter` alterando `style`.

**Depois**
- classes utilitárias:

```tsx
className="text-nba-muted hover:text-nba-gold focus-visible:text-nba-gold transition-colors"
```

## 5. Recomendações Técnicas e de Arquitetura

- Criar camada `components/ui` com primitives obrigatórias para novas telas.
- Introduzir utilitários de acessibilidade (`useDialogA11y`, `LiveRegion`, componentes de foco).
- Definir guideline de estilo: inline style apenas para casos realmente dinâmicos.
- Evoluir tokens para camada semântica (`text-primary`, `surface-elevated`, `focus-ring`) em vez de uso direto de cor.
- Melhorar estratégia de estado realtime com cache/invalidação e atualização progressiva.
- Cobrir UX crítico com testes:
  - teclado/foco
  - fluxo de modal
  - anúncio de feedback
  - regressões em fluxo de palpite

## 6. Próximos Passos Priorizados

1. Implementar infraestrutura de acessibilidade para modais/sheets/toasts (P0 imediato).
2. Refatorar `useRanking` para atualização incremental e reduzir refetch total.
3. Extrair primitives de UI e reduzir inline styles em `Games`, `RankingTable` e `Nav`.
4. Aplicar `prefers-reduced-motion` e padronizar estados de foco/interação.
5. Criar suíte mínima de testes UX para evitar regressões nos fluxos principais.

