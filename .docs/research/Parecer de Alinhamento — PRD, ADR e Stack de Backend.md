# Parecer de Alinhamento — PRD, ADR e Stack de Backend

**Produto:** Domus Corp — Plataforma de Inteligência Corporativa com IA  
**Data:** 07/08/2026  
**Status:** **Alinhado após revisão**

## 1. Decisão de referência

A decisão arquitetural verificada foi:

| Área | Decisão |
|---|---|
| Governança e execução | TypeScript sobre Node.js com Fastify para gateway, control plane, policy engine, budget, auditoria, MCP/tooling e Action Gateway. |
| Organização opcional | NestJS pode ser usado somente sobre o adapter Fastify, como camada de módulos, DI, guards e convenções; não deve invadir o domínio. |
| Conhecimento e inteligência | Python com FastAPI e workers para ingestão, parsing, embeddings, retrieval avançado, transcrição, avaliação e inteligência. |
| Contratos | OpenAPI, JSON Schema e AsyncAPI como contratos versionados entre os runtimes. |
| Infraestrutura comum | PostgreSQL, Redis, MinIO, Qdrant, Vault e OpenTelemetry. |
| Limite da v1.0 | No máximo duas linguagens de produção. Uma terceira linguagem ou runtime principal exige novo ADR. |

## 2. Resultado da auditoria

O **PRD e o ADR estão alinhados** com a decisão acima após os ajustes realizados.

| Documento | Situação anterior | Ajuste realizado | Situação atual |
|---|---|---|---|
| PRD | Definia os módulos e capacidades do produto, mas não registrava explicitamente a divisão de runtimes. | Inserida a decisão de backend no resumo executivo e criada a seção “Decisão de Stack de Backend e Fronteiras de Runtime”. | Atribui TypeScript/Fastify ao Harness e à execução; Python/FastAPI aos planos Knowledge e Intelligence. |
| PRD | Não havia requisito específico para interoperabilidade entre linguagens. | Adicionado RF-047, requisito não funcional de interoperabilidade, RN-029, dependências de runtime e contratos e atualização do cronograma. | Contratos cross-runtime, testes de contrato e limite de duas linguagens tornam-se requisitos verificáveis. |
| ADR | Declarava um “monorepo TypeScript” único, divergente da decisão aprovada. | Substituído por monorepo poliglota controlado, limitado a TypeScript e Python. | A decisão arquitetural agora é canônica e explícita. |
| ADR | Retrieval, Intelligence e workers não tinham runtime definido, e o fluxo poderia ser interpretado como chamada direta ao provider. | Adicionado mapeamento de runtime por domínio, fronteira de egress e fluxo Python → Model Gateway TypeScript → provider. | Python não pode contornar policy, redaction, budget ou auditoria. |
| ADR | A estrutura de pastas não separava claramente os dois runtimes. | Separados `packages-ts`, `packages-py`, `contracts` e testes cross-runtime. | Organização do repositório compatível com a decisão. |

## 3. Matriz de aderência

| Critério de verificação | PRD | ADR | Resultado |
|---|---:|---:|---|
| TypeScript + Fastify no gateway | Sim | Sim | Alinhado |
| TypeScript + Fastify no control plane | Sim | Sim | Alinhado |
| TypeScript para policy, budget e auditoria | Sim | Sim | Alinhado |
| TypeScript para MCP/tooling e Action Gateway | Sim | Sim | Alinhado |
| Python + FastAPI/workers para ingestão e parsing | Sim | Sim | Alinhado |
| Python + FastAPI/workers para embeddings e retrieval avançado | Sim | Sim | Alinhado |
| Python + FastAPI/workers para transcrição, avaliação e inteligência | Sim | Sim | Alinhado |
| OpenAPI, JSON Schema e AsyncAPI | Sim | Sim | Alinhado |
| Egress de providers centralizado no Model Gateway TypeScript | Sim | Sim | Alinhado |
| PostgreSQL, Redis, MinIO, Qdrant, Vault e OpenTelemetry compartilhados | Sim | Sim | Alinhado |
| Limite de duas linguagens de produção na v1.0 | Sim | Sim | Alinhado |
| Uso opcional de NestJS apenas sobre Fastify | Sim | Sim | Alinhado |

## 4. Regras que passam a governar a implementação

A implementação deve tratar o TypeScript/Fastify como **autoridade de governança e execução**. O runtime TypeScript é responsável por identidade, autorização, política efetiva, classificação, redaction, budget, catálogo, credenciais, egress de providers, MCPs, ações e auditoria.

O Python/FastAPI/workers deve ser tratado como **runtime especializado de conhecimento e inteligência**. Ele pode executar parsing, normalização, embeddings, retrieval, avaliação, briefings e insights, mas recebe um `EffectivePolicy` versionado, não pode ampliar escopo e não pode chamar LLMs, embeddings hospedados, MCPs ou APIs externas contornando o Model Gateway.

As integrações entre os runtimes devem usar schemas versionados. Não se deve compartilhar classes nativas de TypeScript e Python como mecanismo de integração, nem duplicar de forma independente identidade, policy, budget ou autorização.

Uma terceira linguagem, runtime ou serviço principal somente poderá ser introduzido por novo ADR, com justificativa baseada em evidência, impacto operacional, contratos, observabilidade, segurança, equipe e plano de reversão.

## 5. Validações realizadas

A validação automática confirmou que:

- os dois arquivos existem e não estão vazios;
- o PRD contém **47 requisitos funcionais**, incluindo RF-047 para contratos e fronteiras entre runtimes;
- o PRD e o ADR contêm as decisões canônicas de TypeScript/Fastify, Python/FastAPI, OpenAPI/JSON Schema/AsyncAPI e duas linguagens;
- não permanece a decisão antiga de “monorepo TypeScript” único;
- não há atribuição indevida de ingestão, embeddings, parsing, transcrição ou inteligência ao TypeScript;
- não há placeholders não resolvidos;
- as referências oficiais de Fastify e FastAPI foram adicionadas ao PRD/ADR conforme aplicável.

## 6. Conclusão

> **O PRD e o ADR estão tecnicamente alinhados com a decisão de usar TypeScript + Fastify/NestJS como núcleo de governança e execução e Python + FastAPI/workers como camada especializada de Knowledge e Intelligence.**

A decisão está suficientemente definida para orientar a Fase 0 e a implementação dos contratos. O próximo gate arquitetural deve ser a especificação dos schemas iniciais de `EffectivePolicy`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest`, `UsageLedger` e dos eventos de ingestão, indexação, avaliação e ação.

## Referências internas

[1]: ./PRD_DomusCorp.md "PRD/ERS do Domus Corp"

[2]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 de arquitetura do Domus Corp"

[3]: ./backend_stack_comparison_domus.md "Comparação de stacks de backend para o Domus Corp"
