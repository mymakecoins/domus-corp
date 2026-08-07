# Backlog de Issues — Harness Corporativo de IA

## Objetivo

Este documento transforma o conteúdo do vídeo **“O que é um Harness Corporativo de IA (e por que sua empresa vai precisar de um)”** em um backlog técnico executável para uma primeira versão corporativa. O vídeo apresenta um sistema distribuído internamente, com cliente desktop, painel administrativo, proxy central de modelos, políticas por workspace, controle de orçamento, integrações via MCP, memória local e base de conhecimento corporativa em RAG [1].

> **Nota de rastreabilidade.** Os timestamps abaixo são aproximados e foram extraídos por análise multimodal do vídeo; não constituem transcrição literal. As issues identificadas como **derivadas** são necessárias para transformar a arquitetura demonstrada em um produto operável e seguro, mas não foram necessariamente descritas em detalhe pelo apresentador.

## Como usar este backlog

A prioridade **P0** representa trabalho necessário para uma implantação corporativa minimamente segura. **P1** representa capacidades importantes para o produto-piloto, mas que podem entrar depois do núcleo de governança. **P2** fica reservado para aprimoramentos ou escala posterior, não incluídos nesta primeira decomposição. As dependências são precedências recomendadas, não impedimentos absolutos quando houver mocks ou contratos estáveis.

Cada issue contém um objetivo, critérios de aceite, dependências e a origem no vídeo. Os critérios devem ser convertidos em testes automatizados, testes de integração ou evidências operacionais antes do fechamento da issue.

## Escopo funcional extraído do vídeo

| Área | Escopo identificado | Trechos de origem |
|---|---|---|
| Cliente | App Electron com chat, ferramentas, automações, integrações, skills locais, histórico de tokens, memória local e recursos de reuniões | 02:18–11:15 [1] |
| Administração | Painel web central com workspaces, políticas em cascata, modelos/provedores, MCPs e permissões de sistema | 11:16–16:42 [1] |
| Execução de IA | Pré-check de budget no cliente, validação definitiva no servidor, injeção server-side de credenciais e resposta em streaming | 16:43–20:20 [1] |
| Segurança | API keys de LLM nunca chegam ao desktop; falhas de validação resultam em bloqueio | 05:00–06:18 e 16:43–20:20 [1] |
| Conhecimento | MinIO para arquivos, Qdrant para vetores e MCP Knowledge Base para consultas RAG | 20:21–25:32 [1] |
| Memória | Memória individual local em SQLite e identidade local em arquivos de workspace | 06:18–09:44 [1] |
| Integrações | ClickUp, Jira, Excalidraw, Higgsfield, Gmail, Google Drive e Google Calendar via MCP | 03:46–05:00 [1] |
| Produtividade | Automações agendadas e gravação/transcrição de reuniões com geração de tarefas para Kanban | 03:46–05:00 e 09:44–11:15 [1] |

## Épicos e sequência recomendada

| Épico | Resultado | Issues | Prioridade predominante |
|---|---|---:|---|
| E0 — Fundação e contratos | Arquitetura, ameaça, contratos e entrega repetível | H-001–H-003 | P0 |
| E1 — Identidade e cliente | App Electron seguro, onboarding e contexto individual | H-004–H-010 | P0/P1 |
| E2 — Gateway e runtime de modelos | Caminho controlado entre cliente, painel e provedores | H-011–H-016 | P0 |
| E3 — Governança, orçamento e custos | Políticas por workspace e controle financeiro verificável | H-017–H-022 | P0/P1 |
| E4 — MCP e ferramentas | Catálogo, autorização e execução segura de ferramentas | H-023–H-026 | P0/P1 |
| E5 — Conhecimento corporativo | Pipeline documental, busca vetorial e MCP de conhecimento | H-027–H-030 | P0/P1 |
| E6 — Automação e produtividade | CRONs, reuniões, transcrição e tarefas | H-031–H-032 | P1 |
| E7 — Resiliência e proteção de dados | Continuidade, backup, privacidade e operação | H-033–H-036 | P0/P1 |
| E8 — Qualidade e rollout | Avaliação, segurança, distribuição e piloto | H-037–H-040 | P0/P1 |

## Corte recomendado para o MVP

O MVP deve priorizar **chat corporativo governado**, não todas as capacidades demonstradas. A sequência abaixo reduz o risco de construir funcionalidades de produtividade antes de resolver credenciais, políticas, custos e auditoria.

| Incremento | Entrega | Issues |
|---|---|---|
| M0 — Fundação | Arquitetura, contratos, ambientes e identidade mínima | H-001–H-005 |
| M1 — Chat controlado | Gateway, provedor, catálogo de modelos, políticas fail-closed, streaming e auditoria | H-009 e H-011–H-016 |
| M2 — Administração financeira | Workspaces, permissões, budget, ledger de uso e dashboard inicial | H-017–H-021 |
| M3 — Conhecimento | Armazenamento, indexação, recuperação e autorização de documentos | H-027–H-030 |
| M4 — Produtividade | MCPs, skills, automações e reuniões | H-010, H-023–H-026 e H-031–H-032 |
| M5 — Empresa em produção | Resiliência, backup, privacidade, observabilidade, testes, atualização e piloto | H-033–H-040 |

# Issues detalhadas

## E0 — Fundação e contratos

### H-001 — Definir arquitetura alvo e threat model do harness

| Campo | Valor |
|---|---|
| Tipo | Spike / arquitetura |
| Prioridade | P0 |
| Origem | 00:00–02:18, 11:16–20:20 e 20:21–25:32 [1] |
| Dependências | Nenhuma |
| Labels | `architecture`, `security`, `foundation`, `p0` |

**Objetivo.** Formalizar a arquitetura composta por cliente Electron, painel administrativo, gateway de modelos, provedores externos, memória local, armazenamento documental, banco vetorial e MCPs. O threat model deve cobrir exfiltração de dados, roubo de credenciais, abuso de ferramentas, prompt injection, custo descontrolado e indisponibilidade do gateway.

**Critérios de aceite.**

1. Existe um diagrama de contexto, um diagrama de contêineres e um fluxo de requisição aprovado por engenharia e segurança.
2. Cada fronteira de confiança, segredo, dado pessoal, dado corporativo e chamada externa está identificada.
3. Há uma matriz de riscos com probabilidade, impacto, mitigação, proprietário e issue correspondente.
4. O documento registra explicitamente a decisão de manter as API keys de LLM exclusivamente no servidor e de bloquear requisições quando a política não puder ser validada.

### H-002 — Definir modelo de domínio e contratos de política

| Campo | Valor |
|---|---|
| Tipo | Spike / contrato de plataforma |
| Prioridade | P0 |
| Origem | 00:38–01:15 e 11:16–16:42 [1] |
| Dependências | H-001 |
| Labels | `architecture`, `api`, `policy`, `p0` |

**Objetivo.** Definir os objetos e contratos compartilhados por cliente e servidor: usuário, dispositivo, workspace, papel, provedor, modelo, MCP, skill, budget, política, chamada, uso, documento e auditoria.

**Critérios de aceite.**

1. O contrato versionado define campos, estados, identificadores, timestamps, tenant e regras de compatibilidade.
2. O contrato de política representa herança global, sobrescrita por workspace e restrições que só podem ficar mais restritivas.
3. Existem exemplos de requisição e resposta para chat, streaming, negação por política, consumo de budget e consulta de conhecimento.
4. Alterações incompatíveis exigem versionamento explícito e estratégia de migração.

### H-003 — Criar ambientes, CI/CD e configuração segura

| Campo | Valor |
|---|---|
| Tipo | Infraestrutura |
| Prioridade | P0 |
| Origem | Derivada da necessidade de painel central e operação corporativa [1] |
| Dependências | H-001 |
| Labels | `devops`, `platform`, `secrets`, `p0` |

**Objetivo.** Preparar ambientes local, teste, staging e produção, com builds reproduzíveis para o painel, gateway e cliente Electron. Nenhuma credencial deve ser armazenada no código, no repositório ou no instalador.

**Critérios de aceite.**

1. Cada ambiente possui configuração separada, migrações versionadas e mecanismo de rollback.
2. O pipeline executa lint, testes unitários, testes de contrato, análise de dependências e verificação de segredos.
3. O deploy exige aprovação para produção e registra versão, autor, artefatos e alterações de configuração.
4. Os provedores, MinIO, Qdrant e bancos usados em teste podem ser substituídos por doubles controlados.

## E1 — Identidade e cliente desktop

### H-004 — Implementar identidade corporativa, papéis e registro de dispositivo

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | Derivada das personas colaborador, administrador e workspace [1] |
| Dependências | H-002, H-003 |
| Labels | `iam`, `rbac`, `device`, `p0` |

**Objetivo.** Autenticar colaboradores e administradores, associar cada sessão a uma organização, usuário e workspace, e registrar os dispositivos autorizados. O mecanismo pode usar o provedor corporativo existente, desde que exponha identidade verificável ao gateway.

**Critérios de aceite.**

1. Uma sessão autenticada possui `tenant_id`, `user_id`, papéis, workspaces e dispositivo associado.
2. O servidor rejeita tokens expirados, audiência incorreta, tenant incorreto e dispositivos revogados.
3. Administrador global, gestor de workspace e colaborador possuem permissões mínimas distintas.
4. Revogar um dispositivo impede novas chamadas e invalida sessões ativas conforme a política definida.

### H-005 — Criar shell Electron com IPC seguro e isolamento de privilégios

| Campo | Valor |
|---|---|
| Tipo | Feature / cliente |
| Prioridade | P0 |
| Origem | 02:18–06:18 [1] |
| Dependências | H-001, H-003, H-004 |
| Labels | `electron`, `desktop`, `security`, `p0` |

**Objetivo.** Entregar o esqueleto do cliente desktop, com janelas, atualização de sessão, armazenamento local controlado e comunicação segura entre renderer e processos privilegiados.

**Critérios de aceite.**

1. O renderer não possui acesso direto a filesystem, subprocessos, segredos ou APIs de rede privilegiadas.
2. O IPC usa uma superfície mínima, validada por schema e protegida contra chamadas arbitrárias.
3. O cliente registra versão, sistema operacional e estado de conectividade sem coletar conteúdo de conversa por padrão.
4. O instalador roda em ambiente limpo e consegue iniciar, autenticar e alcançar o endpoint de saúde do gateway.

### H-006 — Implementar onboarding conversacional e identidade local do agente

| Campo | Valor |
|---|---|
| Tipo | Feature |
| Prioridade | P0 |
| Origem | 08:57–09:44 [1] |
| Dependências | H-005, H-007 |
| Labels | `onboarding`, `agent-identity`, `desktop`, `p0` |

**Objetivo.** Conduzir a entrevista inicial sobre nome, cargo, atividades, rotina e preferências, criando o contexto individual do agente no workspace local.

**Critérios de aceite.**

1. O onboarding pode ser retomado, editado e concluído sem duplicar ou corromper arquivos.
2. `SOUL.md`, `RULES.md`, `USER.md` e `MEMORY.md` são gerados com schema, versão, data de atualização e limites de tamanho.
3. O colaborador visualiza e corrige os dados antes de confirmar a identidade do agente.
4. O fluxo deixa claro quais dados ficam locais e quais podem ser enviados ao gateway para executar uma solicitação.

### H-007 — Implementar memória semântica local em SQLite

| Campo | Valor |
|---|---|
| Tipo | Feature / dados locais |
| Prioridade | P0 |
| Origem | 06:18–08:57 [1] |
| Dependências | H-005, H-006 |
| Labels | `memory`, `sqlite`, `rag`, `desktop`, `p0` |

**Objetivo.** Persistir resumos de sessões e contexto individual em SQLite, permitindo recuperação semântica local para tarefas futuras, sem misturar automaticamente essa memória com a base normativa corporativa.

**Critérios de aceite.**

1. Ao encerrar uma sessão, o cliente gera um resumo controlado e o persiste com origem, data e escopo.
2. Uma consulta futura recupera apenas memórias autorizadas ao usuário e ao workspace local.
3. O usuário pode consultar, corrigir, excluir e limpar a memória local.
4. O banco possui migrações, criptografia ou proteção equivalente em repouso, controle de tamanho e rotina de recuperação após desligamento abrupto.

### H-008 — Armazenar credenciais OAuth no Keychain/Vault do sistema

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | 07:37–08:57 [1] |
| Dependências | H-005, H-004 |
| Labels | `oauth`, `keychain`, `secrets`, `p0` |

**Objetivo.** Implementar o ciclo de vida de tokens das integrações autorizadas pelo colaborador, mantendo segredos no cofre nativo do sistema operacional e fora de arquivos de configuração.

**Critérios de aceite.**

1. Tokens de acesso e refresh não aparecem em logs, banco SQLite, arquivos Markdown, telas ou mensagens de erro.
2. O fluxo suporta conexão, renovação, desconexão e revogação de uma integração.
3. O cliente identifica ausência, expiração ou falha de acesso ao Keychain e apresenta uma ação de recuperação segura.
4. Testes confirmam que cópia do diretório de dados do app não revela tokens utilizáveis.

### H-009 — Entregar chat corporativo com streaming e histórico

| Campo | Valor |
|---|---|
| Tipo | Feature |
| Prioridade | P0 |
| Origem | 02:18–06:18 e 16:43–20:20 [1] |
| Dependências | H-005, H-011, H-015 |
| Labels | `chat`, `streaming`, `desktop`, `p0` |

**Objetivo.** Criar a interface principal de chat, com seleção apenas entre capacidades permitidas, resposta incremental, cancelamento, mensagens de erro explicáveis e histórico local conforme a política da organização.

**Critérios de aceite.**

1. O usuário consegue iniciar uma conversa e recebe tokens em streaming sem que o cliente conheça a API key do provedor.
2. A interface diferencia resposta concluída, cancelada, negada por política, excedida por budget e interrompida por indisponibilidade.
3. O cliente não permite escolher ou forçar um modelo fora do catálogo efetivo recebido do servidor.
4. O histórico respeita retenção e classificação de dados definidos pela organização.

### H-010 — Implementar workspace de skills locais

| Campo | Valor |
|---|---|
| Tipo | Feature |
| Prioridade | P1 |
| Origem | 06:18–07:37 [1] |
| Dependências | H-005, H-006, H-007, H-018 |
| Labels | `skills`, `workspace`, `desktop`, `p1` |

**Objetivo.** Permitir que o colaborador crie e mantenha skills locais específicas para seu trabalho, sem conceder automaticamente novas ferramentas, permissões ou modelos.

**Critérios de aceite.**

1. Uma skill possui nome, instrução, versão, escopo, autor, data e estado de ativação.
2. A edição de uma skill não altera políticas de segurança, catálogo de MCPs ou permissões de sistema.
3. Skills são carregadas com limites de tamanho e passam por validação antes de serem usadas.
4. O usuário consegue desativar, duplicar, exportar e excluir skills locais.

## E2 — Gateway e runtime de modelos

### H-011 — Implementar API gateway autenticada para requisições de IA

| Campo | Valor |
|---|---|
| Tipo | Feature / backend |
| Prioridade | P0 |
| Origem | 05:00–06:18 e 16:43–20:20 [1] |
| Dependências | H-002, H-003, H-004 |
| Labels | `gateway`, `api`, `llm`, `p0` |

**Objetivo.** Criar o endpoint central que recebe pedidos do Electron, autentica o chamador, resolve política, encaminha ao provedor permitido e devolve uma resposta em streaming.

**Critérios de aceite.**

1. Toda requisição exige autenticação, tenant, usuário, dispositivo, workspace e `request_id` verificáveis.
2. O gateway rejeita payload inválido, contexto acima do limite, modelo não catalogado e chamadas sem política efetiva.
3. O contrato de streaming permite início, eventos de texto, eventos de ferramenta, encerramento e erro terminal.
4. O gateway nunca retorna segredos do provedor, cabeçalhos internos ou detalhes sensíveis de infraestrutura.

### H-012 — Criar cofre server-side e rotação de credenciais de provedores

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | 05:00–06:18 e 16:43–20:20 [1] |
| Dependências | H-001, H-003, H-011 |
| Labels | `secrets`, `providers`, `vault`, `p0` |

**Objetivo.** Centralizar as API keys pagas pela empresa e permitir que o gateway use credenciais sem expô-las ao cliente ou aos administradores que não precisam visualizá-las.

**Critérios de aceite.**

1. As credenciais são lidas apenas por uma identidade de serviço autorizada do gateway.
2. O painel permite cadastrar, desativar, rotacionar e testar uma credencial sem exibir o valor completo.
3. Logs, métricas, traces e mensagens de erro passam por verificação automática para evitar segredo em claro.
4. A troca de credencial pode ocorrer sem recompilar ou reinstalar o cliente Electron.

### H-013 — Implementar catálogo de provedores, modelos e roteamento

| Campo | Valor |
|---|---|
| Tipo | Feature |
| Prioridade | P0 |
| Origem | 02:18–06:18 e 11:16–16:42 [1] |
| Dependências | H-002, H-012 |
| Labels | `providers`, `models`, `routing`, `p0` |

**Objetivo.** Cadastrar provedores e modelos com preço, capacidades, limites, status e regras de disponibilidade, permitindo que a organização restrinja modelos caros ou inadequados à tarefa.

**Critérios de aceite.**

1. Cada modelo possui identificador estável, provedor, capacidades, limites de contexto, preços de entrada/saída e estado.
2. O gateway resolve um modelo somente se ele estiver ativo, credenciado e permitido pela política efetiva.
3. A seleção de fallback, quando existir, é explícita e não pode violar uma restrição de custo ou privacidade.
4. Mudanças de preço e catálogo ficam versionadas para cálculo histórico correto.

### H-014 — Implementar resolvedor de políticas com estratégia fail-closed

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | 11:16–20:20 [1] |
| Dependências | H-002, H-013, H-017, H-018, H-019 |
| Labels | `policy`, `fail-closed`, `authorization`, `p0` |

**Objetivo.** Calcular a política efetiva para cada requisição e bloquear por padrão quando cache, política, identidade, orçamento ou dependência necessária não puder ser validada.

**Critérios de aceite.**

1. O resultado inclui usuário, workspace, modelo, ferramentas, permissões, budget e versão da política usada.
2. Ausência de política, erro de leitura, timeout, cache inválido ou conflito de regras produz negação segura e motivo rastreável.
3. Não existe caminho de bypass por parâmetro enviado pelo cliente, modo offline ou flag de debug em produção.
4. Testes cobrem herança global, sobrescrita restritiva, revogação imediata e falhas de cada dependência.

### H-015 — Implementar streaming resiliente, limites e circuit breaker

| Campo | Valor |
|---|---|
| Tipo | Feature / confiabilidade |
| Prioridade | P0 |
| Origem | 16:43–20:20 [1] |
| Dependências | H-011, H-013, H-014 |
| Labels | `streaming`, `reliability`, `timeouts`, `p0` |

**Objetivo.** Tornar o fluxo de resposta tolerante a timeout, desconexão, provedor lento, resposta parcial e sobrecarga, sem repetir ações não idempotentes.

**Critérios de aceite.**

1. O gateway aplica timeout de conexão, primeiro byte, duração total e tamanho máximo de resposta.
2. O cliente consegue retomar apenas operações seguras ou apresenta estado inconclusivo quando a idempotência não pode ser garantida.
3. Circuit breaker e rate limit por tenant, usuário, workspace e provedor evitam cascatas de falha.
4. O motivo de interrupção é apresentado ao usuário sem revelar detalhes de segredo ou infraestrutura.

### H-016 — Criar trilha de auditoria e correlação ponta a ponta

| Campo | Valor |
|---|---|
| Tipo | Feature / compliance |
| Prioridade | P0 |
| Origem | Derivada do proxy central, controle de custos e governança [1] |
| Dependências | H-011, H-014, H-015 |
| Labels | `audit`, `traceability`, `compliance`, `p0` |

**Objetivo.** Registrar metadados suficientes para explicar cada chamada sem transformar o log em cópia indiscriminada de prompts e dados sensíveis.

**Critérios de aceite.**

1. Cada chamada possui correlação entre cliente, gateway, ferramenta, provedor, modelo, custo, política e resultado.
2. O registro indica versão da política, modelo efetivo, tokens, latência, status e motivo de negação ou falha.
3. Conteúdo de prompt e resposta é mascarado, criptografado ou excluído conforme classificação e retenção configuradas.
4. A trilha é somente adicionável para operadores comuns e toda leitura administrativa também é auditada.

## E3 — Governança, orçamento e custos

### H-017 — Implementar workspaces e políticas em cascata

| Campo | Valor |
|---|---|
| Tipo | Feature / painel admin |
| Prioridade | P0 |
| Origem | 11:16–16:42 [1] |
| Dependências | H-002, H-004 |
| Labels | `admin`, `workspaces`, `governance`, `p0` |

**Objetivo.** Permitir que a empresa organize áreas como Suporte e Vendas e aplique uma política global herdável, com restrições próprias por workspace.

**Critérios de aceite.**

1. O administrador consegue criar, editar, arquivar e consultar workspaces e seus membros.
2. Um workspace pode herdar a política global, mas uma política local não pode ampliar silenciosamente uma permissão global negada.
3. A política efetiva mostra a origem de cada regra e a razão de uma permissão ou negação.
4. Alterações são versionadas, têm autor, data e justificativa, e não apagam o histórico de auditoria.

### H-018 — Administrar modelos, MCPs e permissões de sistema

| Campo | Valor |
|---|---|
| Tipo | Feature / painel admin |
| Prioridade | P0 |
| Origem | 11:16–16:42 [1] |
| Dependências | H-013, H-017, H-023 |
| Labels | `admin`, `permissions`, `mcp`, `p0` |

**Objetivo.** Dar ao administrador controle granular sobre modelos, provedores, MCPs e capacidades sensíveis como Bash, Read e Write.

**Critérios de aceite.**

1. O painel permite permitir, negar e limitar cada capacidade por workspace e, quando necessário, por papel.
2. Uma política não pode conceder Bash/Write sem registrar risco, justificativa e mecanismo de contenção.
3. O cliente recebe somente o catálogo efetivo e não pode inferir ou acessar itens negados por simples alteração de interface.
4. Testes de autorização demonstram que cada combinação de usuário, workspace, modelo e ferramenta é aplicada no gateway.

### H-019 — Implementar budget, pré-check e reserva de custo

| Campo | Valor |
|---|---|
| Tipo | Feature / financeiro |
| Prioridade | P0 |
| Origem | 02:18–06:18 e 16:43–20:20 [1] |
| Dependências | H-013, H-017, H-014 |
| Labels | `budget`, `cost-control`, `p0` |

**Objetivo.** Controlar orçamento por empresa, workspace, colaborador e eventualmente tarefa, com estimativa local e decisão definitiva no servidor.

**Critérios de aceite.**

1. O cliente calcula uma estimativa transparente, mas o servidor é a autoridade final para reservar e consumir budget.
2. Uma requisição que excede o limite é negada antes de chamar o provedor.
3. Concorrência entre chamadas não permite gasto acima do orçamento por condição de corrida.
4. O usuário recebe limite, consumo, estimativa e motivo de bloqueio sem receber informação sensível de outros usuários.

### H-020 — Criar ledger de uso e atribuição de custos

| Campo | Valor |
|---|---|
| Tipo | Feature / dados financeiros |
| Prioridade | P0 |
| Origem | 05:00–06:18 e 11:16–16:42 [1] |
| Dependências | H-011, H-013, H-016, H-019 |
| Labels | `usage`, `cost`, `billing`, `p0` |

**Objetivo.** Consolidar tokens, preço efetivo e dimensões de atribuição por colaborador, workspace, provedor, modelo, ferramenta e período.

**Critérios de aceite.**

1. Cada chamada concluída, negada ou falha relevante possui estado de contabilização idempotente.
2. O custo é calculado usando a versão de preço válida no momento da chamada.
3. Reprocessamentos não duplicam consumo e divergências entre resposta do provedor e gateway são sinalizadas.
4. O ledger permite exportação por período e reconciliação com faturas do provedor.

### H-021 — Criar dashboards de consumo, custo e alertas

| Campo | Valor |
|---|---|
| Tipo | Feature / painel admin |
| Prioridade | P1 |
| Origem | 11:16–16:42 [1] |
| Dependências | H-020, H-016 |
| Labels | `admin`, `dashboard`, `observability`, `p1` |

**Objetivo.** Exibir consumo e custos por colaborador, workspace, provedor, modelo e período, com alertas operacionais e financeiros.

**Critérios de aceite.**

1. O administrador consegue filtrar, agrupar e exportar dados sem acesso indevido a tenants ou workspaces.
2. O dashboard diferencia tokens de entrada, saída, chamadas, falhas, custo estimado e custo reconciliado.
3. Alertas configuráveis são disparados por limiar de budget, crescimento anômalo, modelo caro e falha de provedor.
4. Os números exibidos têm indicação de atualização, origem e eventual atraso de reconciliação.

### H-022 — Criar simulador e aprovação de políticas

| Campo | Valor |
|---|---|
| Tipo | Feature / governança |
| Prioridade | P1 |
| Origem | Derivada da complexidade de políticas em cascata e permissões sensíveis [1] |
| Dependências | H-017, H-018, H-019, H-020 |
| Labels | `policy`, `simulation`, `approval`, `p1` |

**Objetivo.** Permitir que o administrador simule o efeito de uma alteração antes de publicá-la, identificando usuários afetados, modelos bloqueados, MCPs removidos e impacto provável no budget.

**Critérios de aceite.**

1. O simulador informa a política efetiva antes e depois para amostras representativas.
2. Alterações de alto risco podem exigir revisão e aprovação por outro administrador.
3. A publicação é atômica e permite rollback para uma versão anterior.
4. A simulação não executa chamadas reais nem ferramentas externas.

## E4 — MCP e ferramentas

### H-023 — Criar registro e catálogo de servidores MCP

| Campo | Valor |
|---|---|
| Tipo | Feature / plataforma |
| Prioridade | P0 |
| Origem | 03:46–05:00 e 11:16–16:42 [1] |
| Dependências | H-002, H-003, H-004 |
| Labels | `mcp`, `catalog`, `integrations`, `p0` |

**Objetivo.** Catalogar servidores MCP, ferramentas expostas, versão, proprietário, escopos de dados, estado de aprovação e workspaces autorizados.

**Critérios de aceite.**

1. Cada MCP possui manifesto validado com nome, versão, endpoint, ferramentas, escopos e classificação de risco.
2. Um MCP novo nasce desabilitado até aprovação e não fica disponível apenas por ser instalado no desktop.
3. O catálogo permite versionar, desativar, substituir e auditar alterações.
4. O cliente mostra apenas integrações compatíveis com a política efetiva do usuário.

### H-024 — Implementar proxy MCP com credenciais escopadas

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | 03:46–05:00, 07:37–08:57 e 11:16–16:42 [1] |
| Dependências | H-008, H-018, H-023 |
| Labels | `mcp`, `oauth`, `proxy`, `authorization`, `p0` |

**Objetivo.** Encaminhar chamadas às ferramentas com escopo mínimo, respeitando o token OAuth do usuário e as políticas do workspace.

**Critérios de aceite.**

1. A chamada é autorizada novamente no servidor por usuário, workspace, ferramenta e operação, mesmo que o cliente esteja comprometido.
2. Credenciais são trocadas ou encaminhadas sem aparecer no prompt, no contexto do modelo ou no log.
3. O proxy impede que um MCP acesse ferramentas ou tenants fora do escopo autorizado.
4. Revogação de integração ou usuário impede chamadas subsequentes sem depender de reinstalação do cliente.

### H-025 — Implementar guardrails para execução de ferramentas

| Campo | Valor |
|---|---|
| Tipo | Feature / segurança |
| Prioridade | P0 |
| Origem | 11:16–16:42 e inferência de risco sobre Bash/Read/Write [1] |
| Dependências | H-018, H-023, H-024 |
| Labels | `tool-use`, `sandbox`, `prompt-injection`, `p0` |

**Objetivo.** Reduzir o risco de prompt injection, exclusão acidental, exfiltração e execução de comandos perigosos em ferramentas ou permissões de sistema.

**Critérios de aceite.**

1. Operações destrutivas, externas ou de escrita exigem confirmação, aprovação prévia ou política explícita conforme risco.
2. Bash, Read e Write possuem sandbox, allowlist de caminhos/comandos, timeout, limite de recursos e logs de decisão.
3. O sistema trata conteúdo recuperado de e-mails, documentos e páginas como dados não confiáveis, nunca como instrução de política.
4. Há testes adversariais para prompt injection, tentativa de escalada, exfiltração e confusão entre instrução do usuário e conteúdo de ferramenta.

### H-026 — Entregar SDK e primeira onda de integrações MCP

| Campo | Valor |
|---|---|
| Tipo | Feature / integrações |
| Prioridade | P1 |
| Origem | 03:46–05:00 [1] |
| Dependências | H-008, H-023, H-024, H-025 |
| Labels | `mcp`, `clickup`, `jira`, `google`, `p1` |

**Objetivo.** Criar um padrão de integração e entregar a primeira onda de conectores demonstrados no vídeo: ClickUp, Jira, Gmail, Google Drive e Google Calendar. Excalidraw e Higgsfield entram no catálogo conforme o mesmo contrato.

**Critérios de aceite.**

1. O SDK define autenticação, descoberta de ferramentas, schemas de entrada/saída, erros, rate limit e observabilidade.
2. Pelo menos três integrações prioritárias funcionam em ambiente de teste com conexão, consulta e uma ação autorizada.
3. Cada integração possui classificação de dados, escopos OAuth, owner, versão e testes de contrato.
4. A falha ou ausência de um conector não impede o uso de modelos e ferramentas independentes.

## E5 — Base de conhecimento corporativa

### H-027 — Implementar ingestão e armazenamento bruto em MinIO

| Campo | Valor |
|---|---|
| Tipo | Feature / dados |
| Prioridade | P0 |
| Origem | 20:21–25:32 [1] |
| Dependências | H-003, H-004, H-017 |
| Labels | `knowledge-base`, `minio`, `documents`, `p0` |

**Objetivo.** Receber documentos oficiais, armazenar o original em MinIO e preservar metadados necessários para autorização, versionamento e reprocessamento.

**Critérios de aceite.**

1. Upload, substituição, arquivamento e download são autenticados e associados a tenant, workspace, proprietário e classificação.
2. O objeto original é imutável por versão e possui hash para detecção de alteração.
3. Tipos, tamanhos, malware e conteúdo incompatível são validados antes do armazenamento.
4. A remoção lógica e física respeita retenção e registra auditoria.

### H-028 — Criar pipeline de chunking, embeddings e indexação no Qdrant

| Campo | Valor |
|---|---|
| Tipo | Feature / dados |
| Prioridade | P0 |
| Origem | 20:21–25:32 [1] |
| Dependências | H-027 |
| Labels | `knowledge-base`, `qdrant`, `embeddings`, `p0` |

**Objetivo.** Transformar documentos aprovados em trechos recuperáveis, gerar embeddings, indexar no Qdrant e acompanhar o estado do processamento.

**Critérios de aceite.**

1. O pipeline é idempotente por versão do documento e modelo de embedding.
2. Cada vetor mantém metadados de origem, versão, tenant, workspace, classificação, página ou seção e data de vigência.
3. Falhas de parsing, embedding ou indexação entram em fila de reprocessamento com motivo observável.
4. Reindexação por mudança de modelo não mistura versões incompatíveis nem deixa documentos sem estado conhecido.

### H-029 — Expor MCP Knowledge Base com RAG e citações

| Campo | Valor |
|---|---|
| Tipo | Feature / RAG |
| Prioridade | P0 |
| Origem | 20:21–25:32 [1] |
| Dependências | H-023, H-028, H-014 |
| Labels | `rag`, `mcp`, `knowledge-base`, `p0` |

**Objetivo.** Disponibilizar a base corporativa como ferramenta de conhecimento para o agente, recuperando documentos relevantes sobre produto, RH e processos internos.

**Critérios de aceite.**

1. A consulta aplica filtros de autorização antes da recuperação e nunca retorna trechos fora do escopo do usuário.
2. A resposta inclui referências ao documento, versão, seção e data de vigência quando disponíveis.
3. O sistema diferencia ausência de evidência, documento conflitante e resposta suportada por fonte.
4. A consulta é auditada com filtros, documentos recuperados, latência e modelo de embedding, sem registrar conteúdo proibido.

### H-030 — Implementar ACL, versionamento, vigência e ciclo de vida do conhecimento

| Campo | Valor |
|---|---|
| Tipo | Feature / governança de dados |
| Prioridade | P1 |
| Origem | Derivada da necessidade de uma “verdade corporativa” confiável [1] |
| Dependências | H-017, H-027, H-028, H-029 |
| Labels | `rag`, `acl`, `governance`, `retention`, `p1` |

**Objetivo.** Evitar que documentos obsoletos, não aprovados ou destinados a outro workspace sejam usados como regra da empresa.

**Critérios de aceite.**

1. Cada documento possui ciclo de revisão, owner, status de aprovação e intervalo de vigência.
2. Revogar ou expirar um documento remove-o da recuperação dentro do SLA definido.
3. Documentos conflitantes são sinalizados para revisão e não são combinados silenciosamente.
4. A consulta permite rastrear qual versão fundamentou uma resposta.

## E6 — Automação e produtividade

### H-031 — Implementar scheduler de CRONs e rotinas governadas

| Campo | Valor |
|---|---|
| Tipo | Feature / automação |
| Prioridade | P1 |
| Origem | 03:46–05:00 [1] |
| Dependências | H-004, H-014, H-018, H-024 |
| Labels | `automation`, `cron`, `mcp`, `p1` |

**Objetivo.** Permitir rotinas como verificar e-mails ou agenda, com frequência, escopo, budget, ferramenta e horário definidos pelo usuário e/ou administrador.

**Critérios de aceite.**

1. Cada rotina possui owner, workspace, agenda, timezone, ferramentas permitidas, limite de custo e estado.
2. Uma execução usa a mesma autenticação, política e auditoria de uma chamada interativa.
3. O scheduler impede concorrência indevida, duplicação de ações e execução após revogação.
4. O usuário consegue pausar, executar uma vez, consultar histórico e entender falhas.

### H-032 — Implementar gravação, transcrição e geração de tarefas de reunião

| Campo | Valor |
|---|---|
| Tipo | Feature / produtividade |
| Prioridade | P1 |
| Origem | 09:44–11:15 [1] |
| Dependências | H-008, H-009, H-020, H-026 |
| Labels | `meetings`, `transcription`, `kanban`, `p1` |

**Objetivo.** Gravar ou importar uma reunião com consentimento, transcrever o áudio e gerar tarefas estruturadas para um Kanban interno ou integração autorizada.

**Critérios de aceite.**

1. A captura exige indicação de consentimento, permissões de microfone e configuração de retenção do áudio.
2. A transcrição mantém associação com reunião, participantes quando disponíveis e timestamps.
3. Tarefas geradas incluem título, descrição, responsável sugerido, prazo, confiança e vínculo com o trecho da transcrição.
4. Nenhuma tarefa externa é criada sem confirmação ou regra de automação explícita.

## E7 — Resiliência, privacidade e operação

### H-033 — Implementar alta disponibilidade e recuperação do gateway

| Campo | Valor |
|---|---|
| Tipo | Feature / infraestrutura |
| Prioridade | P0 |
| Origem | Risco inferido do ponto único de falha em 16:43–20:20 [1] |
| Dependências | H-003, H-011, H-012, H-016 |
| Labels | `availability`, `gateway`, `disaster-recovery`, `p0` |

**Objetivo.** Reduzir o risco de indisponibilidade total quando o painel ou gateway central falhar, mantendo a regra fail-closed para chamadas que não possam ser autorizadas.

**Critérios de aceite.**

1. Há pelo menos duas instâncias ou uma estratégia equivalente de recuperação testada para o gateway stateless.
2. Saúde, prontidão, dependências críticas e saturação são verificáveis por probes e alertas.
3. Falha de uma instância não expõe credenciais nem permite bypass de política.
4. O plano de recuperação define RTO/RPO, responsáveis, runbook e teste periódico.

### H-034 — Criar backup, restauração e migração do workspace local

| Campo | Valor |
|---|---|
| Tipo | Feature / continuidade |
| Prioridade | P1 |
| Origem | Risco inferido de perda de memória ao trocar de dispositivo [1] |
| Dependências | H-006, H-007, H-008 |
| Labels | `backup`, `restore`, `desktop`, `p1` |

**Objetivo.** Permitir migração controlada da identidade, skills e memória local para outro dispositivo sem exportar segredos OAuth ou dados que a política proíba.

**Critérios de aceite.**

1. O usuário consegue iniciar backup e restauração autenticados, com indicação clara do conteúdo incluído e excluído.
2. Tokens OAuth nunca entram no pacote; conexões precisam ser refeitas ou reautorizadas.
3. O backup é criptografado, versionado, expirável e protegido contra restauração em tenant incorreto.
4. Uma restauração parcial não corrompe o SQLite nem substitui dados mais novos sem confirmação.

### H-035 — Implementar classificação, redaction, retenção e direitos sobre dados

| Campo | Valor |
|---|---|
| Tipo | Feature / privacidade |
| Prioridade | P0 |
| Origem | Derivada do controle de dados que saem da empresa e da memória dupla [1] |
| Dependências | H-007, H-016, H-027, H-029 |
| Labels | `privacy`, `data-governance`, `retention`, `p0` |

**Objetivo.** Definir quais dados podem sair para provedores, quais podem ser armazenados, por quanto tempo e quem pode acessá-los.

**Critérios de aceite.**

1. Prompts, documentos, transcrições, memória, logs e embeddings têm classificação e política de retenção configuráveis.
2. PII, segredos e padrões proibidos podem ser mascarados ou bloqueados antes de uma chamada externa.
3. Exclusão, exportação e consulta de dados produzem evidência de execução sem quebrar a trilha mínima de auditoria.
4. O painel informa quando uma política de privacidade impede determinada operação.

### H-036 — Implantar observabilidade, SLOs e resposta a incidentes

| Campo | Valor |
|---|---|
| Tipo | Operação / confiabilidade |
| Prioridade | P0 |
| Origem | Derivada do proxy central, custos, streaming e RAG [1] |
| Dependências | H-011, H-015, H-020, H-033 |
| Labels | `observability`, `slo`, `incident`, `p0` |

**Objetivo.** Monitorar disponibilidade, latência, custo, erros, filas, provedores, MCPs e pipeline de conhecimento com métricas úteis para operação corporativa.

**Critérios de aceite.**

1. Existem métricas e traces correlacionados por tenant, workspace, usuário, provedor e request sem expor conteúdo sensível.
2. SLOs são definidos para gateway, streaming, consultas RAG e automações, com alertas acionáveis.
3. Cada alerta crítico possui runbook, owner, severidade e procedimento de contenção.
4. É possível investigar uma falha de usuário até o componente responsável sem depender de logs em texto livre.

## E8 — Qualidade, segurança e rollout

### H-037 — Criar suíte de avaliação funcional, factual e de custo

| Campo | Valor |
|---|---|
| Tipo | Qualidade / avaliação |
| Prioridade | P0 |
| Origem | Derivada do uso de agentes, RAG, políticas e controle de custo [1] |
| Dependências | H-014, H-020, H-029, H-036 |
| Labels | `evals`, `quality`, `rag`, `cost`, `p0` |

**Objetivo.** Medir se o harness usa o modelo certo, respeita políticas, recupera documentos corretos e mantém custo e latência dentro dos limites.

**Critérios de aceite.**

1. Existe conjunto versionado de casos para chat, negação, budget, MCP, RAG, memória local e streaming.
2. Cada release compara qualidade de resposta, precisão de recuperação, taxa de bloqueio correto, custo e latência.
3. Há testes de regressão para garantir que uma alteração de prompt ou modelo não reabra uma permissão negada.
4. Critérios de aprovação e limites de falha são definidos antes do piloto.

### H-038 — Executar validação de segurança e testes adversariais

| Campo | Valor |
|---|---|
| Tipo | Segurança / qualidade |
| Prioridade | P0 |
| Origem | Riscos inferidos de MCP, Bash/Read/Write, OAuth e proxy [1] |
| Dependências | H-014, H-018, H-024, H-025, H-035 |
| Labels | `security`, `red-team`, `prompt-injection`, `p0` |

**Objetivo.** Verificar, antes da produção, que o cliente, gateway, painel, MCPs e RAG não permitem exfiltração, escalada ou gasto fora da política.

**Critérios de aceite.**

1. Testes cobrem roubo de API key, adulteração de request, replay, escalada de workspace, prompt injection e ferramenta maliciosa.
2. Testes de custo cobrem concorrência, alteração de preço, fallback indevido, limite negativo e bypass do pré-check local.
3. Vulnerabilidades possuem severidade, evidência, mitigação e decisão formal de aceitação ou correção.
4. O release é bloqueado para achados críticos ou de alta severidade sem exceção aprovada.

### H-039 — Criar empacotamento, assinatura e atualização corporativa do Electron

| Campo | Valor |
|---|---|
| Tipo | Release / desktop |
| Prioridade | P1 |
| Origem | Derivada da distribuição do app desktop aos colaboradores [1] |
| Dependências | H-005, H-009, H-033 |
| Labels | `electron`, `release`, `update`, `p1` |

**Objetivo.** Distribuir o app com instaladores assinados, canais de atualização e rollback compatíveis com a política de TI.

**Critérios de aceite.**

1. Instaladores para os sistemas operacionais suportados são assinados e verificáveis.
2. Atualizações são autenticadas, podem ser distribuídas por anel e não removem dados locais sem migração explícita.
3. Falha de atualização permite rollback para a última versão funcional.
4. O painel consegue informar versão mínima, versão recomendada e bloqueio de cliente obsoleto.

### H-040 — Conduzir piloto controlado e plano de rollout

| Campo | Valor |
|---|---|
| Tipo | Operação / adoção |
| Prioridade | P1 |
| Origem | Derivada do objetivo corporativo apresentado no vídeo [1] |
| Dependências | H-021, H-030, H-036, H-037, H-038, H-039 |
| Labels | `pilot`, `rollout`, `adoption`, `p1` |

**Objetivo.** Validar o harness com um conjunto pequeno de usuários e workspaces antes da expansão para toda a empresa.

**Critérios de aceite.**

1. O piloto possui critérios de entrada, grupos participantes, duração, owners, canais de suporte e critérios de saída.
2. São medidos adoção, custo por tarefa, taxa de bloqueios, incidentes, qualidade do RAG, latência e satisfação do colaborador.
3. O rollout por ondas inclui possibilidade de pausa, rollback de política e desligamento de integrações de risco.
4. Um relatório final registra o que foi validado, o que falhou e quais issues devem preceder a próxima onda.

# Dependências críticas

O caminho crítico do MVP é **H-001 → H-002 → H-003 → H-004 → H-011 → H-012/H-013 → H-017/H-018 → H-014 → H-015/H-016 → H-019/H-020**. O cliente de chat (H-009) pode ser desenvolvido em paralelo contra o contrato de H-011, mas não deve ser considerado pronto sem as garantias de H-014 e H-012.

A base de conhecimento segue **H-027 → H-028 → H-029 → H-030**. As integrações e automações dependem de **H-023 → H-024 → H-025**, porque conectar ferramentas antes de definir escopos e guardrails cria um risco que o próprio harness pretende controlar.

# Decisões que precisam de validação executiva

| Decisão | Alternativas | Recomendação para o MVP |
|---|---|---|
| Identidade corporativa | SSO existente, convite por domínio ou identidade própria | Reutilizar o provedor de identidade corporativo existente |
| Memória local | SQLite local, memória central ou híbrida | Manter memória individual local e separar da base normativa |
| Disponibilidade offline | Bloquear geração, cache de respostas ou modelo local | Bloquear chamadas não autorizáveis; permitir apenas recursos locais não sensíveis |
| Auditoria de conteúdo | Somente metadados, conteúdo criptografado ou retenção plena | Começar por metadados e conteúdo mínimo, com política explícita para exceções |
| Ações destrutivas | Automáticas, confirmação humana ou aprovação administrativa | Exigir confirmação ou política de aprovação para Write/Bash e ações externas |
| Conhecimento corporativo | Documentos livres, base aprovada ou sincronização automática | Usar documentos aprovados, versionados e com owner |
| Resiliência | Gateway único, múltiplas instâncias ou modo degradado | Múltiplas instâncias e fail-closed durante perda de autorização |

# Referências

[1]: https://www.youtube.com/watch?v=b1H-gYRW2IU "O que é um Harness Corporativo de IA (e por que sua empresa vai precisar de um) — YouTube"
