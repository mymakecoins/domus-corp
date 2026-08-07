# PRD/ERS: Domus Corp — Plataforma de Inteligência Corporativa com IA

**Versão:** 1.0  
**Data:** 07/08/2026  
**Autor:** Manus AI — Produto, Requisitos, UX/UI e Qualidade  
**Status:** Pronto para Desenvolvimento, condicionado à validação executiva das políticas de dados, fontes prioritárias e critérios de autonomia

> **Resumo executivo.** O Domus Corp é uma **Plataforma de Inteligência Corporativa com IA** que transforma conhecimento disperso, processos, decisões e sinais operacionais em respostas confiáveis, insights contextualizados e ações governadas. Seu núcleo técnico é um harness corporativo de IA: gateway central, políticas, orçamento, auditoria, credenciais server-side, ferramentas e RAG. Seu produto final, porém, é mais amplo: uma camada de memória organizacional e inteligência operacional que ajuda cada pessoa a compreender a empresa, decidir melhor e agir dentro da sua alçada.[1] [2] [3] [4]

> **Promessa da v1.0.** Qualquer colaborador autorizado deve conseguir perguntar, compreender, comparar, monitorar e iniciar uma ação relacionada ao trabalho usando conhecimento empresarial com **proveniência, vigência, contexto e controle de acesso**. O produto não promete absorver “tudo” de maneira indiscriminada: ele constrói uma memória corporativa confiável, governada e continuamente melhorada.

> **Posicionamento.** O harness é a fundação de governança e execução; a camada de conhecimento é a memória institucional; a camada de inteligência transforma memória em entendimento, síntese, sinais e recomendações; e o gateway de ações conecta recomendações a sistemas externos sem remover a responsabilidade humana ou as políticas da empresa.

> **Decisão de backend da v1.0.** O núcleo de governança e execução usará **TypeScript sobre Node.js com Fastify**; **NestJS** poderá ser adotado apenas como camada de convenções sobre o adapter Fastify. Ingestão, parsing, embeddings, retrieval avançado, transcrição, avaliação e inteligência usarão **Python com FastAPI e workers**. OpenAPI, JSON Schema e AsyncAPI serão os contratos entre os runtimes. A v1.0 terá no máximo **duas linguagens de produção**, sem uma terceira linguagem sem novo ADR.

---

## 1. Visão do Produto

### 1.1. Propósito

O Domus Corp cria uma camada comum de inteligência para a organização, conectando pessoas, conhecimento, processos e sistemas em uma experiência segura de IA. A plataforma deve reduzir o tempo necessário para encontrar informação confiável, interpretar o contexto do negócio, identificar mudanças e tomar decisões, sem permitir que a conveniência da IA elimine autorização, rastreabilidade, privacidade ou responsabilidade.

### 1.2. Nome Provisório

**Domus Corp — Plataforma de Inteligência Corporativa com IA.** “Domus” representa a casa comum do negócio; “Corp” representa a dimensão organizacional completa. O nome reforça que a solução não é somente um chatbot ou um painel, mas uma infraestrutura viva onde a empresa organiza memória, conhecimento e execução assistida por IA.[4]

### 1.3. Categoria e Fronteira do Produto

| Elemento | Definição para a v1.0 |
|---|---|
| **Categoria** | Plataforma de Inteligência Corporativa com IA. |
| **Fundação** | Harness corporativo de IA para governar modelos, agentes, ferramentas, dados, custos e credenciais. |
| **Memória** | Knowledge Fabric corporativo com fontes, documentos, registros, entidades, relações, decisões, processos e evidências. |
| **Inteligência** | Busca semântica, respostas fundamentadas, sínteses, briefings, detecção de mudanças, comparações, sinais e recomendações contextualizadas. |
| **Ação** | Execução governada em sistemas externos, com confirmação, aprovação, idempotência e auditoria. |
| **Fronteira** | A plataforma não substitui ERP, CRM, sistemas de RH ou ferramentas transacionais; ela interpreta, conecta e orquestra o uso deles dentro de políticas. |
| **Visão futura** | Evoluir para uma camada inteligente do sistema operacional corporativo, sem declarar que a v1.0 já é esse sistema completo. |

### 1.4. Problema que Resolve

O problema central não é apenas o acesso a modelos de linguagem. É a incapacidade de transformar conhecimento empresarial fragmentado em inteligência confiável e acionável, sob controle corporativo.

| Problema | Consequência para a organização |
|---|---|
| Conhecimento espalhado em documentos, e-mails, reuniões, sistemas e pessoas | O colaborador gasta tempo procurando, pergunta à pessoa errada ou repete uma análise já feita. |
| Fontes sem owner, vigência, classificação ou cadeia de evidência | Respostas podem usar política obsoleta, documento conflitante ou informação fora do escopo. |
| Modelos e ferramentas utilizados sem uma camada comum de governança | A empresa perde controle sobre custos, dados enviados, permissões, qualidade e rastreabilidade. |
| Sinais operacionais não conectados a contexto e histórico | Problemas são percebidos tardiamente; oportunidades e gargalos não viram aprendizado estruturado. |
| Sínteses e recomendações sem separação entre fato, inferência e opinião | Decisões podem ser tomadas com confiança indevida e sem capacidade de auditoria. |
| Ações externas executadas por agentes sem alçada, confirmação ou idempotência | Uma resposta aparentemente útil pode causar alteração indevida, duplicidade ou exfiltração. |
| Memória pessoal, conhecimento normativo e dados sensíveis misturados | O usuário perde controle do próprio contexto e a empresa amplia desnecessariamente a superfície de privacidade. |

A matriz de requisitos destaca como problema de negócio o uso de modelos caros em tarefas simples, a falta de rastreabilidade de gastos e o risco de envio inadequado de dados corporativos.[3] A evolução proposta para a v1.0 acrescenta que o conhecimento precisa ser governado como um ativo operacional: descoberto, contextualizado, versionado, avaliado e convertido em ação responsável.

### 1.5. Público-Alvo

| Persona | Necessidade principal | Resultado esperado |
|---|---|---|
| **Colaborador** | Encontrar respostas, processos e contexto sem depender de busca manual em vários sistemas. | Concluir tarefas com mais velocidade e confiança, sabendo de onde veio a informação. |
| **Gestor de workspace** | Entender o estado da área, mudanças relevantes, riscos e responsabilidades. | Tomar decisões baseadas em contexto e orientar a equipe dentro da política. |
| **Owner de conhecimento** | Publicar, revisar, corrigir e retirar fontes corporativas. | Manter a memória empresarial atual, autorizada e rastreável. |
| **Administrador da empresa** | Governar identidade, modelos, políticas, orçamento, integrações e qualidade. | Expandir IA com controle sobre risco, custo, dados e comportamento. |
| **Segurança, Privacidade e Compliance** | Aplicar classificação, retenção, RLS, evidências e testes adversariais. | Demonstrar que a inteligência não vaza dados nem transforma conteúdo não confiável em política. |
| **Diretoria e Conselho** | Obter visão agregada sobre operações, riscos, adoção, custo e qualidade. | Enxergar tendências e exceções sem acessar conteúdo fora da alçada. |

### 1.6. Proposta de Valor

O Domus Corp entrega três capacidades integradas que normalmente ficam separadas:

1. **Memória corporativa confiável:** captura conhecimento de fontes autorizadas, preserva versão e proveniência, relaciona conceitos e controla vigência e acesso.
2. **Inteligência contextual:** transforma conhecimento e sinais operacionais em respostas fundamentadas, sínteses, comparações, briefings e insights adequados ao papel, workspace e momento.
3. **Execução governada:** permite iniciar ações em sistemas autorizados sem expor credenciais, ultrapassar alçadas, exceder budgets ou esconder a origem da decisão.

A plataforma deve fazer com que governança seja invisível quando a operação está dentro da política e explícita quando uma decisão requer confirmação, revisão ou bloqueio. Essa tese mantém a ideia de que controle deve ser um trilho para a operação, não uma camada burocrática separada do trabalho.[4]

### 1.7. Princípios de Produto

| Princípio | Aplicação prática |
|---|---|
| **Conhecimento com evidência** | Toda resposta factual relevante deve apontar fonte, versão, seção, data e nível de confiança quando houver evidência. |
| **Não existe verdade sem contexto** | A plataforma diferencia fato oficial, inferência, opinião, memória pessoal, conteúdo externo e informação desatualizada. |
| **Atualidade é parte da qualidade** | Cada domínio possui owner, SLA de revisão, vigência e indicador de frescor. |
| **Autonomia com alçada** | O usuário pode explorar, sintetizar e preparar ações livremente dentro do escopo; ações externas seguem política e confirmação. |
| **Política antes da recuperação e da ação** | ACL/RLS e política efetiva são aplicadas antes de recuperar conhecimento ou chamar uma ferramenta. |
| **Fail-closed** | Falha na validação de identidade, política, budget ou autorização bloqueia a operação. |
| **Memória em camadas** | Memória pessoal, memória de equipe, conhecimento normativo e sinais operacionais têm escopos e retenções distintos. |
| **Aprendizado sem sobrescrever a fonte** | Feedback corrige a camada de interpretação ou abre revisão; nunca altera silenciosamente o documento original. |
| **Humano responsável** | Recomendações e insights apoiam decisões; não substituem alçadas, aprovações ou responsabilidade institucional. |

### 1.8. Design system e confiança de interface

A v1.0 adotará **shadcn/ui** como fundação de componentes, com Tailwind CSS, Radix UI e Lucide Icons. Os componentes serão mantidos no repositório do produto e customizados por tokens semânticos Domus, não por overrides frágeis de uma biblioteca externa. A interface deve ser consistente entre o cliente Electron, o painel administrativo, o Knowledge Workbench, o Intelligence Workbench e o Action Review.[8] [9]

A paleta BetaUp será convertida em tokens primitivos, semânticos e de componente. **Beta Blue (`#0468F7`)** é a cor primária de interação. **Core Indigo (`#271BAE`) e Beta Violet (`#310AE3`) são proibidos em backgrounds, hover, active ou bordas ativas de botões**, permanecendo reservados a superfícies profundas, gradientes de marca e elementos não acionáveis. Essa restrição é um guardrail de produto e deve ser validada por lint, testes de componente e revisão visual.

| Diretriz | Requisito para a v1.0 |
|---|---|
| Tokens | Componentes usam tokens semânticos; hexadecimais diretos ficam limitados aos arquivos de tokens e testes de paleta. |
| Temas | A plataforma suporta light e dark mode com equivalência de significado, contraste e estados. |
| Densidade | Workbenches, tabelas e dashboards suportam `default` e `compact`, com densidade declarada pelo contexto. |
| Confiança da IA | Estados Fundamentada, Parcial, Conflitante, Inferida, Sem evidência, Obsoleta, Bloqueada e Inconclusiva aparecem com texto, ícone, cor, descrição e próxima ação. |
| Evidência | Citações abrem um Evidence Sheet com trecho, fonte, versão, seção, owner e vigência, sempre limitado por ACL/RLS. |
| Ação | Operações externas usam Action Review com intenção, destino, parâmetros redigidos, risco, alçada, confirmação, recibo e estado terminal. |
| Acessibilidade | Fluxos críticos atendem WCAG 2.2 AA, incluindo teclado, foco, contraste, leitor de tela, zoom de 200% e `prefers-reduced-motion`. |

O design system é um contrato de interação, não apenas uma camada estética. O frontend não pode inferir estados epistemológicos a partir do texto da resposta nem esconder conteúdo omitido por RLS; ele deve renderizar contratos tipados e comunicar explicitamente incerteza, conflito, obsolescência e bloqueio.

---

## 2. Contexto Atual

### 2.1. Processo Atual

Na situação atual, o conhecimento da empresa está distribuído entre arquivos, drives, e-mails, agendas, sistemas de projetos, ferramentas de atendimento, reuniões, mensagens e memória das equipes. O colaborador precisa lembrar onde buscar, interpretar versões diferentes e decidir se pode compartilhar o material com uma ferramenta de IA. Gestores constroem relatórios e sínteses manualmente; owners atualizam fontes sem necessariamente saber quem as consultou; e administradores tentam controlar o uso de IA sem uma visão única do fluxo de dados.[3] [4]

O cenário futuro proposto é um ciclo contínuo:

```text
Fontes autorizadas
    -> ingestão e normalização
    -> classificação, owner e vigência
    -> relações, entidades e índice semântico
    -> recuperação contextual e evidência
    -> resposta, síntese, briefing ou insight
    -> ação governada ou decisão humana
    -> feedback, correção e melhoria da fonte/processo
```

O harness corporativo controla o caminho técnico, enquanto a plataforma de inteligência dá significado ao conteúdo e conecta conhecimento a trabalho.

### 2.2. Principais Dores

| Dor | Impacto | Indicador de resolução |
|---|---|---|
| Tempo alto para localizar uma resposta confiável | Atrasos, retrabalho e dependência de especialistas individuais. | Redução do tempo mediano para responder tarefas elegíveis. |
| Fontes duplicadas e conflitantes | Decisões inconsistentes e dificuldade de definir a regra vigente. | Conflitos detectados, atribuídos a owner e resolvidos dentro do SLA. |
| Falta de contexto de papel e área | O mesmo documento ou sinal recebe interpretação inadequada. | Respostas e briefings respeitam workspace, papel e classificação. |
| Conhecimento tácito não registrado | Turnover leva experiência e decisões anteriores. | Decisões, processos e reuniões convertidos em ativos com owner e retenção. |
| Modelos caros usados sem roteamento | Custo elevado e dificuldade de justificar consumo. | Custo por tarefa acompanhado e escolha de modelo explicável. |
| Informações sem frescor | A IA recomenda uma política ou processo já alterado. | Taxa de documentos dentro do SLA de atualização e alertas de obsolescência. |
| Insights sem evidência | Baixa confiança e risco de decisões erradas. | Percentual de insights com evidência válida e revisão adequada. |
| Ações de integração sem controle | Exfiltração, escrita indevida e duplicidade. | Ações submetidas a política, confirmação, idempotência e auditoria. |

### 2.3. Oportunidades

A oportunidade do Domus Corp é ocupar a interseção entre conhecimento, IA e operação. O produto pode tornar a empresa mais capaz de responder perguntas, entender processos, antecipar exceções e aprender com o trabalho sem obrigar todos os times a migrar imediatamente seus sistemas transacionais.

| Oportunidade | Entrega na v1.0 |
|---|---|
| Criar uma memória institucional pesquisável | Knowledge Fabric com fontes, documentos, entidades, relações, versões, ACL e evidências. |
| Reduzir o tempo entre pergunta e decisão | Chat fundamentado, sínteses comparativas, briefings por papel e consultas com múltiplas fontes. |
| Detectar mudança e obsolescência | Monitoramento de versões, vigência, conflitos e alterações relevantes. |
| Transformar sinais em inteligência | Insights com evidência, impacto, confiança, owner, explicação e recomendação de próxima ação. |
| Governar o uso de IA sem sufocar a operação | Harness com catálogo, política, budget, credenciais server-side e confirmação proporcional ao risco. |
| Criar um ciclo de melhoria | Feedback, correção de claims, avaliação factual, qualidade de fontes e análise de tarefas não respondidas. |

---

## 3. Usuários e Personas

### 3.1. Persona 1: Colaborador — “Explorador e executor”

O colaborador usa o Domus para perguntar sobre processos, localizar documentos, comparar alternativas, preparar uma reunião, entender mudanças e iniciar tarefas autorizadas. Ele não deve precisar conhecer a arquitetura de modelos ou o catálogo de dados. A interface precisa separar resposta, evidência, inferência e ação proposta.

| Dimensão | Caracterização |
|---|---|
| Objetivo | Resolver uma tarefa de trabalho sem perder tempo procurando contexto em vários sistemas. |
| Dor principal | Não sabe qual fonte é atual, quem é o responsável ou como transformar informação em próximo passo. |
| Necessidade | Resposta rápida, fontes clicáveis, contexto por área, memória pessoal controlável e ação segura. |
| Risco | Compartilhar dados inadequados, aceitar inferência como fato ou executar uma ação fora da alçada. |
| Critério de sucesso | Consegue responder “o que sei?”, “de onde veio?”, “o que mudou?” e “o que posso fazer agora?”. |

### 3.2. Persona 2: Gestor de Workspace — “Intérprete da operação”

O gestor precisa de uma visão contextualizada da sua área, com mudanças, riscos, gargalos, decisões pendentes e indicadores relevantes. Ele pode configurar briefings e rotinas, mas não pode ampliar uma permissão negada pela política global. Deve conseguir revisar uma recomendação e atribuir a responsabilidade a uma pessoa ou sistema.

### 3.3. Persona 3: Owner de Conhecimento — “Curador da verdade operacional”

O owner publica documentos e registros, define classificação, aprova versões, indica vigência, resolve conflitos e responde por um domínio. O Domus precisa tornar visível o que está desatualizado, pouco utilizado, contraditório ou sem owner.

### 3.4. Persona 4: Administrador da Empresa — “Governador da plataforma”

O administrador configura identidade, tenants, workspaces, modelos, providers, credenciais, MCPs, budgets, políticas, retenção, conectores, fontes e rollout. Sua responsabilidade não é validar cada resposta manualmente, mas criar condições para que o sistema tome decisões seguras e produza evidências suficientes.

### 3.5. Persona 5: Segurança, Privacidade e Compliance — “Guardião da confiança”

Esse perfil define o que pode ser ingerido, recuperado, enviado a provedores, retido, exportado ou excluído. Também avalia prompt injection, vazamento, escalada, uso de fontes não confiáveis e comportamento de conectores.

### 3.6. Persona 6: Diretoria e Conselho — “Leitor de sinais estratégicos”

Esse perfil consome briefings e indicadores agregados, com explicação da origem dos sinais e separação entre dado observado, inferência e recomendação. Não deve receber acesso indireto a conteúdo operacional fora de sua alçada.

---

## 4. Jornada do Usuário

### 4.1. Jornada Atual (Sem a Solução)

```text
1. A pessoa percebe uma dúvida, exceção ou decisão.
2. Procura manualmente em drives, e-mails, sistemas, chats ou pergunta a especialistas.
3. Encontra versões diferentes e tenta inferir qual é a correta.
4. Copia informações para uma ferramenta de IA, planilha ou documento pessoal.
5. Produz uma síntese sem evidência estruturada ou encaminha a pergunta para outra área.
6. Executa uma ação em um sistema externo ou registra a decisão separadamente.
7. O conhecimento gerado raramente volta para uma fonte curada.
```

### 4.2. Jornada Futura (Com a Solução)

```text
1. O usuário inicia uma pergunta, objetivo ou sinal observado no Domus.
2. A plataforma identifica identidade, papel, workspace, classificação e intenção.
3. O sistema consulta fontes autorizadas, memória pessoal permitida e sinais relevantes.
4. A resposta mostra síntese, evidências, vigência, conflitos, lacunas e nível de confiança.
5. O usuário pode explorar a origem, comparar versões, pedir uma análise ou registrar feedback.
6. Se houver uma ação, o Domus apresenta proposta, impacto, escopo, ferramenta e confirmação necessária.
7. A ação é autorizada, executada de forma idempotente e auditada, ou bloqueada com motivo claro.
8. O resultado, a correção e o feedback alimentam a melhoria do conhecimento e dos processos.
```

### 4.3. Cinco Jornadas de Inteligência

| Jornada | Pergunta do usuário | Produto entregue |
|---|---|---|
| **Perguntar** | “Qual é a regra atual para este caso?” | Resposta fundamentada, citações, vigência e indicação de lacunas. |
| **Compreender** | “Como este processo funciona e quem decide?” | Síntese de processo, papéis, exceções, documentos e próximos passos. |
| **Monitorar** | “O que mudou ou exige atenção na minha área?” | Briefing contextual, mudanças, anomalias, riscos e fontes. |
| **Decidir** | “Quais são as alternativas e seus impactos?” | Comparação estruturada, premissas, evidências, incertezas e recomendação. |
| **Agir** | “Crie ou atualize a tarefa aprovada.” | Ação escopada, confirmação/aprovação, execução idempotente e recibo auditável. |

### 4.4. Fluxos Principais

| Fluxo | Ator primário | Resultado esperado | Exceções |
|---|---|---|---|
| Pergunta corporativa | Colaborador | Resposta com evidências autorizadas. | Nenhuma fonte, conflito, documento expirado, ACL insuficiente, provedor indisponível. |
| Busca exploratória | Colaborador/Gestor | Navegação por temas, entidades, processos e fontes relacionadas. | Dados incompletos, excesso de resultados, conteúdo restrito. |
| Briefing de área | Gestor/Diretoria | Síntese periódica de mudanças, indicadores, riscos e decisões. | Fonte atrasada, sinal sem evidência, limiar não calibrado. |
| Curadoria de fonte | Owner | Publicação, aprovação, revisão, correção ou retirada de conhecimento. | Malware, conflito, owner ausente, classificação incompatível. |
| Análise comparativa | Gestor/Analista | Alternativas com premissas, fontes, custos, riscos e lacunas. | Dados incomparáveis, fontes conflitantes, baixa confiança. |
| Insight operacional | Gestor/Operação | Sinal detectado com explicação, impacto, confiança e próxima ação. | Falso positivo, sinal não reproduzível, dados insuficientes. |
| Ação conectada | Colaborador/Gestor | Tarefa, consulta ou atualização executada em sistema autorizado. | Confirmação ausente, revogação, operação destrutiva, falha de idempotência. |
| Governança de IA | Administrador | Política, modelo, budget, conector e retenção publicados. | Conflito de regras, risco alto, aprovação pendente, rollback. |

### 4.5. Estados de Resposta e Inteligência

Toda resposta deve indicar um estado semântico mínimo:

- **Fundamentada:** há evidência autorizada e vigente suficiente.
- **Parcial:** há evidência, mas existem lacunas relevantes.
- **Conflitante:** fontes autorizadas divergem; a plataforma não escolhe silenciosamente uma delas.
- **Inferida:** a conclusão é uma interpretação do modelo ou de regras; não deve ser apresentada como fato oficial.
- **Sem evidência:** a plataforma não encontrou base suficiente e deve dizer isso.
- **Obsoleta:** a fonte encontrada está fora da vigência ou do SLA de atualização.
- **Bloqueada:** a operação não pode prosseguir por política, budget, privacidade, identidade ou dependência.
- **Inconclusiva:** a ação ou chamada foi interrompida sem confirmação de resultado.

---

## 5. Escopo da v1.0

### 5.1. Princípio de Corte

A v1.0 não será um “depósito de documentos com chatbot” nem um sistema operacional completo que substitui os sistemas da empresa. Será uma **plataforma de inteligência** com cinco planos integrados:

1. **Harness de governança e execução:** controla identidade, modelos, agentes, tools, orçamento, credenciais e auditoria.
2. **Knowledge Fabric:** transforma fontes corporativas em ativos versionados, relacionados, autorizados e recuperáveis.
3. **Intelligence Layer:** produz respostas, sínteses, briefings, comparações, detecção de mudanças e insights.
4. **Action Gateway:** conecta inteligência a ferramentas e sistemas por meio de ações escopadas e confirmadas.
5. **Learning & Quality Loop:** mede qualidade, coleta feedback, identifica lacunas e melhora fontes, prompts, políticas e avaliações.

### 5.2. Módulos no Escopo

#### 5.2.1. Harness Corporativo de IA

Inclui cliente Electron, painel web, identidade corporativa, registro de dispositivo, workspaces, políticas em cascata, catálogo de modelos e MCPs, budget, ledger, credenciais server-side, streaming, auditoria, rate limit, circuit breaker, redaction e fail-closed.[2] [3]

#### 5.2.2. Knowledge Fabric Corporativo

Inclui registro de fontes, conectores prioritários, ingestão de documentos e registros estruturados, armazenamento de originais em MinIO, normalização, classificação, ownership, versionamento, vigência, taxonomia, entidades, relações, chunks, embeddings, índice híbrido, ACL/RLS, detecção de conflitos e ciclo de vida.

O Knowledge Fabric será tratado como uma **memória institucional governada**, não como um local para despejar dados sem critérios. Cada ativo deve ter origem, owner, classificação, estado de aprovação, vigência, versão e trilha de transformação.

#### 5.2.3. Experiências de Inteligência

A v1.0 inclui:

- chat corporativo com respostas fundamentadas e streaming;
- busca semântica e exploratória por temas, entidades, processos e fontes;
- consulta de políticas, processos, produtos e regras internas;
- síntese de documentos, reuniões e conjuntos de fontes autorizados;
- comparação de alternativas com premissas, evidências e incertezas;
- briefings por papel, workspace e periodicidade;
- detecção de mudanças relevantes em fontes e políticas;
- insights operacionais baseados em sinais autorizados, com explicação, confiança, owner e recomendação;
- registro de feedback, correção e lacunas de conhecimento;
- memória pessoal local separada da memória corporativa.

#### 5.2.4. Ações Governadas

Inclui consultas e ações de baixa ou média criticidade em conectores aprovados, com confirmação humana ou aprovação explícita conforme risco. A v1.0 não permite autonomia irrestrita para ações destrutivas. A primeira onda de integrações inclui, conforme disponibilidade de contratos, ClickUp, Jira, Gmail, Google Drive e Google Calendar; Excalidraw e Higgsfield permanecem extensões do mesmo SDK.[2]

#### 5.2.5. Administração, Qualidade e Operação

Inclui dashboard de adoção, custo, cobertura, frescor, qualidade, conflitos, latência, incidentes, fontes sem owner, consultas sem resposta e uso por workspace. Inclui também observabilidade, SLOs, avaliação de groundedness, precisão de recuperação, segurança adversarial, backup, atualização assinada e rollout por ondas.

#### 5.2.6. Decisão de Stack de Backend e Fronteiras de Runtime

A v1.0 adotará uma arquitetura poliglota controlada, limitada a duas linguagens de produção. A separação existe para colocar cada responsabilidade no runtime mais adequado sem duplicar autoridade, política ou contratos.

| Responsabilidade | Stack da v1.0 | Fronteira obrigatória |
|---|---|---|
| Control Plane, identidade, governança, policy engine, budget, ledger, auditoria, Model Gateway, Tooling/MCP e Action Gateway | **TypeScript + Node.js + Fastify**. **NestJS** é permitido somente como camada de organização usando adapter Fastify. | É a autoridade server-side para autenticação, autorização, política efetiva, budget, redaction, auditoria e egress para provedores/MCPs. |
| Ingestão, parsing, normalização, classificação, embeddings, retrieval avançado, transcrição, avaliação, briefings e inteligência | **Python + FastAPI + workers**. | Recebe contexto e `EffectivePolicy` versionados; não pode ampliar ACL, budget ou escopo e não chama provedores externos contornando o Model Gateway. |
| Comunicação entre runtimes | **OpenAPI + JSON Schema + AsyncAPI**, versionados e testados em contrato. | Nenhum domínio deve compartilhar classes nativas entre TypeScript e Python como mecanismo de integração; a autoridade é o schema versionado. |
| Persistência e infraestrutura | PostgreSQL, Redis, MinIO, Qdrant, Vault e OpenTelemetry. | São serviços comuns e independentes do runtime; segredos e chamadas externas permanecem server-side. |

Os workers Python podem usar bibliotecas locais de IA e acessar PostgreSQL, MinIO e Qdrant por adaptadores autorizados, mas chamadas a LLMs, embeddings hospedados ou outras APIs de provider devem passar pelo contrato interno do Model Gateway TypeScript, que aplica policy, classificação, redaction, budget e auditoria. Essa regra evita que a divisão de linguagens crie um segundo caminho de execução não governado.

### 5.3. Incrementos da v1.0

| Incremento | Resultado | Principais capacidades |
|---|---|---|
| **M0 — Fundação confiável** | O harness e os contratos estão seguros. | Threat model, IdP, Electron, gateway, políticas, Vault, budget, auditoria e CI/CD. |
| **M1 — Memória corporativa** | A empresa possui um núcleo de conhecimento governado. | Registro de fontes, MinIO, ingestão, classificação, owners, versões, ACL, taxonomia, Qdrant e citações. |
| **M2 — Inteligência assistida** | Colaboradores e gestores conseguem perguntar, compreender e decidir. | Chat fundamentado, busca exploratória, sínteses, comparações, processos e memória pessoal separada. |
| **M3 — Inteligência operacional** | A plataforma identifica mudanças, lacunas, riscos e sinais. | Briefings, change detection, indicadores, insights explicáveis, feedback e quality loop. |
| **M4 — Ação governada** | A inteligência pode iniciar trabalho em sistemas conectados. | MCP proxy, SDK, OAuth escopado, confirmação, aprovação, idempotência e recibo de ação. |
| **M5 — Escala corporativa** | A plataforma é operável por ondas em produção. | HA/DR, privacidade, SLOs, segurança, atualização, suporte, piloto e rollout. |

### 5.4. Itens Fora do Escopo da v1.0

| Item | Motivo do recorte | Condição para reconsideração |
|---|---|---|
| Substituir ERP, CRM, HRIS ou sistemas transacionais | O Domus interpreta e orquestra; não deve duplicar a fonte de registro. | Caso de negócio e bounded context específico aprovados. |
| Ingerir literalmente todos os dados da empresa sem curadoria | A acumulação indiscriminada aumentaria ruído, risco, custo e falsa confiança. | Política de fontes, classificação, owner, consentimento e qualidade por domínio. |
| Treinar um modelo proprietário com todo o conhecimento corporativo | A v1.0 prioriza governança de inferência e recuperação rastreável. | Governança de datasets, direitos de uso, avaliação, anonimização e operação especializada. |
| Autonomia irrestrita para executar ações externas | Risco de prompt injection, erro, duplicidade e perda de responsabilidade. | Ações idempotentes, sandbox, aprovação, kill switch e histórico de decisão. |
| Promover qualquer conversa, e-mail ou opinião a “verdade da empresa” | Informação precisa de origem, status, vigência e owner. | Pipeline de curadoria, classificação de claims e workflow de aprovação. |
| Forecast financeiro ou decisão de alto impacto sem revisão humana | A plataforma não deve substituir alçadas institucionais. | Modelos validados, explicabilidade, revisão humana e política específica do domínio. |
| Grafo de conhecimento distribuído em banco dedicado no primeiro corte | A complexidade operacional não é necessária antes de validar entidades e relações. | Volume, latência e requisitos de travessia justificarem tecnologia especializada. |
| Modo offline para geração ou insight corporativo | Não permite verificar política, revogação, budget, fonte e frescor. | Modelo local isolado, dados locais classificados e controles equivalentes. |

---

## 6. Requisitos Funcionais

Os requisitos a seguir ampliam o backlog original para que o produto seja uma plataforma de inteligência, mantendo rastreabilidade com H-001–H-040 e adicionando capacidades derivadas de Knowledge Fabric e inteligência operacional.

| ID | Requisito | Fase/Prioridade | Critério de Aceite |
|---|---|---|---|
| RF-001 | Threat model, contratos e arquitetura | M0 / P0 | **Dado** o início do projeto, **quando** a arquitetura for revisada, **então** existirão C4, fronteiras de confiança, matriz de riscos e contratos versionados para identidade, policy, conhecimento, inteligência, chat, ação, budget e auditoria. |
| RF-002 | Ambientes e entrega reproduzível | M0 / P0 | **Dado** um commit aprovado, **quando** o pipeline executar, **então** validará código, contratos, dependências, segredos, migrações e testes e exigirá aprovação para produção com rollback. |
| RF-003 | Identidade corporativa e dispositivo | M0 / P0 | **Dado** um usuário autenticado, **quando** iniciar sessão, **então** tenant, usuário, papel, workspace e dispositivo serão derivados e tokens, tenants ou dispositivos inválidos serão rejeitados. |
| RF-004 | Cliente desktop e painel administrativo seguros | M0 / P0 | **Dado** uma operação privilegiada, **quando** for solicitada pelo renderer ou navegador, **então** passará por IPC/API validada, autorização server-side e ausência de acesso direto a segredos. |
| RF-005 | Onboarding, memória pessoal e histórico | M0/M2 / P0 | **Dado** um colaborador, **quando** concluir onboarding ou sessão, **então** identidade, memória e histórico permitido serão persistidos com escopo, retenção, edição e exclusão, sem mistura automática com o conhecimento normativo. |
| RF-006 | Credenciais server-side e OAuth seguro | M0/M4 / P0 | **Dado** uma integração ou provider, **quando** o token for criado/renovado, **então** o segredo ficará no Vault/Keychain, nunca aparecerá em logs ou contexto do modelo e poderá ser revogado sem reinstalação. |
| RF-007 | Gateway central de IA | M0/M1 / P0 | **Dado** um pedido de IA, **quando** chegar ao gateway, **então** exigirá contexto verificável, validará schema, limite e política e retornará eventos de streaming tipados ou negação segura. |
| RF-008 | Catálogo de modelos e roteamento | M0/M1 / P0 | **Dado** um catálogo publicado, **quando** uma tarefa solicitar modelo, **então** o gateway selecionará apenas provider/modelo ativo, credenciado, compatível com classificação, custo e política efetiva. |
| RF-009 | Policy engine fail-closed | M0/M1 / P0 | **Dado** ausência, conflito, timeout ou cache inválido de política, **quando** uma ação for avaliada, **então** será bloqueada com motivo rastreável e sem bypass por debug, parâmetro ou modo offline. |
| RF-010 | Budget, reserva e ledger | M0/M1 / P0 | **Dado** um limite configurado, **quando** uma chamada ou insight consumir recursos, **então** o servidor reservará e contabilizará o custo de forma atômica e idempotente antes de chamar o provider. |
| RF-011 | Auditoria e correlação | M0/M1 / P0 | **Dado** qualquer chamada, recuperação, insight, alteração de política ou ação, **quando** o evento ocorrer, **então** haverá correlação com ator, tenant, workspace, fonte/policy, modelo, custo, resultado e timestamp, sem retenção indiscriminada de conteúdo. |
| RF-012 | Registro de fontes corporativas | M1 / P0 | **Dado** uma fonte de conhecimento, **quando** for cadastrada, **então** terá owner, tipo, sistema de origem, escopo, classificação, conector, frequência, SLA de atualização, status e política de retenção. |
| RF-013 | Conectores de fontes prioritárias | M1/M4 / P0 | **Dado** um conector aprovado, **quando** sincronizar, **então** usará credenciais escopadas, respeitará ACL da origem, registrará cursor/versão e permitirá pausar, reprocessar e revogar o acesso. |
| RF-014 | Ingestão de documentos e artefatos | M1 / P0 | **Dado** um documento ou artefato, **quando** for recebido, **então** será validado, escaneado, hasheado, armazenado como versão imutável e associado a tenant, workspace, owner, classificação e vigência. |
| RF-015 | Ingestão de dados estruturados | M1/M3 / P1 | **Dado** um registro operacional autorizado, **quando** for ingerido, **então** manterá schema, origem, timestamp, identificador, classificação e relação com o sistema transacional sem se tornar uma cópia editável da fonte. |
| RF-016 | Normalização e qualidade de fonte | M1 / P0 | **Dado** conteúdo de fontes diferentes, **quando** for normalizado, **então** duplicidade, formato, idioma, campos obrigatórios, malware e falhas de parsing serão detectados e o estado de qualidade ficará observável. |
| RF-017 | Taxonomia corporativa | M1/M2 / P0 | **Dado** um domínio de conhecimento, **quando** for publicado, **então** possuirá termos, categorias, sinônimos, owners e versões que permitam navegar e filtrar informação de forma consistente. |
| RF-018 | Entidades e relações | M1/M2 / P1 | **Dado** um documento ou registro aprovado, **quando** for processado, **então** entidades relevantes e relações terão origem, confiança, versão e possibilidade de revisão sem alterar a fonte original. |
| RF-019 | Claims e evidências | M1/M2 / P0 | **Dado** uma afirmação extraída ou gerada, **quando** for apresentada como informação corporativa, **então** deverá carregar evidência, fonte, versão, vigência, confiança e status de validação. |
| RF-020 | Versionamento e vigência | M1 / P0 | **Dado** uma nova versão, revogação ou expiração, **quando** o estado mudar, **então** a recuperação refletirá a vigência dentro do SLA e preservará o histórico para auditoria. |
| RF-021 | ACL/RLS do conhecimento | M1 / P0 | **Dado** um usuário e workspace, **quando** consultar fontes, **então** filtros de autorização serão aplicados antes da recuperação e nenhum trecho, entidade, relação ou insight fora do escopo será retornado. |
| RF-022 | Pipeline de chunks e embeddings | M1 / P0 | **Dado** um ativo aprovado, **quando** for indexado, **então** chunks e embeddings serão idempotentes por versão/modelo, com metadados de origem, seção, ACL e vigência, e falhas entrarão em reprocessamento observável. |
| RF-023 | Busca híbrida e exploratória | M1/M2 / P0 | **Dado** um objetivo ou termo, **quando** o usuário pesquisar, **então** a plataforma combinará busca semântica, textual, filtros de taxonomia e relações, exibindo fontes, relevância e escopo aplicado. |
| RF-024 | Resposta fundamentada com citações | M2 / P0 | **Dado** uma pergunta com evidência disponível, **quando** o modelo responder, **então** a resposta apresentará fontes, versões, seções e vigência; sem evidência suficiente, declarará a limitação. |
| RF-025 | Tratamento de conflito e ausência | M2 / P0 | **Dado** fontes conflitantes ou insuficientes, **quando** a plataforma gerar resposta, **então** classificará o estado como conflitante, parcial ou sem evidência e não escolherá silenciosamente uma regra. |
| RF-026 | Contexto por papel e workspace | M2 / P0 | **Dado** o mesmo tema consultado por perfis diferentes, **quando** a resposta for formada, **então** ela respeitará alçada, classificação, objetivos do workspace e memória permitida. |
| RF-027 | Assistente de processos e políticas | M2 / P0 | **Dado** um processo corporativo, **quando** o usuário perguntar como executá-lo, **então** receberá etapas, papéis, entradas, exceções, fonte vigente, owner e ação segura disponível. |
| RF-028 | Síntese e comparação de fontes | M2 / P0 | **Dado** um conjunto autorizado de fontes, **quando** o usuário solicitar síntese ou comparação, **então** o resultado separará fatos, diferenças, premissas, lacunas, riscos e referências. |
| RF-029 | Briefings por papel e workspace | M3 / P1 | **Dado** um perfil e periodicidade, **quando** o briefing for gerado, **então** incluirá mudanças, decisões, riscos, pendências e sinais relevantes com evidência, frescor e opção de detalhamento. |
| RF-030 | Detecção de mudanças e obsolescência | M3 / P1 | **Dado** uma nova versão, alteração de registro ou expiração, **quando** o pipeline detectar mudança relevante, **então** classificará impacto, domínio afetado, owner e usuários potencialmente impactados. |
| RF-031 | Detecção de lacunas de conhecimento | M3 / P1 | **Dado** perguntas sem evidência ou com baixa confiança recorrentes, **quando** o padrão for identificado, **então** a plataforma abrirá uma lacuna com tema, frequência, impacto, owner sugerido e fontes candidatas. |
| RF-032 | Insights operacionais explicáveis | M3 / P1 | **Dado** sinais autorizados de processos ou sistemas, **quando** um padrão exceder limiar configurado, **então** a plataforma produzirá insight com evidência, impacto potencial, confiança, explicação, owner e recomendação não executada automaticamente. |
| RF-033 | Cenários e apoio à decisão | M3 / P1 | **Dado** alternativas e critérios, **quando** o usuário pedir análise, **então** a plataforma comparará opções, premissas, impactos, riscos e incertezas sem apresentar recomendação como decisão aprovada. |
| RF-034 | Feedback, correção e revisão | M3 / P0 | **Dado** o usuário sinalizar erro, falta de fonte ou conflito, **quando** enviar feedback, **então** será criado registro rastreável que pode abrir revisão de claim, documento, taxonomia, prompt ou política sem sobrescrever a fonte original. |
| RF-035 | Score de qualidade do conhecimento | M3 / P1 | **Dado** um domínio, fonte ou entidade, **quando** o administrador consultar qualidade, **então** verá frescor, cobertura, uso, conflitos, completude, confiança e pendências de owner. |
| RF-036 | Catálogo MCP e proxy de ferramentas | M4 / P0 | **Dado** um MCP ou ferramenta, **quando** for usado, **então** terá manifesto, owner, risco, escopo, autorização server-side, credencial protegida e catálogo efetivo por workspace. |
| RF-037 | Ação com confirmação e aprovação | M4 / P0 | **Dado** uma recomendação que implique mudança externa, **quando** o usuário iniciar a ação, **então** a plataforma mostrará impacto, parâmetros, ferramenta, risco e confirmação/aprovação exigida antes da execução. |
| RF-038 | Idempotência e recibo de ação | M4 / P0 | **Dado** uma ação autorizada, **quando** for executada ou sofrer retry, **então** não será duplicada, terá estado terminal ou inconclusivo e produzirá recibo com sistema, operação, resultado e correlação. |
| RF-039 | Automações e briefings agendados | M3/M4 / P1 | **Dado** uma rotina agendada, **quando** chegar seu horário, **então** usará a mesma política, budget, fonte, auditoria e revogação das chamadas interativas e permitirá pausa e execução única. |
| RF-040 | Reuniões, transcrição e memória de decisão | M3/M4 / P1 | **Dado** consentimento e retenção configurados, **quando** uma reunião for processada, **então** decisões, tarefas e claims serão extraídos com timestamps, confiança, participantes e necessidade de aprovação antes de publicar conhecimento. |
| RF-041 | Alta disponibilidade e recuperação | M5 / P0 | **Dado** a perda de uma instância ou dependência, **quando** o monitoramento detectar falha, **então** o serviço fará failover ou bloqueará com segurança, sem liberar chamadas não autorizáveis, segundo RTO/RPO definidos. |
| RF-042 | Classificação, redaction e direitos de dados | M0–M5 / P0 | **Dado** qualquer conteúdo ou metadado, **quando** for armazenado, recuperado, enviado ou excluído, **então** será tratado conforme classificação, retenção, redaction, exportação e direito aplicável. |
| RF-043 | Observabilidade e resposta a incidentes | M0–M5 / P0 | **Dado** um incidente, **quando** o operador investigar, **então** traces, métricas, logs estruturados e evidências permitirão localizar componente, fonte, política ou modelo sem expor conteúdo proibido. |
| RF-044 | Avaliação de inteligência e groundedness | M2–M5 / P0 | **Dado** uma nova versão de modelo, prompt, índice, taxonomia ou regra, **quando** a avaliação executar, **então** medirá precisão de recuperação, validade de citações, groundedness, cobertura, confiança, custo e taxa de bloqueio correto. |
| RF-045 | Testes adversariais e segurança | M0–M5 / P0 | **Dado** um candidato a release, **quando** os testes red-team forem executados, **então** cobrirão exfiltração, prompt injection, fonte maliciosa, escalada, replay, bypass de budget e ação indevida, bloqueando achados críticos ou altos sem aceite formal. |
| RF-046 | Empacotamento, atualização e rollout | M5 / P1 | **Dado** uma nova versão, **quando** for distribuída, **então** instaladores e atualizações serão assinados, por anel, reversíveis e capazes de preservar dados locais e políticas de versão mínima. |
| RF-047 | Contratos e fronteiras entre runtimes | M0 / P0 | **Dado** um serviço TypeScript ou Python, **quando** comunicar-se com outro serviço ou publicar um evento, **então** usará OpenAPI, JSON Schema ou AsyncAPI versionado, terá testes de contrato no pipeline e não criará um caminho de provider/MCP fora do gateway governado. |
| RF-048 | Design system e guardrails de interface | M0/M2/M4 / P0 | **Dado** um fluxo crítico do produto, **quando** seus componentes forem implementados ou renderizados, **então** usarão tokens e componentes aprovados do design system, manterão light/dark e densidade declarada, exibirão os oito estados de IA com texto/ícone/descrição e bloquearão Indigo/Violeta em qualquer estado interativo de Button. |

---

## 7. Requisitos Não-Funcionais

| Atributo | Requisito | Métrica/Alvo |
|---|---|---|
| **Segurança de segredos** | Chaves de LLM, refresh tokens e credenciais MCP não chegam ao desktop, ao prompt, ao log ou ao trace. | Zero ocorrência em scanning, testes de rede, memória, artefatos e red-team. |
| **Fail-closed** | Falhas de identidade, política, ACL, budget, vigência ou dependência crítica não liberam consulta, insight ou ação. | 100% dos cenários de falha cobertos e zero bypass conhecido. |
| **Isolamento multi-tenant** | Tenant, workspace, papel e classificação são aplicados no servidor antes da recuperação e ação. | Zero acesso cruzado em testes negativos; RLS nas tabelas sensíveis. |
| **Proveniência** | Toda resposta factual, claim, insight e ação deve conservar sua cadeia de evidência. | ≥99,9% dos resultados elegíveis com `source_id`, versão, timestamp e política. |
| **Groundedness** | A plataforma não deve apresentar inferência como fato sem rotulagem. | ≥95% de groundedness no conjunto de avaliação aprovado; 100% das respostas sem evidência explicitamente marcadas. |
| **Frescor** | Fontes e sinais devem indicar vigência, atraso e SLA de atualização. | ≥95% dos ativos críticos dentro do SLA; 100% dos atrasados sinalizados. |
| **Cobertura** | Domínios prioritários devem ter fontes, owners e taxonomia mínima. | ≥80% das perguntas recorrentes do piloto com fonte elegível; lacunas abertas para o restante. |
| **Latência de busca** | Consulta de conhecimento deve retornar evidência inicial rapidamente. | p95 ≤2 s para recuperação sem geração, no perfil de carga do piloto. |
| **Latência de chat** | A governança não deve dominar o tempo de resposta do provedor. | p95 ≤300 ms para auth/policy/budget; p95 ≤500 ms de overhead até primeiro evento. |
| **Insights** | Um insight deve ser reproduzível, explicável e associado a evidências. | 100% com regra/sinal, janela temporal, fontes, confiança e owner; avaliação humana por amostra. |
| **Ação** | Ações externas precisam de confirmação/aprovação proporcional ao risco e idempotência. | Zero duplicidade nos testes; 100% com recibo ou estado inconclusivo explícito. |
| **Disponibilidade** | Gateway, control plane e consulta devem tolerar falha de instância e apresentar degradação segura. | SLO de 99,9% para admissão e 99,5% para consultas no piloto. |
| **Recuperação** | Control plane, fontes e configurações devem ser restauráveis. | RTO ≤60 min e RPO ≤15 min; teste trimestral documentado. |
| **Qualidade de dados** | Falhas de parsing, duplicidade, conflito e indexação não podem ficar silenciosas. | 100% dos ativos com estado de processamento; ≥99% processados ou em erro observável dentro do SLA. |
| **Privacidade** | Conteúdo, PII, memória, transcrição e telemetria têm classificação e retenção próprias. | 100% dos tipos críticos classificados; redaction e exclusão verificadas por teste. |
| **Acessibilidade** | Fluxos de chat, busca, fontes, briefing, política e confirmação são acessíveis. | WCAG 2.2 AA nos fluxos críticos, incluindo teclado, foco, contraste, leitor de tela, zoom de 200% e reduced motion. |
| **Consistência visual** | Componentes críticos usam tokens, variantes aprovadas de shadcn/ui e estados semânticos comuns. | 100% das jornadas críticas cobertas por snapshots light/dark e `default`/`compact`; zero hexadecimal direto fora dos arquivos de tokens/testes. |
| **Guardrail de botões** | Botões não usam Core Indigo ou Beta Violet em background, hover, active ou borda ativa. | Zero ocorrência executável em lint, testes de componente e revisão visual. |
| **UX de confiança** | Evidência, vigência, conflito, inferência, bloqueio e próxima ação são distinguíveis sem depender exclusivamente de cor. | 100% dos estados de IA com label, ícone, descrição e próxima ação; ≥85% dos usuários identificam fato, inferência, fonte e próximo passo. |
| **Interoperabilidade entre runtimes** | Serviços TypeScript e Python devem evoluir sem cópia manual de modelos ou quebra silenciosa de autorização. | 100% das interfaces cross-runtime cobertas por OpenAPI/JSON Schema/AsyncAPI, com testes de contrato e versionamento. |
| **Manutenibilidade** | Domínios, conectores, fontes e modelos podem ser testados sem serviços reais. | ≥80% de cobertura nos domínios críticos; contratos e doubles versionados. |
| **Escalabilidade** | Gateway e workers escalam sem duplicar custo, ações ou indexação. | 10 vezes o pico previsto do piloto sem perda de isolamento/idempotência. |
| **Atualização** | Cliente, policy, taxonomia, prompts e índice devem ter versão e rollback. | 100% das mudanças críticas versionadas; rollback demonstrado antes do rollout. |

---

## 8. Regras de Negócio

| ID | Regra | Descrição |
|---|---|---|
| RN-001 | Harness como autoridade de execução | Toda chamada de modelo, ferramenta, insight ou ação passa pelo gateway e pela política efetiva. |
| RN-002 | Política global prevalece | Workspace ou usuário podem restringir, mas não reabrir permissão negada na política global. |
| RN-003 | Fail-closed | Falha de identidade, policy, ACL, budget, vigência, classificação ou dependência crítica bloqueia a operação. |
| RN-004 | Server-side é autoridade financeira | Pré-check do cliente é informativo; somente o servidor reserva, consome e reconcilia budget. |
| RN-005 | Provedores não recebem segredos | API keys são server-side e acessíveis apenas por identidade de serviço autorizada. |
| RN-006 | Conhecimento precisa de origem | Nenhum ativo corporativo pode ser publicado sem source, owner, classificação, estado e timestamp. |
| RN-007 | Fonte não é verdade por estar ingerida | Ingestão não equivale a aprovação; conteúdo pode estar pendente, expirado, conflitante ou bloqueado. |
| RN-008 | Citação para afirmação factual | Toda afirmação apresentada como fato corporativo deve possuir evidência válida ou ser explicitamente marcada como sem evidência. |
| RN-009 | Conflito não é resolvido silenciosamente | Fontes conflitantes devem ser apresentadas como conflito e encaminhadas a owner/revisor. |
| RN-010 | Vigência é obrigatória | Fonte fora da vigência ou do SLA não deve fundamentar resposta atual sem indicação explícita de obsolescência. |
| RN-011 | ACL antes da recuperação | O filtro de acesso é aplicado antes de busca, ranking, geração, insight ou visualização de relações. |
| RN-012 | Separação de memórias | Memória pessoal local, conhecimento de equipe, conhecimento normativo e sinais operacionais possuem escopo e retenção distintos. |
| RN-013 | Feedback não sobrescreve fonte | Correção de usuário cria revisão ou anotação rastreável; não altera o original sem fluxo de aprovação. |
| RN-014 | Claim tem confiança e status | Claims extraídos ou gerados carregam confiança, origem, versão, vigência e status de validação. |
| RN-015 | Inferência não é fato | Recomendações, previsões e sínteses interpretativas devem ser rotuladas como inferência ou recomendação. |
| RN-016 | Insight exige evidência | Um insight só pode ser publicado com sinais, janela temporal, explicação, confiança, impacto potencial e owner. |
| RN-017 | Humano responsável | Insights de alto impacto e ações externas exigem revisão, confirmação ou aprovação conforme matriz de risco. |
| RN-018 | Conteúdo externo não é instrução | E-mails, documentos, páginas e resultados de ferramentas são dados não confiáveis e não podem alterar políticas por si mesmos. |
| RN-019 | Menor privilégio de ferramenta | Uma ferramenta é autorizada por usuário, workspace, operação, recurso, escopo e classificação. |
| RN-020 | Ação idempotente | Retry não pode duplicar tarefa, alteração, envio, convite ou consumo financeiro. |
| RN-021 | Revogação imediata | Revogar usuário, dispositivo, fonte, integração, modelo, MCP ou policy impede novas operações conforme o SLA definido. |
| RN-022 | Simulação sem efeito | Simuladores, previews, comparações e briefings de teste não executam ações nem chamadas reais sem confirmação. |
| RN-023 | Fonte transacional preservada | O Domus não substitui o sistema de registro; dados ingeridos devem manter origem, timestamp e link para a fonte. |
| RN-024 | Retenção por classe | Prompts, respostas, documentos, claims, embeddings, transcrições, insights, logs e memória têm políticas de retenção próprias. |
| RN-025 | Offline restrito | Sem validação atual do servidor, somente recursos locais não sensíveis podem permanecer disponíveis. |
| RN-026 | Rollout reversível | Alterações de policy, modelo, taxonomia, conector, índice e cliente são publicadas por anel/versão e podem ser revertidas. |
| RN-027 | Qualidade visível | Administração deve enxergar frescor, cobertura, conflitos, fontes sem owner, consultas sem resposta e métricas de groundedness. |
| RN-028 | Aceitação de risco | Achado crítico ou alto bloqueia release até correção ou aceitação formal do responsável autorizado. |
| RN-029 | Limite de linguagens na v1.0 | A produção terá somente TypeScript/Node.js para governança e execução e Python para Knowledge/Intelligence; uma terceira linguagem, runtime ou serviço principal exige novo ADR, justificativa de risco/benefício e plano operacional. |
| RN-030 | Tokens como contrato de interface | Componentes da aplicação devem usar tokens semânticos e variantes aprovadas; valores hexadecimais diretos só podem existir nos arquivos de tokens, testes de paleta e documentação. |
| RN-031 | Indigo/Violeta fora de botões | Core Indigo e Beta Violet não podem aparecer em background, hover, active ou borda ativa de qualquer Button, independentemente da origem do estilo ou do código gerado por IA. |
| RN-032 | Estado da IA vem do contrato | O frontend renderiza o estado semântico retornado pela API e não classifica uma resposta por heurística textual própria. |
| RN-033 | Evidência com revelação progressiva | Citações devem abrir detalhes de fonte, versão, seção, owner e vigência somente dentro do escopo autorizado; conteúdo omitido por RLS não pode ser inferido por tooltip, aria-label, analytics ou logs. |
| RN-034 | Select seguro e listas previsíveis | Select.Item nunca recebe valor vazio; placeholders pertencem ao valor selecionado; listas são alfabéticas salvo ordenação de prioridade, risco ou recência explicitamente declarada. |

---

## 9. Domínio e Dados

### 9.1. Glossário

| Termo | Definição |
|---|---|
| **Plataforma de Inteligência Corporativa** | Sistema que organiza conhecimento empresarial e o transforma em respostas, insights e ações contextualizadas. |
| **Harness corporativo de IA** | Camada de governança e execução de modelos, agentes, tools, credenciais, custos e políticas. |
| **Knowledge Fabric** | Conjunto de fontes, ativos, entidades, relações, evidências, índices, taxonomias e regras de ciclo de vida do conhecimento. |
| **Fonte** | Sistema, pessoa, repositório ou conector de onde um ativo ou sinal se origina. |
| **Ativo de conhecimento** | Documento, registro, decisão, processo, reunião, claim, entidade, relação ou outro objeto curado para uso da plataforma. |
| **Claim** | Afirmação extraída ou produzida pela plataforma, acompanhada de evidência, confiança e status de validação. |
| **Evidência** | Trecho, registro, evento ou referência que sustenta uma afirmação, síntese ou insight. |
| **Entidade** | Pessoa, área, produto, cliente, processo, projeto, contrato, indicador ou conceito identificado no conhecimento. |
| **Relação** | Vínculo versionado entre entidades ou ativos, como “pertence a”, “depende de”, “substitui” ou “é responsável por”. |
| **Taxonomia** | Vocabulário controlado de temas, domínios, tipos, tags, sinônimos e categorias. |
| **Vigência** | Intervalo no qual uma fonte, claim, política ou processo é válido para fundamentar uma resposta. |
| **Frescor** | Grau de atualidade de uma fonte ou ativo em relação ao SLA de seu domínio. |
| **Insight** | Sinal interpretado com evidências, impacto potencial, confiança, explicação, owner e recomendação. |
| **Briefing** | Síntese periódica e contextualizada para um papel, workspace ou domínio. |
| **Memória local** | Contexto individual persistido no dispositivo, separado da memória normativa. |
| **Ledger** | Registro idempotente de uso, custo, reserva, tokens e reconciliação. |
| **Ação governada** | Operação externa autorizada, confirmada/aprovada, idempotente e auditável. |
| **Fail-closed** | Bloqueio da operação quando uma condição de segurança não pode ser verificada. |

### 9.2. Entidades Principais

| Entidade | Atributos essenciais | Persistência/proteção |
|---|---|---|
| **Tenant** | `tenant_id`, nome, IdP, status, classificação padrão, retenções. | PostgreSQL com RLS. |
| **User** | `user_id`, tenant, identidade, status, papéis, preferências. | PostgreSQL; PII classificada. |
| **Device** | `device_id`, usuário, versão, sistema, status, revogação. | PostgreSQL; sem conteúdo de conversa. |
| **Workspace** | `workspace_id`, tenant, owner, domínio, política, status. | PostgreSQL com RLS. |
| **Policy** | escopo, versão, regras, origem, vigência, autor, justificativa. | PostgreSQL; histórico append-only. |
| **Provider/Model** | capabilities, limites, preço, status, versão, classificação. | PostgreSQL; credencial no Vault. |
| **Source** | tipo, sistema, owner, conector, escopo, frequência, SLA, classificação. | PostgreSQL; segredo fora do banco. |
| **SourceConnection** | OAuth, cursor, último sync, estado, erro, escopos. | Metadados em PostgreSQL; token no Vault/Keychain. |
| **KnowledgeAsset** | tipo, fonte, owner, workspace, classificação, versão, vigência, hash, estado. | Metadados PostgreSQL; original MinIO. |
| **AssetVersion** | hash, timestamp, parser, transformação, aprovação, status de indexação. | PostgreSQL/MinIO; imutável por versão. |
| **TaxonomyTerm** | termo, sinônimos, parent, domínio, versão, owner. | PostgreSQL; publicação versionada. |
| **Entity** | tipo, nome canônico, aliases, fonte, confiança, status. | PostgreSQL; relações e proveniência. |
| **Relation** | origem, destino, tipo, fonte, confiança, vigência, status. | PostgreSQL inicialmente; índice derivado opcional. |
| **Claim** | texto/estrutura, evidências, confiança, vigência, status, owner. | PostgreSQL; sem substituir fonte. |
| **DocumentChunk/Embedding** | asset, seção, texto redigido, modelo, ACL, vigência. | Qdrant; reconstruível. |
| **KnowledgeQuery** | usuário, intenção, filtros, fontes recuperadas, latência, resultado. | Metadados/auditoria; conteúdo mínimo. |
| **Insight** | sinal, janela, evidências, impacto, confiança, explicação, owner, estado. | PostgreSQL; retenção e revisão. |
| **Briefing** | destinatário, workspace, periodicidade, fontes, versão, status, entrega. | PostgreSQL/MinIO conforme conteúdo. |
| **Feedback/Review** | usuário, alvo, tipo, comentário, evidência, estado, owner. | PostgreSQL; auditável. |
| **ChatRequest/UsageLedger** | request, ator, modelo, tokens, custo, reserva, estado. | PostgreSQL; idempotente. |
| **MCPServer/Tool** | manifesto, owner, risco, escopos, versão, status. | PostgreSQL; aprovação obrigatória. |
| **ActionRequest/Receipt** | intenção, ferramenta, parâmetros redigidos, risco, aprovação, estado, resultado. | PostgreSQL; sem segredo. |
| **MemoryItem** | usuário, device, escopo, resumo, origem, retenção. | SQLite local protegido. |

### 9.3. Relações e Invariantes

Um tenant contém usuários, workspaces, fontes, políticas e ativos de conhecimento. Um usuário pode acessar vários workspaces do mesmo tenant, mas nunca atravessar a fronteira de tenant. Um ativo deve apontar para uma fonte e possuir owner, classificação, estado e versionamento. Uma evidência só é recuperável se o usuário tiver autorização tanto para o ativo quanto para a fonte subjacente.

Entidades e relações são projeções revisáveis. Elas não substituem a fonte original e não podem ampliar acesso. Claims, insights e briefings são derivados e devem conservar referências às evidências e às versões que os originaram. O Qdrant é índice derivado; a remoção ou expiração de um ativo precisa invalidar sua recuperação mesmo que um vetor ainda exista temporariamente.

A memória pessoal local pertence ao usuário/dispositivo e não é inserida no Knowledge Fabric corporativo automaticamente. Para virar conhecimento de equipe ou da empresa, ela deve passar por publicação, classificação, owner e aprovação.

### 9.4. Eventos de Domínio

| Evento | Emissor | Consumidores/efeito |
|---|---|---|
| `identity.session_established` | Identidade | Gateway, policy, cliente, auditoria. |
| `device.revoked` | Administração | Gateway, cliente, cache de política. |
| `policy.published` | Governança | Policy engine, cache, auditoria, rollout. |
| `budget.reserved/consumed/released` | Finanças | Gateway, ledger, dashboard. |
| `source.registered/connected/revoked` | Knowledge Admin | Ingestion worker, policy, auditoria. |
| `asset.ingested/approved/revoked/expired` | Knowledge Plane | Indexação, retrieval, briefings, alertas. |
| `asset.indexed/indexing_failed` | Knowledge Worker | Qdrant, operação, qualidade. |
| `taxonomy.published` | Knowledge Owner | Normalização, busca, entidades, UI. |
| `entity/relation.review_required` | Knowledge Plane | Curadoria e qualidade. |
| `knowledge.query.completed` | Retrieval | Auditoria, métricas, feedback. |
| `claim.created/validated/rejected` | Intelligence Plane | Evidência, revisão, briefings. |
| `insight.detected/reviewed/published` | Intelligence Plane | Gestor, briefing, ação proposta. |
| `briefing.generated/delivered` | Briefing Worker | Usuário, auditoria, métricas. |
| `action.requested/approved/executed/failed` | Action Gateway | Sistema externo, recibo, auditoria. |
| `feedback.created/reviewed/resolved` | Quality Loop | Owner, prompt/eval, source revision. |
| `security.finding.opened/closed` | Segurança | Release gate, incidentes, owners. |
| `rollout.paused/rolled_back` | Operação | Cliente, policy, conectores, auditoria. |

---

## 10. Métricas de Sucesso

### 10.1. Métricas de Negócio

| Métrica | Alvo inicial do piloto | Método |
|---|---|---|
| Tempo para encontrar resposta confiável | Redução de 30% em tarefas elegíveis. | Estudo de baseline e eventos de busca/pergunta até primeira evidência aceita. |
| Tempo entre sinal e decisão | Redução de 20% em um processo-piloto. | Comparação antes/depois com amostra de decisões. |
| Reuso de conhecimento | Pelo menos 60% das respostas elegíveis reutilizam fonte ou decisão já registrada. | Relação entre consultas, fontes e ativos publicados. |
| Redução de retrabalho | Redução de 15% em tarefas com procedimento documentado. | Amostragem de tarefas e entrevistas com gestores. |
| Adoção | ≥70% dos convidados ativos semanalmente após segundo ciclo. | Sessões, perguntas, briefings, feedbacks e ações por workspace. |
| Confiança na plataforma | ≥80% de avaliação positiva sobre fontes, frescor e clareza de bloqueios. | Pesquisa pós-tarefa e entrevistas. |
| Incidentes críticos | Zero incidente crítico por bypass conhecido de policy, ACL, segredo ou budget. | Segurança, auditoria e reconciliação. |

### 10.2. Métricas de Produto

| Métrica | Alvo inicial | Método |
|---|---|---|
| Cobertura de perguntas recorrentes | ≥80% com fonte elegível nos domínios prioritários. | Dataset de perguntas reais anonimizadas e consultas sem resposta. |
| Groundedness | ≥95% no conjunto de avaliação aprovado. | Avaliação automática + revisão humana amostral. |
| Validade de citações | ≥95% das citações apontam para trecho, versão e fonte corretos. | Verificador de evidência e amostragem. |
| Frescor | ≥95% dos ativos críticos dentro do SLA. | Painel de vigência, último sync e owner. |
| Conflitos resolvidos | ≥90% dos conflitos críticos com owner e decisão no SLA. | Workflow de revisão e auditoria. |
| Qualidade de insights | ≥80% dos insights avaliados como relevantes e acionáveis no piloto. | Feedback de gestores e revisão por amostra. |
| Lacunas tratadas | ≥60% das lacunas recorrentes com fonte, owner ou decisão de não cobertura. | Quality loop e backlog de conhecimento. |
| Ações bem-sucedidas | ≥95% das ações liberadas com recibo correto e sem duplicidade. | Action receipts, idempotência e integração. |
| Clareza de resposta | ≥85% dos usuários identificam fato, inferência, fonte e próximo passo. | Teste de usabilidade. |

### 10.3. Métricas Operacionais

| Métrica | Alvo inicial | Método |
|---|---|---|
| Admissão do gateway | SLO 99,9%. | Health checks, traces e contagem de decisões. |
| Latência de recuperação | p95 ≤2 s sem geração. | Tracing por parser, filtro, busca e reranking. |
| Latência de decisão | p95 ≤300 ms para auth/policy/budget. | OpenTelemetry. |
| Indexação | ≥99% dos ativos aprovados indexados ou em erro observável no SLA. | Fila, estados e alertas. |
| Sincronização de fontes | ≥95% das fontes críticas atualizadas dentro da frequência. | Cursors, último sync e dashboards. |
| Reconciliação financeira | Zero duplicidade; divergências detectadas diariamente. | Ledger e faturas de provider. |
| Segurança | Zero achado crítico/alto sem decisão formal no release. | Red-team e security gate. |
| Recuperação | RTO ≤60 min; RPO ≤15 min. | Exercícios de restauração. |
| Observabilidade | 100% dos alertas críticos com owner e runbook. | Auditoria operacional. |
| Custo por pergunta/insight | Acompanhar custo p50/p95 e manter dentro do budget por workspace. | Ledger, modelo e tipo de tarefa. |

---

## 11. Riscos e Dependências

### 11.1. Riscos

| Risco | Probabilidade | Impacto | Mitigação | Owner sugerido |
|---|---|---|---|---|
| “Acumular tudo” gerar ruído e falsa confiança | Alta | Alto | Source registry, curadoria, owner, classificação, vigência, scores de qualidade e política de publicação. | Produto/Knowledge |
| Fonte obsoleta fundamentar resposta | Alta | Alto | SLA de frescor, detecção de expiração, versão, status obsoleto e bloqueio por domínio crítico. | Owners de conhecimento |
| Fontes conflitantes não resolvidas | Média | Alto | Claim/evidence, workflow de revisão, estado conflitante e não combinação silenciosa. | Knowledge Governance |
| Modelo apresentar inferência como fato | Alta | Alto | Groundedness, rótulos semânticos, citação obrigatória, prompts e avaliações. | IA/QA |
| Insight falso ou não acionável | Média | Alto | Evidência, janela temporal, confiança, revisão humana, thresholds e feedback. | Intelligence Product |
| ACL permitir vazamento por vector search ou relação | Média | Alto | Filtro antes da busca, RLS, revalidação pós-retrieval, testes adversariais e minimização de payload. | Segurança/Platform |
| Excesso de escopo transformar produto em ERP paralelo | Alta | Médio | Manter sistemas transacionais como source of record e limitar ações a adapters governados. | Product Owner |
| Dependência de um gateway causar indisponibilidade | Média | Alto | Múltiplas instâncias, circuit breaker, observabilidade e fail-closed. | SRE |
| Prompt injection em documentos, e-mails ou MCPs | Alta | Alto | Conteúdo não confiável, delimitação, sandbox, allowlist, confirmação e red-team. | Segurança |
| Custo de embeddings, sincronização e inferência crescer sem controle | Média | Alto | Budget por pipeline/tarefa, deduplicação, cache, roteamento, limites e métricas unitárias. | Finanças/Platform |
| Falta de owners para domínios | Alta | Alto | Registro obrigatório, fila de exceção, escalonamento e publicação limitada sem owner. | Governança |
| Conhecimento pessoal ser coletado sem consentimento | Média | Alto | Separação de memória, opt-in, retenção, exportação/exclusão e classificação. | Privacidade/UX |
| Baixa adoção por falta de confiança | Média | Alto | Mostrar fontes, frescor, conflitos, limitações, feedback e rollout com usuários-piloto. | Produto/UX |
| Ações externas duplicadas ou irreversíveis | Média | Alto | Confirmação, aprovação, idempotency key, sandbox, recibo, retry limitado e kill switch. | Action Gateway |

### 11.2. Dependências

| Dependência | Uso | Critério de prontidão |
|---|---|---|
| IdP corporativo | Identidade, grupos, papéis, tenant e revogação. | OIDC/PKCE ou equivalente validado. |
| Owners de domínio | Aprovação, vigência, conflitos e SLA das fontes. | Matriz de owners para Produto, RH, Processos, Operações e Financeiro. |
| Fontes prioritárias | Documentos, Drive, Jira, ClickUp, e-mail, calendário e sistemas operacionais definidos. | Contratos, escopos OAuth, classificação e frequência de sync. |
| Provedores de LLM | Respostas, sínteses, embeddings e classificação. | Adaptadores, preços, limites, políticas de retenção e testes de erro. |
| Vault/Keychain | Credenciais e OAuth. | Rotação, auditoria, recuperação e escopo mínimo. |
| TypeScript/Node.js + Fastify | Control plane, gateway, policy, budget, auditoria, MCP e ações. | Baseline de runtime, observabilidade, contratos, segurança de dependências e deploy reproduzível. |
| Python + FastAPI/workers | Ingestão, parsing, embeddings, retrieval avançado, transcrição, avaliação e inteligência. | Ambientes reprodutíveis, limites de CPU/memória, filas observáveis e acesso externo governado pelo gateway. |
| Contratos cross-runtime | OpenAPI, JSON Schema e AsyncAPI entre APIs, eventos e jobs. | Versionamento, compatibilidade retroativa, testes de contrato e geração/validação automatizada. |
| PostgreSQL | Control plane, knowledge metadata, claims, insights, budget e auditoria. | RLS, migrações, particionamento, backup e restauração. |
| MinIO/S3 | Originais, artefatos, exportações e conteúdo classificado. | Versionamento, hash, retenção, malware scan e lifecycle. |
| Qdrant | Busca semântica e payload de ACL/vigência. | Coleções versionadas, filtros, reindexação e testes de isolamento. |
| Redis/coordenação | Cache, rate limit, locks e jobs efêmeros. | TTL, invalidação e fail-closed documentados. |
| Observabilidade | SLOs, traces, alertas e incidentes. | Dashboards e runbooks por gateway, knowledge, intelligence e action. |
| Design system e UI | shadcn/ui, Tailwind CSS, Radix UI, Lucide, tokens, componentes de confiança e temas. | Componentes versionados no repositório, contrato de tokens, snapshots e owners de manutenção. |
| Qualidade de interface | Storybook, axe-core, Playwright e testes de contraste/teclado. | Gates de acessibilidade e guardrail de Button no CI/CD. |
| Segurança/Privacidade/Jurídico | Classificação, consentimento, retenção e aceitação de risco. | Critérios de release aprovados. |

---

## 12. Cronograma Estimado (v1.0)

A estimativa pressupõe frentes paralelas de produto, engenharia, dados, segurança, UX e operação, com contratos estáveis e acesso às fontes prioritárias. Deve ser revisada após o threat model e o mapeamento de dados.

| Fase | Duração estimada | Deliverables |
|---|---:|---|
| **F0 — Tese, domínio e governança** | 2 semanas | Posicionamento, threat model, taxonomia inicial, domínios, owners, classificação, contratos cross-runtime OpenAPI/JSON Schema/AsyncAPI, dois toolchains de produção e critérios de qualidade. |
| **F1 — Harness e identidade** | 3 semanas | IdP, tenant/workspace, Electron seguro, Control Plane e Model Gateway em TypeScript + Fastify, Vault, policy engine, budget, auditoria, CI/CD e D0–D2 do design system: tokens, temas, primitivos, foco, contraste e guardrail de Button. |
| **F2 — Knowledge Fabric** | 4 semanas | Source registry, conectores iniciais, workers Python + FastAPI, MinIO, ingestão, normalização, versionamento, ACL, taxonomia, Qdrant e qualidade. |
| **F3 — Inteligência assistida** | 3 semanas | APIs/workers Python para retrieval e inteligência, chat fundamentado via Model Gateway TypeScript, busca híbrida, citações, processos, sínteses, comparações, memória pessoal separada e D3–D4 do design system: componentes de confiança, evidência, streaming, policy, budget e workbenches. |
| **F4 — Inteligência operacional** | 3 semanas | Workers Python para briefings, mudança, lacunas, insights, feedback, claims e score de qualidade, com APIs administrativas TypeScript e dashboards. |
| **F5 — Ação governada** | 3 semanas | MCP proxy, SDK, OAuth escopado, Action Gateway TypeScript + Fastify, confirmação, aprovação, idempotência, primeira onda de ações e D5 do design system: Action Review, parâmetros redigidos, risco, alçada, recibo e estados de execução. |
| **F6 — Segurança, resiliência e avaliação** | 3 semanas | HA/DR, retenção, redaction, SLOs, groundedness, red-team, carga, backup e runbooks. |
| **F7 — Piloto e rollout** | 2 semanas | Instalação assinada, ondas, suporte, métricas, entrevistas, relatório, backlog da próxima evolução e D6 do design system: documentação, exemplos, Storybook, checklist, ownership e treinamento. |

**Duração de calendário estimada:** 20 a 23 semanas, com algumas atividades de F1–F3 em paralelo após os contratos. A plataforma não deve ser declarada pronta apenas porque responde perguntas: o gate de v1.0 exige conhecimento governado, evidência, frescor, qualidade, política, custo, segurança e ação reversível.

### 12.1. Critérios de Entrada do Piloto

O piloto exige IdP integrado, dois ou mais workspaces, providers server-side, política publicada, budget, auditoria, RLS, fontes prioritárias com owners, Knowledge Fabric com documentos aprovados, cobertura e frescor medidos, respostas com citações, estado de conflito, observabilidade, avaliações, runbooks, backup e nenhum achado crítico/alto sem decisão formal.

### 12.2. Critérios de Saída do Piloto

O piloto avança quando os usuários encontram respostas fundamentadas, distinguem fato e inferência, reconhecem fontes obsoletas e conseguem dar feedback; os gestores consideram os briefings relevantes; o sistema identifica lacunas e mudanças sem vazamento; o custo é reconciliável; e qualquer ação liberada possui confirmação, recibo e idempotência. O relatório de saída deve registrar o que foi aprendido sobre fontes, taxonomia, prompts, políticas, experiências e processos.

### 12.3. Rastreabilidade com o Backlog Original

| Área do PRD | Issues cobertas |
|---|---|
| Fundação, identidade e harness | H-001 a H-022 |
| Integrações e ações governadas | H-023 a H-026 |
| Knowledge Fabric inicial | H-027 a H-030 |
| Briefings, automações e memória de decisão | H-031 a H-032, ampliados por RF-029 a RF-035 |
| Resiliência, privacidade e operação | H-033 a H-036 |
| Qualidade, segurança e rollout | H-037 a H-040 |
| Capacidades novas de inteligência | RF-012 a RF-035, derivadas da decisão de posicionar a v1.0 como plataforma de inteligência. |
| Design system e UX de confiança | V1-205, V1-207, V1-412, V1-510, V1-605, V1-807 e V1-808; RF-048; NFR de acessibilidade, consistência visual, guardrail de Button e UX de confiança. |

---

## Referências

[1]: https://www.youtube.com/watch?v=b1H-gYRW2IU "O que é um Harness Corporativo de IA (e por que sua empresa vai precisar de um) — YouTube"

[2]: file:///home/ubuntu/upload/BacklogdeIssues%E2%80%94HarnessCorporativodeIA.md "Backlog de Issues — Harness Corporativo de IA — arquivo anexado"

[3]: file:///home/ubuntu/upload/harness_requirements_matrix.md "Matriz de requisitos — Harness Corporativo de IA — arquivo anexado"

[4]: file:///home/ubuntu/upload/pesquisa-inicial.md "Pesquisa inicial — Domus Corp — arquivo anexado"

[5]: https://fastify.dev/docs/latest/ "Fastify — documentação oficial"

[6]: https://fastapi.tiangolo.com/ "FastAPI — documentação oficial"

[7]: https://www.asyncapi.com/docs "AsyncAPI — documentação oficial"

[8]: https://github.com/shadcn-ui/ui "shadcn/ui — repositório oficial"

[9]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"

[10]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
