# Relatório de Avaliação de Prontidão — Onda 5

   Relatório de Avaliação de Prontidão — Onda 5 (E5: Intelligence Plane)

  ## 1. Objetivo e Condição de Saída da Onda

  • Objetivo da Onda 5:

  Construir a camada de Inteligência (Intelligence Plane) em Python/FastAPI e integrá-la ao Model Gateway TypeScript (control-plane) e à interface de conhecimento. O E5 é responsável  por orquestrar contexto autorizado a partir do retrieval filtrado por ACL/RLS (E4), invocar o Model Gateway TS aplicando redaction e limites financeiros (E3), retornar respostas  estruturadas classificadas nos 8 estados semânticos (AiSemanticBadge), oferecer navegação interativa em citações e proveniência (CitationPill, EvidenceSheet), além de entregar  assistentes de processos, sínteses/comparações, Quality Loop/feedback, detecção de lacunas/mudanças, briefings e insights operacionais explicáveis no Intelligence Workbench.

  • Condição de Saída (Gate G5):

  Conforme estabelecido formalmente no Indice de Execução da V1.0 - Domus Corp.md:

      1. Perguntas do dataset corporativo de avaliação retornam evidências devidamente autorizadas.

      2. Fatos, inferências e conflitos são claramente diferenciados na resposta e na UI.

      3. Respostas sem suporte factual declaram explicitamente a limitação (estado Sem evidência ou Parcial).

      4. Citações interativas abrem a fonte e versão corretas sem vazar metadados fora de alçada.

      5. Métricas de groundedness, latência e custo atingem os limiares mínimos aprovados pelos Knowledge Owners e FinOps.

      6. O 1º vertical slice funcional (pergunta corporativa com resposta citada, estado semântico e tratamento de ausência de evidência) é demonstrável ponta a ponta.

  ──────

  ## 2. Issues Pertencentes à Onda e Ordem de Dependência

  ### Mapeamento de Issues

  Conforme o Backlog*V1*DomusCorp.md e o Indice de Execução da V1.0 - Domus Corp.md, a Onda 5 compreende 11 issues (V1-501 a V1-510 e V1-207):

  • Backlog*V1*DomusCorp.md — Orquestrador de contexto e inteligência em Python/FastAPI (P0)

  • Backlog*V1*DomusCorp.md — Estados semânticos, conflitos e ausência de evidência (P0)

  • Backlog*V1*DomusCorp.md — Experiência de citações, evidências e proveniência na UI (P0)

  • Backlog*V1*DomusCorp.md — Assistente de processos, políticas e regras internas (P0)

  • Backlog*V1*DomusCorp.md — Sínteses, comparações e cenários de decisão (P0/P1)

  • Backlog*V1*DomusCorp.md — Feedback, revisão e Quality Loop (P0)

  • Backlog*V1*DomusCorp.md — Detecção de lacunas de conhecimento (Knowledge Gaps) (P1)

  • Backlog*V1*DomusCorp.md — Detecção de mudanças, obsolescência e impacto (P1)

  • Backlog*V1*DomusCorp.md — Briefings contextuais por papel, workspace e periodicidade (P1)

  • Backlog*V1*DomusCorp.md — Engine de insights operacionais explicáveis (P1)

  • Backlog*V1*DomusCorp.md — Intelligence Workbench para gestores e direção na UI (P1)

  ### Grafo Cíclico Dirigido (DAG) de Dependências da Onda 5

    [ V1-501: Context Orchestrator & TS Gateway Client ]                                                                                                                              

             │                                                                                                                                                                        

             ├───> [ V1-502: 8 Estados Semânticos & State Machine ]                                                                                                                   

             │              │                                                                                                                                                         

             │              ├───> [ V1-207: UI CitationPill / EvidenceSheet ]  <-- (1º Vertical Slice Funcional)                                                                      

             │              │                                                                                                                                                         

             │              ├───> [ V1-503: Assistente de Processos/Políticas ]                                                                                                       

             │              │                                                                                                                                                         

             │              ├───> [ V1-504: Sínteses & Comparações ]                                                                                                                  

             │              │                                                                                                                                                         

             │              └───> [ V1-505: Quality Loop & Feedback ]                                                                                                                 

             │                             │                                                                                                                                          

             │                             ├───> [ V1-506: Detecção de Gaps ]                                                                                                         

             │                             │

             │                             └───> [ V1-507: Change & Impact Detection ]

             │                                            │

             │                                            ├───> [ V1-508: Briefings Contextuais ]*

             │                                            │            │

             │                                            └────────────┼───> [ V1-509: Insights Explicáveis ]

             │                                                         │            │

             └─────────────────────────────────────────────────────────┴────────────┴───> [ V1-510: Intelligence Workbench UI ]

    ──────

  ## 3. Estado das Dependências no Repositório

  ### ✅ Dependências Já Satisfeitas (Evidências no Código/Git)

  1. Onda 3 / E3 — Model Gateway TypeScript:

      • O Model Gateway em TypeScript/Fastify (apps/control-plane/src/application/gateway/execute-model-request.ts), o Egress Guard (guard-egress.ts), o Policy Engine (resolve-

      effective-policy.ts), a gestão de orçamentos e auditoria estão concluídos e validados em docs/evidence/V1-301-verificacao.md até V1-308-verificacao.md.

  2. Onda 4 / E4 — Infraestrutura de Conhecimento e Retrieval:

      • O controle de acesso pré-retrieval (ACL/RLS, V1-409 — commit Indice de Execução da V1.0 - Domus Corp.md), indexação vetorial versionada (V1-410 — commit

      Indice de Execução da V1.0 - Domus Corp.md), busca híbrida delimitada (V1-411 — commit Indice de Execução da V1.0 - Domus Corp.md) e o Knowledge Workbench administrativo (V1-

      412 — commit Indice de Execução da V1.0 - Domus Corp.md) estão implementados na domus_knowledge.

  3. Contratos JSON Schema:

      • Promovidos para a versão 2.17.0 (commit CHANGELOG.md), incluindo os schemas de model-gateway-request, model-gateway-result, model-stream-event, insight, claim, evidence e

      knowledge-retrieval-result em v1.

  ### 🔴 Dependências Ausentes (Serão Criadas na Onda 5)

  1. Módulo Python Orquestrador (domus_intelligence ou submódulo em knowledge-api):

      • O worker/orquestrador Python de contexto (V1-501) e o manipulador da máquina de estados semânticos (V1-502) ainda não possuem implementação concreta no runtime Python.

  2. Cliente Interno Python do Model Gateway:

      • O cliente HTTP/gRPC em Python que consome o endpoint /model/responses/stream da control-plane sem utilizar provedores diretos precisa ser construído em V1-501.

  3. Componentes Frontend de Providência (V1-207):

      • Os componentes CitationPill e EvidenceSheet ainda não foram integrados no pacote ui nem nos apps desktop/admin.

  ### ⚠️ Dependências Incertas / Riscos de Acoplamento Cross-Wave

  • Dependência de V1-508 em V1-609 (Onda 6):

  O backlog mestre indica que V1-508 (Briefings) possui dependência de V1-609 (Agendamento/Automações de E6). Para não violar o limite da Onda 5, V1-508 deve ser implementada em E5

  suportando geração sob demanda (on-demand briefings), deixando o agendamento ativo via cron/automação para a liberação de E6.

  ──────

  ## 4. Contratos e Decisões Invioláveis Pré-Implementação

  1. Fronteira Estrita de Egress do Model Gateway (ADR-001 / PRD):

      • Runtimes Python JAMAIS possuem chaves de API/credenciais de LLMs, JAMAIS efetuam chamadas diretas a APIs externas de provedores (OpenAI, Anthropic, Gemini, Qdrant remoto

      externo) e JAMAIS ampliam a EffectivePolicy.

      • Toda inferência gerada na Onda 5 DEVE obrigatoriamente trafegar pelo cliente interno Python direcionado ao Model Gateway TypeScript em control-plane.

  2. Catálogo Tipado dos 8 Estados Semânticos (V1-502 / ERS / ADR-001):

  A UI e a API devem operar obrigatoriamente sobre o enum dos 8 estados semânticos oficiais:

      • Fundamentado (Grounded)

      • Parcial (Partial)

      • Conflitante (Conflicting)

      • Sem Evidência (No Evidence / Insufficient)

      • Inferido (Inferred / Reasoning)

      • Recomendação (Recommendation)

      • Obsoleto / Quarentenado (Outdated / Quarantined)

      • Restrito / Sem Alçada (Access Denied / RLS Restricted)

  │ Regra de Ouro: É expressamente proibido ao frontend deduzir o estado da resposta por heurística ou regex de texto bruto. O estado vem estritamente tipado no payload JSON do

  │ backend Python.

  3. Contrato de Sanitização e Delimitação de Prompt (V1-501):

  O context builder de V1-501 deve envolver trechos recuperados em tags explícitas de dados não confiáveis (<untrusted*content>) e injetar metadados de proveniência (source*id,

  version*id, chunk*id, owner), garantindo isolamento contra prompt injection.

  ──────

  ## 5. Riscos e Gates Humanos Aplicáveis

  ### Gates Humanos Definidos

  • Checkpoint V1-501 (definido em V1-501.md):

  Security, FinOps, Knowledge Owner e Product devem formalizar aprovação sobre:

      1. Montagem de contexto e regras de redaction de dados sensíveis;

      2. Limites de orçamento/tokens por requisição e por workspace;

      3. Políticas de timeout, retry e fallback de modelos;

      4. Garantia de que ambientes de desenvolvimento utilizam apenas doubles/mocks locais sem egress externo.

  • Gate G5 (Encerramento da Onda 5):

  Aprovação do time de Qualidade de IA (Groundedness & Accuracy) validando que o dataset de testes não apresenta alucinações corporativas e que conflitos de fontes exibem alertas sem

  tomar decisões autônomas silenciosas.

  ──────

  ## 6. Recomendação Objetiva da Primeira Issue Executável

  ### 🎯 **Primeira Issue a Executar: Backlog*V1*DomusCorp.md**

  #### Justificativa Fundamentada em Evidências:

  1. Nó-Raiz do DAG: V1-501 é o requisito técnico indispensável para todas as demais issues da Onda 5 (V1-502, V1-503, V1-504, V1-207, V1-510). Nenhuma resposta fundamentada ou

  estado semântico pode ser entregue sem o orquestrador de contexto Python e seu cliente do Model Gateway TS.

  2. Prontidão das Dependências Anteriores: Todas as dependências diretas de V1-501 (V1-301, V1-303, V1-304 e V1-411) já estão 100% implementadas, testadas e verificadas no

  repositório.

  3. Alinhamento de Checkpoint: O documento de alinhamento de checkpoint em V1-501.md já está redigido no repositório, marcando V1-501 como a porta de entrada autorizada da Onda 5.

  ──────

  ### Resumo do Próximo Passo Sugerido para Execução (quando autorizado):

  Iniciar a issue V1-501 em knowledge-api, criando a camada de orquestração de contexto, a sanitização de prompts e o cliente HTTP fail-closed para o Model Gateway TypeScript,

  validando por meio de testes unitários e de integração com doubles locais.
