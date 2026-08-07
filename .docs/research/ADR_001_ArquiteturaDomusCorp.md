# ADR-001: Plataforma de Inteligência Corporativa com Knowledge Fabric e Harness de IA governado

**Data:** 07/08/2026  
**Status:** Proposto para validação executiva  
**Decisor:** Arquiteto de Software Principal  
**Contexto:** Arquitetura da v1.0 do Domus Corp, reposicionada como Plataforma de Inteligência Corporativa com IA. A solução combina um harness corporativo para governança e execução de IA, um Knowledge Fabric para memória institucional e uma camada de inteligência para respostas fundamentadas, briefings, insights e ações governadas.[1] [2] [3] [4]

---

## 1. Questão ou Problema

O Domus Corp não deve ser apenas um chatbot corporativo nem um repositório que acumula documentos sem critério. A v1.0 precisa transformar conhecimento empresarial disperso em uma capacidade operacional confiável: uma pessoa deve conseguir encontrar uma regra, compreender um processo, comparar alternativas, acompanhar mudanças, identificar um sinal e iniciar uma ação autorizada sem perder a origem da informação ou o controle da empresa.

A arquitetura deve, portanto, resolver dois problemas ao mesmo tempo:

1. **Governar a execução de IA.** Modelos, agentes, ferramentas, credenciais, orçamento, dados, ações e auditoria precisam de uma autoridade central, com comportamento fail-closed.
2. **Construir uma memória corporativa confiável.** Fontes, documentos, registros, decisões, processos, entidades, relações, claims, evidências e sinais precisam de origem, owner, classificação, versão, vigência, controle de acesso e qualidade observável.

A arquitetura original de harness já estabelecia cliente Electron, painel administrativo, gateway central, políticas por workspace, controle de budget, MCPs, MinIO, Qdrant, memória local e auditoria.[2] [3] O reposicionamento para Plataforma de Inteligência Corporativa exige ampliar o modelo para incluir uma **camada de conhecimento** e uma **camada de inteligência**, sem relaxar as decisões de segurança existentes.

### 1.1. Tensões arquiteturais

| Tensão | Risco de uma decisão inadequada |
|---|---|
| Acumular conhecimento versus preservar confiança | Ingestão indiscriminada cria ruído, fontes conflitantes, informação obsoleta e falsa sensação de completude. |
| Recuperar informação versus proteger contexto | Um índice vetorial ou grafo mal filtrado pode vazar trechos, relações ou insights fora do workspace. |
| Velocidade de resposta versus rastreabilidade | Uma resposta rápida, mas sem fonte, vigência ou confiança, não é adequada para uso corporativo. |
| Inteligência proativa versus alarmismo | Insights e briefings sem limiares, evidências e revisão geram fadiga de alertas e decisões ruins. |
| Ação assistida versus responsabilidade humana | Um agente pode converter uma recomendação em alteração externa sem alçada, confirmação ou idempotência. |
| Entidades e relações versus complexidade operacional | Um grafo dedicado cedo demais aumenta custo sem comprovar que a travessia supera consultas relacionais e busca híbrida. |
| Autonomia do cliente versus autoridade corporativa | O desktop poderia contornar policy, budget, revogação, classificação ou credenciais. |
| Evolução rápida versus arquitetura distribuída | Microserviços independentes desde o início aumentariam pontos de falha antes de validar os domínios. |

### 1.2. Restrições assumidas

A API key de LLM é exclusivamente server-side; geração de IA depende de conectividade e de autorização atual; memória individual permanece local e separada da memória normativa; políticas são compostas por herança e restrições; falhas de validação negam a operação; fontes transacionais continuam sendo sistemas de registro; e o conteúdo ingerido de e-mails, documentos, páginas ou ferramentas é tratado como dado não confiável, nunca como instrução de política.[2] [3]

---

## 2. Decisão

**Adotaremos uma arquitetura modular orientada a domínios, em monorepo poliglota controlado, limitado a duas linguagens de produção: TypeScript/Node.js + Fastify para Harness, Control Plane e Action; e Python + FastAPI/workers para Knowledge e Intelligence. NestJS poderá ser usado somente como camada de convenções sobre o adapter Fastify. Os quatro planos — Harness, Knowledge, Intelligence e Action — serão implantados como processos separados nos limites de confiança e escala, usando OpenAPI, JSON Schema e AsyncAPI como contratos versionados. PostgreSQL será a fonte de verdade transacional; MinIO armazenará originais e artefatos; Qdrant manterá o índice vetorial derivado; Vault protegerá credenciais; e o Model Gateway TypeScript aplicará identidade, política, orçamento, classificação, redaction, recuperação e autorização antes de qualquer geração, insight ou ação.**

A decisão contém uma regra de produto e arquitetura:

> **O Domus não acumula “todo o conhecimento” sem distinção; ele constrói uma memória empresarial governada, com linhagem, qualidade, vigência, evidência e controle de acesso.**

O sistema será organizado em quatro planos:

| Plano | Responsabilidade | Pergunta respondida |
|---|---|---|
| **Harness Plane** | Identidade, policy, catálogo, budget, credenciais, auditoria, modelos e tools. | “Esta operação pode acontecer, com qual modelo, custo, dado e alçada?” |
| **Knowledge Plane** | Fontes, ingestão, normalização, classificação, taxonomia, entidades, relações, claims, evidências, indexação e ciclo de vida. | “O que a empresa sabe, de onde veio, para quem é válido e até quando?” |
| **Intelligence Plane** | Recuperação, respostas, sínteses, comparações, briefings, mudanças, lacunas, insights, confiança e feedback. | “O que este conhecimento significa para este usuário e este momento?” |
| **Action Plane** | MCP proxy, conectores, confirmação, aprovação, idempotência, execução e recibos. | “Qual próximo passo pode ser iniciado com segurança e responsabilidade?” |

Esses planos não são necessariamente quatro produtos ou quatro clusters independentes na v1.0. São fronteiras de domínio e confiança que podem compartilhar um control plane e uma instância lógica de PostgreSQL no início, mas devem manter contratos, schemas e responsabilidades separadas.

### 2.1. Frontend

| Área | Decisão |
|---|---|
| **Cliente desktop** | Electron + React + TypeScript, com `contextIsolation`, `sandbox`, `nodeIntegration=false`, CSP e preload mínimo. O cliente oferece chat, busca, exploração, evidência, memória pessoal, briefings, feedback e confirmação de ações. |
| **Painel administrativo** | React + TypeScript para tenants, workspaces, policies, providers, budgets, fontes, owners, taxonomia, qualidade, retenção, auditoria, conectores, insights e rollout. |
| **Knowledge Workbench** | Interface compartilhada para pesquisar ativos, explorar entidades e relações, abrir evidências, comparar versões, revisar claims, resolver conflitos e acompanhar frescor. |
| **Intelligence Workbench** | Interface compartilhada para perguntas, sínteses, comparações, briefings, mudanças, lacunas, insights e feedback; toda saída separa fato, evidência, inferência e recomendação. |
| **Action Review** | Tela de pré-visualização de ação que mostra intenção, sistema, ferramenta, parâmetros redigidos, impacto, risco, aprovação exigida e resultado/recibo. |
| **Estado local** | Zustand para estado efêmero; cache de servidor com versão, TTL e revalidação. Estado de policy, catálogo, fontes e briefings nunca é tratado como autoridade local. |
| **Comunicação** | HTTPS com OIDC/PKCE; REST/JSON para control plane; busca e geração via APIs tipadas; SSE para streaming de respostas e eventos; comandos de ação em endpoints separados. |
| **Persistência local** | SQLite para memória pessoal, identidade local, histórico permitido e skills; Keychain/Vault nativo para OAuth. Memória local não é sincronizada automaticamente com o Knowledge Fabric. |
| **Acessibilidade** | Design system único, teclado, foco, contraste, estados sem dependência exclusiva de cor, leitor de tela e explicações textuais para evidência, confiança, conflito e bloqueio. |
| **Atualização** | Instaladores assinados, atualização por anel e rollback; o cliente respeita versão mínima, política de compatibilidade e migração de dados locais. |
| **Design system** | shadcn/ui mantido no repositório, com Tailwind CSS, Radix UI, Lucide Icons, tokens semânticos BetaUp e componentes compostos Domus para confiança, evidência, governança e ação. |

O frontend não apresenta a plataforma como uma autoridade onisciente. A experiência deve usar estados como **fundamentada**, **parcial**, **conflitante**, **inferida**, **sem evidência**, **obsoleta**, **bloqueada** e **inconclusiva**. Isso é um requisito de confiança, não apenas uma escolha visual.

### 2.1.1. Decisões do design system

A interface será implementada a partir dos componentes de código do shadcn/ui, mantidos no repositório do produto e adaptados por tokens semânticos. O design system não será tratado como tema superficial: ele é uma fronteira de consistência, acessibilidade e comunicação de risco entre os quatro planos arquiteturais.

As decisões vinculantes são:

| Decisão | Consequência arquitetural |
|---|---|
| **Tokens em três camadas** | Valores da paleta BetaUp são convertidos em tokens primitivos, semânticos e de componente; hexadecimais diretos ficam restritos a tokens, testes e documentação. |
| **Button sem Indigo/Violeta** | `#271BAE` e `#310AE3` não podem aparecer em background, hover, active ou borda ativa de Button; lint, snapshots e testes de componente bloqueiam violações. |
| **Estados de IA contratados** | Os oito estados semânticos vêm dos schemas de API; o frontend não classifica resposta por heurística textual nem cria estado divergente. |
| **Evidência com RLS** | CitationPill e EvidenceSheet mostram trecho, versão, seção, owner e vigência apenas dentro do escopo retornado pelo backend. Conteúdo omitido por RLS não aparece em tooltip, aria-label, analytics ou log. |
| **Action Review como fronteira** | ActionReviewDialog visualiza intenção, destino, parâmetros redigidos, risco, alçada, confirmação, recibo e estado terminal; não executa ação diretamente. |
| **Densidade e temas** | Componentes suportam `default`/`compact` e light/dark sem alterar semântica ou contraste. |
| **Acessibilidade como gate** | axe-core/Playwright, teclado, foco, contraste, zoom de 200%, leitor de tela e reduced motion entram no CI/CD e no release gate. |

A implementação deve manter a biblioteca base em `packages-ts/ui-system` e os componentes compostos Domus em um namespace separado. Não deve existir um wrapper opaco para cada componente; a composição adicional só é justificada quando codifica proveniência, policy, estado semântico, risco, auditoria ou comportamento específico da plataforma.

### 2.2. Backend e domínios

| Domínio/processo | Runtime principal na v1.0 | Responsabilidades principais | Fronteira arquitetural |
|---|---|---|---|
| **Identity & Tenancy** | TypeScript + Fastify | IdP, usuários, papéis, dispositivos, tenants, workspaces, RLS e revogação. | Autoridade server-side de identidade; nenhum serviço Python deriva permissões por conta própria. |
| **Governance & Policy** | TypeScript + Fastify | Políticas em cascata, provenance, classificação, retenção, catálogo efetivo e fail-closed. | Produz `EffectivePolicy` versionada para os demais serviços. |
| **Model Gateway** | TypeScript + Fastify | Inferência, streaming, roteamento, redaction, limites, circuit breaker e credenciais. | Único egress de produção para LLMs, embeddings hospedados e providers externos. |
| **Usage & Budget** | TypeScript + Fastify | Pré-check, reserva, ledger, reconciliação, preços e alertas. | Reserva e reconciliação server-side, com consistência forte. |
| **Source Registry** | TypeScript + Fastify | Registro de fontes, connectors, owners, escopos, frequências, SLAs e estado de sincronização. | Publica contratos e metadados consumidos pelos workers Python. |
| **Ingestion & Normalization** | Python + FastAPI/workers | Conectores, parsing, malware scan, deduplicação, normalização, classificação e versionamento. | Não amplia ACL/budget nem chama provider externo fora dos contratos autorizados. |
| **Knowledge Graph Lite** | Python + FastAPI/workers, com PostgreSQL | Taxonomia, entidades, relações, claims, evidências e revisão; inicialmente sobre PostgreSQL, sem banco de grafo dedicado. | Projeções revisáveis; a fonte original permanece a autoridade. |
| **Retrieval** | Python + FastAPI/workers | Busca textual, semântica e por metadados; filtros de ACL antes da recuperação; reranking e referências. | Recebe escopo e `EffectivePolicy`; resultados devem preservar evidência e versão. |
| **Intelligence** | Python + FastAPI/workers | Prompt/context assembly, síntese, comparação, confidence, briefings, change detection, gaps e insights. | Pode usar bibliotecas locais de IA, mas egress de modelo passa pelo Model Gateway. |
| **Quality Loop** | Python + workers, exposto pelo Control Plane TypeScript | Feedback, avaliações, groundedness, qualidade de fontes, métricas e abertura de revisões. | Avaliações e jobs são derivados; não alteram fonte ou policy silenciosamente. |
| **Tooling & MCP** | TypeScript + Fastify | Manifestos, conectores, escopos, proxy, OAuth, guardrails e descoberta de ferramentas. | Credenciais e autorização ficam no servidor, com catálogo efetivo por workspace. |
| **Action Gateway** | TypeScript + Fastify | Confirmação, aprovação, idempotência, execução, recibos, retries e kill switch. | Toda escrita externa passa por esta fronteira e é reautorizada no momento da execução. |
| **Operations & Release** | Comum aos dois runtimes | Observabilidade, incidentes, SLOs, backups, atualização, rollout e auditoria operacional. | Toolchains, imagens, dashboards e runbooks separados, com correlação por `request_id`. |

A implementação será Clean Architecture com DDD pragmático. O domínio não importa HTTP, SDK de provider, banco ou filesystem. Adaptadores implementam contratos para IdP, LLMs, embeddings, Vault, MinIO, Qdrant, MCPs e fontes empresariais.

### 2.3. Tecnologias e infraestrutura

| Camada | Decisão |
|---|---|
| **Runtime do Harness/Control Plane** | TypeScript sobre Node.js 22 LTS, com Fastify, schemas explícitos e serviços de identidade, policy, budget, gateway, MCP e ação. NestJS é opcional somente sobre o adapter Fastify. |
| **Runtime de Knowledge/Intelligence** | Python + FastAPI para APIs especializadas e workers para parsing, ingestão, embeddings, retrieval avançado, transcrição, avaliação, briefings e insights. |
| **Contratos cross-runtime** | OpenAPI para APIs HTTP, JSON Schema para payloads compartilhados e AsyncAPI para eventos/jobs; todos versionados, compatíveis e cobertos por testes de contrato. |
| **Egress de providers** | LLMs, embeddings hospedados e APIs de provider/MCP são chamados pelo Model Gateway TypeScript. Workers Python usam um cliente interno governado e não podem contornar policy, redaction, budget ou auditoria. |
| **Transacional** | PostgreSQL 16+, com RLS, migrações, constraints, outbox, ledger e histórico. |
| **Cache/coordenação** | Redis para cache de policy com versão/TTL, rate limit, locks e coordenação efêmera; nunca como fonte única de autorização. |
| **Segredos** | Vault ou serviço corporativo equivalente; PostgreSQL guarda referências, não valores secretos. |
| **Objetos** | MinIO/S3 compatível para documentos originais, versões, artefatos, transcrições e exportações conforme retenção. |
| **Busca vetorial** | Qdrant com collections versionadas e payload de tenant, workspace, classificação, source, asset, seção e vigência. |
| **Busca textual e filtros** | PostgreSQL inicialmente para metadados e full-text; um motor dedicado pode ser introduzido quando volume ou relevância justificarem. |
| **Eventos/jobs** | Outbox transacional e tabela de jobs no início; broker dedicado somente quando throughput, replay ou desacoplamento forem demonstrados como necessários. |
| **Observabilidade** | OpenTelemetry para traces, métricas e logs estruturados; redaction obrigatório em toda telemetria, com instrumentação equivalente nos dois runtimes. |
| **Entrega** | Containers OCI, ambientes separados, configuração por ambiente, secrets em runtime e CI/CD com gates de segurança, qualidade, testes de contrato e aprovação. |

As chamadas entre os runtimes carregam `request_id`, `tenant_id`, `workspace_id`, `policy_version`, `classification`, `allowed_sources`, `budget_scope` e `provenance`. Um serviço Python pode reduzir o escopo, mas nunca ampliá-lo. O gateway TypeScript permanece a autoridade para egress de modelos, ferramentas, custos e ações.

### 2.4. Política de autoridade dos dados

A plataforma terá três níveis de autoridade:

| Nível | Fonte | Uso |
|---|---|---|
| **Sistema de registro** | ERP, CRM, HRIS, Jira, ClickUp, repositório oficial ou fonte designada pelo domínio. | Verdade operacional/transacional; o Domus referencia e interpreta, mas não substitui. |
| **Conhecimento curado** | Documentos, processos, decisões, claims e relações aprovados no Knowledge Fabric. | Respostas, sínteses, briefings e insights dentro da vigência e do escopo. |
| **Contexto derivado** | Resumos, embeddings, insights, briefings, feedback e memória local. | Acelera compreensão e personalização; não pode ampliar autoridade nem substituir evidência. |

A ingestão de uma fonte não a torna automaticamente normativa. Um ativo pode estar `pending_review`, `approved`, `superseded`, `expired`, `revoked`, `conflicted` ou `quarantined`. O retrieval e a inteligência devem considerar esse estado.

---

## 3. Justificativa

### 3.1. Por que Plataforma de Inteligência, e não apenas harness?

**Vantagens:**

- O harness resolve a governança da execução, mas não define o valor principal que o usuário percebe: compreender a empresa, encontrar evidências e agir melhor.
- O Knowledge Fabric transforma fontes dispersas em um ativo versionado e autorizável, evitando que RAG seja apenas busca em documentos.
- A camada de inteligência permite respostas, sínteses, briefings e insights alinhados ao papel, workspace, tempo e objetivo.
- A arquitetura mantém a segurança do harness como pré-condição para cada operação de conhecimento e ação.

**Trade-off:** A categoria de produto passa a envolver qualidade de dados, UX de confiança, ownership, taxonomia, ciclos de revisão e métricas de inteligência. Isso é mais amplo do que um proxy de LLM. A mitigação é entregar em incrementos, começar por domínios e fontes prioritários e não prometer completude universal.

### 3.2. Por que Knowledge Fabric com fonte, versão e evidência?

**Vantagens:**

- Permite distinguir documento, registro, claim, relação, insight e memória sem misturar autoridade.
- Preserva a proveniência, a vigência e o owner, necessários para respostas corporativas confiáveis.
- Torna possível identificar lacunas, conflitos e obsolescência em vez de apenas gerar uma resposta plausível.
- Permite reconstruir índices e derivados sem perder a fonte original.

**Trade-off:** O pipeline de dados e o modelo de ciclo de vida tornam-se mais complexos do que um upload direto para um vector store. A mitigação é adotar estados explícitos, processamento idempotente, métricas de frescor, workflows de revisão e uma política de publicação por domínio.

### 3.3. Por que busca híbrida em vez de somente vetores?

**Vantagens:**

- Busca textual e filtros preservam precisão para códigos, nomes, números, IDs, cláusulas e termos exatos.
- Busca vetorial ajuda em perguntas semânticas, paráfrases e descoberta de documentos relacionados.
- Taxonomia, ACL, vigência e metadados precisam de filtros determinísticos, não apenas de similaridade.
- A combinação oferece uma base mais adequada para exploração, citações e comparação.

**Trade-off:** A relevância fica dependente de configuração de ranking, chunking, embeddings e qualidade dos metadados. A mitigação é versionar pipeline e modelo, avaliar conjuntos de perguntas, permitir inspeção de evidências e registrar métricas de recuperação.

### 3.4. Por que Knowledge Graph Lite sobre PostgreSQL no MVP?

**Vantagens:**

- Entidades e relações são necessárias para navegar por processos, áreas, produtos, pessoas e dependências.
- PostgreSQL já é a fonte transacional e suporta constraints, versionamento, RLS e auditoria.
- Evita adicionar um banco especializado antes de medir a necessidade real de travessias complexas.
- Permite migrar relações maduras para um grafo dedicado sem perder o contrato de domínio.

**Trade-off:** Consultas de travessia profunda ou consultas exploratórias de grande escala podem ficar limitadas. A mitigação é manter o contrato de relações independente, criar índices adequados e definir um gatilho de evolução: volume, latência ou complexidade que exceda as metas do PostgreSQL.

### 3.5. Por que o gateway deve controlar também recuperação e ação?

Se o gateway controlar apenas inferência, uma busca ou uma ação poderia acessar dados e sistemas sem a mesma identidade, policy, budget, classificação e auditoria do chat. A fronteira central precisa cobrir a cadeia completa:

```text
identidade -> política -> recuperação -> contexto -> modelo -> insight -> ação
```

Cada etapa pode reduzir escopo, mas nenhuma pode ampliar permissões. A ACL deve ser aplicada antes da busca; o contexto recuperado deve ser delimitado como dado não confiável; o modelo deve ser escolhido dentro do catálogo; o insight deve preservar evidências; e a ação deve ser reautorizada no servidor.

### 3.6. Por que a divisão TypeScript + Python?

#### 3.6.1. TypeScript/Node.js + Fastify para Harness, Control Plane e Action

**Vantagens:**

- Compartilha schemas e tipos entre desktop, painel, gateway e SDKs TypeScript, reduzindo divergência entre frontend e autoridade server-side.
- É adequado para I/O de conectores, streaming, chamadas a providers, APIs de control plane e proxy MCP.
- Permite começar com módulos e processos separados sem impor microserviços independentes.
- Facilita doubles, contratos e validação de payloads em APIs e eventos.

**Trade-off:** TypeScript não deve executar parsing pesado, embeddings, transcrição, avaliações ou transformações CPU-bound no processo do gateway. Esses trabalhos ficam em workers Python, com limites de CPU, fila observável e backpressure.

#### 3.6.2. Python + FastAPI/workers para Knowledge e Intelligence

**Vantagens:**

- É o runtime mais adequado para parsing documental, NLP, embeddings, reranking, transcrição, avaliação, classificação e experimentação de IA aplicada.
- FastAPI fornece APIs tipadas por type hints, validação, OpenAPI/JSON Schema e suporte assíncrono adequado às interfaces especializadas.[13]
- Permite separar experimentação e processamento intensivo do caminho crítico do gateway, escalando workers de forma independente.
- Mantém o Knowledge Fabric e a Intelligence Layer próximos das bibliotecas de IA, sem obrigar o Control Plane a incorporar dependências de ciência de dados.

**Trade-off:** A divisão exige contratos cross-runtime, toolchains, imagens, observabilidade e testes adicionais. Python também não deve ser tratado como autoridade de policy, budget ou egress: recebe `EffectivePolicy` versionada e usa o Model Gateway TypeScript para chamadas externas de modelo.

A decisão não é uma autorização para criar dois backends concorrentes. TypeScript é a autoridade de governança e execução; Python é o runtime especializado de conhecimento e inteligência. Nenhum dos dois pode manter uma cópia divergente de policy, budget, identidade ou autorização.

### 3.7. Por que PostgreSQL, MinIO e Qdrant?

**PostgreSQL** concentra identidade, policy, catálogo, source registry, metadados de conhecimento, taxonomia, entidades, claims, insights, budget, ledger, auditoria e outbox. Transações fortes são exigidas para policy publicada, revogação, reserva financeira e estado de ações.

**MinIO** preserva originais e versões imutáveis de documentos, transcrições e artefatos classificados. O objeto original é a fonte de reconstrução, não o vetor.

**Qdrant** fornece busca vetorial e payload filtrável para chunks, documentos, seções, ACL, vigência e versão do modelo de embedding. É um índice derivado que pode ser reprocessado ou reconstruído.

**Trade-off conjunto:** Há múltiplos estados operacionais — fonte, metadado, índice, claim e insight. A mitigação é usar IDs de versão, estados de pipeline, outbox, jobs idempotentes, métricas de atraso e comportamento explícito de “sem evidência” quando o índice não for confiável.[2] [3]

### 3.8. Por que não coletar tudo automaticamente?

O valor de uma plataforma de inteligência não cresce linearmente com o volume ingerido. Dados sem owner, classificação, vigência ou conexão semântica aumentam o custo e a probabilidade de respostas erradas. A decisão é adotar **ingestão governada por fonte**, não “raspagem universal”. Cada fonte deve ter propósito, escopo, frequência, classificação, owner, retenção, estado de qualidade e mecanismo de revogação.

---

## 4. Consequências

### 4.1. Positivas

- ✅ O produto passa a ter uma proposta de valor clara além de “chat com governança”: memória empresarial, inteligência contextual e ação responsável.
- ✅ Toda resposta, síntese, briefing e insight pode ser investigado por evidência, versão, vigência e política.
- ✅ A empresa pode começar por domínios prioritários e expandir a memória de forma incremental, sem prometer completude falsa.
- ✅ A separação entre fonte, conhecimento curado, derivado e memória pessoal reduz confusão de autoridade.
- ✅ O harness continua protegendo credenciais, custos, modelos, ferramentas, políticas e ações.
- ✅ O feedback vira um mecanismo de melhoria de fonte, taxonomia, prompt, avaliação e processo.
- ✅ O desenho de Knowledge Graph Lite mantém a arquitetura simples e deixa aberta a evolução para grafo dedicado.
- ✅ Sistemas transacionais continuam sendo fontes de registro, reduzindo risco de criar um ERP paralelo.

### 4.2. Negativas

- ❌ A v1.0 exige competências de engenharia de dados, IA aplicada, UX de confiança, governança de conhecimento e operação.
- ❌ O valor depende da qualidade e da disponibilidade dos owners das fontes, não apenas do código.
- ❌ O pipeline de ingestão, classificação, revisão, indexação e expiração é mais complexo que um RAG simples.
- ❌ Respostas com evidência, conflitos e estados de confiança exigem mais espaço e decisões na interface.
- ❌ Briefings e insights podem gerar fadiga ou desconfiança se os limiares e as fontes não forem calibrados.
- ❌ A ação governada exige contratos de integração, idempotência, aprovação, confirmação e suporte operacional.
- ❌ O gateway e o control plane permanecem dependências críticas; durante perda de autorização a plataforma deve bloquear operações.

### 4.3. Mitigações

| Consequência | Mitigação |
|---|---|
| Escopo mais amplo | Dividir em planos e incrementos; manter sistemas transacionais como source of record; priorizar cinco domínios e fontes no piloto. |
| Dependência de owners | Source registry obrigatório, SLA, dashboards de frescor/conflito e escalonamento para fontes sem owner. |
| Complexidade do pipeline | Estados explícitos, outbox, jobs idempotentes, reprocessamento e contratos de parser/conector. |
| UX de confiança mais densa | Design system, testes de usabilidade e padrões consistentes para evidência, confiança, conflito, obsolescência e bloqueio. |
| Fadiga de insights | Limiar configurável, deduplicação, feedback, frequência controlada, owner e opção de silenciar/pausar. |
| Risco de ação externa | Matriz de risco, confirmação, aprovação, sandbox, idempotency key, recibo, retry limitado e kill switch. |
| Gateway indisponível | Múltiplas instâncias, circuit breaker, health/readiness, runbooks, RTO/RPO e fail-closed. |
| Exposição de conteúdo | ACL antes da busca, RLS, redaction, metadados por padrão, classificação e auditoria de leitura. |

---

## 5. Arquitetura Técnica Detalhada

### 5.1. Diagrama de Contexto — C4 Nível 1

```text
                              +--------------------------+
                              |      IdP corporativo     |
                              |  identidade / grupos     |
                              +------------+-------------+
                                           |
                                           v
+------------------+     HTTPS/SSE    +----+-------------------------------+
| Colaborador      |<---------------->|                                     |
| Electron         |----------------->|  DOMUS CORP                         |
| chat/busca/      |  ações/feedback  |  Plataforma de Inteligência         |
| memória local    |                  |  Harness + Knowledge + Intelligence |
+--------+---------+                  |  + Action                           |
         |                            +---------+---------------------------+
         v                                      |
+------------------+                            |
| SQLite +         |                            |
| Keychain local   |                            |
+------------------+                            |
                                                    |
       +----------------------+---------------------+---------------------+
       |                      |                     |                     |
       v                      v                     v                     v
+--------------+     +---------------+     +----------------+     +----------------+
| Fontes       |     | Provedores    |     | MCPs/SaaS      |     | Administradores|
| Docs/Drive/  |     | LLM/Embedding |     | Jira/ClickUp/  |     | Gestores/Owners|
| e-mail/SaaS  |     |               |     | Google/etc.    |     | painel web     |
+--------------+     +---------------+     +----------------+     +----------------+

A plataforma preserva origem e ACL das fontes, mantém credenciais no servidor,
recupera conhecimento somente dentro do escopo e executa ações pela camada governada.
```

### 5.2. Diagrama de Containers — C4 Nível 2

> **Mapeamento de runtime.** No diagrama, Control Plane API, AI Gateway e Action Gateway são serviços TypeScript/Fastify; Retrieval, Intelligence, Ingestion, Quality e Briefing/Insight Workers são APIs ou workers Python/FastAPI. Todos usam os contratos versionados e as fronteiras de egress descritas na seção 2.3.

```text
+--------------------------------------------------------------------------------------+
|                              DOMUS CORP                                              |
|                                                                                      |
|  +----------------+       +----------------------+       +----------------------+   |
|  | Admin Web      |------>| Control Plane API   |------>| PostgreSQL            |   |
|  | React          |       | tenants, policies,  |       | identity, source,     |   |
|  +----------------+       | catalog, quality   |       | metadata, claims,    |   |
|                           +----------+-----------+       | insights, budget,    |   |
|                                      |                   | audit, outbox        |   |
|                           +----------v-----------+       +----------+-----------+   |
|                           | Policy & Trust       |                  |               |
|                           | engine / RLS / ACL  |       +----------v-----------+   |
|                           +----------+-----------+       | Redis                |   |
|                                      |                   | cache, rate, locks  |   |
|  +----------------+          +------v-------+           +----------------------+   |
|  | Electron       | HTTPS/SSE| AI Gateway  |                                       |
|  | React + local  |---------->| auth, data, |---------------> Vault                |
|  | memory         |           | policy, SSE |                  secrets             |
|  +----------------+           +---+-----+---+                                       |
|                                   |     |                                           |
|                     +-------------v+   +v------------------+                       |
|                     | Retrieval     |   | Intelligence     |                       |
|                     | hybrid search |   | synthesis,      |                       |
|                     | ACL, ranking  |   | briefings,      |                       |
|                     +------+--------+   | insights, evals |                       |
|                            |            +---------+--------+                       |
|                            |                      |                                |
|              +-------------v---+          +-------v---------+                        |
|              | Qdrant          |          | Model/Provider  |                        |
|              | vectors/payload |          | adapters        |--------------------+   |
|              +-----------------+          +-----------------+                    |   |
|                                                                                  v   |
|  +--------------------+       +----------------------+                    +-----------+
|  | Source Registry    |------>| Ingestion Workers    |------------------->| LLM APIs   |
|  | owners/ACL/SLA     |       | parse/normalize/     |                    | embeddings |
|  +--------------------+       | classify/index      |                    +-----------+
|                               +----------+-----------+                               |
|                                          |                                           |
|                                  +-------v---------+                                 |
|                                  | MinIO/S3        |                                 |
|                                  | originals/      |                                 |
|                                  | versions/files  |                                 |
|                                  +-----------------+                                 |
|                                                                                      |
|  +--------------------+       +----------------------+       +-------------------+   |
|  | Quality Workers    |------>| Briefing/Insight     |------>| Action Gateway    |   |
|  | eval/feedback/     |       | Workers             |       | MCP/OAuth/confirm |   |
|  | freshness/conflict |       +----------------------+       +---------+---------+   |
|  +--------------------+                                                  |             |
|                                                                         v             |
|                                                               +---------------------+  |
|                                                               | Sistemas externos  |  |
|                                                               | SaaS/MCP           |  |
|                                                               +---------------------+  |
|                                                                                      |
|  OpenTelemetry Collector -> traces, metrics, structured logs, alerting/runbooks     |
+--------------------------------------------------------------------------------------+
```

### 5.3. Fluxo Principal: Fonte até Inteligência e Ação

```text
1. Source Owner cadastra uma fonte com owner, escopo, classificação, frequência, SLA e retenção.
2. Connector autentica com credencial escopada e captura documentos/registros conforme cursor.
3. Ingestion Worker valida formato, malware, hash, duplicidade, classificação e versão.
4. MinIO armazena o original imutável; PostgreSQL registra metadata, lineage e estado.
5. Normalizer extrai texto/campos, detecta entidades, taxonomia, relações e claims candidatos.
6. Owner ou regra de domínio aprova o ativo; itens suspeitos ficam pendentes/quarantined/conflicted.
7. Indexer cria chunks, embeddings e payload de ACL/vigência no Qdrant; falhas entram em reprocessamento.
8. Usuário faz pergunta, pede análise, configura briefing ou inicia uma ação.
9. Gateway autentica usuário, tenant, device e workspace; resolve política efetiva e budget.
10. Retrieval aplica ACL/RLS antes da busca e recupera fontes/claims/evidências autorizados.
11. Intelligence Layer monta contexto mínimo, delimita conteúdo não confiável e prepara o pedido conforme o contrato interno.
12. O Model Gateway TypeScript escolhe o modelo permitido, aplica redaction/budget e chama o provider com credencial server-side.
13. O modelo produz resposta, síntese, comparação, briefing ou insight com estado semântico e citações.
14. Data/Quality Guard verifica evidência, vigência, confiança, conflito, redaction e limites de saída.
15. Se houver ação, Action Gateway mostra intenção, impacto, parâmetros, risco e aprovação necessária.
16. Após confirmação/autorização, connector executa idempotentemente; recibo e estado são registrados.
17. Auditoria correlaciona fonte, policy, modelo, custo, usuário, insight, ação e resultado sem reter conteúdo proibido.
18. Feedback ou falha abre revisão de fonte, claim, taxonomia, prompt, limiar, policy ou integração.
```

### 5.4. Fluxo de Pergunta Fundamentada

```text
1. Cliente envia intenção, pergunta, workspace e classificação declarada; request_id é criado.
2. Gateway valida token, dispositivo, versão, tenant e policy; não confia nas permissões do payload.
3. Policy Engine produz EffectivePolicy com allowed_sources, allowed_models, retention e provenance.
4. Retrieval recebe filtros de ACL, vigência, classificação, taxonomia e workspace.
5. Busca híbrida consulta metadados/texto e vetores; candidatos fora do escopo são descartados antes do ranking final.
6. Evidence Resolver verifica documento, versão, seção, estado e vigência no PostgreSQL/MinIO.
7. Context Builder monta somente o contexto autorizado e marca cada trecho como dado não confiável.
8. A API/worker Python invoca o Model Gateway por contrato interno versionado, sem ampliar o `EffectivePolicy`.
9. O Model Gateway TypeScript seleciona o provider permitido, aplica redaction/budget e chama o modelo com credencial server-side.
10. Response Guard classifica saída como fundamentada, parcial, conflitante, inferida, sem evidência ou obsoleta.
11. Cliente apresenta resposta com citações, estado, confiança e ações seguras disponíveis.
12. Auditoria registra query, filtros, ids de evidência, versão de policy, modelo, latência e resultado.
```

### 5.5. Fluxo de Detecção de Mudança e Insight

```text
1. Connector ou owner publica nova versão/registro dentro da fonte autorizada.
2. Change Detector compara versão, estrutura, entidades, claims, relações e janela temporal.
3. Policy/Quality Guard verifica se o dado é elegível, vigente e permitido ao workspace.
4. Impact Resolver identifica processos, áreas, políticas, briefings e usuários potencialmente afetados.
5. Insight Engine aplica regra/limiar versionado ou modelo permitido e produz sinal com evidência.
6. Insight recebe confidence, severidade, explicação, impacto potencial, owner e estado draft.
7. Gestor/owner revisa; o sistema deduplica, agrupa ou silencia conforme feedback.
8. Insight publicado entra em briefing ou fila de ação proposta; não executa automaticamente ação de alto risco.
9. Resultado e feedback alimentam métricas de qualidade e ajuste do limiar, sem apagar a fonte original.
```

### 5.6. Modelo de Confiança e Segredos

| Fronteira | Confiança | Controle obrigatório |
|---|---|---|
| Renderer Electron → Main/Preload | Potencialmente comprometido | IPC allowlist, schemas, sandbox, sem Node, CSP e dependências verificadas. |
| Cliente → Gateway | Autenticado, mas adulterável | TLS, token, device revogável, schema, limite, nenhuma confiança em policy declarada. |
| Gateway → Retrieval/Intelligence | Serviço interno privilegiado | Contexto de request imutável, ACL prévia, policy version, timeout e telemetria redigida. |
| Gateway → Vault | Alta sensibilidade | Identidade de workload, leitura por referência, rotação, auditoria e zero segredo no cliente. |
| Retrieval → Modelo | Conteúdo não confiável | Contexto mínimo, delimitação, classificação, redaction e instruções de sistema fora dos documentos. |
| Modelo → Action Gateway | Saída não confiável | Schema, validação, allowlist, confirmação, aprovação, idempotência e revisão de risco. |
| Fonte/MCP → Knowledge Fabric | Potencialmente não confiável | Escopo OAuth, malware scan, quarantine, classificação, owner e revisão. |
| Admin/Owner → Control Plane | Privilegiado, não absoluto | RBAC, RLS, dupla aprovação para alto risco, auditoria de leitura e rollback. |

### 5.7. Modelo de Política Efetiva

```text
EffectivePolicy {
  tenant_id,
  workspace_id,
  user_id,
  device_id,
  policy_version,
  allowed_sources[],
  allowed_assets[],
  allowed_models[],
  allowed_tools[],
  allowed_actions[],
  allowed_classifications[],
  retention_rules,
  budget_scope,
  freshness_rules,
  insight_rules,
  decision,
  deny_reasons[],
  provenance[]
}
```

A composição deve ser monotônica: uma política de escopo menor só pode reduzir o conjunto de permissões. O resultado carrega a origem de cada restrição, para que a interface explique por que uma fonte, resposta, insight ou ação está indisponível.

### 5.8. Modelo de Conhecimento, Evidência e Qualidade

Cada ativo percorre estados controlados:

```text
registered -> syncing -> ingested -> normalized -> pending_review
         -> approved -> indexed -> active -> superseded/expired/revoked
         -> quarantined/conflicted -> archived/deleted
```

Cada claim ou relação derivada deve apontar para pelo menos uma evidência e carregar `confidence`, `valid_from`, `valid_to`, `source_version`, `owner_id` e `review_status`. Um insight é um derivado ainda mais distante da fonte: precisa preservar os sinais, a janela temporal, a regra/modelo, a versão de policy, a explicação e o owner.

A qualidade de um domínio será composta por indicadores de:

- **frescor:** tempo desde a última atualização em relação ao SLA;
- **cobertura:** proporção de perguntas recorrentes com fonte elegível;
- **completude:** presença de owner, classificação, vigência, metadados e links;
- **consistência:** conflitos e duplicidades detectados;
- **recuperabilidade:** precisão e recall do conjunto de avaliação;
- **groundedness:** aderência das respostas às evidências recuperadas;
- **utilidade:** feedback de usuários e gestores;
- **segurança:** ausência de acessos indevidos, secrets e prompt injection.

### 5.9. Dados, consistência e retenção

A consistência forte é obrigatória para identidade, policy publicada, revogação, ACL, reserva de budget, estado de ação e metadados de versão. Consistência eventual é aceitável para embeddings, dashboards agregados, briefings não críticos e métricas, desde que atraso ou erro sejam visíveis.

O PostgreSQL será particionado/arquivado para ledger, auditoria, queries e eventos conforme o volume. O MinIO usará versionamento e lifecycle. O Qdrant será reindexável a partir da combinação `asset_version + embedding_model + policy metadata`. Conteúdo de prompt, resposta, transcrição e briefing não será retido no servidor por padrão; exceções exigem classificação, retenção, criptografia e autorização.

### 5.10. Estrutura de Pastas Recomendada

```text
/domus-corp
  /apps
    /admin-web
    /desktop
      /main
      /preload
      /renderer
    /control-plane-api-ts
    /ai-gateway-ts
    /action-gateway-ts
    /retrieval-api-py
    /intelligence-worker-py
    /ingestion-worker-py
    /quality-worker-py
  /packages-ts
    /contracts-client
    /domain-identity
    /domain-governance
    /domain-budget
    /domain-tooling
    /domain-actions
    /policy-engine
    /provider-adapters
    /mcp-sdk
    /security-redaction
    /observability
    /ui-system
  /packages-py
    /domain-source-registry
    /domain-knowledge
    /domain-retrieval
    /domain-intelligence
    /quality-engine
    /gateway-client
    /source-connectors
    /parsers
    /evaluation
    /observability
  /contracts
    /openapi
    /json-schema
    /asyncapi
  /database
    /migrations
    /policies
    /taxonomy-seeds
    /evaluation-fixtures
  /infra
    /compose
    /kubernetes
    /iac
    /observability
  /docs
    /adr
    /c4
    /knowledge-governance
    /threat-model
    /runbooks
  /tests
    /contract-cross-runtime
    /integration
    /retrieval
    /evaluation
    /security
    /resilience
```

### 5.11. Estratégia de Testes Arquiteturais

| Camada | Escopo | Gate |
|---|---|---|
| Unitário | Policy, ACL, budget, redaction, versionamento, claims, confiança, idempotência e ranking. | Domínios críticos com cobertura acordada e casos negativos. |
| Contrato | APIs e eventos entre TypeScript/Fastify, Python/FastAPI, fontes, parsers, embeddings, MCP e action adapters. | Compatibilidade de OpenAPI/JSON Schema/AsyncAPI, evolução versionada e erros tipados. |
| Integração | PostgreSQL/RLS, MinIO, Qdrant, Vault, Redis, outbox, indexação e reconciliação. | Ambiente efêmero/doubles; dados sintéticos. |
| Retrieval | Recall/precision, ACL antes da busca, vigência, filtros, duplicidade e citações. | Dataset versionado com limites de aprovação. |
| Intelligence | Groundedness, resumo, comparação, classificação de estados, briefings e insights. | Avaliação automática + revisão humana amostral. |
| Sistema | Fonte → pergunta → evidência → resposta → feedback; fonte → mudança → insight → ação proposta. | Staging com fontes autorizadas e casos representativos. |
| Segurança adversarial | Prompt injection, fonte maliciosa, exfiltração, tenant escape, replay, segredo, budget e ação indevida. | Achados críticos/altos bloqueiam release. |
| Performance/resiliência | Sync, indexação, busca, streaming, concorrência, queda de provider, perda de instância e restore. | SLOs, RTO/RPO e idempotência dentro das metas. |
| Usabilidade/acessibilidade | Busca, evidência, conflito, briefing, feedback, confirmação e bloqueio. | WCAG 2.2 AA e testes com usuários. |
| Design system | Tokens, Button guardrail, temas, densidades, estados de IA, CitationPill, EvidenceSheet, ActionReviewDialog e componentes compostos. | Snapshots light/dark e `default`/`compact`; zero Button com Indigo/Violeta; axe-core/Playwright sem regressões críticas. |

---

## 6. Plano de Implementação em Fases

### Fase 0: Tese, domínio e governança (Semanas 1–2)

- Validar a categoria Plataforma de Inteligência Corporativa com IA e o corte da v1.0.
- Definir domínios prioritários, owners, fontes, classificação, retenção, SLA de frescor e taxonomia inicial.
- Aprovar threat model, C4, bounded contexts, contratos de policy, source, asset, evidence, intelligence e action.
- Criar monorepo poliglota controlado, toolchains TypeScript/Python, CI/CD, migrações, ambientes, contratos e fixtures de avaliação.

**Gate:** fontes prioritárias e owners conhecidos; modelo de autoridade e critérios de qualidade aprovados.

### Fase 1: Harness e identidade (Semanas 3–5)

- Integrar IdP, tenant/workspace, papéis, registro/revogação de dispositivo e painel mínimo.
- Criar Electron com IPC seguro, SQLite, Keychain, onboarding e memória local.
- Implementar Control Plane e Model Gateway em TypeScript/Fastify, Vault, catálogo, Policy Engine, budget, ledger e auditoria mínima.
- Implementar D0–D2 do design system: tokens BetaUp, temas light/dark, Button, Badge, Alert, Card, Dialog, Sheet, Table, Select, foco, contraste e guardrail automatizado contra Indigo/Violeta em Buttons.

**Gate:** nenhum segredo no cliente; policy e budget falham fechados; sessão revogada é bloqueada; os primitivos de UI passam nos gates de acessibilidade e cor.

### Fase 2: Knowledge Fabric básico (Semanas 6–9)

- Implementar Source Registry em TypeScript/Fastify, com owner, escopo, classificação, SLA, conectores e cursores.
- Implementar ingestão documental e normalização em Python/FastAPI/workers, com malware scan, MinIO, hash, versões e estados.
- Criar taxonomia inicial, entidades, relações, claims e evidências com revisão.
- Implementar Qdrant, busca híbrida, ACL antes da recuperação e reprocessamento.

**Gate:** dois ou mais domínios prioritários com fontes aprovadas, evidência rastreável e teste de isolamento.

### Fase 3: Inteligência assistida (Semanas 10–12)

- Entregar chat fundamentado pelo Model Gateway TypeScript, com Retrieval/Intelligence Python, busca exploratória, Knowledge Workbench e citações.
- Adicionar síntese, comparação, processos, estados semânticos e memória pessoal separada, mantendo egress de providers no gateway.
- Implementar D3–D4 do design system: AiSemanticBadge, AiResponseCard, CitationPill, EvidenceSheet, StreamingIndicator, PolicyDecisionBanner, BudgetMeter, SourceFreshnessBadge e tabelas de workbench.
- Criar avaliações de retrieval, groundedness, confiança, clareza de resposta e compreensão dos estados da interface.

**Gate:** perguntas do piloto têm cobertura medida; citações válidas; conflitos e ausência de evidência explícitos.

### Fase 4: Inteligência operacional (Semanas 13–15)

- Implementar em Python/FastAPI/workers briefings por workspace, mudança/obsolescência, lacunas e score de qualidade.
- Criar claims, feedback, revisão, insights com evidência, confidence, owner e recomendação, expondo APIs administrativas pelo Control Plane TypeScript.
- Implementar dashboards de frescor, cobertura, conflitos, consultas sem resposta e qualidade.

**Gate:** gestores validam relevância dos briefings e insights; nenhum insight crítico é publicado sem revisão apropriada.

### Fase 5: Ação governada (Semanas 16–18)

- Implementar MCP catalog, proxy, SDK, OAuth escopado, Action Gateway TypeScript/Fastify e matriz de risco.
- Entregar confirmação, aprovação, idempotência, recibos, retries seguros e kill switch.
- Implementar D5 do design system: ActionReviewDialog com intenção, destino, parâmetros redigidos, risco, alçada, confirmação e estado terminal.
- Ativar primeira onda de consultas e ações de baixa/média criticidade em ambientes controlados.

**Gate:** ações sem duplicidade, com escopo e recibo; ações de alto risco continuam exigindo aprovação; Action Review passa nos testes de teclado, foco, contraste e compreensão de risco.

### Fase 6: Segurança, resiliência e avaliação final (Semanas 19–21)

- Implantar múltiplas instâncias, probes, circuit breakers, observabilidade, SLOs, runbooks e restore.
- Validar retenção, redaction, direitos de dados, classificação, telemetria e backup.
- Executar carga, falhas, red-team, avaliação factual, retrieval, insights, custo e ação.

**Gate:** nenhum achado crítico/alto sem decisão; metas de RTO/RPO, SLO, groundedness e isolamento atendidas.

### Fase 7: Piloto e rollout (Semanas 22–23)

- Distribuir cliente assinado por anel, configurar workspaces e habilitar fontes/domínios selecionados.
- Medir adoção, tempo para resposta, cobertura, frescor, groundedness, insights, custo, bloqueios e satisfação.
- Concluir D6 do design system: documentação, exemplos, Storybook, checklist, ownership de componentes e treinamento do time.
- Produzir relatório de saída e backlog de evolução para novos domínios, fontes, conectores e autonomia.

**Gate:** critérios de saída aprovados e decisão formal sobre próxima onda; biblioteca de UI documentada, versionada e com owner definido.

---

## 7. Métricas de Sucesso para esta Arquitetura

| Métrica | Alvo | Como Medir |
|---|---|---|
| Exposição de segredo | 0 ocorrências | Scanning de cliente, rede, memória, logs, traces e red-team. |
| Bypass de policy/ACL/budget | 0 nos testes aprovados | Testes negativos, fuzzing, concorrência, replay e cliente comprometido. |
| Isolamento de tenant/workspace | 0 acessos cruzados | RLS, ACL antes da busca, retrieval adversarial e testes de relação. |
| Proveniência de resposta | ≥99,9% das respostas elegíveis com fonte/versão/policy | Auditoria de queries e respostas. |
| Validade de citação | ≥95% | Verificador de trecho, documento, versão e vigência. |
| Groundedness | ≥95% no conjunto aprovado | Avaliador automático + revisão humana. |
| Frescor de fonte crítica | ≥95% dentro do SLA | Source registry, último sync, versão e vigência. |
| Cobertura de perguntas | ≥80% no piloto | Dataset de perguntas recorrentes e consulta sem evidência. |
| Conflitos com owner | ≥90% resolvidos no SLA | Workflow de revisão e dashboards. |
| Qualidade de insight | ≥80% relevante/acionável | Feedback de gestores e avaliação amostral. |
| Latência de retrieval | p95 ≤2 s | Traces de filtros, busca, ranking e evidence resolver. |
| Latência de governança | p95 ≤300 ms | Spans de auth, policy, ACL e budget, excluindo provider. |
| Disponibilidade do gateway | SLO 99,9% | Synthetic checks, health checks e decisões. |
| Duplicidade de ação/custo | 0 | Idempotency keys, recibos e reconciliação. |
| Reconstrução do índice | 100% dos ativos reindexáveis | Inventário `asset_version + embedding_model` e exercício de rebuild. |
| RTO/RPO | 60/15 minutos | Teste periódico de recuperação. |
| Telemetria sem conteúdo proibido | 0 campos proibidos | Schema, redaction, DLP e amostragem. |
| Rollback | 100% dos fluxos críticos demonstrados | Policy, cliente, índice, conector e briefing. |

---

## 8. Alternativas Consideradas e Rejeitadas

### 8.1. Manter o produto apenas como harness corporativo

**Rejeitado como posicionamento da v1.0 porque:**

- Descreve corretamente a fundação, mas não o valor principal de conhecimento, inteligência e contexto que o usuário busca.
- Não orienta requisitos de fontes, evidências, frescor, lacunas, insights e qualidade.
- Pode levar o time a otimizar apenas proxy, policy e custo, deixando a memória empresarial como um RAG genérico.

O harness continua como bounded context e camada obrigatória; a rejeição é apenas ao enquadramento limitado.

### 8.2. Tratar a plataforma como sistema operacional corporativo completo desde a v1.0

**Rejeitado como promessa de escopo porque:**

- Implicaria substituir ou controlar todos os sistemas transacionais, workflows e decisões da empresa.
- Aumentaria o risco de criar um ERP paralelo e de prometer automação fora da maturidade dos dados.
- A v1.0 deve ser uma camada de inteligência que conecta e interpreta sistemas, evoluindo futuramente para um sistema operacional corporativo de IA.

### 8.3. Ingestão universal sem curadoria

**Rejeitado porque:**

- Volume não é sinônimo de conhecimento confiável.
- Aumentaria conflito, obsolescência, custo, ruído e superfície de privacidade.
- Impediria responsabilizar owners e medir frescor/cobertura por domínio.

### 8.4. RAG somente vetorial, sem fonte, claims ou relações

**Rejeitado porque:**

- Similaridade não resolve vigência, conflito, autoridade, entidades, dependências ou explicação de insight.
- Não é suficiente para exploração corporativa e comparação de processos.
- A busca vetorial permanece, mas dentro de um Knowledge Fabric com metadados, taxonomia, evidência e busca híbrida.

### 8.5. Banco de grafo dedicado desde o primeiro sprint

**Rejeitado porque:**

- Adiciona custo operacional antes de validar o vocabulário de entidades e relações.
- PostgreSQL atende o modelo inicial com RLS, versionamento e auditoria.
- O contrato de relação será independente para permitir extração futura se as métricas justificarem.

### 8.6. Chamar providers ou MCPs diretamente do desktop

**Rejeitado porque:**

- Expõe chaves e tokens, dificulta revogação e contorna budget, ACL, redaction e auditoria.
- Um cliente comprometido poderia modificar modelo, ferramenta, tenant ou parâmetros.
- Contraria a restrição central do harness corporativo.[2] [3]

### 8.7. Centralizar memória pessoal e corporativa em um único índice

**Rejeitado porque:**

- Aumentaria risco de privacidade e confundiria contexto pessoal com regra normativa.
- Memória pessoal precisa de controle local, retenção e consentimento próprios.
- Publicação de memória para a empresa deve ser uma ação explícita, curada e autorizada.

### 8.8. Retenção plena de todo prompt, resposta e reunião

**Rejeitado porque:**

- Não é necessário para fornecer inteligência fundamentada e aumenta exposição.
- Metadados, evidência e referências são o padrão; conteúdo excepcional exige classificação, criptografia e retenção definida.

---

## 9. Próximos Passos

1. Validar formalmente o reposicionamento: **Plataforma de Inteligência Corporativa com IA**, com harness como fundação.
2. Escolher os cinco domínios de conhecimento do piloto, seus owners, fontes prioritárias, SLAs, classificações e critérios de qualidade.
3. Aprovar a matriz de autoridade: sistema de registro, conhecimento curado e contexto derivado.
4. Definir quais fontes serão sincronizadas primeiro e quais escopos OAuth podem ser concedidos.
5. Aprovar o modelo de estados de fonte/ativo/claim/insight e o workflow de revisão.
6. Criar o dataset inicial de perguntas, processos, conflitos, mudanças e decisões para avaliar retrieval, groundedness e inteligência.
7. Confirmar a política de retenção para documentos, e-mails, transcrições, prompts, respostas, claims, embeddings, insights, logs e memória pessoal.
8. Implementar Fase 0 e produzir fixtures de teste para `Source`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest` e `EffectivePolicy`, incluindo contratos OpenAPI/JSON Schema/AsyncAPI entre TypeScript e Python.
9. Construir um vertical slice: uma fonte aprovada → ingestão → evidência → pergunta fundamentada → feedback → correção de fonte.
10. Construir um segundo vertical slice: mudança em fonte autorizada → insight explicável → ação proposta → confirmação → recibo.
11. Medir se o PostgreSQL atende às travessias do Knowledge Graph Lite antes de introduzir banco especializado.
12. Manter PRD e ADR vinculados às issues H-001–H-040 e aos requisitos RF-012–RF-047; qualquer mudança que relaxe ACL antes da busca, separação de memória, gateway central, egress governado, limite de duas linguagens ou fail-closed deve gerar novo ADR.

---

## 10. Referências

[1]: https://www.youtube.com/watch?v=b1H-gYRW2IU "O que é um Harness Corporativo de IA (e por que sua empresa vai precisar de um) — YouTube"

[2]: file:///home/ubuntu/upload/BacklogdeIssues%E2%80%94HarnessCorporativodeIA.md "Backlog de Issues — Harness Corporativo de IA — arquivo anexado"

[3]: file:///home/ubuntu/upload/harness_requirements_matrix.md "Matriz de requisitos — Harness Corporativo de IA — arquivo anexado"

[4]: file:///home/ubuntu/upload/pesquisa-inicial.md "Pesquisa inicial — Domus Corp — arquivo anexado"

[5]: https://www.electronjs.org/docs/latest/tutorial/security "Electron Security — documentação oficial"

[6]: https://fastify.dev/docs/latest/ "Fastify — documentação oficial"

[7]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html "PostgreSQL Row Security Policies — documentação oficial"

[8]: https://developer.hashicorp.com/vault/docs "HashiCorp Vault — documentação oficial"

[9]: https://qdrant.tech/documentation/ "Qdrant — documentação oficial"

[10]: https://min.io/docs/minio/linux/index.html "MinIO — documentação oficial"

[11]: https://opentelemetry.io/docs/ "OpenTelemetry — documentação oficial"

[12]: https://spec.modelcontextprotocol.io/ "Model Context Protocol — especificação"

[13]: https://fastapi.tiangolo.com/ "FastAPI — documentação oficial"

[14]: https://github.com/shadcn-ui/ui "shadcn/ui — repositório oficial"

[15]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"

[16]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
