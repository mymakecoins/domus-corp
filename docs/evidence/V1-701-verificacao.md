# Evidência local — V1-701

## Estado

Baseline de governança de schema implementada localmente. Aprovação humana de DBA e Segurança permanece gate de encerramento; integrações externas estão registradas como débitos de promoção.

## Cobertura

- manifesto versionado com issue, impacto, risco, owner, revisores e rollback;
- versões contíguas, pares `up`/`down` e transações obrigatórias;
- rejeição de DDL destrutivo em `up` e de tabela sensível sem `tenant_id`;
- exceções de tabelas globais explícitas;
- runner genérico, idempotente por `schema_migrations` e ordenado;
- rollback inverso limitado explicitamente a local/CI;
- role runtime sem `BYPASSRLS`, DDL ou grants amplos;
- RLS fail-closed e testes cross-tenant/cross-workspace.

## Evidência executável

- cinco testes unitários específicos de governança de migrações;
- seis testes estruturais da migração IAM;
- aplicação, verificação e rollback completos em PostgreSQL 16.9 efêmero;
- tentativa de `CREATE TABLE` sob `domus_identity_runtime` rejeitada pelo PostgreSQL;
- `scripts/verify.sh`, auditoria de dependências e `git diff --check` como gate final.

## Limites

O runner local não concede autoridade para DDL externo. Os itens de `docs/debt/V1-701-external-database-governance.md` bloqueiam promoção, não desenvolvimento.
