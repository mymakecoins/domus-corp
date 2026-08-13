# Relatório de Evidências de Validação — V1-902

**Issue:** `V1-902` — Implementar alta disponibilidade, degradação segura e recuperação do gateway  
**Marco:** `M5`  
**Prioridade:** `P0`  
**Rastreabilidade:** `RF-041`; `H-033`  
**Data:** 2026-08-12  
**Status:** `APROVADO`  

---

## 1. Resumo da Execução

A issue **V1-902** foi implementada com rigor seguindo a metodologia **Test-Driven Development (TDD)**. Foram desenvolvidos os mecanismos de alta disponibilidade, probes de saúde, failover entre instâncias stateless, imposição de comportamento *fail-closed* perante indisponibilidade de dependências críticas (Vault, Policy Engine, Budget Ledger, Autorização), e o plano automatizado de Disaster Recovery do gateway atendendo as metas de RTO ($\le 15\text{ min}$) e RPO ($\le 1\text{ hora}$) com validação pré-flight de não-bypass de segurança.

---

## 2. Critérios de Aceite e Verificação

### AC1 — Failover Stateless e Preservação de Correlação e Segredos
- **Requisito:** Falhas de instâncias stateless são detectadas pelas probes e o tráfego é roteado para instâncias saudáveis mantendo `request_id`, segredos e políticas.
- **Evidência:**
  - `apps/control-plane/test/gateway-ha-dr.test.mjs`: Teste de failover stateless entre `appNode1` e `appNode2` validando que a correlação `request_id` (cabeçalho `x-request-id`) é preservada e os segredos acessados no Vault continuam mascarados (`[REDACTED_SECRET]`).
  - `apps/knowledge-api/tests/test_v1_902_gateway_dr.py::test_failover_preserves_request_correlation_and_secrets`: Passou em `0.03s`.

### AC2 — Comportamento Fail-Closed sob Perda de Dependências
- **Requisito:** Perda de Autorização, Policy Engine, Budget Ledger ou Vault bloqueia chamadas em modo *fail-closed* sem permitir bypass.
- **Evidência:**
  - `apps/control-plane/test/gateway-ha-dr.test.mjs`: Testes negativos validando que perdas de Vault, Policy, Budget e Autorização retornam HTTP 503 com código `GATEWAY_DEPENDENCY_UNAVAILABLE`.
  - `scripts/gateway_dr.py audit-fail-closed`: Executado no CLI confirmando aplicação estrita do bloqueio para 100% dos cenários de indisponibilidade.

### AC3 — Disaster Recovery, RTO/RPO e Validação Não-Bypass
- **Requisito:** Plano de recuperação documentado e automatizado atendendo RTO ($\le 15$ min) e RPO ($\le 1$ hr) com validação de não-bypass antes da liberação de tráfego.
- **Evidência:**
  - Runbook oficial: [`docs/runbooks/V1-902-gateway-ha-dr-and-failover-plan.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/docs/runbooks/V1-902-gateway-ha-dr-and-failover-plan.md).
  - CLI Script: [`scripts/gateway_dr.py`](file:///home/mmc/00_code/domus-app-suite/domus-corp/scripts/gateway_dr.py) executando `recover` e `audit-fail-closed`.
  - Exceção `NonBypassValidationError`: Garante que qualquer rota desprotegida ou falha no validador pré-flight aborta imediatamente o processo de recuperação e impede a reabertura do tráfego.

---

## 3. Resultados das Suítes de Testes

### 3.1 Control Plane (Node.js Test Runner)
```bash
pnpm --filter @domus/control-plane test
```
- **Resultado:** 205 passou, 0 falhou (incluindo as 8 novas asserções de HA/DR e Probes).

### 3.2 Knowledge API & Resiliência (Pytest)
```bash
.venv/bin/pytest apps/knowledge-api/tests/test_v1_902_gateway_dr.py
```
- **Resultado:** 6 passou em 0.03s.

### 3.3 CLI de Disaster Recovery
```bash
.venv/bin/python scripts/gateway_dr.py audit-fail-closed
.venv/bin/python scripts/gateway_dr.py recover --incident-id INC-GW-TEST-01
```
- **Resultado:** Retornou exit code 0 com RTO de 120s, RPO de 300s e validação de não-bypass APROVADA.

---

## 4. Artefatos Criados e Modificados

1. [`apps/control-plane/src/app.ts`](file:///home/mmc/00_code/domus-app-suite/domus-corp/apps/control-plane/src/app.ts) — Suporte a probes `/health/liveness`, `/health/readiness` e `/health/gateway`.
2. [`apps/control-plane/test/gateway-ha-dr.test.mjs`](file:///home/mmc/00_code/domus-app-suite/domus-corp/apps/control-plane/test/gateway-ha-dr.test.mjs) — Suíte de testes TDD em TypeScript para probes, failover e fail-closed.
3. [`apps/knowledge-api/src/domus_knowledge/gateway_ha_dr.py`](file:///home/mmc/00_code/domus-app-suite/domus-corp/apps/knowledge-api/src/domus_knowledge/gateway_ha_dr.py) — Módulo central de HA, failover, fail-closed e recuperação do gateway.
4. [`apps/knowledge-api/tests/test_v1_902_gateway_dr.py`](file:///home/mmc/00_code/domus-app-suite/domus-corp/apps/knowledge-api/tests/test_v1_902_gateway_dr.py) — Suíte de testes Python para o módulo HA/DR.
5. [`scripts/gateway_dr.py`](file:///home/mmc/00_code/domus-app-suite/domus-corp/scripts/gateway_dr.py) — CLI de automação operacional de Disaster Recovery e probes.
6. [`docs/runbooks/V1-902-gateway-ha-dr-and-failover-plan.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/docs/runbooks/V1-902-gateway-ha-dr-and-failover-plan.md) — Runbook operacional SRE/Segurança.
7. [`scripts/release_gate_g7.py`](file:///home/mmc/00_code/domus-app-suite/domus-corp/scripts/release_gate_g7.py) — Atualização da matriz de rastreabilidade do Gate G7 (`RF-041`, `P0_ISSUES`).
