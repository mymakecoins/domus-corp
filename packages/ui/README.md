# @domus/ui

Biblioteca interna de interface do Domus Corp v1.0. Os contratos visuais vêm de `.docs/research/DESIGN_SYSTEM_DOMUS_CORP.md`; alterações de tokens, estados semânticos ou guardrails exigem revisão de UX, QA e Engenharia.

## Uso

Importe componentes de `@domus/ui` e carregue `@domus/ui/tokens.css` uma vez na raiz da superfície. Tema e densidade são selecionados com `data-theme="light|dark"` e `data-density="default|compact"`.

Componentes não fazem fetch, autorização ou inferência de policy. Estados de IA devem vir do contrato da API. `Select` exige opções não vazias e ordena por `pt-BR`, salvo `order="explicit"` quando a interface declarar prioridade, risco ou recência.

## Qualidade local

```sh
pnpm --filter @domus/ui test
pnpm --filter @domus/ui typecheck
pnpm --filter @domus/ui storybook:build
pnpm --filter @domus/ui test:browser
```

O teste de browser requer o Chromium controlado pelo Playwright. Os snapshots cobrem light/dark, default/compact e zoom de 200%. O owner de manutenção é Frontend, com revisão obrigatória de UX para linguagem visual e QA para acessibilidade.
