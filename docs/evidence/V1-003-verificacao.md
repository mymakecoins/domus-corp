# V1-003 — Evidência de verificação

**Status:** Aprovado  
**Data:** 07/08/2026  
**Aprovador:** Marcos Wasem  
**Escopo:** catálogo v1.0.0 de schemas, APIs HTTP, eventos/jobs, exemplos e regras de compatibilidade

## Cobertura

| Critério | Evidência |
|---|---|
| Nove contratos exigidos | `contracts/json-schema/v1/` |
| OpenAPI HTTP | `contracts/openapi/v1/openapi.json` |
| AsyncAPI eventos/jobs | `contracts/asyncapi/v1/asyncapi.json` |
| Campos comuns e budget aplicável | `common.schema.json` e schemas fechados |
| Exemplos válidos e inválidos | `contracts/examples/v1/` |
| Versionamento e compatibilidade | `contracts/CHANGELOG.md` |
| Teste básico | `tests/contracts/validate_contracts.py` |

## Decisões

- Versão inicial `1.0.0`, agrupada sob major `v1`.
- Schemas fechados (`additionalProperties: false`) para impedir aceitação silenciosa de contexto não compreendido.
- Erros possuem códigos tipados; falhas de autoridade e versões desconhecidas são fail-closed.
- `ActionRequest` é uma proposta e não prova aprovação nem autoriza execução.
- Eventos carregam envelope completo e tipo explicitamente versionado.

## Comandos de verificação

```bash
python3 tests/contracts/validate_contracts.py
git diff --check
```

## Revisão humana

Marcos Wasem aprovou em 07/08/2026 o catálogo, os campos de segurança, a política de compatibilidade e os protocolos cross-runtime, sem exceções registradas. A suíte cross-runtime integrada e o gate de incompatibilidade no pipeline serão materializados em V1-004/V1-801.

## Desenvolvimento assistido por IA

- Modelo: Codex.
- Papel: elaboração e verificação estrutural, sem autoridade de aprovação.
- Dados: documentação do repositório e fixtures inteiramente sintéticas; nenhum segredo ou dado corporativo real.

## Decisão de encerramento

Os critérios de aceite e o DoD específico da V1-003 foram atendidos. A issue está concluída, e a **V1-004 — Criar monorepo poliglota, toolchains e CI/CD reproduzível** está formalmente liberada como próxima etapa do caminho crítico.
