# Runbook de Observabilidade, SLOs e Resposta a Incidentes (V1-901)

## 1. Visão Geral

Este documento estabelece o procedimento operacional padrão para instrumentação de observabilidade via OpenTelemetry, monitoramento dos Service Level Objectives (SLOs) em 5 domínios críticos da plataforma Domus Corp, e resposta auditável a incidentes com mecanismos de contenção automatizada.

### Domínios Cobertos
1. **Gateway**: Egress de modelos LLM, validação de políticas e controle de orçamento.
2. **Streaming**: Transmissão Server-Sent Events (SSE), tempo para primeiro token (TTFT).
3. **Retrieval**: Busca híbrida (vetorial Qdrant + full-text PostgreSQL), alinhamento de ACL/RLS.
4. **Ingestão**: Extração, parsing, escaneamento de malware e normalização de documentos.
5. **Ações**: Action Gateway e execução de ferramentas externas via MCP (Model Context Protocol).

---

## 2. Diretrizer de Redação de Telemetria (Redaction Engine)

Toda telemetria (métricas, logs e traces) exportada via OpenTelemetry DEVE ser correlacionada pelo cabeçalho ou atributo de contexto `request_id`.

### Regra de Ouro da Privacidade e Segurança
- **Segredos**: NENHUMA chave de API (`api_key`, `client_secret`), token OAuth/JWT, senha ou credencial Vault pode ser gravada em texto plano.
- **PII (Dados Pessoais)**: E-mails, CPFs, números de cartão e identificadores pessoais devem ser mascarados automaticamente como `[REDACTED_PII]`.
- **Comportamento do Processor**: O processor de redação atua de forma defensiva antes da serialização ou transmissão do payload para o collector.

---

## 3. Matriz de SLOs e Alertas por Domínio

| Domínio | Métrica Chave | Limiar (SLO) | Severidade | Owner | Runbook Section |
|---|---|---|---|---|---|
| **Gateway** | Latência p95 (`latency_p95_ms`) | $\le 300\text{ ms}$ | P0 | SRE / Gateway Team | `#gateway-slo` |
| **Streaming** | TTFT p95 (`ttft_p95_ms`) | $\le 200\text{ ms}$ | P1 | Harness & Streaming Team | `#streaming-slo` |
| **Retrieval** | Taxa de Erro (`error_rate_pct`) | $\le 1.0\%$ | P0 | Knowledge & Retrieval Team | `#retrieval-slo` |
| **Ingestão** | Tempo de Proc. (`avg_processing_sec`) | $\le 5.0\text{ s}$ | P1 | Data Pipeline Team | `#ingestion-slo` |
| **Ações** | Taxa de Falha MCP (`error_rate_pct`) | $\le 0.5\%$ | P0 | Action & MCP Gateway Team | `#actions-slo` |

### Alertas de Violação de SLO
Todo alerta gerado obrigatoriamente contém:
- `owner`: Equipe responsável pelo serviço.
- `severity`: P0 (Crítico), P1 (Alto), P2 (Médio).
- `impact`: Descrição clara do impacto percebido pelos usuários ou serviços.
- `runbook_url`: Link direto para as instruções de mitigação.

---

## 4. Procedimentos de Contenção de Incidentes

Em caso de violação de SLO crítica (P0) ou comportamento anômalo com risco de exfiltração/estouro de custos, o operador on-call ou o motor automatizado de resposta pode acionar as seguintes ações de contenção:

1. **`CIRCUIT_BREAKER_TRIP`**: Desarma o envio de novas requisições ao provedor ou serviço afetado, retornando fallback seguro fail-closed.
2. **`WORKSPACE_ISOLATION`**: Isolamento temporário do workspace/tenant para conter estouro de quota ou comportamentos adversariais.
3. **`SECRET_FREEZE`**: Congelamento imediato e revocação de tokens/chaves de API expostos ou comprometidos.
4. **`BACKPRESSURE_SHEDDING`**: Descarte de requisições de baixa prioridade em cenários de saturação de pool ou CPU.
5. **`EGRESS_CONTAINMENT`**: Bloqueio de chamadas externas de ferramentas MCP sem recibo prévio de aprovação humana.

---

## 5. Timeline Auditável e Análise de Causa Raiz (RCA)

Cada incidente gera um registro imutável com timeline estruturada contendo:
- `INCIDENT_OPENED`: Registro inicial com escopo e severidade.
- `CONTAINMENT_EXECUTED`: Ações de contenção ativadas com carimbo de data/hora e status de execução.
- `COMMUNICATION_DISPATCHED`: Logs de comunicação com stakeholders e canal de engenharia.
- `INCIDENT_RESOLVED`: Resolução documentada e validação de recuperação.
- `RCA`: Relatório de Análise de Causa Raiz contendo fatores contribuintes, prazos de remediação e plano preventivo auditável.
