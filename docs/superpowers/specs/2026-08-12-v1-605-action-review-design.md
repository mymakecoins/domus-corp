# Especificação de Design — Issue V1-605: Action Review e Confirmação de Impacto

**Data**: 12 de Agosto de 2026  
**Status**: Proposto / Em Validação  
**Issue**: V1-605 — Implementar Action Review e confirmação de impacto  
**Modulo**: `@domus/ui` (Design System) & Frontend  

---

## 1. Visão Geral e Objetivos

A issue **V1-605** tem como objetivo tornar inteiramente visíveis a intenção, destino, parâmetros redigidos, dados afetados (escopo), nível de risco, política de segurança (policy decision), cota de consumo (budget) e aprovações necessárias antes da execução de qualquer ação externa por agentes de IA ou usuários no Domus Corp.

Adicionalmente, estabelece um mecanismo rígido e dinâmico de confirmação de segurança para ações de alto impacto ou destrutivas, garantindo ausência de auto-submit, ausência de botões ambíguos, estrita conformidade de cores (sem Indigo/Violeta nos botões primários) e suporte total a acessibilidade (teclado, leitor de tela, zoom de 200% e reduced motion).

Ao final da execução, a interface deve exibir de forma clara o **Recibo de Ação** imutável (conforme especificado na V1-604), contendo status (`SUCCESS`, `FAILED`, `INCONCLUSIVE`, `KILLED`), badge de estado semântico da IA, link para auditoria e próxima ação recomendada.

---

## 2. Requisitos Funcionais e Critérios de Aceite

| # | Requisito / Critério de Aceite | Detalhes da Implementação |
|---|---|---|
| **RF-01** | **Exibição de Intenção e Metadados** | O `ActionReviewDialog` exibirá intenção, sistema destino, parâmetros redigidos (`redactedParams`), escopo afetado (`affectedScope`), risco, policy e aprovação exigida. |
| **RF-02** | **Confirmação Dinâmica por Nível de Risco** | • `LOW` / `MEDIUM`: Botão primário ativo por padrão.<br>• `HIGH`: Exige marcação de Checkbox explícito de confirmação de escopo.<br>• `CRITICAL`: Exige digitação exata de palavra/token de confirmação (ex: `CONFIRMAR`). |
| **RF-03** | **Guardrails de Botão e Estilo** | • Botão primário destrutivo em tom `destructive` (vermelho semântico).<br>• Proibição estrita de tons Indigo/Violeta (`assertButtonClassesAllowed`).<br>• Sem auto-submit ou ações ambíguas. |
| **RF-04** | **Recibo Auditável Pós-Execução** | Ao concluir a ação, exibe o `ActionReceiptView` com o status do recibo (`SUCCESS`, `FAILED`, `INCONCLUSIVE`, `KILLED`), badge de estado semântico (`AiSemanticBadge`), ID de auditoria navegável e próxima ação recomendada. |
| **RF-05** | **Governança & Policy Banners** | Integração do `PolicyDecisionBanner` (`allowed`, `denied`, `conditioned`, `blocked`) e medidor visual `BudgetMeter` mostrando percentual e consumo da cota de orçamento. |
| **RF-06** | **Acessibilidade e Responsividade** | Navegação por teclado, leitor de tela (`aria-live`, `aria-describedby`, focus trap), suporte a zoom de 200%, reduced motion e temas Light/Dark. |

---

## 3. Arquitetura de Componentes (`@domus/ui`)

### 3.1 `ActionReviewDialog`
Componente modal principal baseado em `@radix-ui/react-dialog`.

```typescript
export interface ActionRequestPayload {
  id: string;
  intent: string;
  targetSystem: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redactedParams: Record<string, string>;
  affectedScope: string[];
  requiredApproval?: string;
  policyDecision: 'allowed' | 'denied' | 'conditioned' | 'blocked';
  policyReason?: string;
  budgetUsage?: { used: number; limit: number };
  isDestructive?: boolean;
}

export interface ActionReviewDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  actionRequest: ActionRequestPayload;
  onConfirm: (confirmToken?: string) => Promise<ActionReceiptPayload> | ActionReceiptPayload;
  onClose?: () => void;
}
```

### 3.2 `ActionConfirmationGate`
Subcomponente de segurança responsável por aplicar as travas de confirmação consciente conforme o nível de risco:
- `LOW` / `MEDIUM`: Habilita o botão imediatamente.
- `HIGH`: Habilita apenas após o usuário marcar a caixa `<input type="checkbox">` declarando conhecimento do escopo.
- `CRITICAL`: Habilita apenas após o usuário digitar a palavra de confirmação exigida no campo `<input type="text">`.

### 3.3 `ActionReceiptView`
Subcomponente de exibição de resultado final pós-execução:
```typescript
export interface ActionReceiptPayload {
  receiptId: string;
  correlationId: string;
  status: 'SUCCESS' | 'FAILED' | 'INCONCLUSIVE' | 'KILLED';
  semanticState: AiSemanticState;
  executedAt: string;
  summary: string;
  auditUrl?: string;
  nextAction?: { id: string; label: string; onClick?: () => void };
}
```

### 3.4 Refatoração de `PolicyDecisionBanner` e `BudgetMeter`
- `PolicyDecisionBanner`: Apresenta visualmente os 4 estados de decisão com ícones Lucide (`ShieldCheck`, `ShieldX`, `ClockAlert`), fundo semântico e descrição.
- `BudgetMeter`: Exibe barra de progresso HTML5 `<progress>` com valores numéricos (`used` de `limit`), alternando cor de alerta se `used / limit >= 0.8`.

---

## 4. Matriz de Acessibilidade (WCAG 2.1 AA)

| Recurso | Estratégia |
|---|---|
| **Focus Management** | Radix UI captura o foco ao abrir e retorna ao fechar. Foco inicial vai para o primeiro elemento interativo ou campo de confirmação. |
| **Leitores de Tela** | `aria-live="polite"` nos avisos de erro de token e nas atualizações de estado do recibo; `role="dialog"`, `DialogTitle` e `DialogDescription`. |
| **Navegação Teclado** | Tecla `Esc` fecha o modal; `Tab` / `Shift+Tab` percorrem os controles; `Space` marca o checkbox; `Enter` submete o formulário quando o botão estiver habilitado. |
| **Zoom & Layout** | Flexbox/Grid fluido sem tamanhos fixos em pixels para não quebrar a 200% de zoom no navegador. |
| **Reduced Motion** | Animações CSS com `@media (prefers-reduced-motion: reduce)` desabilitando transições e sombras pulsantes. |

---

## 5. Estratégia de Testes e Validação

1. **Testes Unitários de Componentes (`packages/ui/test/action-review.test.tsx`)**:
   - Renderização correta de todos os campos do `ActionRequestPayload`.
   - Teste do travamento do botão no nível `HIGH` (desabilitado até marcar checkbox).
   - Teste do travamento do botão no nível `CRITICAL` (desabilitado até digitar o termo correto).
   - Verificação de erro no `assertButtonClassesAllowed` se botões Indigo/Violeta forem injetados.
   - Transição da Dialog para a exibição de `ActionReceiptView` pós-confirmação.

2. **Testes de Acessibilidade (`axe-core`)**:
   - Validação sem violações críticas WCAG 2.1 AA nos temas Light e Dark.

3. **Validação de Build**:
   - `pnpm --filter @domus/ui build` e `pnpm --filter @domus/ui test`.

---

## 6. Documentação de Evidências

Ao finalizar a execução dos testes e implementação, será gerado o relatório `docs/evidence/V1-605-verificacao.md`.
