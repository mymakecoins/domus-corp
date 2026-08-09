# Evidência local — V1-101

## Estado

Baseline local implementada. Integrações de ambientes externos permanecem como débitos registrados e não são declaradas validadas.

## Cobertura

- contratos 1.2.0 separados de identidade, sessão, contexto, challenge, registro, eventos e erros;
- domínio imutável, dispositivo monotônico e sessão de tenant único;
- OIDC genérico com discovery/JWKS, `RS256`/`ES256`, issuer/audience e fail-closed;
- PostgreSQL com nove tabelas IAM, vínculos tenant-bound, RLS forçado e migração reversível;
- registro de dispositivo, sessão, logout, revogação e outbox transacionais;
- Redis versionado com falha fechada;
- rotas Fastify para registro, sessão, logout e revogação, sem confiar em tenant/ator do payload;
- redaction: token e subject externo não aparecem em resposta ou erro.

## Evidência

- 16 schemas e 32 fixtures válidas/negativas;
- 37 testes TypeScript;
- seis testes estruturais de migração;
- teste PostgreSQL real de isolamento, multi-tenant e rollback em Compose efêmero;
- `scripts/verify.sh`, `git diff --check` e `pnpm audit --prod`.

## Débitos externos

Consultar `docs/debt/V1-101-external-environments.md`. Esses débitos bloqueiam promoção externa, não a baseline de desenvolvimento.

## Prova de posse

O protocolo aprovado usa chave pública P-256, JWS `ES256`, challenge de 256 bits com TTL de 120 segundos, audiência e finalidade fixas, tolerância de relógio de 60 segundos e consumo único atômico no Redis. O servidor deriva o thumbprint RFC 7638; replay, chave privada no JWK, algoritmo divergente, vínculo inválido, expiração ou indisponibilidade falham fechados.

## Aprovações

Design, contratos, parâmetros operacionais, persistência e dependências foram aprovados por Marcos Wasem durante a execução. O registro não substitui revisão final do diff antes do merge.
