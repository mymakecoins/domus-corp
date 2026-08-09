# Evidência de verificação — V1-402

## Entrega

- interface `SourceConnector`, descriptor e double determinístico;
- validação de referência Vault, escopos mínimos, classificação e ACL de origem;
- lease/fencing, cursor CAS, dedupe transacional e backoff/dead-letter;
- migração PostgreSQL com RLS forçado e pausa por inelegibilidade da fonte;
- cinco JSON Schemas, jobs/eventos AsyncAPI e catálogo 2.10.0;
- estado de conexão e ações seguras no painel administrativo;
- guia de adapters e débitos externos.

## Provas

- testes de domínio cobrem paginação, cancelamento, ACL, dedupe, retry, lease e fencing;
- testes de repositório cobrem aquisição atômica, outbox e rollback de fence inválido;
- testes de migração cobrem RLS, constraints, ausência de tokens e reversibilidade;
- fixtures válidas/negativas exercitam todo o catálogo cross-runtime;
- `scripts/verify.sh` registra o resultado integral antes do encerramento.
