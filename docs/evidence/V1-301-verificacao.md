# Evidência local — V1-301

## Estado

Fatia integrada de desenvolvimento concluída. Conectividade e configuração de providers externos exigem revisão de Segurança antes de promoção.

## Cobertura

- ordem fail-closed: contexto/policy, rota, egress, budget, credencial, provider, reconciliação e auditoria;
- request sem autoridade de tenant, workspace, policy, provider, preço, credencial ou budget;
- adapter aceita somente providers previamente configurados e endpoints HTTPS;
- segredo existe somente durante a chamada e não integra retorno ou erro;
- falha ambígua não causa retry cego nem reconciliação inventada;
- contratos `ModelGatewayRequest` e `ModelGatewayResult` 2.4.

## Evidência

- testes de ordem, short-circuit, adulteração, segredo canário, resposta malformada e sanitização;
- catálogo completo de contratos e gate integral;
- nenhum provider externo ou conteúdo corporativo usado.

## Limites

Streaming resiliente, limites, cancelamento e circuit breaker pertencem à V1-307. Auditoria correlacionada completa pertence à V1-308. Débitos externos estão em `docs/debt/V1-301-external-providers.md`.
