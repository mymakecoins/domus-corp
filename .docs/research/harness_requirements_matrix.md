# Matriz de requisitos — Harness Corporativo de IA

Fonte principal: [vídeo sobre o Harness Corporativo de IA](https://www.youtube.com/watch?v=b1H-gYRW2IU). Os timestamps são aproximados e os itens marcados como inferência não foram afirmados literalmente no vídeo.

## Problema e objetivos

O harness deve permitir adoção interna de IA com controle centralizado sobre agentes, prompts, ferramentas, orçamento por usuário e fluxo de dados para provedores externos. O problema de negócio destacado é o uso de modelos caros em tarefas simples, a falta de rastreabilidade de gastos e o risco de envio inadequado de dados corporativos.

## Personas

- Colaborador: usa o app desktop para chat, automações, integrações, skills locais, memória pessoal e produtividade.
- Administrador/empresa: define regras, workspaces, modelos/provedores, MCPs, permissões e budgets; mantém as chaves dos provedores e acompanha custos.
- Gestor de workspace: persona derivada da existência de políticas por área; administra uma área sem necessariamente controlar a política global.

## Requisitos funcionais extraídos

1. Cliente desktop Electron com chat.
2. Menu de ferramentas customizáveis.
3. Automações/rotinas agendadas (CRON).
4. Catálogo e conexão de integrações via MCP: ClickUp, Jira, Excalidraw, Higgsfield, Gmail, Google Drive e Google Calendar.
5. Skills locais criadas pelo colaborador.
6. Histórico de tokens por chamada no cliente.
7. Onboarding conversacional que coleta nome, cargo, atividades e rotina.
8. Persistência da identidade local em SOUL.md, RULES.md, USER.md e MEMORY.md.
9. Memória semântica local em SQLite com sumarização ao fim da sessão e recuperação via RAG.
10. OAuth local para integrações, com segredos no Keychain/Vault do sistema operacional.
11. Gravador/transcritor de reuniões com geração automática de tarefas para Kanban.
12. Painel administrativo web hospedado no ambiente da empresa.
13. Gestão de workspaces, com herança de política global e sobrescrita restritiva por workspace.
14. Políticas para provedores, modelos exatos, MCPs e permissões de sistema Bash/Read/Write.
15. API gateway/proxy central para chamadas de LLM.
16. Chaves dos provedores somente no servidor, nunca no desktop.
17. Pré-check local de budget e validação definitiva no servidor.
18. Streaming da resposta do provedor através do gateway para o desktop.
19. Fail-closed quando cache ou validação de políticas falhar.
20. Dashboards de tokens e custos por colaborador, workspace e provedor.
21. Armazenamento bruto de documentos em MinIO.
22. Indexação vetorial em Qdrant.
23. Exposição da base de conhecimento como MCP Knowledge Base.
24. RAG para regras de produto, RH e processos internos.

## Decisões e restrições arquiteturais

- A API key de LLM é um segredo exclusivamente server-side.
- O cliente depende de conectividade com o painel para gerar respostas.
- A memória individual permanece local; a memória normativa/corporativa fica centralizada.
- A política efetiva deve ser calculada com herança e restrições.
- Falha de validação deve negar a operação, não liberar uma alternativa insegura.

## Riscos a tratar como issues próprias

- Ponto único de falha no gateway/painel.
- Perda de identidade/memória ao trocar de dispositivo.
- Prompt injection e abuso de permissões Bash/Write/MCP.
- Vazamento ou auditoria indevida de prompts/conversas através do proxy.
- Excesso de custo, bypass de budget e uso de modelo não autorizado.
- OAuth local e ciclo de vida de tokens.
- Qualidade, versionamento e autorização dos documentos usados no RAG.
- Confiabilidade de automações agendadas e ações externas.

## Fluxo de requisição esperado

1. O usuário seleciona ou inicia uma tarefa no cliente.
2. O cliente estima o custo e executa pré-check local.
3. O cliente envia contexto mínimo e pedido autenticado por HTTPS ao gateway.
4. O gateway autentica o usuário, resolve workspace e política efetiva.
5. O gateway valida orçamento, modelo, ferramentas e permissões.
6. O gateway injeta a credencial server-side e chama o provedor permitido.
7. O gateway registra metadados de auditoria e repassa a resposta em streaming.
8. O cliente mostra a resposta e atualiza o histórico local/central conforme a política.

## Critérios sistêmicos de sucesso derivados

- Nenhuma API key de LLM é observável no cliente.
- Nenhuma chamada é liberada quando a política ou o budget não podem ser verificados.
- Todo consumo é atribuído a usuário, workspace, provedor e modelo.
- Um administrador consegue impedir um modelo caro ou uma ferramenta perigosa por workspace.
- O colaborador consegue recuperar contexto pessoal local sem misturá-lo com a base normativa da empresa.
- O agente responde a dúvidas corporativas com documentos oficiais e evidências rastreáveis.
- Quedas do gateway e falhas de provedor são detectáveis, explicáveis e recuperáveis.
