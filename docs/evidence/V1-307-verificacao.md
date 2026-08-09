# Evidência local — V1-307

## Estado

Controles de desenvolvimento concluídos. Limites de ambientes externos exigem calibração por SRE e FinOps antes de promoção.

## Cobertura

- janela deslizante e concorrência atômicas para múltiplos escopos em Redis;
- falha do Redis bloqueia admissão;
- circuit breaker `CLOSED`, `OPEN` e sonda única `HALF_OPEN`;
- stream com sequência monotônica e exatamente um terminal;
- cancelamento propagado, timeout de inatividade/duração, limite de bytes/chunks e backpressure pelo `await` do emissor;
- contrato `ModelStreamEvent` 2.5 sem autorização de retry automático.

## Evidência

- relógio controlado e testes de expiração, corrida lógica, liberação idempotente, circuito e falha do Redis;
- prova em Redis 7.4 real de admissão atômica, rejeição cumulativa e liberação por lease;
- testes de conclusão, limite e cancelamento de stream;
- gate integral e catálogo completo de contratos.

## Limites

Os valores aprovados são somente baseline de desenvolvimento. Débitos externos estão em `docs/debt/V1-307-external-resilience.md`.
