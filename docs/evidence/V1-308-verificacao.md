# Evidência local — V1-308

## Estado

Auditoria de desenvolvimento concluída. Retenção legal e armazenamento externo exigem decisão de Compliance, Segurança e DBA antes de promoção.

## Cobertura

- eventos mínimos correlacionados por request/trace, sem conteúdo operacional;
- allowlist de atributos escalares e limite de 8 KiB;
- tabelas particionadas/append-only para roles comuns, com RLS forçado;
- leitura administrativa limitada, com finalidade e evento de acesso na mesma transação;
- retenção local de 30 dias por role de manutenção separada;
- contratos `AuditEvent` e `AuditAccessEvent` 2.6.

## Evidência

- testes negativos para prompt, resposta, token, PII, estrutura e tamanho;
- testes de propósito, intervalo, limite e falha fechada da autoauditoria;
- PostgreSQL real com aplicação, RLS, ausência de UPDATE runtime e rollback;
- gate integral e catálogo de contratos verdes.

## Limites

Débitos de ambientes externos estão em `docs/debt/V1-308-external-audit.md`.
