# Evidência local — V1-306

## Estado

Ledger P0 e agregações backend concluídos. Dashboard visual P1 e parâmetros externos permanecem fora desta fatia.

## Cobertura

- custo estimado/real, tokens, recibo e versões de rota/preço/policy;
- idempotência por reserva/recibo e revisão de divergências;
- transições monotônicas protegidas no PostgreSQL;
- agregações nunca misturam moedas;
- consulta até 31 dias/10 mil linhas e no máximo duas dimensões;
- CSV protegido contra formula injection;
- thresholds de desenvolvimento 80%/100% sem ampliar policy.

## Evidência

- testes de estados, recibos, moeda, agregação, thresholds e exportação;
- PostgreSQL real com RLS, constraints, transição, rollback e reaplicação;
- contratos 2.7 e gate integral verdes.

## Limites

Débitos externos estão em `docs/debt/V1-306-external-finops.md`.
