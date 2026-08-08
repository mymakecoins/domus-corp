# Evidência de verificação — V1-006

## Cobertura local

| Critério | Evidência | Estado |
|---|---|---|
| Configuração/secrets mínimos por runtime | oito projetos técnicos e allowlists em `deploy/vercel/projects.json` | Atendido estruturalmente |
| Double sem acesso a produção | projetos de test distintos e `externalIntegrations=double` | Testado |
| Rotação sem reinstalar cliente | novo deployment backend para Sensitive Env; adapter file-backed relê versão corrente em futuros hosts | Testado localmente |
| Identidade de workload | OIDC por team/projeto/ambiente, sem cloud credential persistente | Definido; validação externa pendente |
| Portabilidade | valores runtime na Vercel e referências `*_FILE` para VPS/Azure/AWS | Testado nos dois runtimes |
| Rollback | `docs/runbooks/V1-006-secrets-rotation-rollback.md` | Documentado |

## Proveniência

Codex elaborou código, modelo declarativo, testes e documentação usando apenas dados sintéticos. Não acessou Vercel, Vault, cloud ou produção e não possui autoridade para aprovar permissões. Contexto: `.ai/context-packs/V1-006.md`.

## Aprovação e responsabilidade operacional

Marcos Wasem aprovou em 08/08/2026 o baseline Vercel-first, a separação de projetos por runtime, a matriz de acesso e os mecanismos de rotação/portabilidade. Com esse aceite, a implementação versionável da V1-006 está encerrada e a V1-007 está liberada.

Segurança/DevOps continuam responsáveis por criar os projetos, habilitar OIDC e proteções, configurar valores sem exposição e validar isolamento/rotação em staging. Essas ações externas não foram executadas pelo modelo e devem gerar evidência operacional antes de qualquer promoção a produção. Kubernetes permanece fora do baseline; uma futura VPS/Azure/AWS exigirá decisão de plataforma própria.
