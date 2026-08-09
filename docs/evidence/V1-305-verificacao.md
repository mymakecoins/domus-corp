# Evidência local — V1-305

## Estado

Implementação de desenvolvimento concluída. FinOps, DBA e Segurança devem revisar parâmetros e operação antes de qualquer promoção externa.

## Cobertura

- reservas cumulativas em até cinco escopos com valores `bigint` em unidades menores;
- idempotência vinculada ao fingerprint da intenção e TTL de 15 minutos;
- locks PostgreSQL em ordem estável, ledger e reconciliação vinculada ao recibo;
- overage registrado sem apagar custo real, com bloqueio e estado `RECONCILIATION_REVIEW`;
- contrato `BudgetReservationDecision` 2.3 usa strings decimais no transporte cross-runtime;
- tabelas tenant-scoped com RLS forçado e rollback governado.

## Evidência

- testes de domínio/aplicação para limites, duplicidade, indisponibilidade, reconciliação e overage;
- validação integral de contratos e migrações;
- aplicação e rollback da cadeia 000001→000008 em PostgreSQL local;
- gate integral, auditoria de dependências e `git diff --check`.

## Limites

A definição de budgets, moedas, alertas e integrações de ambientes externos permanece dívida explícita em `docs/debt/V1-305-external-budget.md`.
