# Evidência local — V1-304

## Estado

Implementação de desenvolvimento concluída. Segurança e Privacidade devem revisar detectores, falsos negativos e exceções antes de promoção externa.

## Cobertura

- contrato `EgressGuardDecision` 2.2 sem conteúdo ou matches;
- precedência fail-closed entre policy, rota, classificação, secrets, proibidos e PII;
- máscara não reversível e bloqueio absoluto de secrets/chaves perigosas;
- JSON puro com limites de profundidade 20 e tamanho 1 MiB;
- exceção PII-only, escopada, com segregação de aprovador e validade máxima de 30 dias;
- ruleset único, exceção server-side e auditoria obrigatória antes do egress;
- regras globais publicadas e exceções tenant/workspace sob RLS.

## Evidência

- testes TypeScript com canários sintéticos, adulteração, duplicidade, indisponibilidade e limites;
- 21 schemas e 42 fixtures válidas/negativas;
- testes estruturais da migração e manifesto governado;
- PostgreSQL 16 real com aplicação 000001→000007, exceção invisível sem contexto, visível no escopo correto e rollback;
- gate integral, auditoria de dependências e `git diff --check`.

## Limites

A V1-304 prepara payload dentro do processo TypeScript; a V1-301 encadeará o provider. Não há provider real nem conteúdo corporativo. Débitos externos estão em `docs/debt/V1-304-external-egress.md`.
