# Runbook de Alta Disponibilidade, Failover e Disaster Recovery do Gateway (V1-902)

## 1. Visão Geral

Este documento estabelece o procedimento operacional padrão para garantir Alta Disponibilidade (HA), degradação segura com comportamento *fail-closed*, failover entre instâncias *stateless* e plano de Disaster Recovery (DR) do Gateway de Modelos e Ações da plataforma **DomusCorp**.

---

## 2. Probes de Saúde e Arquitetura HA

O gateway opera em modo *stateless* com múltiplas instâncias atrás de um balanceador de carga ou Ingress Kubernetes, expondo três endpoints de saúde:

| Probe | Endpoint | Objetivo | Comportamento em Sucesso | Comportamento em Falha |
|---|---|---|---|---|
| **Liveness** | `GET /health/liveness` | Verifica se o processo está em execução e responsivo. | `200 OK` `{ status: "ok" }` | Falha do container (restart pod) |
| **Readiness** | `GET /health/readiness` | Verifica se dependências críticas de segurança estão funcionais. | `200 OK` `{ ready: true, status: "ok" }` | `503 Service Unavailable` (remove tráfego) |
| **HA Status** | `GET /health/gateway` | Exibe o nó ativo, estado do fail-closed e estatísticas de carga. | `200 OK` `{ nodeId: "...", failClosedEnforced: true }` | `503 Service Unavailable` |

---

## 3. Procedimento de Failover entre Instâncias Stateless

### 3.1 Manutenção de Contexto e Correlação
1. Toda requisição que atravessa o gateway carrega e preserva o atributo de correlação `request_id` (cabeçalho HTTP `x-request-id` ou UUID derivado).
2. Durante o redirecionamento de tráfego de uma instância com falha (*node alpha*) para uma instância saudável (*node beta*), o `request_id` permanece inalterado em todos os logs, traces OpenTelemetry e eventos de auditoria.

### 3.2 Proteção de Segredos e Políticas
- Nenhum segredo em texto plano (chaves de API do provedor LLM, tokens Vault, segredos OAuth) é compartilhado ou retornado em respostas.
- O cache de políticas efetivas permanece isolado por sessão/workspace e não pode ser reaberto pelo cliente no nó de destino.

---

## 4. Matriz de Comportamento Fail-Closed sob Perda de Dependência

Quando qualquer serviço crítico de autorização ou segurança ficar indisponível, o gateway obrigatoriamente aplica o princípio **Fail-Closed** (bloqueio total seguro com código HTTP 503):

| Dependência Perdida | Endpoint Afetado | Resposta do Gateway | Código HTTP | Impacto de Segurança |
|---|---|---|---|---|
| **Provedor de Autorização** | `/v1/model/responses`, `/v1/mcp/tools/execute` | Bloqueia todas as requisições | `503 Service Unavailable` | Impede chamadas não autenticadas |
| **Policy Engine** | `/v1/model/responses`, `/v1/model/responses/stream` | Bloqueia todas as requisições | `503 Service Unavailable` | Impede bypass de políticas |
| **Budget Ledger / Redis** | `/v1/model/responses` | Bloqueia novas alocações | `503 Service Unavailable` | Evita consumo descontrolado |
| **Vault / Credenciais** | `/v1/mcp/tools/execute`, `/v1/model/responses` | Bloqueia execução de ferramentas | `503 Service Unavailable` | Impede uso sem credencial ativa |

---

## 5. Plano de Disaster Recovery (DR) e Matriz RTO/RPO

### 5.1 Metas de Resiliência
* **RTO (Recovery Time Objective):** $\le 15\text{ minutos}$ ($900\text{ s}$) para restauração completa de tráfego do gateway.
* **RPO (Recovery Point Objective):** $\le 1\text{ hora}$ ($3600\text{ s}$) para sincronização de estado do ledger e auditoria.

### 5.2 Fluxo de Execução do DR
1. **Isolamento de Tráfego:** Desviar o Ingress para a página de manutenção *fail-closed*.
2. **Substituição de Nós Stateless:** Reiniciar ou instanciar novos pods/nós do gateway com a versão de código aprovada.
3. **Validação Pré-flight de Não-Bypass Security:** Executar o script de auditoria antes de reabrir o Ingress:
   ```bash
   .venv/bin/python scripts/gateway_dr.py audit-fail-closed
   ```
4. **Validação de Recuperação:** Executar o comando de recuperação e verificação de SLOs:
   ```bash
   .venv/bin/python scripts/gateway_dr.py recover --incident-id INC-GW-REC-01 --target-node gateway-node-beta
   ```
5. **Reabertura de Tráfego:** Redirecionar Ingress para a nova instância validada e verificar readiness probe (`GET /health/readiness`).

---

## 6. Referência de Comandos da CLI de Operação

```bash
# 1. Checar estado das probes do gateway
.venv/bin/python scripts/gateway_dr.py probes

# 2. Simular e validar failover stateless preservando correlação
.venv/bin/python scripts/gateway_dr.py failover --failed-node node-a --target-node node-b --request-id req-12345

# 3. Auditar aplicação estrita de fail-closed em todas as dependências
.venv/bin/python scripts/gateway_dr.py audit-fail-closed

# 4. Executar rotina de Disaster Recovery com validação de não-bypass
.venv/bin/python scripts/gateway_dr.py recover --incident-id INC-INCIDENTE-ID
```

---

## 7. Matriz de Contato e Responsáveis SRE / Segurança

* **On-Call SRE Lead:** `sre-team@domuscorp.com`
* **Lead Security Engineer:** `security@domuscorp.com`
* **Incident Coordinator:** `incident-commander@domuscorp.com`
