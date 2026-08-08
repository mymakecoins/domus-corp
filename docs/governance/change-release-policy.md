# Política de mudanças, versões e releases

**Issue:** V1-007  
**Owners:** Gerência de Projeto / Release Manager  
**Status:** vigente na v1.0

## Escopo e unidade de mudança

Código, contratos, prompts, modelos, taxonomia, policies, conectores, índices, migrações e configuração são artefatos versionados. Toda mudança liga issue, classificação, impacto, riscos, testes, evidência, versão, anel e rollback no PR e em `release/candidate.json`.

## Branch e merge

- `main` é protegida; mudanças entram por PR, checks obrigatórios e revisão humana.
- Autor não aprova a própria mudança alta/P0. Modelos nunca contam como aprovação.
- Merge direto, force-push e bypass de check são proibidos. Emergência exige incidente, dois aprovadores autorizados e registro posterior.
- Commits devem ser reproduzíveis; segredo, artefato local ou evidência não redigida bloqueia merge.

## Classificação e aprovação

| Classe | Exemplos | Aprovação mínima |
|---|---|---|
| Baixa | documentação não normativa, correção interna sem comportamento | Engenharia |
| Moderada | aplicação, dependência, contrato compatível, prompt não produtivo | Engenharia + owner do componente |
| Alta/P0 | auth, policy, ACL, budget, segredo, migração, contrato incompatível, egress, modelo/prompt produtivo, release | Engenharia + Release Manager + especialista de domínio |

A matriz detalhada está em `release-approval-matrix.md`. Achado alto/crítico bloqueia o candidato até correção ou aceite formal com owner autorizado, justificativa e expiração. Aceite não elimina o achado e permanece auditável no manifesto.

## Versionamento

- Aplicação e contratos usam SemVer `MAJOR.MINOR.PATCH`.
- `MAJOR`: remoção, mudança incompatível de schema/semântica ou exigência de migração do consumidor.
- `MINOR`: capacidade retrocompatível ou campo opcional.
- `PATCH`: correção retrocompatível sem ampliar contrato.
- Contratos publicam a versão em `contracts/VERSION` e registram mudanças em `contracts/CHANGELOG.md`; breaking change requer nova pasta major (`v2`, por exemplo) e convivência/migração explícita.
- Prompt, modelo, policy, taxonomia, conector e índice carregam versão imutável própria e referência à versão anterior; publicação nunca sobrescreve silenciosamente a versão ativa.

## Gate e rollout

`scripts/check_release.py` falha fechado quando faltam testes, risco, impacto, evidência, rollback, anel ou compatibilidade de versão, e quando existe achado alto/crítico sem decisão formal vigente. A ordem de promoção é `internal → pilot → gradual → stable`; cada avanço exige métricas e aprovação do owner. Pausa ou rollback conserva manifesto, decisão, deployment e versão anterior.

Memória local nunca é apagada pelo rollback. Migrações locais são aditivas/reversíveis ou mantêm reader compatível com a versão anterior; caso contrário, a promoção é bloqueada.
