# Evidência local — V1-302

## Estado

Implementação de desenvolvimento concluída. Segurança, DevOps e DBA devem revisar políticas, identidade de workload e operação antes de qualquer promoção externa.

## Cobertura

- credenciais versionadas nos estados `PENDING`, `ACTIVE` e `REVOKED`, sem reativação;
- uma única versão ativa por provider e substituição sob lock transacional;
- PostgreSQL limitado a metadados e referência lógica opaca;
- segredo usado just-in-time dentro de callback efêmero, com rejeição de retorno contaminado;
- adapter Vault KV v2 com token de workload por arquivo, escopo mínimo e timeouts de 2/5 segundos;
- cadastro, teste sintético, ativação/rotação, revogação e cleanup pendente auditável;
- falha de repositório, Vault, teste, referência, timeout ou revogação resulta em bloqueio.

## Evidência

- testes TypeScript de domínio, aplicação, persistência e adapter;
- testes estruturais de migração e limites contra vazamento;
- PostgreSQL 16 real com aplicação 000001→000005, separação RLS entre admin/gateway, revogação e rollback;
- Vault 1.20.4 efêmero com policy real: gateway leu a versão autorizada e teve escrita negada;
- validação integral em `scripts/verify.sh`, auditoria de dependências e `git diff --check`.

## Limites

A V1-302 fornece as portas para a V1-301, mas não implementa egress, catálogo, roteamento, budget ou redaction de payload. Decisões externas estão em `docs/debt/V1-302-external-vault.md`.
