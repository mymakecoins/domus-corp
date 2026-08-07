# Índice de Execução da V1.0 — Domus Corp

**Produto:** Domus Corp — Plataforma de Inteligência Corporativa com IA  
**Objetivo:** orientar a ordem de execução dos 10 épicos, maximizar paralelismo seguro e evitar que decisões provisórias se transformem em débito técnico.  
**Fonte principal:** [Backlog Mestre de Issues — Domus Corp v1.0][1]

## 1. Como usar este índice

Este índice não substitui o backlog detalhado. Ele define **quando** cada épico deve ser iniciado, **quais fatias podem avançar em paralelo**, **quais condições bloqueiam a liberação** e **qual gate encerra cada onda**.

A regra operacional é separar três estados que costumam ser confundidos:

| Estado | Significado | Pode avançar para produção? |
|---|---|---:|
| **Exploração** | Spike, contrato, protótipo, mock ou teste de hipótese. | Não. |
| **Construção** | Implementação contra contratos estáveis, com testes automatizados. | Somente em ambiente controlado. |
| **Liberação** | Capacidade integrada, observável, segura, documentada e aprovada pelo gate. | Sim, dentro do escopo autorizado. |

O débito técnico é minimizado quando uma equipe não começa uma capacidade de negócio usando contratos, policy, schema, dados ou integração provisórios que depois precisarão ser substituídos. Por isso, o índice prioriza **contratos e invariantes antes de telas**, **governança antes de autonomia**, **proveniência antes de respostas** e **testes antes de escala**.[2] [3]

## 2. Ordem executiva recomendada

| Ordem | Onda | Épico(s) dominante(s) | Objetivo da onda | Gate de saída |
|---:|---|---|---|---|
| 0 | **Preparação** | Decisões transversais | Congelar escopo, risco, contratos de trabalho e protocolo de IA | G0 — escopo e arquitetura aprovados |
| 1 | **Fundação** | **E0** | Criar arquitetura, contratos, repositório, CI/CD, ambientes e secrets | G1 — build reproduzível e contratos versionados |
| 2 | **Contexto e dados-base** | **E1 + início de E7 + D0–D2** | Identidade, tenants, workspaces, papéis, RLS, schema, migrações e primitivos de UI governados | G2 — contexto de segurança e primitivos visuais verificáveis |
| 3 | **Harness mínimo** | **E3 + fatia inicial de E2 + D3** | Gateway, policy, providers, budget, auditoria, shell desktop e componentes de confiança do chat | G3 — chat governado sem egress indevido e com estados compreensíveis |
| 4 | **Knowledge Fabric** | **E4 + QA contínuo + D4** | Fontes, ingestão, vigência, ACL, embeddings, retrieval e Knowledge Workbench | G4 — recuperação autorizada, citável e curável |
| 5 | **Intelligence Plane** | **E5 + fatia de E2 + D3/D4** | Respostas fundamentadas, estados semânticos, sínteses, gaps, briefings e Intelligence Workbench | G5 — inteligência avaliada, explicável e distinguível na interface |
| 6 | **Ações governadas** | **E6 + D5** | MCP, Action Gateway, Action Review, confirmação, idempotência e conectores | G6 — escrita externa controlada e compreendida |
| 7 | **Endurecimento** | **E7 final + E8 + D2/D6** | Backup, DR, performance, red-team, carga, acessibilidade, snapshots, color guard e release gate | G7 — Go/No-Go técnico e de interface |
| 8 | **Produção e piloto** | **E9 + D6** | HA, atualização assinada, documentação do design system, suporte e rollout por ondas | G8 — piloto aprovado ou rollback |

## 3. Índice detalhado por onda

### Onda 0 — Preparação e decisões irreversíveis

**Objetivo.** Evitar que o time construa funcionalidades antes de resolver escopo, fronteiras e responsabilidades.

**Entradas obrigatórias:** PRD vigente, ADR vigente, matriz de requisitos, backlog original, decisão de stack e Design System Domus Corp v1.0.

**Atividades:** confirmar a categoria do produto, domínios do piloto, fontes iniciais, owners, limites de autonomia, ambientes, classificação de dados, provedores permitidos e critérios de sucesso. O protocolo de desenvolvimento com Claude, Gemini, Codex e Kimi também deve ser aprovado nesta etapa.

**Saída:** decisão registrada em V1-001 e arquitetura/threat model em V1-002.

**Não iniciar antes de:** nenhum trabalho que crie schema, banco, tela ou integração produtiva.

**Débito evitado:** retrabalho de domínio, APIs incompatíveis, uso de dados reais em protótipos e automações que depois precisam ser desativadas por falta de alçada.

### Onda 1 — E0: Fundação, contratos e entrega assistida por IA

**Issues:** V1-001 a V1-007.

O E0 deve ser concluído como fundação mínima. A sequência interna recomendada é:

```text
V1-001 → V1-002 → V1-003 → V1-004 → V1-006 → V1-007
                         ↘ V1-005 — governança de IA transversal
```

V1-003 deve preceder implementações que cruzem TypeScript e Python. Os contratos precisam cobrir `EffectivePolicy`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest`, `UsageLedger`, eventos e erros. V1-004 deve disponibilizar CI, lint, type-check, testes, scanner de segredos, migrações e builds reproduzíveis. O pacote inicial do design system (D0–D2) deve entrar no mesmo CI, com tokens, temas, primitivos shadcn/ui e guardrail de Button versionados.

**Gate G1:** o clone limpo gera artefatos dos dois runtimes; contratos são versionados; nenhum segredo está no repositório; a arquitetura explicita que o Python usa o Model Gateway TypeScript para egress de providers.

**Pode avançar em paralelo:** protótipos de UX e spikes de banco, desde que não sejam tratados como contratos finais.

**Não liberar:** endpoints reais, dados corporativos, providers pagos ou conectores externos.

### Onda 2 — E1 + início de E7: Identidade, contexto e persistência governada

**Issues principais:** V1-101, V1-102, V1-103, V1-701.

A implementação deve começar pelo contexto de segurança, não pelo chat. A ordem é:

```text
V1-101 — identidade e dispositivo
        ↓
V1-102 — tenant, workspace e papéis
        ↓
V1-701 — schema, migrações e RLS
        ↓
V1-103 — EffectivePolicy fail-closed
```

V1-701 é uma fatia inicial do E7 e deve ser tratada como dependência de todos os domínios que persistem dados sensíveis. O RLS deve ser aplicado no PostgreSQL; os filtros de Qdrant e das APIs Python devem derivar do mesmo contexto server-side. V1-205 pode avançar com mocks após V1-002/V1-003, mas seus contratos de estado, tokens e componentes devem ser congelados antes de V1-206, V1-207, V1-412, V1-510 e V1-605.

**Gate G2:** é possível provar, com testes negativos, que uma sessão tem tenant, usuário, dispositivo, papel e workspace verificáveis; queries cross-tenant/cross-workspace não retornam dados; policy ausente ou inválida bloqueia a operação.

**Pode avançar em paralelo:** V1-201 — shell Electron — e V1-205 — Design System — com mocks, sem conectar a provider ou dados corporativos.

**Débito evitado:** reescrita de todos os repositórios quando RLS, tenant_id ou EffectivePolicy forem introduzidos tardiamente.

### Onda 3 — E3 + fatia inicial de E2: Harness mínimo operacional

**Issues principais:** V1-301 a V1-308 e V1-201 a V1-206.

O E3 é o hub técnico da plataforma. A ordem recomendada é:

```text
V1-302 — Vault e credenciais
V1-303 — catálogo de models/providers
V1-304 — classificação e redaction
V1-305 — budget e reserva atômica
V1-301 — Model Gateway integrado
V1-307 — streaming, rate limit e circuit breaker
V1-308 — auditoria correlacionada
```

V1-301 pode ser desenvolvido por fatias, mas nenhum request deve chamar provider antes de V1-302, V1-303, V1-304 e V1-305 estarem integrados. O cliente E2 pode implementar onboarding, memória local e chat contra mocks, mas só recebe o estado de “pronto” quando o gateway e a policy forem reais.

**Gate G3:** usuário autenticado inicia uma conversa autorizada; o gateway calcula policy, reserva budget, redige dados, injeta credencial server-side, transmite streaming e registra auditoria. Falhas de policy, budget, Vault ou provider resultam em bloqueio ou erro seguro. O chat usa `AiResponseCard`/`StreamingIndicator`, estados tipados e tokens aprovados em light/dark e `default`/`compact`.

**Não fazer:** implementar seleção de modelo apenas na UI, armazenar API keys no Electron, permitir worker Python chamar provider diretamente ou usar o cliente como autoridade financeira.

### Onda 4 — E4: Knowledge Fabric

**Issues principais:** V1-401 a V1-411; V1-412 pode iniciar após os contratos de estado.

A ordem interna deve ser:

```text
V1-401 — Source Registry
        ↓
V1-402 — framework de conectores
        ↓
V1-403 — MinIO/S3 imutável
        ↓
V1-404 — ingestão e parsing Python
        ↓
V1-405 + V1-406 + V1-407 — vigência, quarentena e taxonomia
        ↓
V1-408 — entidades, claims e evidências
        ↓
V1-409 — ACL/RLS antes do retrieval
        ↓
V1-410 — chunks e embeddings versionados
        ↓
V1-411 — busca híbrida e retrieval citável
```

V1-409 deve ser implementada antes de qualquer busca que alimente modelos. V1-410 pode usar embeddings apenas por meio do egress autorizado do Model Gateway. O Knowledge Workbench — V1-412 — deve ser construído sobre a state machine real de fontes e claims, não sobre estados fictícios de uma tela. Suas tabelas, filtros, badges e Selects devem usar `KnowledgeAssetRow`, `SourceFreshnessBadge`, valores não vazios e ordenação declarada.

**Gate G4:** um owner submete e aprova uma fonte; o sistema ingere, versiona, classifica, indexa e recupera somente trechos vigentes e autorizados, com source_id, versão, seção, owner e evidência. Documento obsoleto, conflitante, quarentenado ou fora do escopo não pode fundamentar resposta normativa.

**Débito evitado:** RAG sem ACL, documentos sem owner, embeddings impossíveis de reprocessar, conflitos escondidos e workbench que precisa ser refeito quando a governança de fonte é criada.

### Onda 5 — E5: Intelligence Plane e experiência de conhecimento

**Issues principais:** V1-501 a V1-510 e V1-207.

O E5 começa somente após G4. A sequência é:

```text
V1-501 — orquestração de contexto e chamada ao Model Gateway
        ↓
V1-502 — estados semânticos e conflitos
        ↓
V1-503/V1-504 — processos, sínteses e comparações
        ↓
V1-505/V1-506 — feedback e gaps
        ↓
V1-507/V1-508/V1-509 — mudanças, briefings e insights
        ↓
V1-510 + V1-207 — workbench e citações no cliente
```

O primeiro vertical slice deve ser uma pergunta corporativa com resposta citada, estado semântico e ausência de evidência tratada explicitamente. Só depois entram briefings, detecção de mudanças e insights. A geração Python deve chamar o Model Gateway TypeScript para qualquer provider; o Intelligence Plane não escolhe credenciais, não amplia policy e não executa ações. A interface usa `CitationPill`, `EvidenceSheet`, `InsightCard` e o catálogo dos oito estados, sem classificar respostas por heurística textual.

**Gate G5:** perguntas do dataset de avaliação retornam evidências autorizadas; fatos, inferências e conflitos são diferenciados; respostas sem suporte declaram a limitação; citações abrem a fonte correta; groundedness, latência e custo atingem os limiares aprovados.

**Não fazer:** começar por “agentes autônomos”, briefings ou dashboards de insights antes de resolver respostas fundamentadas e Quality Loop.

### Onda 6 — E6: MCP, Action Gateway e produtividade

**Issues principais:** V1-601 a V1-610.

O E6 possui duas trilhas, mas a liberação deve seguir uma única cadeia de segurança:

```text
V1-601 — catálogo MCP
        ↓
V1-602 — proxy e credenciais escopadas
        ↓
V1-603 — guardrails e sandbox
        ↓
V1-604 — Action Gateway
        ↓
V1-605 — Action Review
        ↓
V1-606 — idempotência e recibos
        ↓
V1-607/V1-608 — conectores externos
        ↓
V1-609/V1-610 — automações e reuniões
```

O catálogo e os adapters podem ser desenvolvidos contra doubles após G3. Entretanto, nenhum conector de escrita deve ser liberado antes de V1-604–V1-606. V1-609 e V1-610 devem usar os mesmos mecanismos de policy, budget, auditoria e confirmação das chamadas interativas. V1-605 deve usar `ActionReviewDialog`, `PolicyDecisionBanner` e `BudgetMeter`, com Button guardrail, confirmação explícita para deleção e estados de execução compreensíveis.

**Gate G6:** uma ação autorizada é pré-visualizada, confirmada, executada uma vez, registrada com recibo e reconciliada em caso de timeout. Ações sem alçada, sem confirmação ou com policy indisponível não chegam ao sistema externo.

**Débito evitado:** integração direta em cada feature, credenciais espalhadas, retries duplicando ações e automações que bypassam o Action Gateway.

### Onda 7 — E7 final + E8: Endurecimento e gates de qualidade

**Issues principais:** V1-702 a V1-705 e V1-801 a V1-808; V1-901 começa aqui.

O E8 é transversal: V1-801 acompanha E0; V1-802 acompanha E1/E3; V1-803 acompanha E4/E5; V1-805 acompanha E6. Não se deve esperar até o fim para descobrir que os contratos, ACLs ou respostas não são testáveis.

A parte final de E7 entrega backup/restore, DR, retenção, particionamento, performance e runbooks. O Qdrant e o PostgreSQL precisam de benchmark e reindexação versionada antes do piloto.

**Gate G7:** todos os P0 possuem evidência; testes adversariais não encontram achados críticos/altos sem decisão formal; groundedness e SLOs atingem os limites definidos; restore foi testado; Action Gateway passou por retry/replay; acessibilidade e compreensão de risco foram validadas; snapshots light/dark, `default`/`compact`, axe/Playwright, Select seguro e color guard de Button passaram.

### Onda 8 — E9: Produção, release e piloto

**Issues:** V1-901, V1-902, V1-903 e V1-904.

E9 somente deve receber tráfego real depois de G7. A ordem é:

```text
V1-901 — observabilidade, SLOs e incident response
        ↓
V1-902 — HA, degradação segura e recuperação
        ↓
V1-903 — assinatura e atualização do Electron
        ↓
V1-904 — piloto e rollout por ondas
```

O piloto inicia pequeno, com poucos workspaces, fontes conhecidas, owners definidos, suporte disponível e capacidade de pausar. A expansão depende de evidência, não de calendário. Uma regressão de qualidade, custo, segurança ou adoção deve permitir reduzir o anel, desligar um connector, reverter policy ou fazer rollback.

## 4. Paralelismo seguro

| Trilha | Pode começar | Condição de paralelismo | Não pode fazer |
|---|---|---|---|
| **UX/UI / Design System** | Após V1-002 e V1-003 | Tokens, primitivas shadcn/ui, componentes compostos e estados com contratos versionados | Inventar payloads finais, usar hex direto, usar Indigo/Violeta em Button ou esconder estados de segurança |
| **Desktop** | Após V1-004 e V1-101 | Shell, onboarding e memória local com mocks | Armazenar secrets ou liberar chat sem E3 |
| **DBA** | Após V1-003 | Schema, migrações e RLS em ambiente efêmero | Aplicar DDL direto em produção |
| **Python Knowledge** | Após V1-003, V1-006 e V1-401 | Parsers, workers e doubles | Egress direto para provider ou MCP |
| **QA** | Desde V1-003 | Contratos, testes negativos e datasets por fatia | Adiar red-team e avaliação para o último sprint |
| **Integrações** | Após V1-601/602 | Adapters contra mocks e sandbox | Conectar escrita real antes de E6 completo |
| **Operação/SRE** | Desde V1-004 | Healthchecks, métricas e runbooks incrementais | Declarar SLO sem baseline ou teste |

## 5. Regras anti-débito técnico

1. **Nenhum contrato provisório sem prazo de remoção.** Se um mock ou schema temporário for necessário, a issue deve registrar owner, consumer, data de expiração e issue de substituição.
2. **Nenhum banco compartilhado sem ownership de schema.** PostgreSQL pode ser comum, mas cada domínio deve ter tabelas, migrações e regras de acesso claras.
3. **Nenhum provider fora do Model Gateway.** Isso vale para chat, embeddings, transcrição, avaliação, briefings e workers.
4. **Nenhuma resposta corporativa sem provenance.** O Intelligence Plane não deve introduzir texto livre como verdade oficial sem source, versão, seção e estado.
5. **Nenhuma ação externa sem Action Gateway.** Nem botão da UI, job agendado, MCP, worker ou fluxo de reunião pode contornar policy, budget, confirmação e auditoria.
6. **Nenhuma otimização antes de baseline.** Ajustes de HNSW, cache, prompt, modelo ou chunking devem comparar qualidade, custo e latência antes/depois.
7. **Nenhum “P1 provisório” para risco P0.** Funcionalidades podem ser adiadas; controles de segurança, isolamento, auditoria e fail-closed não podem ser empurrados para depois da exposição.
8. **Nenhuma liberação sem observabilidade.** Cada capacidade precisa de métricas, logs redigidos, trace, alerta, owner e runbook proporcional ao impacto.
9. **Tokens antes de telas finais.** Nenhum fluxo crítico pode substituir componentes do design system por CSS local, cor direta ou estado visual ad hoc sem registrar decisão, teste e remoção planejada.
10. **Estados antes de experiências.** O contrato de estados semânticos da IA deve existir antes de implementar telas que exibam respostas, insights, conflitos, bloqueios ou ausência de evidência.
11. **Guardrail de Button no CI.** A proibição de Indigo/Violeta em Button, os testes de contraste, snapshots, temas e densidades são gates de merge e release, não tarefas de acabamento.
12. **Backlog mestre é a fonte de verdade.** CSV, validação, índice e sínteses devem ser regenerados ou revisados sempre que uma issue, critério, dependência ou rastreabilidade mudar.

## 6. Critério de avanço entre ondas

Uma onda só avança quando a saída atende simultaneamente a quatro condições:

| Condição | Pergunta de verificação |
|---|---|
| **Contrato** | Os consumidores e produtores usam schemas versionados e testes de compatibilidade? |
| **Segurança** | As falhas, revogações, limites e acessos indevidos foram testados em fail-closed? |
| **Operação** | Existem métricas, SLO/limite, alerta, owner e rollback? |
| **Produto** | O usuário consegue completar a jornada sem interpretar inferência como fato, executar ação sem alçada ou perder informação por tema, densidade, foco ou contraste? |

O caminho crítico de liberação é, portanto:

```text
E0 → E1/E7-inicial → E3 → E4 → E5 → E6 → E7-final/E8 → E9
```

O E2 percorre o caminho em paralelo, mas suas capacidades são habilitadas progressivamente: shell após E0, chat após E3, citações após E4/E5 e Action Review após E6. Essa estratégia reduz o risco de construir uma interface aparentemente pronta sobre uma fundação de segurança ainda inexistente.

## 7. Referências

[1]: ./Backlog_V1_DomusCorp.md "Backlog Mestre de Issues — Domus Corp v1.0"  
[2]: ./PRD_DomusCorp.md "PRD — Domus Corp v1.0"  
[3]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 — Arquitetura do Domus Corp"  
[4]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"  
[5]: ./DESIGN_SYSTEM_VALIDACAO.md "Validação e handoff — Design System Domus Corp v1.0"

**Recomendação de uso:** anexar este índice ao repositório como documento de governança de execução e revisá-lo somente por ADR quando uma dependência estrutural ou gate de segurança for alterado.
