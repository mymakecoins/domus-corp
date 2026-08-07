# Changelog dos contratos

O catálogo segue Semantic Versioning. Mudança incompatível exige nova major; mudança aditiva opcional usa minor; correção documental ou restrição que não altera instâncias aceitas usa patch.

## [1.0.0] — 2026-08-07

- Publicação inicial de `EffectivePolicy`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest`, `UsageLedger`, `ContractError` e `DomainEvent`.
- Publicação dos contratos HTTP OpenAPI e de eventos/jobs AsyncAPI.
- Envelope obrigatório de segurança, correlação e proveniência.

## Política de compatibilidade

1. Remover/renomear campo, tornar opcional obrigatório, estreitar enum/tipo ou alterar semântica é incompatível e requer nova major.
2. Campo novo deve ser opcional durante a janela de transição. Como os schemas são fechados, produtores só o enviam após consumidores declararem suporte à minor correspondente.
3. Uma migração temporária deve documentar produtor, consumidores, prazo, telemetria e remoção. No máximo duas majors adjacentes podem coexistir.
4. Eventos publicados não mudam em trânsito. Nova major usa novo `message.name` e, quando necessário, novo canal.
5. Alterações de `classification`, policy, proveniência, budget, autorização ou erro fail-closed exigem revisão humana de Arquitetura e Segurança.
