# Evidência de verificação — V1-005

**Data:** 08/08/2026
**Status:** aprovada

## Cobertura dos critérios

1. A política exige context pack, prompt/resumo, saída utilizada, arquivos, testes e responsável humano; templates versionados padronizam o registro.
2. O template de PR e o checklist exigem revisão humana e teste automatizado proporcional ao risco para contribuições geradas por IA.
3. Política e matriz vedam acesso autônomo a produção, segredos, dados pessoais e escrita externa e reservam ações reais ao fluxo humano autorizado.

O DoD está representado por:

- `docs/governance/ai-assisted-development-policy.md`;
- `docs/governance/ai-responsibility-matrix.md`;
- `docs/templates/ai-context-pack.md`;
- `docs/templates/ai-review-checklist.md`;
- `docs/templates/ai-provenance-record.md`;
- `.github/pull_request_template.md`.

## Registro de proveniência desta entrega

- Responsável humano: Marcos Wasem.
- Modelo: Codex; versão não exposta pela interface.
- Finalidade: elaborar os artefatos do DoD e a validação estrutural da V1-005.
- Context pack: `.ai/context-packs/V1-005.md`.
- Prompt/resumo: prosseguir com a V1-005 conforme backlog; foram usadas apenas fontes versionadas e o baseline aprovado.
- Saída utilizada: política, matriz, templates, integração de PR, testes e documentação.
- Saída descartada: nenhuma decisão institucional; a aprovação permanece pendente.
- Arquivos alterados: os arquivos listados no DoD, `README.md`, `scripts/verify.sh`, `tests/governance/` e esta evidência.
- Dados: documentação do repositório e fixtures sintéticas; nenhum segredo ou dado corporativo real.
- Ações externas: nenhuma.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `python3 -m unittest tests.governance.test_ai_governance -v` | 3 testes aprovados |
| `./scripts/verify.sh` | aprovado: scaffold, governança, 9 schemas/18 fixtures, migração, lint, tipos e testes TS/Python |
| `git diff --check` | aprovado |

O ambiente local usa Node.js 24.18.0 e emitiu o aviso esperado porque o projeto requer Node.js 22. O CI permanece fixado em 22.18.0; não houve falha associada.

## Gate humano

Marcos Wasem aprovou a V1-005 em 08/08/2026 após a implementação e as verificações automatizadas. A decisão libera o encerramento desta issue e o prosseguimento para a V1-006. A configuração de branch protection e dos times de aprovação no provedor Git continua sendo um controle operacional da organização e não foi alterada por modelo.
