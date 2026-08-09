# Evidência local — V1-102

## Estado

Implementação local concluída; revisão humana de Backend/DBA/Segurança permanece obrigatória antes do encerramento formal ou promoção.

## Cobertura

- contratos 1.3.0 de workspace, membership e eventos de tenancy;
- papel administrativo ativo e tenant-bound resolvido pelo servidor;
- workspace imutável com owner, domínio, policy, classificação, status e versão;
- CRUD de criação, arquivamento e membership com outbox transacional;
- matriz de papéis, clearance e restrição monotônica de classificação;
- RLS de tenant/workspace, incluindo administração sem atravessamento de tenant;
- payload do cliente não pode sobrescrever tenant, usuário, sessão ou dispositivo.

## Evidência

- 49 testes TypeScript, incluindo bypass de payload e fail-closed;
- quatro testes estruturais da migração V1-102;
- PostgreSQL 16.9 real: aplicação 000001→000003, isolamento tenant/workspace/role, bloqueio de DDL e rollback 000003→000001;
- 19 schemas e 38 fixtures válidas/negativas;
- gate integral em `scripts/verify.sh`, auditoria de dependências e `git diff --check`.

## Limites

`policy_id` não concede autorização. A V1-103 deve materializar e avaliar a `EffectivePolicy`. Débitos de ambiente estão em `docs/debt/V1-102-external-administration.md`.
