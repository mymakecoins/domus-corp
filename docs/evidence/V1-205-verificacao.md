# Evidência local — V1-205

## Estado

Fundação do Design System implementada em `packages/ui` com dados sintéticos. O encerramento depende do gate humano de UX, QA e Engenharia.

## Cobertura

- 12 componentes base com Radix/shadcn, tokens semânticos e foco visível;
- 12 componentes compostos previstos no handoff;
- catálogo tipado dos oito estados semânticos, com label, ícone, descrição, tom e próxima ação;
- temas light/dark e densidades default/compact;
- Button `cva` com bloqueio de Indigo/Violeta e Select com valor não vazio/ordenação `pt-BR`;
- Storybook local, reduced motion, teclado, zoom 200%, axe-core e snapshots das quatro matrizes.

## Evidência automatizada

- `pnpm --filter @domus/ui test`: 13 testes aprovados;
- `pnpm --filter @domus/ui typecheck`: aprovado;
- `pnpm --filter @domus/ui storybook:build`: aprovado;
- `pnpm --filter @domus/ui test:browser`: 4 cenários Chromium aprovados, sem violações axe WCAG 2.2 AA;
- guardrail de fonte prova ausência de hexadecimais diretos em componentes;
- snapshots versionados em `packages/ui/test/browser/design-system.spec.ts-snapshots/`.

## Riscos residuais

- validação visual e de compreensão por pessoas ainda é obrigatória;
- matriz adicional de SO/browser e publicação externa permanecem débitos de release;
- componentes compostos contêm apenas composição e semântica; integração de produto pertence às issues consumidoras.

## Revisão requerida

- UX: fidelidade aos tokens, hierarquia e compreensão dos oito estados;
- QA/A11y: teclado, leitor de tela, contraste, zoom e reduced motion;
- Engenharia: API pública, ownership e guardrails.
