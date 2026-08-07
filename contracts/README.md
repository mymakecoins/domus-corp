# Catálogo de contratos cross-runtime

Este diretório é a fonte canônica das interfaces entre serviços TypeScript e Python. Classes, DTOs ou modelos nativos de runtime são derivados destes arquivos e não constituem contratos de integração.

## Layout e versão

- `json-schema/v1/`: payloads compartilhados, em JSON Schema 2020-12;
- `openapi/v1/openapi.json`: operações HTTP internas, em OpenAPI 3.1;
- `asyncapi/v1/asyncapi.json`: eventos e jobs, em AsyncAPI 3.0;
- `examples/v1/{valid,invalid}/`: fixtures sintéticas de contrato;
- `PROTOCOLS.md`: mapeamento das setas cross-runtime e semântica de transporte;
- `CHANGELOG.md`: histórico e janela de compatibilidade.

`v1` é a versão major do contrato. O campo `schema_version` identifica a versão exata do payload. Consumidores devem rejeitar major desconhecida e campos desconhecidos; ausência, erro ou versão desconhecida de campos de autoridade deve falhar de forma fechada.

## Invariantes

Todo payload cross-runtime contém `request_id`, `tenant_id`, `workspace_id`, `policy_version`, `classification` e `provenance`. `budget_scope` é obrigatório nos contratos que admitem custo (`ActionRequest`, `UsageLedger` e chamadas de modelo). Python pode reduzir `allowed_sources`, capacidades, classificação máxima e orçamento recebidos, nunca ampliá-los.

Dados de autenticação e segredos não pertencem aos payloads. Identidade de workload e autenticação são controles de transporte; os identificadores do envelope servem a escopo, correlação e auditoria e não concedem autorização.

## Validação local

```bash
python3 tests/contracts/validate_contracts.py
```

O teste verifica documentos JSON, referências locais, metadados das especificações, fixtures válidas e rejeição das inválidas. A suíte completa de compatibilidade e geração por runtime pertence à V1-801/V1-004.
