# Evidência local — V1-101

## Estado

Baseline local implementada. Integrações de ambientes externos permanecem como débitos registrados e não são declaradas validadas.

## Cobertura

- contratos separados de identidade, sessão, contexto, eventos e erros;
- domínio imutável, dispositivo monotônico e sessão de tenant único;
- OIDC genérico com discovery/JWKS, `RS256`/`ES256`, issuer/audience e fail-closed;
- PostgreSQL com nove tabelas IAM, vínculos tenant-bound, RLS forçado e migração reversível;
- registro de dispositivo, sessão, logout, revogação e outbox transacionais;
- Redis versionado com falha fechada;
- rotas Fastify para registro, sessão, logout e revogação, sem confiar em tenant/ator do payload;
- redaction: token e subject externo não aparecem em resposta ou erro.

## Evidência

- 14 schemas e 28 fixtures válidas/negativas;
- 31 testes TypeScript;
- seis testes estruturais de migração;
- teste PostgreSQL real de isolamento, multi-tenant e rollback em Compose efêmero;
- `scripts/verify.sh`, `git diff --check` e `pnpm audit --prod`.

## Débitos externos

Consultar `docs/debt/V1-101-external-environments.md`. Esses débitos bloqueiam promoção externa, não a baseline de desenvolvimento.

## Limite local ainda aberto

O fluxo de registro exige prova de posse antes da persistência e expõe essa verificação como porta obrigatória. O formato criptográfico da prova, emissão/consumo de challenge e vínculo com a chave pública ainda não possuem contrato aprovado. Um double prova a ordem e o comportamento negativo, mas não substitui o verificador criptográfico. Esse ponto impede declarar a V1-101 encerrada; não é decisão de ambiente externo.

## Aprovações

Design, contratos, parâmetros operacionais, persistência e dependências foram aprovados por Marcos Wasem durante a execução. O registro não substitui revisão final do diff antes do merge.
