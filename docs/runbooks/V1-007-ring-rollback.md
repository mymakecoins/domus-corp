# V1-007 — Pausa e rollback por anéis

## Promoção

1. Congelar versão, digest/deployment e `release/candidate.json` aprovados.
2. Promover sequencialmente: internal, pilot, gradual e stable.
3. Em cada anel, registrar horário, população, métricas, achados e decisão humana.
4. Não avançar com check falho, métrica fora do limite ou achado alto/crítico sem aceite formal vigente.

## Pausa

Desabilitar promoção automática, preservar o deployment atual e bloquear novos consumidores. Não editar o manifesto já publicado; criar evento/registro de pausa ligado à versão. Policy, índice, prompt e modelo permanecem apontáveis por versão, sem overwrite.

## Rollback

1. Selecionar o último deployment/digest aprovado do mesmo ambiente e confirmar compatibilidade de banco, contratos e memória local.
2. Na Vercel, usar Instant Rollback para código. Para configuração/segredo, gerar novo deployment conforme o runbook V1-006.
3. Reapontar flags/version references de policy, prompt, modelo, taxonomia, conector e índice para a versão anterior.
4. Manter dados novos em quarentena quando a versão anterior não os compreender; nunca truncar memória local.
5. Executar smoke tests e reconciliação, registrar recibo, causa, impacto, operador e decisão de retomada.

Se uma migração impedir leitura pela versão anterior, rollback de aplicação é proibido até ativar reader compatível ou restore aprovado. A operação falha fechado e é escalada ao DBA/Release Manager.
