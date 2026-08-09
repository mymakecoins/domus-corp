# Evidência local — V1-103

## Estado

Implementação local concluída e gate G2 aprovado pelo responsável humano em 2026-08-09. Revisões especializadas de Backend, DBA e Segurança continuam obrigatórias antes de promoção externa.

## Cobertura

- contrato `EffectivePolicy` 2.0.0 aprovado, explícito e imutável por requisição;
- composição monotônica de exatamente uma camada publicada por escopo global, tenant, workspace e role;
- interseção de permissões, menor limite numérico e habilitação de insights apenas por consenso;
- resolução server-side, sem concessão por campos enviados pelo cliente;
- negação rastreável para camada ausente, duplicada, conflitante ou inválida e para falha de dependência, cache ou revogação;
- cache Redis com validade máxima de cinco minutos e vínculo completo ao contexto de segurança;
- persistência das camadas publicadas e da decisão auditável sob RLS.

## Evidência

- testes unitários e HTTP da composição, resolução, cache e comportamento fail-closed;
- testes estruturais da migração V1-103 e do manifesto governado;
- PostgreSQL 16 real: aplicação da migração 000004 e verificação de RLS sem contexto e com ator elegível;
- validação integral de schemas e fixtures de contrato;
- gate integral em `scripts/verify.sh`, auditoria de dependências e `git diff --check`.

## Limites

A V1-103 consome identificadores estáveis por portas abstratas; não implementa catálogo, providers, MCPs, skills ou UI previstos em V1-104, V1-303 e V1-601. Decisões de ambientes externos estão em `docs/debt/V1-103-external-policy.md`.
