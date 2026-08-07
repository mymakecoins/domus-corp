# Protocolos das fronteiras cross-runtime

| Fluxo | Produtor → consumidor | Protocolo | Contratos |
|---|---|---|---|
| Contexto efetivo | Harness/Policy TS → Retrieval, Ingestion e Intelligence Python | HTTPS/OpenAPI | `EffectivePolicy`, `ContractError` |
| Ingestão | Source Registry TS → worker Python | job/outbox AsyncAPI | `KnowledgeAsset`, `DomainEvent`, `ContractError` |
| Recuperação | Harness TS → Retrieval Python | HTTPS/OpenAPI | `EffectivePolicy`, `Evidence`, `ContractError` |
| Inteligência | Intelligence Python → Harness TS | HTTPS/OpenAPI + evento | `Claim`, `Insight`, `DomainEvent`, `ContractError` |
| Modelo hospedado | Python → Model Gateway TS | HTTPS/OpenAPI | envelope, `EffectivePolicy`, `UsageLedger`, `ContractError` |
| Proposta de ação | Intelligence Python → Action Gateway TS | HTTPS/OpenAPI | `ActionRequest`, `ContractError` |
| Contabilização | Model/Action Gateway TS → Usage & Budget TS | serviço interno + outbox | `UsageLedger`, `DomainEvent`, `ContractError` |

## Regras de transporte e consumo

1. HTTPS interno exige identidade de workload; eventos/jobs usam outbox transacional e entrega pelo menos uma vez.
2. `request_id` é preservado em retries e eventos derivados. Operações mutáveis exigem ainda uma chave de idempotência de negócio.
3. Consumidor valida o payload antes de qualquer efeito. Schema, major, policy, tenant/workspace, classificação ou proveniência ausente/desconhecida bloqueia o processamento e gera erro tipado, sem fallback permissivo.
4. Retry só ocorre quando `ContractError.retryable` for verdadeiro, com limite e backoff. Erro de contrato, versão, policy, budget ou confirmação não é corrigido por retry cego.
5. Eventos duplicados são deduplicados por `event_id`; ordenação global não é presumida. O estado autoritativo permanece no PostgreSQL.
6. Logs e traces conservam identificadores de correlação, mas devem redigir conteúdo, parâmetros, PII e segredos conforme classificação.

Os endpoints do catálogo representam fronteiras lógicas. Descoberta de serviço, mTLS, timeout e políticas de rede serão concretizados em V1-006; isso não altera a semântica fail-closed destes contratos.
