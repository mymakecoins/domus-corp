# Evidência local — V1-201

## Estado

Shell Electron de desenvolvimento concluído. Distribuição externa e assinatura permanecem fora desta fatia.

## Cobertura

- `contextIsolation`, sandbox, Node desabilitado, web security e conteúdo inseguro bloqueado;
- CSP sem `unsafe-eval`, abertura/navegação/permissões deny-by-default;
- preload CJS mínimo e congelado com apenas `app.getVersion` e `controlPlane.health`;
- IPC valida frame/origem e não expõe primitive genérica;
- healthcheck limita origem, redirect, timeout, schema e tamanho;
- renderer React sem filesystem, subprocesso, token ou segredo.

## Evidência

- testes unitários de preferências, CSP, origem, navegação e resposta adulterada;
- Electron 43 real sob Xvfb provou `require`/`process` ausentes e somente duas namespaces allowlisted;
- pacote Linux local não assinado gerado por `electron-builder --dir`;
- gate monorepo e scanner de dependências verdes.

## Limites

Débitos externos estão em `docs/debt/V1-201-external-distribution.md`.
