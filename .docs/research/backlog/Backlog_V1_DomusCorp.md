# Backlog Mestre de Issues — Domus Corp v1.0

**Produto:** Domus Corp — Plataforma de Inteligência Corporativa com IA  
**Versão:** 1.0  
**Status:** Pronto para refinamento e desenvolvimento assistido por IA, condicionado aos gates M0  
**Autor:** Equipe multidisciplinar da `product-ideation-skill`  
**Data:** 07/08/2026

## 1. Objetivo e decisão de escopo

Este documento transforma o PRD, o ADR e o backlog original do Harness Corporativo de IA em um **backlog único, priorizado, rastreável e executável** para a v1.0 do Domus Corp.[1] [2] [3] [4]

A v1.0 será uma **Plataforma de Inteligência Corporativa com IA**, não apenas um chatbot nem um sistema operacional corporativo completo. A entrega combina uma fundação de governança e execução com uma memória empresarial governada e experiências de inteligência contextual.

> **Decisão de stack da v1.0.** O Harness, o Control Plane, o Model Gateway, o Policy Engine, o Budget/Ledger, o catálogo MCP, a auditoria e o Action Gateway serão desenvolvidos em **TypeScript sobre Node.js com Fastify**. NestJS é permitido somente como camada de convenções sobre o adapter Fastify. Ingestão, parsing, normalização, embeddings, retrieval avançado, transcrição, avaliação, briefings e inteligência serão desenvolvidos em **Python com FastAPI e workers**. OpenAPI, JSON Schema e AsyncAPI são os contratos entre runtimes. A produção terá no máximo **duas linguagens** na v1.0.

Este backlog contém **77 issues de produto, arquitetura, engenharia, dados, UX, QA, segurança, operação e entrega assistida por IA**. As issues P0 são necessárias para uma implantação corporativa minimamente segura; as P1 completam o piloto e a proposta de valor da v1.0. Nenhuma issue P0 pode ser encerrada apenas com código: ela exige evidência de teste, documentação e revisão humana compatível com o risco.

## 2. Protocolo de desenvolvimento assistido por modelos de IA

O projeto poderá utilizar Claude, Gemini, Codex e Kimi como copilotos de análise, implementação, documentação, teste e revisão. Esses modelos não são autoridades do produto, da segurança ou da arquitetura. A responsabilidade final permanece com Product Owner, Arquitetura, Segurança, DBA, QA e Engenharia.

| Tipo de trabalho | Uso recomendado de modelos | Gate humano obrigatório |
|---|---|---|
| Descoberta, requisitos e decisões | Claude ou Kimi para análise crítica e cenários; Gemini para síntese de grandes documentos. | Product Owner e Requisitos aprovam escopo, critérios e ambiguidades. |
| Arquitetura e contratos | Claude/Kimi para alternativas e revisão; Codex para scaffolding de schemas e testes de contrato. | Arquiteto aprova C4, ADR, schemas, fronteiras e invariantes. |
| TypeScript/Fastify | Codex para implementação incremental, testes e refatoração; Claude para revisão de segurança e design. | Engenheiro sênior revisa diff, dependências, tratamento de erros e egress. |
| Python/FastAPI e workers | Codex para adapters, pipelines e testes; Gemini para explorar formatos e documentos multimodais; Claude para revisão de qualidade. | Engenheiro de IA/Backend aprova parsing, retrieval, prompts, limites e dados de teste. |
| UX/UI | Gemini para exploração visual e protótipos; Claude/Kimi para crítica de jornada, acessibilidade e estados. | UX/UI e usuários-piloto aprovam fluxo, acessibilidade e handoff. |
| QA, segurança e red-team | Claude/Kimi para gerar casos adversariais; Codex para automação; Gemini para variações de entrada e documentos. | QA e Segurança aprovam evidências, severidade, cobertura e critérios de release. |
| Banco e migrações | Codex pode gerar migração e testes em ambiente efêmero; Claude pode revisar impacto e rollback. | DBA aprova schema, RLS, índices, migração e restore; nenhuma alteração direta em produção. |

### 2.1. Regras obrigatórias para qualquer issue

1. A issue deve ter um **context pack** com o PRD, o ADR, contratos relevantes, decisão de negócio e arquivos de código envolvidos antes de solicitar geração de código.
2. O modelo deve receber somente o menor contexto necessário; segredos, tokens, dados pessoais reais e dados corporativos não autorizados não entram em prompts.
3. Toda saída gerada por IA deve ser tratada como proposta. Código, schema, prompt, teste, migração e configuração passam por revisão humana e validação automatizada.
4. Um modelo não pode aprovar sua própria saída. Para riscos P0, a revisão deve ser humana e, quando útil, complementada por um segundo modelo independente.
5. Código gerado deve ser pequeno, modular e rastreável à issue. Arquivos longos, duplicação, abstrações não justificadas e dependências novas exigem refatoração ou decisão explícita.
6. O pipeline deve bloquear merge por falha de contrato, teste, segredo, lint, vulnerabilidade crítica, migração inválida ou violação de limite de egress.
7. Nenhum modelo recebe acesso autônomo a produção, Vault, banco produtivo, conectores corporativos ou ferramentas de escrita externa.
8. Cada issue encerrada deve registrar decisões, arquivos alterados, testes executados, limitações conhecidas, revisão humana e evidências anexáveis.

## 3. Convenções do backlog

| Campo | Convenção |
|---|---|
| **ID** | `V1-xxx`, agrupado por épico. |
| **Prioridade** | `P0` para segurança/fundação/capacidade necessária ao piloto; `P1` para completar inteligência, produtividade e operação do piloto. |
| **Marco** | `M0` Fundação; `M1` Harness; `M2` Knowledge Fabric; `M3` Intelligence; `M4` Actions; `M5` Produção/Rollout. |
| **Tipo** | Spike, Feature, Story, Infraestrutura, Dados, UX, QA, Segurança ou Operação. |
| **Estimativa** | S, M, L ou XL, considerando implementação, testes, documentação e revisão. |
| **Critério de aceite** | Sempre escrito em formato **Dado–Quando–Então**; o texto pode conter mais de um cenário. |
| **Definition of Done** | Código revisado, testes adequados, observabilidade, documentação, segurança e evidência de aceite. |
| **Traceabilidade** | `RF-*` do PRD, `H-*` do backlog original ou decisão do ADR. |

## 4. Visão dos épicos e marcos

| Épico | Resultado | Issues | Marco predominante |
|---|---|---:|---|
| **E0 — Fundação, contratos e entrega assistida** | Escopo, arquitetura, contratos, toolchains, ambientes e governança de IA. | 7 | M0 |
| **E1 — Identidade, tenants e administração** | Identidade corporativa, workspaces, papéis e políticas publicáveis. | 5 | M0–M1 |
| **E2 — Cliente desktop e experiência de confiança** | Electron seguro, memória local, chat, citações, skills e acessibilidade. | 8 | M0–M2 |
| **E3 — Harness, gateway e economia de IA** | Model Gateway, providers, policy, budget, auditoria e resiliência. | 8 | M1 |
| **E4 — Knowledge Fabric** | Fontes, ingestão, ciclo de vida, entidades, evidências, ACL e retrieval. | 12 | M2 |
| **E5 — Intelligence Plane** | Respostas fundamentadas, briefings, gaps, mudanças, insights e feedback. | 10 | M3 |
| **E6 — MCP, integrações e ações governadas** | Ferramentas, Action Gateway, conectores, automações e reuniões. | 10 | M4 |
| **E7 — Dados, recuperação e continuidade** | Migrações, RLS, backup, retenção, performance e runbooks de banco. | 5 | M0–M5 |
| **E8 — QA, segurança e avaliação** | Testes multicamada, groundedness, red-team, carga e acessibilidade. | 8 | M0–M5 |
| **E9 — Operação, release e piloto** | Observabilidade, HA, atualizações assinadas, suporte e rollout. | 4 | M5 |

---

# 5. Issues detalhadas

## E0 — Fundação, contratos e entrega assistida por IA

### V1-001 — Aprovar escopo, objetivos e critérios de saída da v1.0

| Campo | Valor |
|---|---|
| **Tipo** | Produto / governança |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Product Owner / Gerente de Projeto |
| **Estimativa** | M |
| **Dependências** | Nenhuma |
| **Rastreabilidade** | PRD 1–5; RF-001; H-001 |
| **Labels** | `product`, `scope`, `governance`, `p0` |

**Objetivo.** Transformar a tese de Plataforma de Inteligência Corporativa com IA em uma linha de base aprovada, com domínios prioritários, usuários-piloto, fontes iniciais, limites de autonomia e critérios de sucesso.

**Critérios de aceite.**

1. **Dado** que o PRD e o ADR foram revisados, **quando** o comitê de produto realizar o gate M0, **então** aprovará formalmente a categoria, o corte da v1.0, os itens fora de escopo e os critérios de saída.
2. **Dado** que o piloto precisa de fontes e owners, **quando** o escopo for aprovado, **então** haverá pelo menos cinco domínios priorizados, owner nominal, fonte inicial, classificação, SLA de frescor e usuário responsável por validação.
3. **Dado** que mudanças de escopo possam ocorrer, **quando** uma nova capacidade for proposta, **então** deverá registrar impacto em prazo, risco, custo, dependências e decisão de inclusão ou adiamento.

**DoD específico.** Ata de decisão, mapa de stakeholders, backlog baseline, critérios de entrada/saída do piloto e matriz de mudanças publicados.

**Assistência de IA.** Claude/Kimi podem propor cenários e riscos; Product Owner aprova a decisão e nenhuma saída de modelo é considerada requisito sem validação humana.

### V1-002 — Consolidar arquitetura C4, threat model e ADR de fronteiras

| Campo | Valor |
|---|---|
| **Tipo** | Spike / Arquitetura / Segurança |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Arquiteto de Software / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-001 |
| **Rastreabilidade** | ADR-001; RF-001; H-001 |
| **Labels** | `architecture`, `c4`, `threat-model`, `security`, `p0` |

**Objetivo.** Atualizar a arquitetura executável com quatro planos — Harness, Knowledge, Intelligence e Action — e registrar fronteiras de confiança, egress, dados e responsabilidades dos dois runtimes.

**Critérios de aceite.**

1. **Dado** o produto e a decisão de stack, **quando** a arquitetura for publicada, **então** conterá C4 de contexto e containers, fluxo de pergunta, fluxo de ingestão e fluxo de ação.
2. **Dado** que Python e TypeScript possuem responsabilidades distintas, **quando** o threat model for revisado, **então** identificará que o Model Gateway TypeScript é o único egress de providers e que workers Python não podem ampliar política ou chamar MCPs diretamente.
3. **Dado** um risco de segredo, tenant escape, prompt injection, budget ou ação indevida, **quando** a matriz de risco for avaliada, **então** haverá mitigação, owner, teste e issue de destino.

**DoD específico.** ADR atualizado, diagramas renderizáveis, threat model com STRIDE/abuso de IA, matriz de riscos e decisão sobre limites de autonomia.

**Assistência de IA.** Claude/Kimi geram alternativas e hipóteses; Arquiteto e Segurança validam todas as fronteiras e rejeitam decisões não explicáveis.

### V1-003 — Versionar contratos cross-runtime e catálogo de schemas

| Campo | Valor |
|---|---|
| **Tipo** | Arquitetura / Contrato |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Arquitetura / Engenharia |
| **Estimativa** | L |
| **Dependências** | V1-002 |
| **Rastreabilidade** | RF-001; RF-047; H-002 |
| **Labels** | `contracts`, `openapi`, `json-schema`, `asyncapi`, `p0` |

**Objetivo.** Definir contratos OpenAPI, JSON Schema e AsyncAPI para comunicação entre TypeScript/Fastify e Python/FastAPI, sem compartilhar classes nativas como mecanismo de integração.

**Critérios de aceite.**

1. **Dado** que os runtimes trocam contexto, **quando** os contratos forem publicados, **então** existirão schemas versionados para `EffectivePolicy`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest`, `UsageLedger`, erros e eventos.
2. **Dado** uma alteração incompatível, **quando** o PR for aberto, **então** o pipeline exigirá nova versão, migração ou compatibilidade temporária documentada.
3. **Dado** qualquer payload cross-runtime, **quando** for validado, **então** carregará `request_id`, `tenant_id`, `workspace_id`, `policy_version`, `classification`, `provenance` e, quando aplicável, `budget_scope`.

**DoD específico.** Diretório `/contracts`, exemplos válidos e inválidos, changelog de schemas, regras de compatibilidade e testes de contrato básicos.

**Assistência de IA.** Codex pode gerar schemas e fixtures; Claude revisa semântica; Engenharia valida manualmente campos de segurança e compatibilidade.

### V1-004 — Criar monorepo poliglota, toolchains e CI/CD reproduzível

| Campo | Valor |
|---|---|
| **Tipo** | Infraestrutura / DevEx |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Engenharia / DevOps |
| **Estimativa** | L |
| **Dependências** | V1-002, V1-003 |
| **Rastreabilidade** | RF-002; H-003; ADR-001 |
| **Labels** | `monorepo`, `typescript`, `python`, `ci-cd`, `p0` |

**Objetivo.** Criar a base do repositório para TypeScript/Fastify e Python/FastAPI/workers, com builds, lint, testes, imagens OCI e execução local reproduzível.

**Critérios de aceite.**

1. **Dado** um clone limpo, **quando** o desenvolvedor executar o bootstrap documentado, **então** os toolchains TypeScript e Python, contratos, banco local e serviços auxiliares iniciam sem configuração manual secreta.
2. **Dado** um pull request, **quando** o CI executar, **então** validará lint, type-check, testes, contratos, dependências, vulnerabilidades, segredos, migrações e build dos dois runtimes.
3. **Dado** um deploy em staging, **quando** as imagens forem publicadas, **então** terão digest verificável, SBOM, versão, logs de build e rollback documentado.

**DoD específico.** `README` de desenvolvimento, scripts de bootstrap, ambientes dev/test/staging, pipeline protegido e primeira execução verde.

**Assistência de IA.** Codex implementa scaffolding e pipelines; Claude revisa segurança da cadeia de build; nenhum modelo recebe secrets reais.

### V1-005 — Instituir governança de desenvolvimento assistido por IA

| Campo | Valor |
|---|---|
| **Tipo** | Processo / Governança / Segurança |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Gerente de Projeto / Engenharia / Segurança |
| **Estimativa** | M |
| **Dependências** | V1-001, V1-002 |
| **Rastreabilidade** | ADR-001; RF-001; risco de desenvolvimento assistido por IA |
| **Labels** | `ai-assisted-development`, `governance`, `security`, `p0` |

**Objetivo.** Definir como Claude, Gemini, Codex e Kimi serão usados no ciclo de desenvolvimento sem transferir para modelos a autoridade de decidir, aprovar ou operar componentes críticos.

**Critérios de aceite.**

1. **Dado** qualquer issue da v1.0, **quando** um modelo for usado, **então** haverá context pack, prompt/resumo de decisão, saída revisada, arquivos alterados, testes e responsável humano registrados.
2. **Dado** código, schema, migração, policy ou prompt gerado por IA, **quando** chegar ao merge, **então** terá revisão humana obrigatória e teste automatizado proporcional ao risco.
3. **Dado** uma tarefa que envolva produção, secrets, dados pessoais ou escrita externa, **quando** for atribuída a um modelo, **então** o modelo não terá acesso autônomo ao ambiente e a ação dependerá de aprovação humana.

**DoD específico.** Política de uso de IA, matriz de responsabilidades, template de context pack, checklist de revisão e registro mínimo de proveniência.

**Assistência de IA.** A própria issue pode ser refinada pelos quatro modelos em revisão cruzada; o Gerente de Projeto e Segurança mantêm a decisão final.

### V1-006 — Provisionar ambientes, configuração e segredos por runtime

| Campo | Valor |
|---|---|
| **Tipo** | Infraestrutura / Segurança |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | DevOps / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-004 |
| **Rastreabilidade** | RF-002; RF-006; H-003; H-012 |
| **Labels** | `environments`, `vault`, `secrets`, `p0` |

**Objetivo.** Configurar dev, test, staging e prod com separação de secrets, identidades de workload, configuração versionada e acesso mínimo para TypeScript, Python, PostgreSQL, Redis, MinIO e Qdrant.

**Critérios de aceite.**

1. **Dado** um serviço TypeScript ou Python, **quando** iniciar, **então** receberá apenas as configurações e referências de segredo necessárias ao seu domínio.
2. **Dado** o ambiente de teste, **quando** uma integração externa não estiver disponível, **então** poderá usar double controlado sem permitir que código de teste acesse produção.
3. **Dado** um segredo rotacionado, **quando** o Vault publicar a nova versão, **então** o gateway e os workers autorizados a usar a referência atual sem reinstalar o cliente.

**DoD específico.** Matriz de acesso, políticas de rede, secrets em runtime, rotação testada, configuração por ambiente e documentação de rollback.

**Assistência de IA.** Codex pode gerar manifests; Segurança e DevOps revisam cada permissão, política de rede e variável.

### V1-007 — Implantar governança de mudanças, versionamento e gates de release

| Campo | Valor |
|---|---|
| **Tipo** | Processo / Release |
| **Prioridade** | P0 |
| **Marco** | M0–M5 |
| **Responsável** | Gerente de Projeto / Release Manager |
| **Estimativa** | M |
| **Dependências** | V1-001, V1-004, V1-005 |
| **Rastreabilidade** | RF-002; RF-046; RN-026; RN-028 |
| **Labels** | `release`, `change-management`, `rollback`, `p0` |

**Objetivo.** Criar o fluxo de mudanças para código, contratos, prompts, modelos, taxonomia, políticas, conectores e índices, com aprovação proporcional ao risco.

**Critérios de aceite.**

1. **Dado** uma mudança em componente P0, **quando** o release for criado, **então** o pipeline mostrará testes, riscos, impacto, versão, evidência e plano de rollback.
2. **Dado** um achado crítico ou alto, **quando** o gate for executado, **então** o release será bloqueado até correção ou aceitação formal por responsável autorizado.
3. **Dado** uma nova versão publicada por anel, **quando** ocorrer falha, **então** será possível pausar e reverter sem perder auditoria ou corromper memória local.

**DoD específico.** Política de branch/merge, matriz de aprovação, changelog, versionamento semântico dos contratos e runbook de rollback.

**Assistência de IA.** Modelos podem gerar release notes e checklist; o responsável humano valida risco e autorização.

---

## E1 — Identidade, tenants e administração

### V1-101 — Implementar SSO, sessão, tenant e registro de dispositivo

| Campo | Valor |
|---|---|
| **Tipo** | Feature / IAM |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Backend TypeScript / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-003, V1-004, V1-006 |
| **Rastreabilidade** | RF-003; H-004 |
| **Labels** | `iam`, `oidc`, `device`, `p0` |

**Objetivo.** Autenticar usuários por IdP corporativo, derivar tenant, papéis, workspaces e dispositivo e permitir revogação imediata.

**Critérios de aceite.**

1. **Dado** um login válido, **quando** a sessão for criada, **então** o servidor associará `tenant_id`, `user_id`, papéis, workspaces, `device_id`, versão do cliente e expiração.
2. **Dado** token expirado, tenant incorreto, audiência inválida ou dispositivo revogado, **quando** uma chamada chegar ao gateway, **então** será rejeitada e auditada.
3. **Dado** que um administrador revogue um dispositivo, **quando** a revogação for publicada, **então** novas chamadas e sessões ativas serão invalidadas dentro do SLA definido.

**DoD específico.** OIDC/PKCE, testes negativos, revogação, sessão de serviço e auditoria de login/logout.

**Assistência de IA.** Codex pode implementar adaptadores e testes; Segurança aprova claims, audiences, scopes e revogação.

### V1-102 — Implementar tenants, workspaces, papéis e RLS lógico

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Administração |
| **Prioridade** | P0 |
| **Marco** | M0–M1 |
| **Responsável** | Backend TypeScript / DBA |
| **Estimativa** | L |
| **Dependências** | V1-101, V1-701 |
| **Rastreabilidade** | RF-003; RF-026; H-017 |
| **Labels** | `tenant`, `workspace`, `rbac`, `rls`, `p0` |

**Objetivo.** Permitir que a empresa organize áreas, usuários, owners e gestores sem permitir atravessamento de tenant ou ampliação indevida de permissão.

**Critérios de aceite.**

1. **Dado** um administrador autorizado, **quando** criar ou arquivar um workspace, **então** membros, owner, domínio, classificação padrão e policy vinculada serão registrados.
2. **Dado** que um usuário pertença a um workspace, **quando** consultar dados, **então** só poderá acessar registros compatíveis com tenant, workspace, papel e classificação.
3. **Dado** um usuário com papel de gestor, **quando** alterar uma regra, **então** só poderá restringir o escopo permitido e não poderá reabrir uma negação global.

**DoD específico.** CRUD admin, RLS no banco, testes cross-tenant e matriz de papéis.

**Assistência de IA.** Codex gera testes de autorização; DBA e Segurança revisam políticas RLS e casos de escape.

### V1-103 — Implementar Policy Engine e EffectivePolicy fail-closed

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Segurança / Backend TypeScript |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-101, V1-102, V1-104, V1-701 |
| **Rastreabilidade** | RF-009; RF-021; RN-001–RN-003; H-014 |
| **Labels** | `policy`, `fail-closed`, `authorization`, `p0` |

**Objetivo.** Calcular a política efetiva por usuário, tenant, workspace, dispositivo, fonte, modelo, ferramenta, ação, classificação e budget.

**Critérios de aceite.**

1. **Dado** políticas global, tenant, workspace e papel, **quando** a `EffectivePolicy` for calculada, **então** a composição será monotônica e carregará origem, versão, decisão e motivos de negação.
2. **Dado** ausência, conflito, timeout, cache inválido ou revogação, **quando** uma operação for avaliada, **então** chat, retrieval, insight e ação serão bloqueados de forma auditável.
3. **Dado** um payload adulterado pelo cliente, **quando** chegar ao gateway, **então** o servidor ignorará permissões declaradas no payload e recalculará o escopo.

**DoD específico.** Engine isolado, contrato `EffectivePolicy`, cache versionado, testes de propriedade e matriz de falhas.

**Assistência de IA.** Claude pode revisar regras; Codex implementa cenários. Segurança e Requisitos aprovam a semântica, não apenas o código.

### V1-104 — Administrar catálogo de modelos, ferramentas, capacidades e permissões

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Painel Admin |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / Frontend |
| **Estimativa** | L |
| **Dependências** | V1-102, V1-103, V1-303, V1-601 |
| **Rastreabilidade** | RF-008; RF-036; H-013; H-018; H-023 |
| **Labels** | `admin`, `catalog`, `providers`, `mcp`, `p0` |

**Objetivo.** Expor um catálogo efetivo de modelos, providers, MCPs, skills e capacidades como Bash/Read/Write, com estado, owner, risco e permissões.

**Critérios de aceite.**

1. **Dado** um item de catálogo, **quando** for publicado, **então** terá identificador estável, capacidades, limites, classificação, custo, owner, versão, estado e justificativa.
2. **Dado** uma política por workspace, **quando** o cliente receber o catálogo, **então** visualizará somente itens autorizados e não poderá habilitar um item negado via UI ou request adulterado.
3. **Dado** uma capacidade de alto risco, **quando** for habilitada, **então** exigirá risco, justificativa, sandbox e aprovação correspondente.

**DoD específico.** API, UI, versionamento, estados de aprovação e testes de autorização.

**Assistência de IA.** Gemini pode apoiar a documentação de capacidades; Segurança aprova riscos e permissões.

### V1-105 — Criar simulador, aprovação e rollback de políticas

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Governança |
| **Prioridade** | P1 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / UX Admin |
| **Estimativa** | L |
| **Dependências** | V1-103, V1-104, V1-306 |
| **Rastreabilidade** | RF-009; RN-026; H-022 |
| **Labels** | `policy`, `simulation`, `approval`, `p1` |

**Objetivo.** Permitir que administradores visualizem o impacto de uma mudança antes da publicação e revertam políticas sem apagar histórico.

**Critérios de aceite.**

1. **Dado** uma alteração proposta, **quando** o simulador for executado, **então** exibirá política antes/depois, usuários afetados, modelos, fontes, ferramentas, ações e impacto estimado no budget.
2. **Dado** uma mudança de alto risco, **quando** for submetida, **então** exigirá aprovação independente antes de publicação.
3. **Dado** uma política publicada, **quando** ocorrer rollback, **então** a versão anterior será reativada atomicamente e novas requisições usarão a versão correta.

**DoD específico.** Simulação sem chamadas externas, fluxo de aprovação, rollback e auditoria de leitura/publicação.

**Assistência de IA.** Claude pode resumir impacto; a decisão de publicação é humana e auditada.

---

## E2 — Cliente desktop e experiência de confiança

### V1-201 — Criar shell Electron seguro e IPC mínimo

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Cliente / Segurança |
| **Prioridade** | P0 |
| **Marco** | M0 |
| **Responsável** | Frontend Desktop / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-002, V1-004, V1-101 |
| **Rastreabilidade** | RF-004; H-005 |
| **Labels** | `electron`, `desktop`, `ipc`, `p0` |

**Objetivo.** Entregar o shell Electron com `contextIsolation`, `sandbox`, `nodeIntegration=false`, CSP, preload mínimo e IPC validado.

**Critérios de aceite.**

1. **Dado** o renderer em execução, **quando** tentar acessar Node, filesystem, subprocesso ou segredo diretamente, **então** o acesso será negado.
2. **Dado** uma chamada IPC, **quando** for enviada, **então** será validada por schema, allowlist, origem e versão do cliente.
3. **Dado** um instalador limpo, **quando** iniciar, **então** conseguirá autenticar e consultar healthcheck sem conter API key de provider.

**DoD específico.** Teste de isolamento, CSP, preload documentado, scanner de dependência e pacote instalável.

**Assistência de IA.** Codex pode criar scaffolding; Segurança revisa IPC e usa red-team antes do aceite.

### V1-202 — Implementar onboarding, identidade local e consentimento de contexto

| Campo | Valor |
|---|---|
| **Tipo** | Feature / UX / Privacidade |
| **Prioridade** | P0 |
| **Marco** | M0–M1 |
| **Responsável** | Frontend / UX / Privacidade |
| **Estimativa** | M |
| **Dependências** | V1-201, V1-101 |
| **Rastreabilidade** | RF-005; H-006 |
| **Labels** | `onboarding`, `local-identity`, `privacy`, `p0` |

**Objetivo.** Coletar nome, cargo, atividades, rotina e preferências com revisão explícita, separando o que ficará local do que será enviado ao gateway.

**Critérios de aceite.**

1. **Dado** o primeiro acesso, **quando** o onboarding for iniciado, **então** o usuário poderá revisar, editar, pausar e concluir os dados sem duplicidade.
2. **Dado** um contexto pessoal, **quando** o usuário confirmar, **então** o sistema indicará campo, escopo, retenção e possibilidade de exclusão.
3. **Dado** um dado marcado como local, **quando** uma requisição for enviada, **então** ele não será anexado automaticamente ao contexto corporativo.

**DoD específico.** Fluxo acessível, arquivos locais versionados, consentimento e testes de retomada.

**Assistência de IA.** Gemini pode propor cópia e variações de onboarding; UX e Privacidade aprovam o conteúdo.

### V1-203 — Implementar memória pessoal local, histórico e recuperação em SQLite

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Dados locais |
| **Prioridade** | P0 |
| **Marco** | M1–M2 |
| **Responsável** | Frontend Desktop / Dados |
| **Estimativa** | L |
| **Dependências** | V1-201, V1-202, V1-701 |
| **Rastreabilidade** | RF-005; RF-026; RN-012; H-007 |
| **Labels** | `memory`, `sqlite`, `privacy`, `p0` |

**Objetivo.** Persistir resumos, preferências, histórico permitido e contexto individual no dispositivo, com recuperação local e sem mistura automática com a memória normativa.

**Critérios de aceite.**

1. **Dado** o encerramento de uma sessão, **quando** o resumo for persistido, **então** terá origem, escopo, data, versão e retenção configurada.
2. **Dado** uma consulta local, **quando** a memória for recuperada, **então** somente itens autorizados ao usuário/dispositivo serão usados.
3. **Dado** que o usuário solicite exclusão, **quando** confirmar, **então** o item será removido localmente e a operação será comprovada sem apagar indevidamente a auditoria mínima.

**DoD específico.** Migrações SQLite, proteção em repouso, limite de armazenamento, recuperação após desligamento e exportação controlada.

**Assistência de IA.** Codex pode implementar repositório e testes; Privacidade revisa retenção e exclusão.

### V1-204 — Implementar OAuth local e armazenamento seguro em Keychain

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Segurança |
| **Prioridade** | P0 |
| **Marco** | M1–M4 |
| **Responsável** | Frontend Desktop / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-201, V1-101, V1-006 |
| **Rastreabilidade** | RF-006; H-008 |
| **Labels** | `oauth`, `keychain`, `tokens`, `p0` |

**Objetivo.** Conectar integrações autorizadas pelo colaborador sem armazenar tokens em arquivos, SQLite, logs ou contexto de modelo.

**Critérios de aceite.**

1. **Dado** uma conexão OAuth, **quando** o callback for concluído, **então** tokens serão armazenados no Keychain/Vault adequado e somente referências serão mantidas no cliente.
2. **Dado** token expirado, desconectado ou revogado, **quando** a integração for usada, **então** a interface indicará recuperação segura sem expor o token.
3. **Dado** uma cópia do diretório local do app, **quando** for inspecionada, **então** não conterá token utilizável.

**DoD específico.** Conectar, renovar, desconectar, revogar, testar em sistemas suportados e auditar sem segredo.

**Assistência de IA.** Codex pode escrever adapters; Segurança valida fluxo OAuth e armazenamento em cada SO suportado.

### V1-205 — Criar Design System, acessibilidade e estados semânticos

| Campo | Valor |
|---|---|
| **Tipo** | UX/UI / Frontend / A11y |
| **Prioridade** | P0 |
| **Marco** | M0–M2 |
| **Responsável** | UX/UI / Frontend |
| **Estimativa** | L |
| **Dependências** | V1-001, V1-002, V1-003, V1-004 |
| **Rastreabilidade** | RF-004; RF-024–RF-026; RF-048; NFR de acessibilidade, consistência visual e UX de confiança; PRD 1.8; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `design-system`, `shadcn`, `tokens`, `wcag`, `a11y`, `light-dark`, `compact`, `p0` |

**Objetivo.** Criar a biblioteca de interface Domus sobre shadcn/ui, Tailwind CSS, Radix UI e Lucide Icons, usando tokens BetaUp, temas light/dark, densidades `default`/`compact`, variantes de Button sem Indigo/Violeta e os oito estados semânticos da IA para Electron, painel e workbenches.

**Critérios de aceite.**

1. **Dado** o repositório configurado, **quando** os primitivos forem implementados, **então** Button, Badge, Alert, Card, Dialog, Sheet, Table, Tabs, Command, Tooltip, Select e Skeleton usarão tokens semânticos e variantes versionadas do shadcn/ui, sem hexadecimais diretos fora dos arquivos de tokens/testes.
2. **Dado** qualquer variante de Button, **quando** seus estilos forem compilados, renderizados ou revisados, **então** não conterão Core Indigo `#271BAE`, Beta Violet `#310AE3`, `bg-indigo-*`, `bg-violet-*`, `brand-depth` ou `brand-secondary` em background, hover, active ou borda ativa.
3. **Dado** uma resposta ou insight da IA, **quando** for renderizado, **então** usará o estado de contrato Fundamentada, Parcial, Conflitante, Inferida, Sem evidência, Obsoleta, Bloqueada ou Inconclusiva com label, ícone, descrição, tom e próxima ação, sem depender apenas da cor.
4. **Dado** um fluxo Chat, Evidence, Knowledge Workbench, Intelligence Workbench ou Action Review, **quando** alternar entre light/dark e `default`/`compact`, **então** manterá semântica, contraste, foco e hierarquia informacional.
5. **Dado** um Select ou lista de governança, **quando** for renderizado, **então** nenhum `Select.Item` terá valor vazio e as opções serão alfabéticas salvo ordenação de prioridade, risco ou recência explicitamente declarada.
6. **Dado** um fluxo crítico, **quando** os testes de axe-core/Playwright e snapshots forem executados, **então** teclado, foco, leitor de tela, zoom de 200%, reduced motion, contraste e guardrail de Button passarão sem regressão crítica.

**DoD específico.** Tokens CSS/HSL e TS, variantes `cva` de Button, 12 componentes compostos Domus, documentação, Storybook, snapshots light/dark e `default`/`compact`, axe-core, Playwright, checklist WCAG 2.2 AA, handoff e owners de manutenção.

**Assistência de IA.** Gemini pode gerar variações visuais; Claude/Kimi criticam hierarquia, estados e acessibilidade; Codex implementa componentes e testes; UX, QA e Engenharia aprovam o código e as evidências.

### V1-206 — Entregar chat corporativo com streaming, histórico e estados de erro

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Frontend |
| **Prioridade** | P0 |
| **Marco** | M1–M2 |
| **Responsável** | Frontend Desktop / Backend Gateway |
| **Estimativa** | L |
| **Dependências** | V1-201, V1-103, V1-205, V1-301, V1-307 |
| **Rastreabilidade** | RF-007; RF-024; RF-048; H-009; H-011; H-015 |
| **Labels** | `chat`, `streaming`, `history`, `p0` |

**Objetivo.** Criar a experiência principal de pergunta, resposta incremental, cancelamento, histórico e tratamento explicável de falha, bloqueio e ausência de evidência.

**Critérios de aceite.**

1. **Dado** uma requisição autorizada, **quando** o gateway transmitir eventos, **então** o cliente exibirá `StreamingIndicator`/`AiResponseCard`, streaming tipado, status, citações e conclusão sem API key.
2. **Dado** bloqueio por policy, budget, timeout ou provider, **quando** o evento terminal chegar, **então** a interface apresentará o estado correto com label, ícone, descrição e próxima ação segura, distinguindo falha técnica, bloqueio, ausência de evidência e conflito.
3. **Dado** histórico classificado, **quando** for salvo, **então** respeitará retenção, escopo e exclusão definidos.
4. **Dado** o chat em light/dark ou `default`/`compact`, **quando** o usuário navegar por teclado ou zoom de 200%, **então** streaming, foco, `aria-live`, contraste e leitura não sofrerão regressão.

**DoD específico.** SSE, cancelamento, reconexão segura, `AiResponseCard`, `StreamingIndicator`, testes de evento, histórico, estados semânticos, snapshots visuais e axe/Playwright.

**Assistência de IA.** Codex implementa componentes e testes; Claude revisa concorrência, cancelamento e manipulação de erro.

### V1-207 — Implementar experiência de citações, evidências e proveniência

| Campo | Valor |
|---|---|
| **Tipo** | UX / Frontend / Knowledge |
| **Prioridade** | P0 |
| **Marco** | M2–M3 |
| **Responsável** | UX/UI / Frontend / Intelligence |
| **Estimativa** | L |
| **Dependências** | V1-205, V1-206, V1-405, V1-411, V1-501 |
| **Rastreabilidade** | RF-019; RF-024; RF-025; H-029; INTEL-002 |
| **Labels** | `citations`, `evidence`, `provenance`, `p0` |

**Objetivo.** Permitir que o usuário inspecione fonte, versão, seção, owner, vigência, escopo e confiança sem abandonar a tarefa.

**Critérios de aceite.**

1. **Dado** uma afirmação factual, **quando** o usuário abrir a `CitationPill`, **então** o `EvidenceSheet` exibirá o trecho exato, documento, versão, seção, owner e vigência autorizados.
2. **Dado** fonte obsoleta ou conflitante, **quando** a evidência for aberta, **então** o `SourceFreshnessBadge`/alerta aparecerá antes da interpretação, indicará a divergência e preservará as fontes lado a lado.
3. **Dado** uma evidência fora do escopo, **quando** a API retornar, **então** a UI não exibirá trecho, título, tooltip, `aria-label` ou metadado que revele conteúdo protegido.
4. **Dado** o modo compacto ou um viewport ampliado, **quando** o painel for aberto e fechado por teclado, **então** foco, leitura, scroll, contraste e ordem de conteúdo permanecerão corretos.

**DoD específico.** `CitationPill`, `EvidenceSheet`, `SourceFreshnessBadge`, painel lateral, deep link seguro, estados de loading/erro/bloqueio, snapshots light/dark, testes de acessibilidade e dados sintéticos.

**Assistência de IA.** Gemini pode apoiar prototipagem; Codex implementa componentes; UX e Segurança validam a exposição mínima.

### V1-208 — Implementar workspace de skills locais com limites de segurança

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Cliente / Governança |
| **Prioridade** | P1 |
| **Marco** | M2 |
| **Responsável** | Frontend Desktop / Policy |
| **Estimativa** | M |
| **Dependências** | V1-202, V1-203, V1-104 |
| **Rastreabilidade** | RF-005; H-010 |
| **Labels** | `skills`, `local`, `workspace`, `p1` |

**Objetivo.** Permitir skills locais editáveis sem que instruções pessoais concedam novos modelos, ferramentas, permissões ou egress.

**Critérios de aceite.**

1. **Dado** uma skill local, **quando** for salva, **então** terá nome, versão, autor, escopo, tamanho máximo, estado e data.
2. **Dado** uma skill que tente conceder Bash, Write, MCP ou modelo não permitido, **quando** for ativada, **então** será bloqueada ou reduzida pela `EffectivePolicy`.
3. **Dado** o usuário solicitar exportação ou exclusão, **quando** confirmar, **então** a operação ocorrerá sem incluir secrets ou memória não selecionada.

**DoD específico.** Editor, validação, ativar/desativar, duplicar, exportar, excluir e testes de prompt injection.

**Assistência de IA.** Codex pode gerar editor e schemas; Segurança revisa que skill nunca é policy.

---

## E3 — Harness, gateway e economia de IA

### V1-301 — Implementar Model Gateway TypeScript/Fastify

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Backend / Segurança |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript |
| **Estimativa** | XL |
| **Dependências** | V1-003, V1-006, V1-101, V1-103, V1-302 |
| **Rastreabilidade** | RF-007; H-011 |
| **Labels** | `gateway`, `fastify`, `llm`, `p0` |

**Objetivo.** Criar o único ponto autorizado para admitir requests, resolver policy, controlar orçamento, redigir dados, chamar providers e transmitir respostas.

**Critérios de aceite.**

1. **Dado** um request de cliente ou worker, **quando** chegar ao gateway, **então** será validado por autenticação, tenant, workspace, schema, policy, classificação, budget e `request_id`.
2. **Dado** uma chamada permitida, **quando** o provider for invocado, **então** a credencial será injetada server-side e nenhum cabeçalho ou segredo interno retornará ao consumidor.
3. **Dado** um provider, payload, modelo ou contexto não permitido, **quando** o request for processado, **então** será negado com erro tipado e auditoria.

**DoD específico.** Endpoints REST/SSE, cliente interno para Python, erros, timeouts, métricas, tracing e testes de contrato.

**Assistência de IA.** Codex implementa vertical slices; Claude revisa segurança e Fastify; merge exige revisão humana de egress.

### V1-302 — Implementar Vault server-side, credenciais e rotação de providers

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Segurança |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Segurança / DevOps / Backend TypeScript |
| **Estimativa** | L |
| **Dependências** | V1-006, V1-301 |
| **Rastreabilidade** | RF-006; H-012 |
| **Labels** | `vault`, `secrets`, `rotation`, `p0` |

**Objetivo.** Proteger API keys e credenciais pagas pela empresa, permitindo cadastro, teste, rotação, revogação e uso por identidade de serviço.

**Critérios de aceite.**

1. **Dado** uma credencial cadastrada, **quando** o gateway precisar do provider, **então** lerá o segredo por referência autorizada, sem persisti-lo no PostgreSQL, cliente ou logs.
2. **Dado** uma rotação, **quando** a nova versão for ativada, **então** novas chamadas usarão a credencial nova e a antiga poderá ser revogada sem reinstalar clientes.
3. **Dado** telemetria ou erro, **quando** o scanner rodar, **então** não encontrará o segredo em logs, traces, métricas, artefatos ou respostas.

**DoD específico.** Políticas de Vault, workload identity, rotação, teste de provider e redaction.

**Assistência de IA.** Codex gera adapter; Segurança e DevOps revisam permissões e rotação em ambiente isolado.

### V1-303 — Implementar catálogo de providers, modelos, capacidades e roteamento

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Backend / Admin |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / Produto |
| **Estimativa** | L |
| **Dependências** | V1-104, V1-302 |
| **Rastreabilidade** | RF-008; H-013 |
| **Labels** | `models`, `providers`, `routing`, `p0` |

**Objetivo.** Cadastrar modelos com capacidades, contexto, preço, classificação, limites, status, fallback e regras de uso por tarefa.

**Critérios de aceite.**

1. **Dado** um modelo, **quando** for publicado, **então** terá ID, provider, capacidades, input/output price, limite, classificação, disponibilidade e versão de preço.
2. **Dado** uma tarefa, **quando** o roteador selecionar modelo, **então** escolherá apenas modelo ativo, credenciado, compatível com classificação, custo, contexto e policy.
3. **Dado** fallback configurado, **quando** o provider principal falhar, **então** o fallback respeitará custo, privacidade e capacidade ou negará a operação.

**DoD específico.** Catálogo admin, roteamento determinístico, fallback, versionamento e testes.

**Assistência de IA.** Claude pode revisar matriz de seleção; Product Owner aprova defaults e limites de custo.

### V1-304 — Implementar classificação, redaction e governança de egress

| Campo | Valor |
|---|---|
| **Tipo** | Segurança / Dados |
| **Prioridade** | P0 |
| **Marco** | M1–M2 |
| **Responsável** | Segurança / Backend TypeScript |
| **Estimativa** | L |
| **Dependências** | V1-103, V1-301, V1-302 |
| **Rastreabilidade** | RF-006; RF-042; RN-005; H-035 |
| **Labels** | `classification`, `redaction`, `privacy`, `p0` |

**Objetivo.** Classificar dados, decidir o que pode sair para cada provider e mascarar ou bloquear PII, secrets e conteúdo proibido antes do egress.

**Critérios de aceite.**

1. **Dado** um contexto classificado, **quando** for preparado para provider, **então** a policy verificará se o modelo suporta a classificação e aplicará redaction configurado.
2. **Dado** um secret, PII ou padrão bloqueado, **quando** aparecer no payload, **então** será mascarado ou a chamada será negada antes do egress.
3. **Dado** uma exceção aprovada, **quando** ocorrer, **então** terá owner, justificativa, vigência e auditoria sem expor o dado em logs.

**DoD específico.** Taxonomia de classificação, redactors testados, política de egress, casos positivos/negativos e métricas.

**Assistência de IA.** Modelos podem gerar casos de redaction; Segurança deve revisar falsos negativos com dados sintéticos.

### V1-305 — Implementar pré-check, reserva atômica e reconciliação de budget

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Financeiro / Backend |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / DBA |
| **Estimativa** | XL |
| **Dependências** | V1-103, V1-303, V1-701 |
| **Rastreabilidade** | RF-010; RN-004; H-019 |
| **Labels** | `budget`, `ledger`, `atomicity`, `p0` |

**Objetivo.** Impedir consumo acima do orçamento por usuário, workspace, tenant, tarefa ou provider, inclusive sob concorrência e retry.

**Critérios de aceite.**

1. **Dado** uma chamada, **quando** o pré-check server-side ocorrer, **então** o sistema reservará custo estimado atomicamente antes do provider.
2. **Dado** concorrência, **quando** duas chamadas consumirem o saldo restante, **então** somente a combinação permitida será admitida e nenhuma corrida excederá o limite.
3. **Dado** custo real diferente da estimativa, **quando** a chamada terminar, **então** o ledger reconciliará consumo e liberará ou cobrará a diferença de modo idempotente.

**DoD específico.** Transação, locks, estados de reserva, concorrência, overflow, alertas e reconciliação.

**Assistência de IA.** Codex gera testes de concorrência; DBA aprova isolamento e rollback; não aceitar implementação sem evidência de carga.

### V1-306 — Implementar ledger, atribuição de custos e dashboards

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Dados / Admin |
| **Prioridade** | P0 para ledger; P1 para dashboards |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / Frontend Admin / Finanças |
| **Estimativa** | L |
| **Dependências** | V1-305, V1-308 |
| **Rastreabilidade** | RF-010; RF-011; H-020; H-021 |
| **Labels** | `usage`, `cost`, `dashboard`, `p0`, `p1` |

**Objetivo.** Exibir e exportar consumo por usuário, workspace, tenant, provider, modelo, ferramenta, tipo de tarefa e período.

**Critérios de aceite.**

1. **Dado** uma chamada admitida, negada ou falha relevante, **quando** o ledger registrar, **então** terá estado idempotente, tokens, custo estimado/real, preço vigente e correlação.
2. **Dado** um administrador autorizado, **quando** consultar dashboard, **então** poderá filtrar, agrupar, exportar e ver atraso de reconciliação sem atravessar tenant.
3. **Dado** um limiar de custo ou crescimento anômalo, **quando** for excedido, **então** o sistema alertará owner e aplicará ação definida pela policy.

**DoD específico.** Ledger, consultas, exportação, dashboard, alertas e reconciliação com provider.

**Assistência de IA.** Gemini pode apoiar exploração de dashboards; Codex implementa queries; Finanças valida semântica de custo.

### V1-307 — Implementar streaming resiliente, rate limit e circuit breaker

| Campo | Valor |
|---|---|
| **Tipo** | Confiabilidade / Backend |
| **Prioridade** | P0 |
| **Marco** | M1 |
| **Responsável** | Backend TypeScript / SRE |
| **Estimativa** | L |
| **Dependências** | V1-301, V1-303, V1-305 |
| **Rastreabilidade** | RF-007; RF-041; H-015 |
| **Labels** | `streaming`, `timeouts`, `circuit-breaker`, `p0` |

**Objetivo.** Controlar conexão, primeiro byte, duração, tamanho, concorrência e falhas de provider sem duplicar ação.

**Critérios de aceite.**

1. **Dado** provider lento ou indisponível, **quando** os limites forem atingidos, **então** o circuito abrirá, a resposta será inconclusiva e o usuário receberá motivo seguro.
2. **Dado** picos de uso, **quando** rate limit por tenant/usuário/workspace/provider for excedido, **então** a chamada será rejeitada sem contornar policy ou budget.
3. **Dado** streaming parcial, **quando** a conexão for perdida, **então** o cliente distinguirá cancelamento, falha e conclusão e não repetirá operação não idempotente.

**DoD específico.** Timeouts, cancelamento, backpressure, rate limits, circuit breaker, métricas e testes de falha.

**Assistência de IA.** Codex implementa testes de caos; Claude revisa estados de corrida e limites.

### V1-308 — Implementar auditoria correlacionada e auditoria de leitura

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Compliance |
| **Prioridade** | P0 |
| **Marco** | M1–M5 |
| **Responsável** | Backend TypeScript / Segurança / DBA |
| **Estimativa** | L |
| **Dependências** | V1-301, V1-303, V1-305, V1-701 |
| **Rastreabilidade** | RF-011; RF-043; H-016 |
| **Labels** | `audit`, `traceability`, `compliance`, `p0` |

**Objetivo.** Explicar cada request, recuperação, insight, policy, custo e ação usando metadados mínimos, sem reter indiscriminadamente conteúdo sensível.

**Critérios de aceite.**

1. **Dado** qualquer operação, **quando** terminar, **então** haverá `request_id`, ator, tenant, workspace, policy/model version, fonte/tool, custo, latência e resultado.
2. **Dado** prompt, resposta, documento ou segredo classificado, **quando** for auditado, **então** o conteúdo será redigido, criptografado ou excluído conforme retenção.
3. **Dado** leitura administrativa de auditoria, **quando** ocorrer, **então** a própria leitura será registrada com finalidade e escopo.

**DoD específico.** Schema auditável, append-only para operadores comuns, exportação controlada, retenção e correlação OpenTelemetry.

**Assistência de IA.** Claude pode revisar campos de auditoria; Segurança e DBA aprovam retenção e imutabilidade.

---

## E4 — Knowledge Fabric

### V1-401 — Criar Source Registry com owners, SLA, classificação e escopo

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Knowledge Governance |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Knowledge Product / Backend TypeScript |
| **Estimativa** | L |
| **Dependências** | V1-102, V1-103, V1-701 |
| **Rastreabilidade** | RF-012; PRD 5.2.2 |
| **Labels** | `source-registry`, `owner`, `freshness`, `p0` |

**Objetivo.** Registrar cada fonte com owner, escopo, classificação, conector, frequência, SLA de frescor, retenção e estado.

**Critérios de aceite.**

1. **Dado** uma fonte, **quando** for cadastrada, **então** possuirá owner, sistema de origem, tenant/workspace, classificação, periodicidade, SLA, retenção e status.
2. **Dado** uma fonte sem owner ou classificação, **quando** tentar ser publicada, **então** ficará pendente e não fundamentará resposta normativa.
3. **Dado** um owner revogado ou fonte desconectada, **quando** o estado mudar, **então** novas ingestões serão pausadas e o impacto ficará visível.

**DoD específico.** API, UI admin, estados, owner workflow e auditoria.

**Assistência de IA.** Claude pode apoiar taxonomia de metadados; Owner de Conhecimento valida significado e responsabilidade.

### V1-402 — Criar framework de conectores de fontes e cursores de sincronização

| Campo | Valor |
|---|---|
| **Tipo** | Plataforma / Integrações |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Backend TypeScript / Python Workers |
| **Estimativa** | L |
| **Dependências** | V1-003, V1-401, V1-204 |
| **Rastreabilidade** | RF-013; RF-015 |
| **Labels** | `connectors`, `sync`, `oauth`, `p0` |

**Objetivo.** Definir adapter de fonte com autenticação, cursor, paginação, retry, deduplicação, ACL de origem, pausa e reprocessamento.

**Critérios de aceite.**

1. **Dado** um conector aprovado, **quando** sincronizar, **então** usará escopo OAuth mínimo, cursor persistente, paginação segura e evento de progresso/falha.
2. **Dado** retry ou execução concorrente, **quando** o cursor for atualizado, **então** não haverá perda, duplicação silenciosa ou regressão de versão.
3. **Dado** revogação de fonte, **quando** ocorrer, **então** sync e jobs derivados serão pausados e auditados.

**DoD específico.** Interface de connector, double, contrato, cursor, backoff, dead-letter e documentação para novos adapters.

**Assistência de IA.** Codex pode gerar adapter base; Engenharia e Segurança revisam OAuth, paginação e tratamento de dados.

### V1-403 — Implementar armazenamento bruto imutável em MinIO/S3

| Campo | Valor |
|---|---|
| **Tipo** | Dados / Storage |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Backend Python / DBA / DevOps |
| **Estimativa** | L |
| **Dependências** | V1-401, V1-006 |
| **Rastreabilidade** | RF-014; H-027 |
| **Labels** | `minio`, `object-storage`, `immutable`, `p0` |

**Objetivo.** Armazenar originais, versões e artefatos de conhecimento com hash, classificação, retenção e possibilidade de reconstrução.

**Critérios de aceite.**

1. **Dado** um artefato recebido, **quando** for aceito, **então** será armazenado em objeto versionado e imutável com checksum, source, asset, classificação e timestamp.
2. **Dado** arquivo inválido, malware ou tamanho proibido, **quando** for recebido, **então** ficará rejeitado/quarentenado sem entrar no índice.
3. **Dado** expiração ou solicitação de exclusão, **quando** a retenção for executada, **então** o objeto será removido ou arquivado conforme policy e a evidência da operação será preservada.

**DoD específico.** Buckets, políticas de acesso, versionamento, checksum, lifecycle e testes de restore.

**Assistência de IA.** Codex pode gerar adapter e fixtures; DevOps e DBA aprovam permissões e lifecycle.

### V1-404 — Implementar pipeline Python de ingestão, parsing e normalização

| Campo | Valor |
|---|---|
| **Tipo** | Backend Python / Knowledge |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Backend Python / Knowledge Engineering |
| **Estimativa** | XL |
| **Dependências** | V1-402, V1-403, V1-003 |
| **Rastreabilidade** | RF-014–RF-016; H-027; ENG-005 |
| **Labels** | `ingestion`, `parsing`, `normalization`, `python`, `p0` |

**Objetivo.** Receber documentos e registros, extrair conteúdo, normalizar metadados, detectar duplicidade e publicar eventos de processamento.

**Critérios de aceite.**

1. **Dado** um documento de formato suportado, **quando** o worker processar, **então** produzirá texto/estrutura, páginas/seções, hash, idioma, classificação, origem e estado observável.
2. **Dado** parser indisponível ou conteúdo corrompido, **quando** o processamento falhar, **então** o asset permanecerá em erro/quarentena com motivo e retry controlado.
3. **Dado** dois conteúdos com mesmo hash e versão, **quando** forem ingeridos, **então** o pipeline será idempotente e não duplicará ativo ou custo.

**DoD específico.** Parsers prioritários, filas, estados, métricas, dados sintéticos e reprocessamento.

**Assistência de IA.** Gemini pode auxiliar formatos multimodais; Codex implementa parsers e testes; todo parser passa por revisão de segurança.

### V1-405 — Implementar versionamento, aprovação, vigência e frescor de fontes

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Governança de Dados |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Knowledge Governance / Backend |
| **Estimativa** | L |
| **Dependências** | V1-401, V1-404, V1-701 |
| **Rastreabilidade** | RF-020; RN-006–RN-010; H-030 |
| **Labels** | `versioning`, `approval`, `freshness`, `p0` |

**Objetivo.** Impedir que conteúdo pendente, expirado, revogado ou conflitante seja tratado como verdade vigente.

**Critérios de aceite.**

1. **Dado** uma nova versão, **quando** entrar no pipeline, **então** ficará `pending_review` até aprovação do owner/regra autorizada.
2. **Dado** documento expirado, revogado ou fora do SLA, **quando** o retrieval ocorrer, **então** será excluído ou rotulado como obsoleto conforme policy.
3. **Dado** versões conflitantes, **quando** forem detectadas, **então** o sistema criará conflito com owners e não combinará as fontes silenciosamente.

**DoD específico.** State machine, owner workflow, freshness score, alertas e histórico.

**Assistência de IA.** Claude pode sugerir conflitos e resumos; somente owner autorizado publica a versão normativa.

### V1-406 — Criar quarentena e defesa contra prompt injection indireto

| Campo | Valor |
|---|---|
| **Tipo** | Segurança / Knowledge |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Segurança / Backend Python |
| **Estimativa** | L |
| **Dependências** | V1-404, V1-405, V1-304 |
| **Rastreabilidade** | RF-016; RF-042; RF-045; H-025; H-035 |
| **Labels** | `prompt-injection`, `quarantine`, `untrusted-data`, `p0` |

**Objetivo.** Tratar documentos, e-mails, páginas e resultados de ferramentas como dados não confiáveis, isolando conteúdo suspeito antes do uso em contexto de IA.

**Critérios de aceite.**

1. **Dado** conteúdo ingerido contendo instrução de override, exfiltração ou execução, **quando** for normalizado, **então** será marcado como dado externo e não poderá alterar system prompt, policy ou alçada.
2. **Dado** score de malícia acima do limiar, **quando** o pipeline classificar, **então** o asset será quarentenado e o owner notificado.
3. **Dado** conteúdo recuperado para o modelo, **quando** o contexto for montado, **então** haverá delimitação explícita entre instruções do sistema e dados recuperados.

**DoD específico.** Scanners, estados, fixtures maliciosos, testes de exfiltração e runbook de quarentena.

**Assistência de IA.** Claude/Kimi geram ataques; Segurança decide limiares e revisa falsos negativos.

### V1-407 — Criar taxonomia, vocabulário e classificação corporativa

| Campo | Valor |
|---|---|
| **Tipo** | Knowledge Governance / Dados |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Product/Knowledge Owners |
| **Estimativa** | L |
| **Dependências** | V1-001, V1-401, V1-405 |
| **Rastreabilidade** | RF-017; RF-042 |
| **Labels** | `taxonomy`, `classification`, `knowledge`, `p0` |

**Objetivo.** Definir termos, domínios, tipos de ativo, sinônimos, níveis de classificação, retenção e owners para os domínios do piloto.

**Critérios de aceite.**

1. **Dado** um domínio piloto, **quando** a taxonomia for publicada, **então** haverá termos canônicos, sinônimos, hierarquia, owner, versão e regras de classificação.
2. **Dado** um asset normalizado, **quando** for classificado, **então** receberá domínio, tipo, sensibilidade, retenção e status de confiança observável.
3. **Dado** alteração de termo ou classificação, **quando** for publicada, **então** a versão será preservada e os índices derivados terão plano de reprocessamento.

**DoD específico.** Taxonomia inicial, UI de administração, seeds, versionamento e exemplos de busca.

**Assistência de IA.** Gemini pode sugerir sinônimos e agrupamentos; Knowledge Owner aprova vocabulário e classificação.

### V1-408 — Implementar entidades, relações, claims e evidências

| Campo | Valor |
|---|---|
| **Tipo** | Dados / Knowledge Graph Lite |
| **Prioridade** | P0 para claims/evidências; P1 para relações avançadas |
| **Marco** | M2–M3 |
| **Responsável** | Backend Python / DBA / Knowledge |
| **Estimativa** | XL |
| **Dependências** | V1-404, V1-405, V1-407, V1-701 |
| **Rastreabilidade** | RF-018; RF-019; RF-033; KNOW-002 |
| **Labels** | `entities`, `relations`, `claims`, `evidence`, `p0`, `p1` |

**Objetivo.** Construir Knowledge Graph Lite sobre PostgreSQL, com evidência, confiança, vigência e travessia limitada, sem banco de grafo dedicado.

**Critérios de aceite.**

1. **Dado** documento aprovado, **quando** o extrator gerar entidade, relação ou claim, **então** registrará origem, seção, versão, confiança, owner, vigência e status.
2. **Dado** um claim publicado, **quando** for usado em resposta ou insight, **então** apontará para evidência verificável e não poderá ampliar acesso.
3. **Dado** uma consulta exploratória, **quando** atravessar relações, **então** respeitará ACL e limite inicial de dois saltos, retornando origem e confiança.

**DoD específico.** Schema, migrações, índices, extratores, revisão manual e testes de conflito/ACL.

**Assistência de IA.** Gemini pode extrair candidatos; Claude revisa modelo; owner aprova claims normativos.

### V1-409 — Implementar ACL/RLS do Knowledge Fabric antes da recuperação

| Campo | Valor |
|---|---|
| **Tipo** | Segurança / Dados |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Segurança / DBA / Backend Python |
| **Estimativa** | XL |
| **Dependências** | V1-102, V1-103, V1-405, V1-701 |
| **Rastreabilidade** | RF-021; RN-011; H-030; PM-004 |
| **Labels** | `acl`, `rls`, `tenant-isolation`, `p0` |

**Objetivo.** Garantir que tenant, workspace, papel, classificação, vigência e source scope sejam aplicados antes de consultar PostgreSQL, Qdrant ou relações.

**Critérios de aceite.**

1. **Dado** uma query de retrieval, **quando** for executada, **então** filtros ACL/RLS serão construídos no servidor a partir de `EffectivePolicy`, antes da busca e do ranking.
2. **Dado** usuário fora do workspace, **quando** pesquisar, **então** não receberá trecho, título, entidade, relação, claim, insight ou metadado revelador.
3. **Dado** falha de contexto, policy ou sessão de banco, **quando** a busca for avaliada, **então** será abortada em fail-closed e auditada.

**DoD específico.** RLS, filtros Qdrant, testes adversariais cross-tenant, revisão de query plans e evidências.

**Assistência de IA.** Codex gera cenários negativos; DBA e Segurança aprovam policies e queries.

### V1-410 — Implementar chunks, embeddings e indexação versionada no Qdrant

| Campo | Valor |
|---|---|
| **Tipo** | Backend Python / Dados |
| **Prioridade** | P0 |
| **Marco** | M2 |
| **Responsável** | Backend Python / IA |
| **Estimativa** | L |
| **Dependências** | V1-404, V1-405, V1-409 |
| **Rastreabilidade** | RF-022; H-028; TEAM-004 |
| **Labels** | `embeddings`, `qdrant`, `indexing`, `p0` |

**Objetivo.** Transformar ativos aprovados em chunks e embeddings reconstruíveis, com metadados de source, ACL, vigência e modelo.

**Critérios de aceite.**

1. **Dado** um asset aprovado, **quando** for indexado, **então** chunks terão IDs determinísticos, seção, hash, source, version, tenant, workspace, classification e vigência.
2. **Dado** reprocessamento ou falha, **quando** o job rodar, **então** será idempotente e deixará estado observável sem duplicar custo ou vetor.
3. **Dado** atualização do modelo de embedding, **quando** ocorrer, **então** uma collection versionada poderá ser construída e validada antes do cutover.

**DoD específico.** Pipeline, collections, HNSW inicial, reindexação, filas, métricas e testes de consistência.

**Assistência de IA.** Codex implementa worker; Gemini apoia avaliação de chunking; IA não decide sozinha parâmetros de produção.

### V1-411 — Implementar busca híbrida e retrieval com evidência

| Campo | Valor |
|---|---|
| **Tipo** | Backend Python / Intelligence |
| **Prioridade** | P0 |
| **Marco** | M2–M3 |
| **Responsável** | Backend Python / IA / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-408, V1-409, V1-410, V1-003 |
| **Rastreabilidade** | RF-023; RF-024; H-029; INTEL-001 |
| **Labels** | `retrieval`, `hybrid-search`, `rag`, `p0` |

**Objetivo.** Combinar texto, vetor, metadados, taxonomia e relações, retornando somente evidências autorizadas, vigentes e citáveis.

**Critérios de aceite.**

1. **Dado** uma query autorizada, **quando** o retrieval executar, **então** combinará busca semântica/textual, filtros de taxonomia, vigência, classificação e ACL antes do ranking final.
2. **Dado** um resultado, **quando** for retornado ao Intelligence Plane, **então** incluirá source, asset, versão, seção, score, confidence e trecho redigido.
3. **Dado** nenhuma evidência elegível, **quando** a query terminar, **então** retornará estado sem evidência sem inventar documento ou ampliar escopo.

**DoD específico.** API FastAPI, ranking, reranking, filtros, p95 medido, dataset de avaliação e logs redigidos.

**Assistência de IA.** Gemini pode apoiar experimentos de retrieval; Claude revisa groundedness e riscos; mudanças passam por benchmark.

### V1-412 — Criar Knowledge Workbench para curadoria e owners

| Campo | Valor |
|---|---|
| **Tipo** | UX / Admin / Knowledge |
| **Prioridade** | P1 |
| **Marco** | M2–M3 |
| **Responsável** | UX/UI / Frontend / Knowledge Governance |
| **Estimativa** | L |
| **Dependências** | V1-205, V1-401, V1-405, V1-408, V1-411 |
| **Rastreabilidade** | RF-012; RF-017–RF-020; RF-035; RF-048; UX-003; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `knowledge-workbench`, `curation`, `owners`, `design-system`, `compact`, `p1` |

**Objetivo.** Oferecer triagem de fontes, versões, conflitos, frescor, feedback negativo, claims e publicação/despublicação.

**Critérios de aceite.**

1. **Dado** owner autenticado, **quando** abrir o workbench, **então** verá ativos atrasados, conflitos, gaps, feedback e fontes sem owner do seu escopo em tabela `compact` ou `default`, com `SourceFreshnessBadge` e estados textuais.
2. **Dado** uma nova versão, **quando** aprovar ou rejeitar, **então** registrará autor, justificativa, data, policy e transição de estado usando componentes e confirmações do design system.
3. **Dado** um conflito de claim, **quando** resolver, **então** o sistema preservará fontes, decisão e histórico sem apagar evidência e exibirá a divergência sem depender apenas de cor.
4. **Dado** filtros de owners, workspaces, fontes ou estados, **quando** a lista for renderizada, **então** os `Select.Item` terão valores estáveis não vazios e a ordenação será alfabética salvo critério declarado.

**DoD específico.** `KnowledgeAssetRow`, `SourceFreshnessBadge`, tabelas `compact`/`default`, UI light/dark acessível, filtros seguros, fluxo de aprovação, auditoria, snapshots e teste com owners.

**Assistência de IA.** Gemini pode prototipar interface; Claude pode revisar o fluxo; Owner de Conhecimento valida usabilidade.

---

## E5 — Intelligence Plane

### V1-501 — Implementar orquestrador de contexto e inteligência em Python/FastAPI

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Backend Python / IA |
| **Prioridade** | P0 |
| **Marco** | M3 |
| **Responsável** | Backend Python / IA / Backend TypeScript |
| **Estimativa** | XL |
| **Dependências** | V1-301, V1-303, V1-304, V1-411 |
| **Rastreabilidade** | RF-024; RF-026; RF-028; INTEL-002 |
| **Labels** | `intelligence`, `context-builder`, `python`, `p0` |

**Objetivo.** Montar contexto mínimo autorizado, separar instruções de dados, solicitar geração via Model Gateway e devolver saída estruturada com evidências.

**Critérios de aceite.**

1. **Dado** uma intenção e evidências recuperadas, **quando** o contexto for montado, **então** incluirá somente dados autorizados, policy version, fontes, limites e delimitação de conteúdo não confiável.
2. **Dado** o pedido de geração, **quando** o worker Python chamar o gateway, **então** usará contrato versionado e não poderá escolher provider, credencial, budget ou ferramenta fora do escopo.
3. **Dado** uma saída do modelo, **quando** for validada, **então** terá schema, estado semântico, claims, evidências, confidence e limitações.

**DoD específico.** API, context builder, prompt templates versionados, cliente interno do gateway, validação de saída e testes.

**Assistência de IA.** Claude revisa prompts e invariantes; Codex implementa; Gemini pode explorar formatos multimodais; nenhuma saída é publicada sem guard.

### V1-502 — Implementar estados semânticos, conflitos e ausência de evidência

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Qualidade de IA |
| **Prioridade** | P0 |
| **Marco** | M3 |
| **Responsável** | Intelligence / Requisitos / UX |
| **Estimativa** | L |
| **Dependências** | V1-408, V1-411, V1-501, V1-205 |
| **Rastreabilidade** | RF-025; RF-044; RF-048; RN-008–RN-010; RN-032; REQ-002; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `semantic-state`, `conflict`, `groundedness`, `design-system`, `p0` |

**Objetivo.** Impedir que a plataforma apresente inferência como fato e que resolva silenciosamente conflitos entre fontes autorizadas.

**Critérios de aceite.**

1. **Dado** fontes divergentes, **quando** a resposta for construída, **então** será `Conflitante`, exibirá versões/owners/evidências e não escolherá regra silenciosamente.
2. **Dado** evidência insuficiente, **quando** a geração terminar, **então** será `Sem evidência` ou `Parcial` e declarará a limitação.
3. **Dado** interpretação do modelo, **quando** for exibida, **então** será marcada como `Inferida` ou `Recomendação`, separada visualmente de fato oficial.
4. **Dado** qualquer estado retornado pela API, **quando** a UI o renderizar, **então** receberá label, descrição, ícone, tom e próxima ação do catálogo tipado, sem heurística textual, estado inventado ou dependência exclusiva de cor.

**DoD específico.** State machine, enum/schema versionado, validator, catálogo tipado compatível com `AiSemanticBadge`, fixtures de conflito, resposta estruturada, contrato para UI e testes de regressão.

**Assistência de IA.** Claude/Kimi geram casos extremos; Requisitos e UX aprovam linguagem e semântica.

### V1-503 — Implementar assistente de processos, políticas e regras internas

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Inteligência |
| **Prioridade** | P0 |
| **Marco** | M3 |
| **Responsável** | Product/Intelligence / Backend Python |
| **Estimativa** | L |
| **Dependências** | V1-501, V1-502, V1-411 |
| **Rastreabilidade** | RF-027; PRD 4.3 |
| **Labels** | `process-assistant`, `policies`, `p0` |

**Objetivo.** Responder como executar processos corporativos, mostrando etapas, papéis, entradas, exceções, owner, fonte vigente e próxima ação segura.

**Critérios de aceite.**

1. **Dado** uma pergunta sobre processo, **quando** houver fonte vigente, **então** a resposta exibirá etapas ordenadas, responsáveis, entradas, exceções e citações.
2. **Dado** processo obsoleto ou conflitante, **quando** for recuperado, **então** o resultado sinalizará o problema e encaminhará ao owner.
3. **Dado** próxima ação externa, **quando** for apresentada, **então** será apenas proposta até passar pelo Action Gateway.

**DoD específico.** Dataset de processos, templates de resposta, links de evidência e testes de cobertura.

**Assistência de IA.** Gemini pode sintetizar documentos longos; Claude revisa instruções; Owner de Processo aprova respostas de referência.

### V1-504 — Implementar sínteses, comparações e cenários de decisão

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Intelligence |
| **Prioridade** | P0 para síntese/comparação; P1 para cenários |
| **Marco** | M3 |
| **Responsável** | Intelligence / Product |
| **Estimativa** | L |
| **Dependências** | V1-501, V1-502, V1-411 |
| **Rastreabilidade** | RF-028; RF-033; PRD 4.3 |
| **Labels** | `synthesis`, `comparison`, `decision-support`, `p0`, `p1` |

**Objetivo.** Gerar sínteses e comparações estruturadas sem ocultar premissas, lacunas, riscos ou diferença entre dados e recomendação.

**Critérios de aceite.**

1. **Dado** conjunto de fontes autorizado, **quando** o usuário solicitar síntese, **então** o resultado separará fatos, divergências, lacunas e referências.
2. **Dado** alternativas e critérios, **quando** a comparação for gerada, **então** exibirá premissas, impactos, riscos, incertezas e evidências por alternativa.
3. **Dado** recomendação do modelo, **quando** for mostrada, **então** será rotulada como recomendação e não como decisão aprovada.

**DoD específico.** Schemas de saída, templates, avaliações humanas, citations e testes de documentos conflitantes.

**Assistência de IA.** Claude pode revisar estrutura e riscos; Gemini pode processar documentos longos; aprovação de decisão continua humana.

### V1-505 — Implementar feedback, revisão e Quality Loop

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Qualidade / Knowledge |
| **Prioridade** | P0 |
| **Marco** | M3 |
| **Responsável** | Product / QA / Knowledge Owners |
| **Estimativa** | L |
| **Dependências** | V1-308, V1-411, V1-502 |
| **Rastreabilidade** | RF-034; RF-035; RN-013; REQ-003 |
| **Labels** | `feedback`, `quality-loop`, `review`, `p0` |

**Objetivo.** Transformar feedback de erro, falta de fonte, obsolescência e utilidade em revisão rastreável de fonte, claim, taxonomia, prompt ou policy.

**Critérios de aceite.**

1. **Dado** usuário sinalizar erro ou baixa utilidade, **quando** enviar feedback, **então** o sistema criará registro com alvo, evidência, versão, workspace, tipo e status.
2. **Dado** feedback recorrente, **quando** o Quality Loop consolidar, **então** sugerirá revisão de fonte, claim, prompt, taxonomy ou policy com owner e impacto.
3. **Dado** uma correção, **quando** for aplicada, **então** não sobrescreverá o original e permitirá comparar antes/depois.

**DoD específico.** UI/API, filas de revisão, score por fonte/domínio, auditoria e relatórios.

**Assistência de IA.** Claude/Kimi agrupam feedback; owner humano decide revisão e publicação.

### V1-506 — Implementar detecção de lacunas de conhecimento

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Quality Loop |
| **Prioridade** | P1 |
| **Marco** | M3 |
| **Responsável** | Intelligence / Knowledge Governance |
| **Estimativa** | M |
| **Dependências** | V1-411, V1-505 |
| **Rastreabilidade** | RF-031; REQ-003 |
| **Labels** | `knowledge-gaps`, `quality`, `p1` |

**Objetivo.** Detectar perguntas recorrentes sem evidência, com baixa confiança ou fontes conflitantes e encaminhar a owner.

**Critérios de aceite.**

1. **Dado** perguntas sem fonte elegível em janela configurada, **quando** o job rodar, **então** criará gap com tema, frequência, workspaces, impacto e fontes candidatas.
2. **Dado** um gap atribuído, **quando** o owner abrir o workbench, **então** poderá registrar nova fonte, decisão de não cobertura ou revisão de taxonomia.
3. **Dado** dados insuficientes ou sensíveis, **quando** o gap for agregado, **então** não revelará conteúdo fora da alçada.

**DoD específico.** Job, agregação, deduplicação, score, UI e teste de privacidade.

**Assistência de IA.** Gemini/Claude podem sugerir agrupamentos; owner humano confirma tema e impacto.

### V1-507 — Implementar detecção de mudanças, obsolescência e impacto

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Intelligence |
| **Prioridade** | P1 |
| **Marco** | M3 |
| **Responsável** | Backend Python / Knowledge |
| **Estimativa** | L |
| **Dependências** | V1-405, V1-408, V1-411 |
| **Rastreabilidade** | RF-020; RF-030; PRD 5.2.3 |
| **Labels** | `change-detection`, `freshness`, `impact`, `p1` |

**Objetivo.** Identificar alterações relevantes em fontes, entidades, claims e processos e estimar domínios, briefings e usuários afetados.

**Critérios de aceite.**

1. **Dado** uma nova versão ou evento, **quando** o detector comparar conteúdo, **então** classificará mudança estrutural, normativa, informativa ou irrelevante.
2. **Dado** mudança normativa, **quando** o impacto for resolvido, **então** indicará processos, áreas, briefings e owners afetados com evidência.
3. **Dado** mudança duplicada ou já revisada, **quando** for processada, **então** será agrupada e não gerará alerta redundante.

**DoD específico.** Detector, janela temporal, score de impacto, deduplicação, auditoria e integração com briefing.

**Assistência de IA.** Gemini pode comparar documentos longos; Knowledge Owner valida impacto crítico.

### V1-508 — Implementar briefings contextuais por papel, workspace e periodicidade

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Intelligence |
| **Prioridade** | P1 |
| **Marco** | M3 |
| **Responsável** | Intelligence / Frontend |
| **Estimativa** | L |
| **Dependências** | V1-501, V1-505, V1-507, V1-609 |
| **Rastreabilidade** | RF-029; RF-039; UX-005 |
| **Labels** | `briefing`, `scheduled`, `intelligence`, `p1` |

**Objetivo.** Gerar sínteses periódicas de mudanças, decisões, riscos, lacunas e sinais relevantes, com evidência e controle de frequência.

**Critérios de aceite.**

1. **Dado** perfil, workspace e periodicidade autorizados, **quando** o briefing for gerado, **então** usará fontes vigentes, filtros de policy, budget e estado de confiança.
2. **Dado** uma fonte atrasada ou sinal sem evidência, **quando** aparecer no briefing, **então** será rotulado e não será apresentado como fato atual.
3. **Dado** usuário ou gestor pausar o briefing, **quando** a pausa for registrada, **então** execuções futuras serão bloqueadas e auditadas.

**DoD específico.** Agendamento, templates, entrega, leitura, feedback, pausa e métricas de utilidade.

**Assistência de IA.** Claude gera templates; Gemini processa lotes longos; Product/UX validam densidade e fadiga de alertas.

### V1-509 — Implementar insights operacionais explicáveis

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Intelligence / Governança |
| **Prioridade** | P1 |
| **Marco** | M3 |
| **Responsável** | Intelligence / Product / QA |
| **Estimativa** | XL |
| **Dependências** | V1-408, V1-505, V1-507, V1-508 |
| **Rastreabilidade** | RF-032; RF-033; RN-016–RN-017 |
| **Labels** | `insights`, `explainability`, `thresholds`, `p1` |

**Objetivo.** Produzir sinais com evidência, janela temporal, confiança, severidade, impacto, owner e recomendação não executada automaticamente.

**Critérios de aceite.**

1. **Dado** sinais autorizados excedendo limiar versionado, **quando** o engine rodar, **então** criará insight com regra/modelo, evidências, janela, confidence, severidade e owner.
2. **Dado** insight de alto impacto ou baixa confiança, **quando** for gerado, **então** ficará em draft/review e não será publicado como alerta operacional sem revisão.
3. **Dado** feedback de falso positivo, **quando** for incorporado, **então** poderá ajustar limiar/versionamento sem apagar histórico.

**DoD específico.** Engine, thresholds, estados, deduplicação, revisão, feedback e avaliação humana.

**Assistência de IA.** Claude/Kimi revisam explicabilidade e casos adversariais; gestor/owner aprova publicação.

### V1-510 — Criar Intelligence Workbench para gestores e direção

| Campo | Valor |
|---|---|
| **Tipo** | UX / Frontend / Intelligence |
| **Prioridade** | P1 |
| **Marco** | M3 |
| **Responsável** | UX/UI / Frontend / Product |
| **Estimativa** | L |
| **Dependências** | V1-205, V1-502, V1-504, V1-508, V1-509 |
| **Rastreabilidade** | RF-028–RF-035; RF-048; UX-005; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `intelligence-workbench`, `briefings`, `insights`, `design-system`, `compact`, `p1` |

**Objetivo.** Exibir briefings, mudanças, gaps, insights e comparações com separação clara entre observado, inferido e recomendado.

**Critérios de aceite.**

1. **Dado** gestor autorizado, **quando** abrir o workbench, **então** verá somente dados do seu escopo, ordenados por impacto/urgência e com origem, usando `InsightCard`, badges semânticos e densidade declarada.
2. **Dado** insight ou briefing, **quando** expandir, **então** poderá visualizar evidências, premissas, confiança, owner, vigência e feedback por `EvidenceSheet`, sem misturar fato, inferência e recomendação.
3. **Dado** uma notificação não crítica, **quando** o usuário a silenciar, **então** a preferência será respeitada sem ocultar alertas obrigatórios de segurança.
4. **Dado** o workbench em light/dark e `compact`/`default`, **quando** for usado por teclado ou leitor de tela, **então** conteúdo, estado, impacto e próxima ação permanecerão distinguíveis sem depender exclusivamente de cor.

**DoD específico.** `InsightCard`, `SourceFreshnessBadge`, `EvidenceSheet`, wireframes, protótipo, implementação, acessibilidade, snapshots, testes com gestores e analytics de uso.

**Assistência de IA.** Gemini apoia prototipagem; Claude revisa clareza; gestores aprovam a experiência.

---

## E6 — MCP, integrações e ações governadas

### V1-601 — Criar registro e catálogo de servidores MCP e ferramentas

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Plataforma |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | Backend TypeScript / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-003, V1-104, V1-006 |
| **Rastreabilidade** | RF-036; H-023 |
| **Labels** | `mcp`, `catalog`, `tools`, `p0` |

**Objetivo.** Catalogar MCPs com manifesto, ferramentas, versão, owner, escopos, classificação de dados, risco e workspaces autorizados.

**Critérios de aceite.**

1. **Dado** um MCP novo, **quando** for registrado, **então** nascerá desabilitado, com manifesto validado, owner, endpoint, ferramentas, versão e risco.
2. **Dado** um MCP aprovado, **quando** o catálogo efetivo for resolvido, **então** aparecerá somente para workspaces e operações permitidos.
3. **Dado** alteração ou revogação, **quando** for publicada, **então** novas chamadas respeitarão a versão e o estado sem depender de reinstalação.

**DoD específico.** Registro, validação, estados, catálogo admin, versionamento e auditoria.

**Assistência de IA.** Claude pode revisar manifestos; Segurança aprova risco e escopos.

### V1-602 — Implementar proxy MCP e credenciais escopadas

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Backend TypeScript / Segurança |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | Backend TypeScript / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-204, V1-601, V1-103 |
| **Rastreabilidade** | RF-006; RF-036; H-024 |
| **Labels** | `mcp`, `proxy`, `oauth`, `p0` |

**Objetivo.** Encaminhar chamadas a ferramentas com OAuth, escopo mínimo, reautorização server-side e redaction.

**Critérios de aceite.**

1. **Dado** uma chamada MCP, **quando** chegar ao proxy, **então** o Action/Policy Gateway validará usuário, workspace, ferramenta, operação, recurso, classificação e token.
2. **Dado** token OAuth, **quando** for encaminhado, **então** não aparecerá em prompt, output, log, trace ou recibo.
3. **Dado** usuário, fonte ou integração revogada, **quando** tentar usar ferramenta, **então** a chamada será bloqueada imediatamente e auditada.

**DoD específico.** Proxy, scopes, refresh/revoke, timeout, retry seguro, erros e testes de tenant escape.

**Assistência de IA.** Codex implementa adapters; Segurança revisa egress e OAuth.

### V1-603 — Implementar guardrails, sandbox e validação de ferramentas

| Campo | Valor |
|---|---|
| **Tipo** | Segurança / Tools |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | Segurança / Backend TypeScript |
| **Estimativa** | XL |
| **Dependências** | V1-103, V1-601, V1-602, V1-406 |
| **Rastreabilidade** | RF-036–RF-038; RN-018–RN-020; H-025 |
| **Labels** | `guardrails`, `sandbox`, `prompt-injection`, `p0` |

**Objetivo.** Impedir execução arbitrária, exfiltração, abuso de Bash/Read/Write, manipulação de parâmetros e confusão entre dados e instruções.

**Critérios de aceite.**

1. **Dado** ferramenta de leitura, escrita ou comando, **quando** for invocada, **então** terá schema, allowlist, limite de recursos, timeout, risco e policy.
2. **Dado** operação destrutiva ou externa, **quando** for preparada, **então** exigirá confirmação/aprovação proporcional ao risco.
3. **Dado** documento ou retorno de ferramenta contendo instrução maliciosa, **quando** entrar no contexto, **então** será tratado como dado e não poderá mudar tool choice, policy ou alçada.

**DoD específico.** Sandbox, allowlists, limites, kill switch, testes adversariais e runbook de incidente.

**Assistência de IA.** Claude/Kimi geram ataques e casos de abuso; Segurança aprova bloqueios.

### V1-604 — Implementar Action Gateway para execução governada

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Backend TypeScript |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | Backend TypeScript / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-103, V1-602, V1-603, V1-308 |
| **Rastreabilidade** | RF-037; H-024–H-025; ACT-001 |
| **Labels** | `action-gateway`, `approval`, `p0` |

**Objetivo.** Orquestrar ações externas após validação de escopo, alçada, parâmetros, risco, confirmação e budget.

**Critérios de aceite.**

1. **Dado** recomendação de ação, **quando** chegar ao gateway, **então** será reautorizada no servidor e transformada em `ActionRequest` estruturado.
2. **Dado** ação de escrita, **quando** não houver confirmação/aprovação válida, **então** nenhuma chamada externa ocorrerá.
3. **Dado** falha externa ou resultado inconclusivo, **quando** o gateway finalizar, **então** registrará estado seguro, tentativa e recibo sem afirmar sucesso indevido.

**DoD específico.** API, matriz de risco, confirmação, approval chain, connector interface, kill switch e auditoria.

**Assistência de IA.** Codex implementa fluxo; Claude revisa invariantes; nenhum modelo executa ação real durante desenvolvimento.

### V1-605 — Implementar Action Review e confirmação de impacto

| Campo | Valor |
|---|---|
| **Tipo** | UX / Segurança / Frontend |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | UX/UI / Frontend / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-205, V1-604 |
| **Rastreabilidade** | RF-037; RF-048; UX-004; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `action-review`, `confirmation`, `ux`, `design-system`, `p0` |

**Objetivo.** Tornar intenção, sistema, parâmetros, escopo, impacto, risco e aprovação necessários visíveis antes da escrita externa.

**Critérios de aceite.**

1. **Dado** ação proposta, **quando** a tela `ActionReviewDialog` abrir, **então** exibirá intenção, destino, parâmetros redigidos, dados afetados, risco, policy e aprovação exigida.
2. **Dado** ação destrutiva ou de alto impacto, **quando** o usuário confirmar, **então** deverá realizar confirmação explícita de intenção e escopo, usar Button primário aprovado sem Indigo/Violeta, sem botão ambíguo ou auto-submit, e apresentar alerta de confirmação para deleção.
3. **Dado** execução concluída, **quando** o recibo chegar, **então** a tela mostrará sucesso, falha ou inconclusivo com link de auditoria, estado semântico e próxima ação.
4. **Dado** teclado, leitor de tela, zoom de 200% ou reduced motion, **quando** o usuário revisar a ação, **então** foco, ordem, contraste, risco, parâmetros e aprovação permanecerão compreensíveis.

**DoD específico.** `ActionReviewDialog`, `PolicyDecisionBanner`, `BudgetMeter`, protótipo, estados, Button guardrail, teclado, leitor de tela, snapshot light/dark, teste de compreensão e integração com gateway.

**Assistência de IA.** Gemini pode criar protótipos; UX e Segurança validam risco de clique e clareza.

### V1-606 — Implementar idempotência, retries e recibos de ação

| Campo | Valor |
|---|---|
| **Tipo** | Backend / Confiabilidade |
| **Prioridade** | P0 |
| **Marco** | M4 |
| **Responsável** | Backend TypeScript / QA |
| **Estimativa** | L |
| **Dependências** | V1-604, V1-308, V1-701 |
| **Rastreabilidade** | RF-038; RN-020; H-026 |
| **Labels** | `idempotency`, `receipts`, `retry`, `p0` |

**Objetivo.** Garantir que retry, timeout, replay ou processamento duplicado não criem duas tarefas, mensagens, convites ou alterações.

**Critérios de aceite.**

1. **Dado** mesmo `idempotency_key`, **quando** a ação for recebida novamente, **então** o gateway retornará o mesmo estado/recibo sem executar segunda vez.
2. **Dado** timeout após envio possivelmente concluído, **quando** o retry ocorrer, **então** consultará estado ou usará mecanismo idempotente antes de repetir.
3. **Dado** ação concluída, **quando** o recibo for persistido, **então** terá operação, ator, ferramenta, destino, estado, timestamps, tentativa e correlação.

**DoD específico.** Estado machine, storage, chaves, retries limitados, testes de falha e recibo imutável.

**Assistência de IA.** Codex gera testes de rede; QA valida exactly-once efetivo ou estado inconclusivo explícito.

### V1-607 — Entregar conectores Google Drive, Gmail e Calendar

| Campo | Valor |
|---|---|
| **Tipo** | Integração / MCP |
| **Prioridade** | P1 |
| **Marco** | M4 |
| **Responsável** | Integrações / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-402, V1-602, V1-604, V1-606 |
| **Rastreabilidade** | RF-013; H-026 |
| **Labels** | `google`, `drive`, `gmail`, `calendar`, `p1` |

**Objetivo.** Entregar primeira onda Google com escopos mínimos para leitura e ações de baixa/média criticidade.

**Critérios de aceite.**

1. **Dado** conexão aprovada, **quando** o usuário autorizar, **então** cada API usará scopes mínimos, owner, classificação, auditoria e revogação.
2. **Dado** busca em Drive/Gmail/Calendar, **quando** ocorrer, **então** os resultados respeitarão ACL da origem e não serão publicados automaticamente como conhecimento normativo.
3. **Dado** ação de baixa/média criticidade, **quando** confirmada, **então** passará pelo Action Gateway, será idempotente e produzirá recibo.

**DoD específico.** Contratos, sandbox, doubles, integração staging, rate limits, testes OAuth e documentação operacional.

**Assistência de IA.** Codex gera adapters; Gemini ajuda com formatos; Segurança aprova scopes.

### V1-608 — Entregar conectores Jira e ClickUp

| Campo | Valor |
|---|---|
| **Tipo** | Integração / MCP |
| **Prioridade** | P1 |
| **Marco** | M4 |
| **Responsável** | Integrações / Produto |
| **Estimativa** | XL |
| **Dependências** | V1-402, V1-602, V1-604, V1-606 |
| **Rastreabilidade** | RF-013; H-026 |
| **Labels** | `jira`, `clickup`, `mcp`, `p1` |

**Objetivo.** Permitir consultar projetos/tarefas e criar ou atualizar tarefas autorizadas com confirmação e rastreabilidade.

**Critérios de aceite.**

1. **Dado** workspace conectado, **quando** consultar tarefas, **então** o conector respeitará escopo de projeto, usuário, tenant e classificação.
2. **Dado** criação/alteração de tarefa, **quando** o usuário confirmar, **então** enviará somente parâmetros validados, com chave idempotente e recibo.
3. **Dado** falha de API, **quando** o retry ocorrer, **então** não duplicará tarefa e explicará estado inconclusivo quando não houver confirmação.

**DoD específico.** Consulta, escrita controlada, schemas, mocks, contract tests, scopes e runbook.

**Assistência de IA.** Codex implementa adapters e testes; Claude revisa fluxos de escrita.

### V1-609 — Implementar scheduler de automações e briefings governados

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Automação |
| **Prioridade** | P1 |
| **Marco** | M4 |
| **Responsável** | Backend TypeScript / Python Workers |
| **Estimativa** | L |
| **Dependências** | V1-103, V1-305, V1-508, V1-604 |
| **Rastreabilidade** | RF-039; H-031 |
| **Labels** | `scheduler`, `cron`, `automation`, `p1` |

**Objetivo.** Executar rotinas agendadas com owner, timezone, policy, budget, ferramentas, deduplicação, pausa e auditoria.

**Critérios de aceite.**

1. **Dado** uma rotina criada, **quando** for publicada, **então** terá agenda, timezone, owner, workspace, fontes, ferramentas, limite de custo e estado.
2. **Dado** o horário de execução, **quando** o job iniciar, **então** revalidará identidade, policy, fonte, budget e revogação como chamada interativa.
3. **Dado** job concorrente ou revogado, **quando** o scheduler detectar, **então** impedirá duplicidade, cancelará ou deixará estado auditável.

**DoD específico.** Scheduler, locks, pausa/execução única, histórico, dead-letter, métricas e kill switch.

**Assistência de IA.** Codex implementa jobs; QA testa timezone, concorrência e revogação.

### V1-610 — Implementar reunião, consentimento, transcrição e tarefas

| Campo | Valor |
|---|---|
| **Tipo** | Feature / Produtividade / IA |
| **Prioridade** | P1 |
| **Marco** | M4 |
| **Responsável** | Frontend / Python Intelligence / Privacidade |
| **Estimativa** | XL |
| **Dependências** | V1-203, V1-204, V1-501, V1-606, V1-608 |
| **Rastreabilidade** | RF-040; H-032 |
| **Labels** | `meetings`, `transcription`, `consent`, `p1` |

**Objetivo.** Importar/gravar reunião com consentimento, transcrever, extrair decisões e propor tarefas sem publicar ou executar automaticamente.

**Critérios de aceite.**

1. **Dado** captura de áudio, **quando** iniciar, **então** haverá consentimento, participantes/escopo, retenção e indicador visível.
2. **Dado** áudio processado, **quando** a transcrição for gerada, **então** manterá timestamps, confiança e origem e será acessível apenas ao escopo autorizado.
3. **Dado** tarefa extraída, **quando** for proposta, **então** terá título, responsável sugerido, prazo, confidence, trecho de origem e confirmação antes de criar tarefa externa.

**DoD específico.** Importação/record, transcrição, exclusão, consentimento, tarefa interna e integração controlada.

**Assistência de IA.** Gemini pode apoiar áudio/multimodal; Claude revisa extração; Privacidade aprova retenção e consentimento.

---

## E7 — Dados, recuperação e continuidade

### V1-701 — Governar schema, migrações, RLS e DDL do PostgreSQL

| Campo | Valor |
|---|---|
| **Tipo** | Dados / DBA / Segurança |
| **Prioridade** | P0 |
| **Marco** | M0–M5 |
| **Responsável** | DBA / Engenharia |
| **Estimativa** | XL |
| **Dependências** | V1-003, V1-004 |
| **Rastreabilidade** | RF-002; RF-021; RF-042; TEAM-002 |
| **Labels** | `postgresql`, `migrations`, `rls`, `dba`, `p0` |

**Objetivo.** Centralizar migrações reversíveis, schema, RLS e auditoria de DDL para os serviços TypeScript e Python.

**Critérios de aceite.**

1. **Dado** alteração de schema, **quando** o PR for aberto, **então** terá migração versionada, impacto, teste, rollback e aprovação DBA.
2. **Dado** query em tabela sensível, **quando** executar, **então** RLS filtrará tenant/workspace a partir de sessão segura e não de parâmetro confiado do cliente.
3. **Dado** DDL direto em produção, **quando** for tentado, **então** será bloqueado ou auditado conforme permissão e janela aprovadas.

**DoD específico.** Tooling de migração, RLS, fixtures, plano de rollback e documentação de acesso.

**Assistência de IA.** Codex pode gerar script; DBA executa revisão obrigatória e nenhum modelo aplica DDL produtivo.

### V1-702 — Implementar backup, restore e disaster recovery de PostgreSQL, MinIO e Qdrant

| Campo | Valor |
|---|---|
| **Tipo** | Infraestrutura / Continuidade |
| **Prioridade** | P0 |
| **Marco** | M5 |
| **Responsável** | DBA / DevOps / SRE |
| **Estimativa** | XL |
| **Dependências** | V1-403, V1-701, V1-902 |
| **Rastreabilidade** | RF-041; H-033–H-034; TEAM-001 |
| **Labels** | `backup`, `restore`, `dr`, `rto`, `rpo`, `p0` |

**Objetivo.** Garantir recuperação coerente dos dados transacionais, objetos imutáveis, índice vetorial e memória/configurações dentro de RTO/RPO.

**Critérios de aceite.**

1. **Dado** rotina produtiva, **quando** o backup executar, **então** produzirá artefatos criptografados, versionados, checksum e retenção isolada.
2. **Dado** desastre simulado, **quando** o restore for executado em staging, **então** PostgreSQL, MinIO e Qdrant serão recuperados com ACL, versões e metadados coerentes dentro de RTO/RPO.
3. **Dado** backup falho ou corrompido, **quando** o monitoramento detectar, **então** alertará owner e impedirá que a organização declare cobertura sem evidência.

**DoD específico.** Jobs, storage isolado, restore trimestral, runbook, matriz RTO/RPO e evidência de teste.

**Assistência de IA.** Codex pode gerar scripts em ambiente não produtivo; DBA aprova e executa o plano.

### V1-703 — Implementar retenção, particionamento e arquivamento de histórico

| Campo | Valor |
|---|---|
| **Tipo** | Dados / Privacidade / Performance |
| **Prioridade** | P1 |
| **Marco** | M5 |
| **Responsável** | DBA / Privacidade |
| **Estimativa** | L |
| **Dependências** | V1-308, V1-306, V1-701, V1-702 |
| **Rastreabilidade** | RF-042; RN-024; TEAM-003 |
| **Labels** | `retention`, `partitioning`, `archive`, `p1` |

**Objetivo.** Controlar crescimento e retenção de auditoria, ledger, eventos, prompts excepcionais, transcrições e derivados sem perder rastreabilidade mínima.

**Critérios de aceite.**

1. **Dado** tabela de alto volume, **quando** atingir limiar definido, **então** novas partições e índices serão criados sem interromper operações críticas.
2. **Dado** prazo de retenção vencido, **quando** o job rodar, **então** arquivará/removerá conforme classe, registrando evidência e preservando referências mínimas permitidas.
3. **Dado** auditoria histórica arquivada, **quando** operador autorizado consultar, **então** o acesso será controlado, lento/assíncrono quando necessário e auditado.

**DoD específico.** Matriz de retenção, jobs, partições, archive format, restore de histórico e testes de exclusão.

**Assistência de IA.** Codex pode gerar migrações; DBA e Privacidade aprovam impactos.

### V1-704 — Otimizar Qdrant, PostgreSQL e reindexação sem downtime

| Campo | Valor |
|---|---|
| **Tipo** | Performance / Retrieval |
| **Prioridade** | P0 para baseline; P1 para otimização avançada |
| **Marco** | M2–M5 |
| **Responsável** | IA/Backend Python / DBA |
| **Estimativa** | L |
| **Dependências** | V1-410, V1-411, V1-701 |
| **Rastreabilidade** | RF-022; RF-023; RN-023; TEAM-004 |
| **Labels** | `performance`, `qdrant`, `hnsw`, `reindex`, `p0`, `p1` |

**Objetivo.** Medir e otimizar busca híbrida, índices HNSW, full-text, payload filters, cache e reindexação versionada.

**Critérios de aceite.**

1. **Dado** workload do piloto, **quando** o benchmark rodar, **então** medirá p50/p95, recall/precision, custo, filtros e uso de recursos.
2. **Dado** nova versão de embedding, **quando** reindexar, **então** construirá collection paralela, validará qualidade e fará cutover/rollback sem deixar retrieval sem estado.
3. **Dado** ACL/vigência, **quando** a query executar, **então** filtros continuarão aplicados antes do ranking e a otimização não poderá ampliar resultado.

**DoD específico.** Benchmark, índices, dashboard, reindex job, rollback e relatório de ganho/risco.

**Assistência de IA.** Gemini pode explorar parâmetros; DBA/IA validam com benchmark realista e não por opinião do modelo.

### V1-705 — Monitorar saúde do banco e manter runbooks DBA

| Campo | Valor |
|---|---|
| **Tipo** | Operação / Observabilidade |
| **Prioridade** | P1 |
| **Marco** | M5 |
| **Responsável** | DBA / SRE |
| **Estimativa** | M |
| **Dependências** | V1-701, V1-702, V1-901 |
| **Rastreabilidade** | RF-041; RF-043; TEAM-005 |
| **Labels** | `dba`, `health`, `runbook`, `p1` |

**Objetivo.** Detectar pool esgotado, locks, deadlocks, query lenta, I/O, disco, Qdrant indisponível e falhas de backup com resposta operacional segura.

**Critérios de aceite.**

1. **Dado** query acima do limiar ou contenção, **quando** o monitoramento detectar, **então** coletará métricas/traces e alertará com owner, severidade e runbook.
2. **Dado** pool de conexão saturado, **quando** a proteção atuar, **então** gateway e workers reduzirão admissão sem corromper ledger ou liberar policy.
3. **Dado** incidente de banco, **quando** o operador seguir runbook, **então** poderá diagnosticar e estabilizar sem comandos destrutivos não aprovados.

**DoD específico.** Dashboards, alertas, runbooks


---

## E8 — QA, segurança e avaliação

### V1-801 — Implementar suíte automatizada de contratos cross-runtime

| Campo | Valor |
|---|---|
| **Tipo** | QA / Automação |
| **Prioridade** | P0 |
| **Marco** | M0–M5 |
| **Responsável** | QA / Engenharia |
| **Estimativa** | L |
| **Dependências** | V1-003, V1-004 |
| **Rastreabilidade** | RF-047; H-002; ARCH-001; TEAM-001 |
| **Labels** | `contract-tests`, `openapi`, `asyncapi`, `p0` |

**Objetivo.** Bloquear incompatibilidades entre APIs/eventos TypeScript/Fastify e Python/FastAPI antes do merge ou deploy.

**Critérios de aceite.**

1. **Dado** alteração de DTO, evento ou schema, **quando** o CI executar, **então** validará compatibilidade, campos obrigatórios, enumerações, erros e versionamento nos dois runtimes.
2. **Dado** evento de ingestão, policy, retrieval, insight ou ação, **quando** o consumidor processar, **então** validará AsyncAPI e preservará correlação, tenant, workspace e policy.
3. **Dado** quebra incompatível sem migração, **quando** o PR for verificado, **então** o merge será bloqueado com diagnóstico acionável.

**DoD específico.** Contract tests, fixtures, compatibilidade backward/forward, pipeline, relatório e ownership de schemas.

**Assistência de IA.** Codex gera fixtures; Claude revisa casos de segurança; QA mantém oráculos e aprova resultados.

### V1-802 — Criar suíte de policy, autorização e fail-closed

| Campo | Valor |
|---|---|
| **Tipo** | QA / Segurança |
| **Prioridade** | P0 |
| **Marco** | M1–M5 |
| **Responsável** | QA / Segurança |
| **Estimativa** | XL |
| **Dependências** | V1-103, V1-304, V1-409, V1-602 |
| **Rastreabilidade** | RF-009; RF-021; RF-036; RF-043; H-014; TEAM-002 |
| **Labels** | `authorization-tests`, `fail-closed`, `security`, `p0` |

**Objetivo.** Provar que ausência, corrupção, timeout ou conflito de identidade, policy, ACL, budget ou egress sempre resulta em bloqueio seguro.

**Critérios de aceite.**

1. **Dado** Redis, banco, Vault, policy service ou contexto indisponível, **quando** uma operação for tentada, **então** chat, retrieval, insight e ação serão negados sem fallback aberto.
2. **Dado** request com tenant, role, modelo, ferramenta ou budget adulterados, **quando** for processado, **então** o servidor recalculará o contexto e rejeitará o excesso.
3. **Dado** tentativa de acesso cross-tenant/cross-workspace, **quando** for executada em PostgreSQL ou Qdrant, **então** nenhum dado ou metadado será retornado.

**DoD específico.** Matriz de autorização, testes de mutação, injeção de falhas, evidências de auditoria e gate de release.

**Assistência de IA.** Claude/Kimi geram cenários de abuso; QA e Segurança revisam cobertura e não aceitam testes que só validem status HTTP.

### V1-803 — Criar framework de avaliação de groundedness, citações e qualidade

| Campo | Valor |
|---|---|
| **Tipo** | QA / Avaliação de IA |
| **Prioridade** | P0 |
| **Marco** | M3–M5 |
| **Responsável** | QA de IA / Intelligence / Knowledge |
| **Estimativa** | XL |
| **Dependências** | V1-411, V1-501, V1-502, V1-505 |
| **Rastreabilidade** | RF-024; RF-025; RF-044; H-037; TEAM-003 |
| **Labels** | `evals`, `groundedness`, `citations`, `p0` |

**Objetivo.** Medir recuperação, fidelidade a evidências, precisão de citações, ausência de alucinação, estados semânticos, custo e latência em releases de prompt/modelo.

**Critérios de aceite.**

1. **Dado** dataset versionado de perguntas com fontes esperadas, **quando** o pipeline rodar, **então** calculará Recall@K, precisão de evidência, validade de citação, groundedness, ausência de evidência e latência.
2. **Dado** resposta sem fonte suficiente, **quando** o validador avaliar, **então** aprovará somente se a saída declarar a limitação e o estado correto.
3. **Dado** mudança de modelo, prompt, chunking ou embedding, **quando** o benchmark comparar versões, **então** exibirá regressões por domínio, classificação e estado semântico.

**DoD específico.** Dataset sintético/aprovado, métricas, thresholds aprovados, relatório, regressão e revisão humana de amostra.

**Assistência de IA.** Gemini/Claude podem gerar variações de perguntas; especialistas humanos definem respostas esperadas e limiares.

### V1-804 — Executar testes de carga, concorrência e resiliência

| Campo | Valor |
|---|---|
| **Tipo** | QA / Performance / SRE |
| **Prioridade** | P0 |
| **Marco** | M1–M5 |
| **Responsável** | QA / SRE / DBA |
| **Estimativa** | L |
| **Dependências** | V1-305, V1-307, V1-410, V1-701, V1-901 |
| **Rastreabilidade** | RF-010; RF-023; RF-041; RF-043; H-033; H-036 |
| **Labels** | `load-test`, `chaos`, `concurrency`, `p0` |

**Objetivo.** Verificar limites de gateway, budget, retrieval, filas, banco, streaming e workers sob carga realista do piloto.

**Critérios de aceite.**

1. **Dado** carga concorrente de chat, retrieval e ingestão, **quando** o teste rodar, **então** p95, erro, custo, pool, filas e saturação permanecerão dentro dos SLOs ou bloquearão admissão controladamente.
2. **Dado** concorrência no budget, **quando** a carga competir por saldo, **então** o ledger não excederá o teto nem registrará consumo duplicado.
3. **Dado** falha de provider, Redis, Qdrant ou worker, **quando** o experimento ocorrer, **então** o sistema permanecerá fail-closed, detectável e recuperável.

**DoD específico.** Cenários, dados sintéticos, métricas, relatório, SLO baseline e ações de tuning.

**Assistência de IA.** Codex gera scripts; Kimi/Claude ajudam a desafiar cenários; SRE valida resultados e não extrapola de carga insuficiente.

### V1-805 — Testar idempotência, aprovação e estados inconclusivos do Action Gateway

| Campo | Valor |
|---|---|
| **Tipo** | QA / Sistema / Confiabilidade |
| **Prioridade** | P0 |
| **Marco** | M4–M5 |
| **Responsável** | QA / Segurança / Integrações |
| **Estimativa** | L |
| **Dependências** | V1-604, V1-605, V1-606, V1-607, V1-608 |
| **Rastreabilidade** | RF-037; RF-038; H-025; TEAM-004 |
| **Labels** | `action-tests`, `idempotency`, `approval`, `p0` |

**Objetivo.** Provar que ações externas exigem aprovação válida e não duplicam operações em retry, replay, timeout, concorrência ou reprocessamento de fila.

**Critérios de aceite.**

1. **Dado** ação sem confirmação, **quando** chegar ao gateway, **então** nenhum connector será chamado.
2. **Dado** timeout após envio potencial, **quando** o retry ocorrer, **então** o sistema consultará estado/chave idempotente e não duplicará a operação.
3. **Dado** resposta externa ambígua, **quando** o fluxo terminar, **então** será marcado inconclusivo, informado ao usuário e mantido em reconciliação.

**DoD específico.** Mocks de connectors, falhas de rede, replay, concorrência, recibos e evidência de não duplicação.

**Assistência de IA.** Codex gera casos de falha; QA controla doubles e aprova a semântica de exatamente uma execução ou inconclusivo.

### V1-806 — Executar red-team, varredura de segredos e threat validation

| Campo | Valor |
|---|---|
| **Tipo** | Segurança / Red Team |
| **Prioridade** | P0 |
| **Marco** | M5 |
| **Responsável** | Segurança / QA |
| **Estimativa** | XL |
| **Dependências** | V1-304, V1-406, V1-603, V1-802, V1-803 |
| **Rastreabilidade** | RF-042; RF-045; H-038; TEAM-005 |
| **Labels** | `red-team`, `secrets`, `prompt-injection`, `p0` |

**Objetivo.** Verificar exfiltração, prompt injection, tenant escape, bypass de budget, abuso de ferramenta, vazamento de segredo e escalada de privilégio.

**Critérios de aceite.**

1. **Dado** documento, e-mail, ferramenta ou prompt malicioso, **quando** for processado, **então** não alterará policy, tool choice, egress ou alçada.
2. **Dado** artefato, log, trace, imagem ou pacote, **quando** os scanners executarem, **então** não haverá API keys, OAuth tokens, secrets ou PII não autorizada.
3. **Dado** vulnerabilidade crítica/alta, **quando** o gate rodar, **então** o release será bloqueado até correção ou aceite formal com prazo e mitigação.

**DoD específico.** Plano de ataque, evidências, severidade, correção, reteste, threat model atualizado e decisão residual.

**Assistência de IA.** Claude/Kimi podem criar payloads adversariais; Segurança controla execução e não fornece segredos reais aos modelos.

### V1-807 — Validar acessibilidade, usabilidade e compreensão de risco

| Campo | Valor |
|---|---|
| **Tipo** | QA / UX / Acessibilidade |
| **Prioridade** | P0 |
| **Marco** | M2–M5 |
| **Responsável** | QA / UX/UI / Usuários-piloto |
| **Estimativa** | L |
| **Dependências** | V1-205, V1-206, V1-207, V1-412, V1-510, V1-605 |
| **Rastreabilidade** | RF-004; RF-024; RF-037; RF-048; NFR de acessibilidade, consistência visual e UX de confiança; PRD 1.8; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `a11y`, `usability`, `user-test`, `design-system`, `color-guard`, `p0` |

**Objetivo.** Garantir que colaboradores, owners, gestores e administradores entendam estados, evidências, bloqueios e impacto das ações.

**Critérios de aceite.**

1. **Dado** usuário de teclado/leitor de tela, **quando** executar chat, citação, curadoria ou Action Review, **então** completará o fluxo sem perda de foco ou informação em light/dark e `default`/`compact`.
2. **Dado** resposta inferida, conflitante ou sem evidência, **quando** o usuário interpretar, **então** distinguirá fato, inferência e limitação em teste de compreensão sem depender apenas de cor.
3. **Dado** ação de alto impacto, **quando** o usuário revisar, **então** identificará destino, escopo, risco e efeito antes de confirmar.
4. **Dado** um candidato a release, **quando** o guardrail de Button e snapshots forem executados, **então** não haverá Indigo/Violeta em estados interativos de Button e não haverá regressão crítica de contraste, foco, zoom, reduced motion ou `Select.Item` vazio.

**DoD específico.** axe-core, Playwright, testes com usuários, snapshots light/dark e `default`/`compact`, guardrail automatizado de Button, relatório, correções WCAG, métricas de erro e aprovação de UX.

**Assistência de IA.** Modelos podem gerar roteiros e variações; usuários reais e UX fornecem validação final.

### V1-808 — Executar gate sistêmico de qualidade e prontidão de release

| Campo | Valor |
|---|---|
| **Tipo** | QA / Release Gate |
| **Prioridade** | P0 |
| **Marco** | M5 |
| **Responsável** | QA Lead / Product / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-801–V1-807, V1-702, V1-903 |
| **Rastreabilidade** | RF-044–RF-048; H-037–H-040; PM-008; DESIGN_SYSTEM_VALIDACAO |
| **Labels** | `release-gate`, `acceptance`, `design-system`, `p0` |

**Objetivo.** Consolidar evidências de funcionalidade, segurança, qualidade de IA, performance, continuidade, UX e operação antes do piloto.

**Critérios de aceite.**

1. **Dado** release candidate, **quando** o gate for executado, **então** todas as issues P0 apresentarão evidência, revisão, testes e status sem bloqueios críticos.
2. **Dado** threshold de groundedness, SLO, cobertura, acessibilidade, contraste, Button guardrail ou vulnerabilidade não atingido, **quando** o relatório for gerado, **então** o release será bloqueado ou terá exceção executiva explícita.
3. **Dado** aprovação do gate, **quando** a versão for promovida, **então** haverá checklist assinado, changelog, plano de rollback, owners, critérios de pausa e versão do design system/tokens.

**DoD específico.** Release report, matriz RF→issue→teste, inventário de componentes e tokens, snapshots, relatório axe/Playwright, resultado do color guard, decisão Go/No-Go e pacote de evidências.

**Assistência de IA.** Modelos podem resumir resultados; QA, Segurança e Product aprovam Go/No-Go.

---

## E9 — Operação, release e piloto

### V1-901 — Implantar observabilidade, SLOs e resposta a incidentes

| Campo | Valor |
|---|---|
| **Tipo** | SRE / Observabilidade |
| **Prioridade** | P0 |
| **Marco** | M1–M5 |
| **Responsável** | SRE / Backend / Product Ops |
| **Estimativa** | XL |
| **Dependências** | V1-301, V1-308, V1-411, V1-609 |
| **Rastreabilidade** | RF-043; H-036 |
| **Labels** | `opentelemetry`, `slo`, `incident`, `p0` |

**Objetivo.** Operar gateway, policy, budget, retrieval, ingestão, workers, MCPs, actions, custos e qualidade com métricas e traces redigidos.

**Critérios de aceite.**

1. **Dado** request do cliente ou worker, **quando** atravessar serviços, **então** logs/traces correlacionarão `request_id` sem conteúdo sensível ou secret.
2. **Dado** SLO de gateway, streaming, retrieval, ingestão e ação, **quando** for violado, **então** alertará owner, severidade, impacto e runbook.
3. **Dado** incidente crítico, **quando** for aberto, **então** haverá contenção, comunicação, timeline, análise de causa e ação preventiva auditável.

**DoD específico.** Dashboards, SLOs, alertas, runbooks, on-call, redaction e teste de incidente.

**Assistência de IA.** Claude pode resumir incidentes; modelos não ocultam alertas nem alteram métricas.

### V1-902 — Implementar alta disponibilidade, degradação segura e recuperação do gateway

| Campo | Valor |
|---|---|
| **Tipo** | Infraestrutura / SRE |
| **Prioridade** | P0 |
| **Marco** | M5 |
| **Responsável** | SRE / Backend TypeScript |
| **Estimativa** | XL |
| **Dependências** | V1-301, V1-307, V1-308, V1-702, V1-901 |
| **Rastreabilidade** | RF-041; H-033 |
| **Labels** | `ha`, `failover`, `disaster-recovery`, `p0` |

**Objetivo.** Evitar ponto único de falha sem transformar indisponibilidade de policy, budget ou Vault em bypass de segurança.

**Critérios de aceite.**

1. **Dado** falha de uma instância stateless, **quando** o healthcheck detectar, **então** tráfego poderá ser direcionado a instância saudável sem perder correlação, segredo ou policy.
2. **Dado** perda de autorização, policy, budget ou Vault, **quando** ocorrer, **então** geração, retrieval e action ficarão bloqueados ou em modo somente local seguro.
3. **Dado** desastre do gateway, **quando** o runbook for executado, **então** recuperação atenderá RTO/RPO e terá validação de não-bypass antes de reabrir tráfego.

**DoD específico.** HA, probes, failover, chaos test, RTO/RPO, runbook e aprovação SRE/Security.

**Assistência de IA.** Codex pode gerar manifests; SRE e Segurança aprovam testes de recuperação.

### V1-903 — Empacotar, assinar e atualizar o cliente Electron por anéis

| Campo | Valor |
|---|---|
| **Tipo** | Release / Desktop |
| **Prioridade** | P1 |
| **Marco** | M5 |
| **Responsável** | Desktop / DevOps / Segurança |
| **Estimativa** | L |
| **Dependências** | V1-201, V1-206, V1-007, V1-808 |
| **Rastreabilidade** | RF-046; H-039 |
| **Labels** | `electron`, `signing`, `update`, `p1` |

**Objetivo.** Distribuir cliente verificável, atualizável e reversível, compatível com política de TI e rollout controlado.

**Critérios de aceite.**

1. **Dado** artefato de release, **quando** for empacotado, **então** será assinado, terá checksum/SBOM e poderá ser verificado antes de instalar.
2. **Dado** atualização por anel, **quando** for distribuída, **então** suportará pausa, versão mínima, migração de dados e rollback.
3. **Dado** cliente obsoleto ou incompatível, **quando** conectar ao gateway, **então** receberá aviso ou bloqueio conforme policy sem apagar memória local.

**DoD específico.** Builds para sistemas suportados, assinatura, updater, canais, rollout interno e teste de rollback.

**Assistência de IA.** Codex pode automatizar packaging; Segurança valida cadeia de assinatura e atualização.

### V1-904 — Conduzir piloto controlado, suporte e rollout por ondas

| Campo | Valor |
|---|---|
| **Tipo** | Produto / Operação / Adoção |
| **Prioridade** | P1 |
| **Marco** | M5 |
| **Responsável** | Product / Customer Success / SRE |
| **Estimativa** | XL |
| **Dependências** | V1-001, V1-412, V1-508, V1-510, V1-808, V1-902, V1-903 |
| **Rastreabilidade** | RF-046; H-040 |
| **Labels** | `pilot`, `rollout`, `adoption`, `support`, `p1` |

**Objetivo.** Validar valor, segurança, qualidade, adoção e operação com poucos workspaces antes da expansão.

**Critérios de aceite.**

1. **Dado** piloto aprovado, **quando** iniciar, **então** possuirá grupos, duração, fontes, owners, canais de suporte, training, critérios de entrada e saída.
2. **Dado** execução do piloto, **quando** medir resultados, **então** acompanhará adoção, custo/tarefa, groundedness, latência, bloqueios, incidentes, gaps, feedback e compreensão de risco.
3. **Dado** incidente ou regressão, **quando** o comitê decidir pausar, **então** poderá desligar connector, reverter policy, reduzir anel ou fazer rollback sem perder evidência.

**DoD específico.** Runbook de suporte, materiais de adoção, relatório final, decisão de expansão e backlog de v1.1.

**Assistência de IA.** Modelos podem sintetizar feedback e sugerir hipóteses; Product e usuários-piloto decidem valor e rollout.

---

# 6. Dependências críticas e sequência recomendada

O caminho crítico técnico mínimo é:

```text
V1-001 → V1-002 → V1-003 → V1-004 → V1-006 → V1-101 → V1-102 → V1-103
                                                    ↘ V1-701
V1-103 → V1-301 → V1-302 → V1-303 → V1-304 → V1-305 → V1-307 → V1-308
V1-401 → V1-402 → V1-403 → V1-404 → V1-405 → V1-406 → V1-407
V1-408 → V1-409 → V1-410 → V1-411 → V1-501 → V1-502 → V1-803
V1-601 → V1-602 → V1-603 → V1-604 → V1-605 → V1-606 → V1-805
V1-702 → V1-901 → V1-902 → V1-808 → V1-904
```

| Marco | Condição de entrada | Entrega de saída | Gate |
|---|---|---|---|
| **M0 — Fundação** | V1-001–V1-007, identidade mínima e PostgreSQL governado | Contratos, ambientes, threat model, CI e acesso seguro | Product, Arquitetura, Segurança e DBA |
| **M1 — Harness** | M0 aprovado | Gateway, policy, providers, budget, auditoria e chat controlado | Segurança, QA e Finanças |
| **M2 — Knowledge Fabric** | Harness com egress/policy e Source Registry | Fontes aprovadas, ingestão, ACL, chunks, embeddings e retrieval | Knowledge Owner, Segurança e QA |
| **M3 — Intelligence** | Retrieval com evidência e contratos estáveis | Respostas fundamentadas, estados, sínteses, gaps, mudanças e briefings | Product, Intelligence, UX e QA |
| **M4 — Actions** | Policy, budget, MCP e UX de confiança | Action Gateway, connectors, automação e reuniões | Segurança, Product e QA |
| **M5 — Produção/Piloto** | Quality gate, backups, observabilidade e release | HA, update, piloto e decisão de expansão | Comitê executivo de Go/No-Go |

As issues de cada marco podem ser desenvolvidas em paralelo quando o contrato e o mock estiverem estáveis. A paralelização não autoriza inverter gates: nenhum serviço Python pode fazer egress direto para provider, nenhuma ação externa pode ser executada antes do Action Gateway e nenhum retrieval pode ser liberado antes de ACL/RLS e vigência.

# 7. Matriz resumida de rastreabilidade

| Capacidade do PRD/matriz | Issues principais |
|---|---|
| Identidade, tenant, workspace e papéis | V1-101, V1-102, V1-103 |
| Cliente Electron seguro | V1-201, V1-202, V1-204, V1-903 |
| Memória local e histórico | V1-203, V1-206 |
| Chat, streaming e gateway | V1-206, V1-301, V1-307 |
| Providers, modelos e credenciais | V1-302, V1-303, V1-304 |
| Policy em cascata e fail-closed | V1-103, V1-105, V1-802 |
| Budget, ledger e custos | V1-305, V1-306, V1-804 |
| Auditoria e rastreabilidade | V1-308, V1-901 |
| Source Registry e conectores de conhecimento | V1-401, V1-402 |
| Ingestão, parsing, MinIO e normalização | V1-403, V1-404, V1-406 |
| Taxonomia, vigência, owner e conflitos | V1-405, V1-407, V1-408, V1-412 |
| ACL/RLS, Qdrant e retrieval | V1-409, V1-410, V1-411, V1-704 |
| Design system, tokens e acessibilidade | V1-205, V1-206, V1-207, V1-412, V1-510, V1-605, V1-807, V1-808 |
| Respostas fundamentadas e estados semânticos | V1-501, V1-502, V1-207, V1-803 |
| Síntese, comparação e assistente de processos | V1-503, V1-504 |
| Feedback, gaps, mudanças, insights e briefings | V1-505–V1-510 |
| MCP, OAuth e ferramentas | V1-601, V1-602, V1-603 |
| Ações externas governadas | V1-604–V1-606, V1-805 |
| Integradores Google, Jira e ClickUp | V1-607, V1-608 |
| Automações e reuniões | V1-609, V1-610 |
| Backup, DR, retenção e performance | V1-702–V1-705 |
| QA, red-team, carga e acessibilidade | V1-801–V1-808 |
| Observabilidade, HA, release e piloto | V1-901–V1-904 |

# 8. Definition of Done global

Uma issue só pode ser encerrada quando o código ou artefato estiver implementado no runtime correto, coberto por testes proporcionais ao risco, integrado por contrato versionado, instrumentado sem vazamento, documentado e revisado por pessoa responsável. Para issues de dados, a migração deve ser reversível e aprovada pelo DBA. Para issues de segurança, a evidência deve incluir casos negativos e comportamento fail-closed. Para issues de IA, a evidência deve incluir dataset/avaliação, proveniência, limites de confiança e revisão humana. Para issues de UX, deve existir teste de acessibilidade e compreensão dos estados. Para issues de operação, runbook, alerta, owner e rollback são obrigatórios.

Nenhum aceite pode ser baseado somente em demonstração manual, captura de tela, opinião de um modelo ou teste feliz. O pacote de encerramento deve registrar a issue, arquivos/artefatos alterados, versão dos contratos, testes, resultados, riscos residuais, revisão humana, modelo(s) de IA utilizados e eventual decisão de exceção.

# 9. Artefatos auxiliares recomendados para o time de IA

O repositório deve manter um diretório `/.ai/` com `context-packs/`, `decisions/`, `prompts/`, `evals/`, `threat-scenarios/` e `review-records/`. Cada issue P0 deve possuir um context pack pequeno e versionado com objetivo, invariantes, contratos, dependências, arquivos alvo, testes esperados e itens proibidos. O diretório não deve conter secrets, dados reais ou conversas completas com modelos que exponham informação corporativa.

Para Codex, o formato recomendado é uma tarefa pequena com arquivos alvo e comando de teste explícito. Para Claude e Kimi, recomenda-se revisão de arquitetura, ameaça, requisitos e diffs. Para Gemini, recomenda-se processamento de documentos, prototipagem e variações de avaliação. Nenhum modelo deve receber ao mesmo tempo todo o repositório e autorização para alterar produção.

# 10. Referências

[1]: ./PRD_DomusCorp.md "PRD — Domus Corp v1.0"  
[2]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 — Arquitetura do Domus Corp"  
[3]: ./upload/BacklogdeIssues—HarnessCorporativodeIA.md "Backlog original — Harness Corporativo de IA"  
[4]: ./upload/harness_requirements_matrix.md "Matriz de requisitos — Harness Corporativo de IA"  
[5]: ./upload/pesquisa-inicial.md "Pesquisa inicial — tese e posicionamento do Domus Corp"  
[6]: https://www.youtube.com/watch?v=b1H-gYRW2IU "Vídeo de referência sobre Harness Corporativo de IA"  
[7]: https://fastify.dev/ "Fastify — documentação oficial"  
[8]: https://fastapi.tiangolo.com/ "FastAPI — documentação oficial"  
[9]: https://www.postgresql.org/docs/ "PostgreSQL — documentação oficial"  
[10]: https://qdrant.tech/documentation/ "Qdrant — documentação oficial"
[11]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"
[12]: ./DESIGN_SYSTEM_VALIDACAO.md "Validação e handoff — Design System Domus Corp v1.0"

---

**Próximo passo recomendado:** iniciar pelo refinamento conjunto de V1-001–V1-007 e só então abrir as primeiras tarefas de implementação. As issues V1-301, V1-103, V1-305, V1-409, V1-411, V1-604 e V1-803 devem ser consideradas componentes de risco elevado e receber revisão humana especializada antes de qualquer merge.

**Fim do backlog mestre da v1.0.**

