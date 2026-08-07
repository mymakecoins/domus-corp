# Superpowers-workflow

 No seu caso, o Superpowers deve funcionar como uma ponte entre o planejamento já concluído e a implementação disciplinada. Não precisamos repetir

  toda a descoberta do produto.

  O fluxo adaptado ao Domus Corp seria:

  Documentação existente

          ↓

  Validação curta do design

          ↓

  Escolha de uma issue/onda

          ↓

  Plano técnico executável

          ↓

  Worktree/branch isolada

          ↓

  TDD: teste → implementação → refatoração

          ↓

  Revisão de aderência à especificação

          ↓

  Revisão de qualidade

          ↓

  Verificação completa

          ↓

  Commit / PR / próxima issue

  O projeto oficial define justamente esse encadeamento: brainstorming, using-git-worktrees, writing-plans, execução por agentes ou checkpoints,

  TDD, revisão e verificação antes da conclusão. Superpowers no GitHub (https://github.com/obra/superpowers) · skills.sh

  (https://www.skills.sh/obra/superpowers)

  ## Como aplicar ao nosso projeto

  ### 1. Brainstorming vira validação, não redescoberta

  Normalmente o Superpowers começa perguntando o que será construído. No Domus, já temos PRD, ADR, Design System, backlog e sequência de execução.

  **Para cada conjunto de trabalho, o brainstorming deve:**

  - Ler somente o context pack relevante.

  - Confirmar objetivo, fronteiras e critérios de aceite.

  - Encontrar ambiguidades ou contradições.

  - Propor alternativas apenas para decisões ainda abertas.

  - Produzir um design técnico pequeno para aquela issue.

  - Pedir sua aprovação antes do plano de implementação.

  Exemplo de solicitação:

  > Use Superpowers para refinar a V1-003. Considere o PRD, ADR-001, backlog e índice de execução como fontes de autoridade. Não redesenhe o

  > produto. Identifique apenas lacunas necessárias para implementar contratos cross-runtime e apresente o design técnico para aprovação.

  O PRD continua dizendo “o que e por quê”; o ADR, “quais limites”; a issue, “qual entrega”; e o design técnico do Superpowers, “como implementar

  esta fatia”.

  ### 2. Trabalhar por issue ou pequeno conjunto coeso

  Não é recomendável pedir:

  > Implemente a v1.0 inteira.

  O ideal é selecionar uma issue ou uma fatia pequena com dependências próximas. Para começar, o backlog indica:

  V1-001 → V1-002 → V1-003 → V1-004 → V1-006

  Entretanto, V1-001 e V1-002 são predominantemente decisões e artefatos. A primeira implementação concreta provavelmente será preparada em torno

  de:

  - V1-003 — contratos cross-runtime;

  - V1-004 — monorepo e CI;

  - V1-006 — ambientes, configuração e segredos.

  Podemos refiná-las juntas para coerência, mas executá-las separadamente.

  ### 3. Gerar um plano técnico com writing-plans

  Depois de você aprovar o design técnico, o Superpowers transforma a issue em tarefas pequenas e verificáveis.

  Um plano adequado deve informar para cada tarefa:

  - Arquivos exatos a criar ou alterar.

  - Contrato ou requisito atendido.

  - Teste que deve ser escrito primeiro.

  - Comando para observar o teste falhar.

  - Implementação mínima.

  - Comando para confirmar que passou.

  - Critério de conclusão.

  - Ponto de commit ou revisão.

  Exemplo simplificado:

  Tarefa 1 — Criar schema base de EffectivePolicy

  1. Criar o teste de validação do JSON Schema.

  2. Executar o teste e confirmar falha.

  3. Criar o schema mínimo.

  4. Executar o teste e confirmar sucesso.

  5. Validar exemplos TypeScript e Python.

  6. Registrar decisão e commit.

  Embora o Superpowers costume decompor em tarefas muito pequenas, para este projeto os commits devem continuar alinhados às issues e aos contratos

  arquiteturais.

  ### 4. Criar ambiente isolado

  A skill using-git-worktrees cria uma branch/worktree separada e verifica o baseline antes de modificar o projeto.

  Para o Domus, uma convenção possível seria:

  issue/v1-003-cross-runtime-contracts

  issue/v1-004-monorepo-toolchains

  issue/v1-006-environments-secrets

  Antes da execução:

  - confirmar que a worktree está limpa;

  - instalar dependências;

  - executar lint, typecheck e testes existentes;

  - registrar falhas anteriores à issue.

  Isso evita atribuir ao novo desenvolvimento problemas que já existiam.

  ### 5. Escolher o modo de execução

  O Superpowers oferece dois modos principais.

  subagent-driven-development:

  - Um agente novo implementa cada tarefa.

  - Outro verifica aderência à especificação.

  - Depois ocorre revisão de qualidade.

  - É apropriado para tarefas independentes e bem especificadas.

  - Pode continuar autonomamente até terminar ou encontrar bloqueio.

  executing-plans:

  - O agente executa o plano em lotes.

  - Há checkpoints humanos entre os lotes.

  - É melhor para decisões arquiteturais sensíveis ou quando você deseja acompanhar mais de perto.

  Para o Domus, eu recomendo:

  - executing-plans nas issues M0 e nos gates críticos;

  - subagentes para tarefas mecânicas e isoladas, depois que contratos e arquitetura estiverem aprovados;

  - revisão humana obrigatória nas issues de risco elevado indicadas pelo backlog.

  O próprio Superpowers recomenda execução por subagentes quando a plataforma oferece suporte, com duas revisões: conformidade com a especificação

  e qualidade de código. Subagent-Driven Development (https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md)

  ### 6. Implementar sempre com TDD

  Durante cada tarefa, a skill test-driven-development aplica:

  RED      escrever o teste e confirmar que falha

  GREEN    implementar apenas o necessário para passar

  REFACTOR melhorar mantendo os testes verdes

  No Domus isso precisa abranger mais que testes unitários:

  - Testes de contrato OpenAPI/JSON Schema/AsyncAPI.

  - Testes negativos e comportamento fail-closed.

  - Isolamento de tenant e workspace.

  - Verificação de egress.

  - Migrações e rollback.

  - Acessibilidade.

  - Observabilidade sem vazamento.

  - Avaliações de groundedness para funcionalidades de IA.

  ### 7. Duas revisões antes de aceitar

  Cada entrega deve passar por duas perguntas diferentes:

  1. Aderência: foi implementado exatamente o que PRD, ADR, issue e design técnico determinam?

  2. Qualidade: o código está seguro, simples, testável, observável e sustentável?

  Uma implementação pode ter excelente código e ainda estar errada em relação ao produto. Por isso a ordem é primeiro conformidade, depois

  qualidade.

  ### 8. Verificação antes de declarar conclusão

  A skill verification-before-completion impede afirmações como “pronto” ou “todos os testes passam” sem evidência recente.

  O pacote de conclusão de uma issue deve trazer:

  - Arquivos alterados.

  - Comandos executados.

  - Resultados dos testes.

  - Critérios de aceite comprovados.

  - Contratos afetados.

  - Riscos e limitações residuais.

  - Revisões realizadas.

  - Decisões adicionadas.

  - Próximo passo recomendado.

  Isso combina diretamente com a Definition of Done do backlog.

  ## Um ciclo prático completo

  Para cada issue, você poderia solicitar:

  > Use Superpowers para trabalhar na V1-003. Leia o context pack e os documentos de autoridade relevantes. Faça primeiro uma validação curta do

  > design, sem implementar. Depois da minha aprovação, gere um plano técnico executável com TDD, arquivos-alvo, comandos de verificação e

  > checkpoints.

  Após aprovar o design:

  > Design aprovado. Use writing-plans e salve o plano no repositório. Não implemente ainda.

  Depois de revisar o plano:

  > Plano aprovado. Execute com executing-plans, em ambiente isolado, usando TDD. Pare somente diante de bloqueio real ou decisão arquitetural não

  > coberta. Ao final, apresente as evidências da verificação.

  Para uma tarefa segura e altamente particionável:

  > Plano aprovado. Use subagent-driven-development. Faça revisão de aderência à especificação e, separadamente, revisão de qualidade após cada

  > tarefa.

  ## Instalação

  O pacote oficial contém 14 skills e pode ser instalado com:

  npx skills add obra/superpowers

  A página do pacote registra o comando e as skills disponíveis. obra/superpowers no skills.sh (https://www.skills.sh/obra/superpowers)

  Atualmente ele não está instalado nesta sessão. Quando você quiser, o próximo passo natural é instalar o Superpowers e iniciar uma validação

  controlada da primeira onda, começando por V1-001–V1-004, sem escrever código antes de aprovarmos o primeiro design técnico.
