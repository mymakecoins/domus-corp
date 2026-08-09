# Evidência de verificação — V1-403

## Entrega

- domínio Python de admissão, quarentena, retenção, exclusão em duas fases e restore;
- spool limitado em memória, SHA-256 e object keys sem nomes/PII;
- scanner determinístico com EICAR e object store em memória para testes;
- adapter S3 compatível por client injetado, conditional put, VersionId, SSE e leitura exata;
- metadata PostgreSQL imutável, role isolada, RLS, auditoria e outbox;
- quatro contratos 2.11.0 e evento AsyncAPI sem conteúdo ou URL;
- débitos externos de MinIO/KMS/scanner e infraestrutura.

## Provas

- pytest cobre objeto limpo, EICAR, idempotência, hash divergente, media type, legal hold, adulteração, restore e deleção verificada;
- mypy strict e ruff validam o Knowledge Plane;
- testes de repositório provam metadata/auditoria/outbox na mesma transação e rollback;
- testes de migração provam RLS, role sem BYPASSRLS, imutabilidade, lineage e rollback;
- catálogo completo usa fixtures válidas e negativas;
- `scripts/verify.sh` registra o gate integral antes do encerramento.
