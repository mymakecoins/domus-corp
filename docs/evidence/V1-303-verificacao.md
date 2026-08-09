# Evidência local — V1-303

## Estado

Implementação de desenvolvimento concluída. Produto, Backend, Segurança e DBA devem revisar defaults comerciais e publicação antes de promoção externa.

## Cobertura

- contrato aditivo `ModelRouteDecision` 2.1;
- catálogo global versionado de providers, modelos, capacidades, preços e fallback;
- custo por aritmética inteira com arredondamento para cima e proteção de overflow;
- filtragem por policy, classificação, capacidade, contexto, output, moeda, teto financeiro, credencial e health;
- ordenação determinística por prioridade, custo e chave estável;
- fallback explícito, limitado, acíclico e integralmente revalidado;
- publicação sob lock, histórico imutável, roles distintas e RLS fail-closed.

## Evidência

- testes TypeScript do roteador e publicação, incluindo adulteração e dependências indisponíveis;
- 20 schemas e 40 fixtures válidas/negativas;
- testes estruturais da migração e manifesto governado;
- PostgreSQL 16 real com aplicação 000001→000006, visibilidade somente de modelo ativo e rollback 000006;
- gate integral, auditoria de dependências e `git diff --check`.

## Limites

Não há egress, reserva financeira, provider real ou painel administrativo. A V1-301 consome a rota; V1-305 reserva budget; V1-104 expõe administração. Débitos externos estão em `docs/debt/V1-303-external-model-catalog.md`.
