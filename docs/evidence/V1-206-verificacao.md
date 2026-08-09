# Evidência local — V1-206

## Estado

Chat corporativo implementado sobre portas autenticadas e fail-closed. Sessão corporativa, Gateway e provider reais dependem das configurações externas registradas como débitos; nenhum token de desenvolvimento ou bypass foi criado.

## Cobertura

- `POST /v1/model/responses/stream` com SSE sem cache, autoridade server-side, backpressure e cancelamento;
- contrato 2.8.0 com estado semântico e referências opacas aditivas;
- parser do Electron com UTF-8 estrito, sequência contígua, request único, evento de até 1 MiB e terminal único;
- uma repetição somente antes do primeiro evento; interrupção posterior fica inconclusiva;
- token de sessão somente no armazenamento seguro/main process;
- histórico `ALLOWED_HISTORY` cifrado, `LOCAL_ONLY`, isolado por usuário/dispositivo e retido por até 90 dias;
- renderer com streaming, cancelamento, resposta parcial, bloqueio, falha técnica e estado epistemológico distintos;
- UI baseada em `@domus/ui`, light/dark, foco, `aria-live` por fase e reduced motion.

## Evidência automatizada

- Control Plane: 117 testes aprovados, incluindo rota SSE e rejeição de autoridade do cliente;
- Electron: 28 testes aprovados, incluindo parser, reducer, sessão, retry e ausência de token nos eventos;
- Playwright/axe: chat light/dark aprovado, com snapshots versionados;
- contratos, TypeScript, Python, migrações e gate de release aprovados por `scripts/verify.sh`;
- snapshots do Design System permanecem protegidos após o ajuste de contraste do hover Cyan.

## Decisões de segurança

- o runtime sem dependências do Gateway responde fail-closed;
- o Electron sem sessão segura válida bloqueia chat e histórico;
- o renderer não recebe token, tenant, device, policy, provider, modelo ou budget scope;
- o caminho sem Knowledge Fabric só conclui como `Inferida`; demais estados devem vir de produtor autorizado.

## Revisão requerida

Frontend, Backend Gateway, Segurança e QA devem revisar contrato SSE, estados de erro, cancelamento, histórico e evidências antes do encerramento.
