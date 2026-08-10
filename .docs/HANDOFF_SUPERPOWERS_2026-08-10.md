# Handoff para retomada com Superpowers — Domus Corp

**Data:** 2026-08-10  
**Status:** execução interrompida por solicitação do usuário; repositório remoto sincronizado  
**Branch:** `marcos-betaup/v1-101-identity-contracts`  
**Worktree usada:** `/home/mmc/orca/workspaces/domus-corp/v1-101-identity-contracts`  
**Baseline anterior ao commit deste handoff:** `160271e`  
**Merge:** não autorizado. O usuário determinou que o merge ocorrerá somente ao final da onda.

## Finalidade deste documento

Este arquivo deve ser a porta de entrada de uma futura sessão com Superpowers. Ele registra o estado verificável da branch, decisões humanas já expressas, limites de autoridade e lacunas que precisam ser auditadas antes de continuar.

Não trate este handoff como fonte superior ao PRD/ERS, ADR-001, backlog mestre ou decisões formalmente aprovadas. Em caso de divergência, prevalecem, nesta ordem:

1. `.docs/research/PRD_ERS_ Domus Corp — Plataforma de Inteligência Corporativa com IA.md`;
2. `.docs/research/ADR_001_ArquiteturaDomusCorp.md`;
3. `.docs/research/backlog/Backlog_V1_DomusCorp.md` e `Backlog_V1_DomusCorp.csv`;
4. `.docs/research/backlog/Indice de Execução da V1.0 - Domus Corp.md`;
5. decisões humanas aprovadas e registradas;
6. context packs e este handoff, que são documentos derivados.

## Visão do todo da v1.0

A visão integral de escopo, dependências, critérios de aceite e Definition of Done está no backlog mestre solicitado pelo usuário:

- caminho absoluto de referência: [Backlog Mestre da v1.0](</home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md>);
- caminho equivalente dentro do repositório: [Backlog_V1_DomusCorp.md](</home/mmc/orca/workspaces/domus-corp/v1-101-identity-contracts/.docs/research/backlog/Backlog_V1_DomusCorp.md>).

O backlog organiza a v1.0 em dez épicos. A tabela abaixo posiciona a branch no programa completo; “presente” significa que há código/artefato associado, não que o DoD integral tenha sido reauditado neste handoff.

| Épico | Papel no produto | Estado observado nesta branch |
|---|---|---|
| E0 — Fundação, contratos e entrega assistida por IA | escopo, arquitetura, contratos, monorepo, governança, ambientes e release | fundação executada em parte relevante; V1-003–V1-007 possuem artefatos/commits, mas a aderência integral de V1-001/V1-002 deve ser confirmada pelas fontes de autoridade |
| E1 — Identidade, tenants e administração | SSO/sessão/dispositivo, tenancy, RLS lógico, policy e administração | V1-101–V1-103 presentes; V1-104 e V1-105 não foram executadas nesta sequência |
| E2 — Cliente desktop e experiência de confiança | Electron seguro, onboarding, memória local, OAuth, design system, chat e citações | V1-201–V1-206 presentes; V1-207 e V1-208 permanecem futuras |
| E3 — Harness, gateway e economia de IA | credenciais, catálogo, egress, budget, gateway, resiliência, auditoria e custos | V1-301–V1-308 presentes na branch; requerem revisão sistêmica antes de merge/release |
| E4 — Knowledge Fabric | fontes, ingestão, governança, safety, taxonomia, graph, ACL, índice, retrieval e workbench | V1-401–V1-412 têm commits; V1-409–V1-412 possuem lacunas materiais detalhadas neste handoff |
| E5 — Intelligence Plane | orquestração, estados semânticos, síntese, feedback, gaps, mudanças e insights | não iniciado; existe apenas o checkpoint derivado da V1-501 |
| E6 — MCP, integrações e ações governadas | catálogo/proxy MCP, guardrails, Action Gateway, confirmações e conectores | não iniciado nesta branch |
| E7 — Dados, recuperação e continuidade | migrações/RLS, backup, retenção, otimização e runbooks | V1-701 presente como governança de migrações; V1-702–V1-705 não executadas |
| E8 — QA, segurança e avaliação | contratos, policy, groundedness, carga, red-team, acessibilidade e gate sistêmico | testes locais existem, mas as issues V1-801–V1-808 não devem ser consideradas executadas |
| E9 — Operação, release e piloto | observabilidade/SLO, HA, distribuição Electron e piloto | não iniciado nesta branch |

O caminho crítico registrado no backlog é, em síntese:

```text
Fundação → Identidade/Policy → Gateway governado → Knowledge Fabric
         → Retrieval citável → Intelligence Plane → Avaliação sistêmica → Piloto
```

A branch chegou ao limite entre Knowledge Fabric e Intelligence Plane, mas a auditoria de aderência da E4 é pré-condição recomendada antes de atravessar esse limite.

## Histórico das ondas/frentes já executadas

### Onda de fundação — E0 e V1-701

Objetivo: estabelecer toolchains reproduzíveis, governança de IA, ambientes de desenvolvimento, release governado e migrações/RLS.

Commits representativos:

- `51c903b` — fundação poliglota reproduzível;
- `c15d588` — gate de aceitação da V1-004;
- `a4886d0` — governança de desenvolvimento assistido por IA;
- `838b183` — ambientes Vercel-first;
- `b73a8f2` — lifecycle governado de release;
- `175efc2` — governança de migrações PostgreSQL e RLS (V1-701).

Resultado observado: monorepo TypeScript/Python, scripts de verificação, contratos versionados, migrações reversíveis e gates de release. Decisões de staging/produção continuam como débitos quando não necessárias ao desenvolvimento.

### Onda E1 — Identidade, tenants e policy

Objetivo executado: identidade corporativa genérica OIDC/PKCE, sessão e dispositivo, tenancy/workspace e `EffectivePolicy` fail-closed.

Commits representativos:

- `632616b` — contratos de identidade;
- `4f35300` e `1d8ef89` — fronteiras de domínio e membership tenant-bound;
- `742a533` — persistência governada;
- `a939872` — validação de identidade OIDC genérica;
- `23d9371` — sessões e revogação fail-closed;
- `e4b3bb1`, `8c679c2`, `908fe79`, `6bd91cd` — endpoints, logout/dispositivo e prova de posse;
- `bbdb5cd` — administração tenant/workspace;
- `10fc6fe` — resolução de `EffectivePolicy`;
- `7f8c8be` — registro de aprovação humana G2.

Resultado observado: V1-101–V1-103 possuem implementação e testes. V1-104 (catálogo administrativo de capacidades/permissões) e V1-105 (simulador/aprovação/rollback de policy) não foram executadas e não devem ser inferidas a partir do gateway.

### Onda E3 — Harness, gateway e economia de IA

Esta frente foi executada antes de concluir toda a E2 para satisfazer dependências do chat e do restante da plataforma.

Commits de implementação:

- `612b913` — Vault e credenciais de providers (V1-302);
- `70e81ad` — catálogo e roteamento (V1-303);
- `5e54136` — governança de egress (V1-304);
- `e38d97c` — reservas atômicas de budget (V1-305);
- `e31ea8f` — Model Gateway fail-closed (V1-301);
- `e487181` — streaming resiliente, rate limit/circuit breaker (V1-307);
- `9b8bef4` — auditoria correlacionada append-only (V1-308);
- `ba700a8` — ledger e reconciliação de custos (V1-306).

Resultado observado: V1-301–V1-308 estão representadas por código, migrações, testes e checkpoints. Isso não substitui os gates futuros de carga, red-team, SLO e release das E8/E9.

### Onda E2 — Cliente desktop e experiência de confiança

Commits de implementação:

- `47116ae` — shell Electron seguro (V1-201);
- `505bb31` — onboarding privado e retomável (V1-202);
- `7373a22` — memória local criptografada (V1-203);
- `375e7c7` — OAuth local com PKCE (V1-204);
- `f18cc1d` — Design System (V1-205);
- `c15b9d5` — chat governado com streaming (V1-206).

Resultado observado: a base desktop, armazenamento local, autenticação, UI e chat estão presentes. V1-207 depende de V1-501 e continua aberta; V1-208 também não foi executada.

### Onda E4 — Knowledge Fabric

Execução em ordem de dependência:

```text
V1-401 → V1-402 → V1-403 → V1-404 → V1-405 → V1-406
       → V1-407 → V1-408 → V1-409 → V1-410 → V1-411 → V1-412
```

Commits e entregas estão na tabela da seção “Linha de execução registrada”. V1-401–V1-408 formam a base de sources, conectores, objetos, ingestão, governança, safety, taxonomia e graph. V1-409–V1-412 avançaram ACL/retrieval/UI, mas não demonstram ainda o DoD integral do backlog; por isso são o foco obrigatório da próxima revisão Superpowers.

### Fronteira atual — entrada da E5

`160271e` contém somente `.ai/context-packs/V1-501.md`. Nenhum código da V1-501 foi iniciado. O próximo marco técnico seria o Intelligence Plane, seguido por V1-502 e pelas capacidades de inteligência, mas essa progressão está deliberadamente pausada.

## Regras de continuidade aprovadas pelo usuário

- Usar TDD e avançar até impedimento ou gate humano.
- Fazer commit e push ao final de cada issue.
- Não fazer merge antes do encerramento da onda.
- Decisões de ambientes que não sejam desenvolvimento devem ser registradas como débitos; não é necessário definir staging/produção agora.
- O IdP é corporativo genérico via OIDC/PKCE. Keycloak é apenas uma implementação possível, não a arquitetura padrão.
- Python não pode acessar diretamente provedores de IA. Todo egress de inferência/embedding passa pelo Model Gateway TypeScript.
- Autorização, revogação, RLS e retrieval são fail-closed.
- Logs e auditoria não retêm prompt, resposta, conteúdo documental, PII ou segredos por padrão.

## Estado Git verificável

No momento da coleta, antes de adicionar este próprio arquivo:

- a branch estava limpa;
- `HEAD` local e `origin/marcos-betaup/v1-101-identity-contracts` apontavam para `160271e`;
- o último push incluiu o checkpoint V1-501;
- nenhum merge foi realizado.

Comandos iniciais recomendados:

```bash
git status -sb
git fetch origin
git log --oneline --decorate -10
git diff --stat origin/marcos-betaup/v1-101-identity-contracts...HEAD
```

Não crie outra branch/worktree até confirmar com o usuário se a retomada continuará nesta branch de onda ou será isolada em uma nova entrega.

## Linha de execução registrada

A branch contém uma sequência ampla, iniciada em identidade e estendida por gateway, desktop e Knowledge Fabric. Os commits mais recentes e diretamente relevantes são:

| Issue/checkpoint | Commit | Estado factual |
|---|---:|---|
| V1-401 | `94d58e4` | Source Registry governado |
| V1-402 | `bb897ca` | framework de conectores |
| V1-403 | `32a8584` | metadados de objetos imutáveis |
| V1-404 | `2e3f846` | pipeline de ingestão |
| V1-405 | `90006cc` | governança de versões |
| V1-406 | `b45fe78` | content safety |
| V1-407 | `c473b1f` | taxonomia |
| V1-408 | `ac767a0` | Knowledge Graph Lite |
| V1-409 | `16e4963` | contexto/filtro pré-retrieval e auditoria |
| V1-410 | `9a49af0` | chunk/embedding metadata e migração |
| V1-411 | `2c6b7c8` | retrieval híbrido bounded e auditoria |
| V1-412 | `1e32443` | primeira superfície do Knowledge Workbench |
| checkpoint V1-501 | `160271e` | somente documento; implementação não iniciada |

Os context packs estão em `.ai/context-packs/`. Os packs V1-409 a V1-501 registram os parâmetros de desenvolvimento discutidos durante a execução.

## Última verificação executada

Após V1-412, `./scripts/verify.sh` terminou com sucesso. A evidência observada incluiu:

- 21 pares de migração reconhecidos pela governança;
- catálogo ainda em 63 schemas e 126 fixtures;
- lint e typecheck TypeScript aprovados;
- testes dos pacotes JS/TS aprovados;
- 6 testes do admin aprovados;
- mypy aprovado;
- 53 testes do Knowledge API aprovados.

Há um aviso de ambiente local: o repositório declara Node `>=22 <23`, mas a execução usou Node `v24.18.0`. Isso não invalidou a suíte, porém deve permanecer visível como débito do ambiente de desenvolvimento.

Comando de baseline:

```bash
./scripts/verify.sh
```

## Alerta de aderência: não assumir DoD integral de V1-409–V1-412

Os commits foram chamados de “implementação” durante a sessão e a suíte está verde, mas uma leitura posterior dos critérios de aceite mostra que há trabalho não demonstrado. Uma futura sessão deve usar `specification-review`/revisão de aderência do Superpowers antes de iniciar V1-501.

### V1-409 — provável implementação parcial

Existe `access_control.py`, double Qdrant, contexto transacional e a migração `000019`. Ainda não há evidência suficiente no repositório de:

- aplicação real de todos os predicados de ACL/RLS às queries PostgreSQL/Qdrant;
- revisão de query plans com `EXPLAIN` em dataset sintético;
- teste integrado de pool/conexão contra PostgreSQL real;
- aprovação especializada registrada por DBA e Segurança;
- contratos JSON Schema/AsyncAPI planejados no checkpoint.

### V1-410 — provável implementação parcial e risco de migração

Existe `vector_index.py` e a migração `000020`, mas não há integração real com Qdrant, worker/job idempotente, filas, collections versionadas, HNSW, reindexação, cutover ou métricas. O modelo de chunk também não demonstra todos os metadados exigidos pelo backlog, como source, seção e vigência.

Revisar imediatamente esta instrução da migração:

```sql
GRANT SELECT,INSERT,UPDATE(status) ON knowledge_chunk,knowledge_embedding TO domus_knowledge_runtime;
```

`knowledge_chunk` não possui coluna `status`. A governança atual valida arquivos estaticamente, mas não prova que a migração `000020` execute com sucesso em PostgreSQL. Trate isso como possível bloqueador e escreva um teste de migração real antes de corrigir.

### V1-411 — provável implementação parcial

Existe `retrieval.py` com filtro e ranking determinístico em memória e migração de auditoria `000021`. O DoD do backlog também exige API FastAPI, integração textual/vetorial real, taxonomia/relações, reranking, trecho redigido, estado explícito sem evidência, p95 medido, dataset de avaliação, benchmark e logs redigidos. Essas evidências não foram encontradas.

### V1-412 — primeira fatia de UI, não Workbench completo

Existe `knowledge-workbench.tsx` com uma tabela de ativos e testes básicos. Ainda faltam, conforme backlog:

- atrasos, conflitos, gaps, feedback negativo e fontes sem owner;
- filtros com valores estáveis e ordenação declarada;
- fluxos de aprovação/rejeição e resolução de conflito;
- justificativa, confirmação, policy e auditoria;
- `SourceFreshnessBadge` como componente explícito;
- modo compact/default, light/dark, snapshots, acessibilidade automatizada e teste com owners;
- integração com cliente/backend real. Em `main.tsx`, o cliente permanece indisponível e lança `SESSION_UNAVAILABLE`.

## Contratos e release metadata ainda não atualizados

O estado observado após V1-412 continuava:

- `contracts/VERSION`: `2.16.0`;
- AsyncAPI: `1.10.0`;
- release candidate: `0.27.0`, `contractsVersion: 2.16.0`;
- 63 schemas / 126 fixtures.

Portanto, os contratos propostos nos checkpoints V1-409–V1-411 não foram promovidos ao catálogo versionado. A retomada deve decidir, com base no backlog e nos contratos já existentes, quais schemas/eventos são realmente necessários e fazer a evolução de versão de forma coesa — sem inventar contratos apenas para igualar o checkpoint derivado.

## Ponto exato de retomada recomendado

Não iniciar a implementação da V1-501 ainda. O primeiro trabalho recomendado é uma auditoria de aderência das V1-409–V1-412 contra PRD, ADR, backlog e código real.

Ordem sugerida:

1. executar o baseline completo;
2. revisar os quatro commits e os critérios de aceite linha a linha;
3. confirmar o possível erro da migração `000020` com PostgreSQL real;
4. produzir uma matriz “atendido / parcial / ausente / requer gate”;
5. propor um plano de remediação mínimo, sem ampliar v1.0;
6. obter aprovação humana, especialmente DBA/Security para V1-409 e V1-411;
7. implementar as lacunas com TDD e push por issue;
8. somente então reavaliar a prontidão da V1-501.

## Gate atualmente aberto

O arquivo `.ai/context-packs/V1-501.md` foi criado e enviado, mas seu gate não foi aprovado. Ele propõe orquestração de contexto autorizado, budget, redaction e chamada exclusiva ao Model Gateway. O usuário solicitou parar antes de qualquer implementação.

Mesmo que o gate V1-501 seja posteriormente aprovado, as lacunas E4 acima precisam ser classificadas: bloqueadoras, dívida aceita ou falso positivo. Não assumir aprovação implícita.

## Prompt recomendado para a próxima sessão Superpowers

```text
Use as skills relevantes do Superpowers para retomar o Domus Corp a partir de
`.docs/HANDOFF_SUPERPOWERS_2026-08-10.md`.

Esta primeira etapa é somente de análise. Não altere arquivos, não crie branch/worktree,
não implemente código e não faça merge.

Confirme o estado Git e execute apenas verificações read-only. Leia o handoff integralmente,
depois confronte as V1-409, V1-410, V1-411 e V1-412 com o PRD/ERS, ADR-001, backlog mestre,
índice de execução, context packs e código real. Documentos derivados não superam as fontes
de autoridade.

Entregue uma matriz de aderência por critério de aceite com evidência de arquivo/commit,
classificando cada item como atendido, parcial, ausente ou gate humano. Verifique em especial
a executabilidade da migração 000020, a ausência de integração Qdrant/FastAPI, os contratos
não versionados e o escopo incompleto do Knowledge Workbench.

Ao final, recomende a primeira remediação executável. Não prossiga para V1-501 sem aprovação
explícita e sem classificar as lacunas da E4.
```

## Critério para considerar o handoff consumido

O handoff foi consumido corretamente quando a nova sessão:

- confirmou branch, HEAD e limpeza do worktree;
- reproduziu o baseline ou registrou falhas preexistentes;
- não iniciou V1-501 automaticamente;
- produziu uma revisão de especificação baseada em evidências;
- separou débitos de ambiente externo de bloqueios reais de desenvolvimento;
- pediu aprovação antes de alterar o plano ou implementar remediações.
