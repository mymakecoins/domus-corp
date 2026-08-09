# Evidência de verificação — V1-401

## Escopo entregue

- domínio e aplicação do Source Registry com validações, workflow de owner e elegibilidade derivada;
- API administrativa fail-closed, sem autoridade de tenant/workspace no cliente;
- PostgreSQL com constraints, concorrência otimista, RLS forçado, auditoria e outbox atômicas;
- pausa automática de fontes ativas quando o owner perde membership ou clearance;
- contratos JSON Schema 2.9.0, OpenAPI e AsyncAPI 3.0;
- shell React/TypeScript `apps/admin`, reutilizando `@domus/ui` e indisponível sem sessão segura;
- débitos de ambientes externos registrados separadamente.

## Verificações

- `pnpm --filter @domus/control-plane test`: domínio, aplicação, HTTP e regressão do Control Plane;
- `pnpm --filter @domus/admin test`: sessão ausente fail-closed e renderização de estado governado;
- `pnpm --filter @domus/admin build`: bundle web e typecheck;
- `python3 tests/contracts/validate_contracts.py`: catálogo completo, fixtures e referências;
- `python3 -m unittest tests.migrations.test_v1_401_source_registry -v`: constraints, RLS, eventos e rollback;
- `python3 scripts/check-migrations.py`: par reversível e manifesto governado;
- `scripts/verify.sh`: gate integral do monorepo (registrar resultado final antes do encerramento).

## Revisão humana requerida

DBA, Segurança e Knowledge Product revisam a migração e semântica de owner/classificação antes de promoção. UX valida o painel em ambiente de integração quando a configuração OIDC existir; essa configuração não é decisão de desenvolvimento.
