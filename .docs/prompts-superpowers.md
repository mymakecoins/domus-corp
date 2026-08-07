# Prompts de execução com Superpowers — Domus Corp

Este documento é um roteiro operacional para desenvolver o Domus Corp com o pacote de skills Superpowers. Os prompts estão na ordem em que devem ser usados e foram escritos para serem copiados e colados.

O fluxo deve ser aplicado a **uma issue ou a uma pequena fatia coesa por vez**. Não use este roteiro para solicitar a implementação integral da v1.0 em uma única execução.

## Como usar

Antes de começar um ciclo, substitua os campos entre `<...>`:

- `<ISSUE_ID>`: por exemplo, `V1-003`.
- `<TITULO_ISSUE>`: título da issue no backlog mestre.
- `<MARCO>`: `M0`, `M1`, `M2`, `M3`, `M4` ou `M5`.
- `<ARQUIVO_DESIGN>`: caminho do design técnico aprovado.
- `<ARQUIVO_PLANO>`: caminho do plano de implementação aprovado.
- `<BRANCH_OU_WORKTREE>`: nome sugerido para a entrega isolada.

As fontes de autoridade do projeto são:

1. `.docs/research/PRD_ERS_ Domus Corp — Plataforma de Inteligência Corporativa com IA.md`
2. `.docs/research/ADR_001_ArquiteturaDomusCorp.md`
3. `.docs/research/backlog/Backlog_V1_DomusCorp.md`
4. `.docs/research/backlog/Indice de Execução da V1.0 - Domus Corp.md`
5. `.docs/research/DESIGN_SYSTEM_DOMUS_CORP.md`, quando houver interface.
6. Contratos, decisões e código já aprovados no repositório.

Em caso de conflito, o agente não deve escolher silenciosamente. Deve indicar o conflito, seu impacto e a decisão humana necessária.

---

# Fluxo 0 — Início de uma onda ou marco

Use este fluxo somente quando começar uma nova onda ou marco. Para a segunda issue da mesma onda, comece pelo Fluxo 1.

## Prompt 0.1 — Avaliar a prontidão da onda

```text
Use as skills relevantes do Superpowers para avaliar a prontidão da onda correspondente ao marco <MARCO> do Domus Corp.

Esta etapa é somente de análise. Não altere arquivos, não crie branch ou worktree e não implemente código.

Leia o PRD/ERS, o ADR-001, o backlog mestre e o índice de execução em `.docs/research`. Leia apenas outros arquivos necessários para verificar o estado real do repositório.

Entregue:
1. objetivo e condição de saída da onda;
2. issues que pertencem à onda, na ordem de dependência;
3. dependências já satisfeitas, ausentes ou incertas;
4. contratos e decisões que precisam existir antes da implementação;
5. riscos e gates humanos aplicáveis;
6. recomendação objetiva da primeira issue executável.

Use evidências do repositório. Não redesenhe o produto, não amplie o escopo da v1.0 e não trate documentos derivados como mais autoritativos que PRD, ADR e decisões aprovadas.
```

## Prompt 0.2 — Confirmar a issue inicial

Use depois de revisar o diagnóstico:

```text
Diagnóstico da onda aprovado. A primeira entrega será <ISSUE_ID> — <TITULO_ISSUE>.

Registre essa seleção apenas no plano de trabalho da sessão. Ainda não altere o repositório. Prossiga para a validação do design da issue usando o workflow do Superpowers.
```

---

# Fluxo 1 — Validar o design da entrega

Inicie uma sessão limpa para este fluxo. Ele substitui uma redescoberta ampla do produto por uma validação técnica curta e focada.

## Prompt 1.1 — Construir o context pack da issue

```text
Use Superpowers para preparar o desenvolvimento da issue <ISSUE_ID> — <TITULO_ISSUE>, pertencente ao marco <MARCO>.

Comece lendo integralmente a issue no backlog mestre, suas dependências e os trechos diretamente relevantes do PRD, ADR-001, índice de execução e Design System, quando aplicável. Inspecione também o estado atual do código e os contratos afetados.

Esta etapa é somente de análise. Não escreva código e não altere arquivos.

Monte um context pack conciso contendo:
- objetivo e valor da issue;
- requisitos e critérios de aceite;
- dependências e pré-condições;
- invariantes arquiteturais e de segurança;
- runtime e domínio responsáveis;
- contratos, entidades e eventos afetados;
- arquivos ou áreas prováveis do repositório;
- testes e evidências esperados;
- ações expressamente proibidas;
- ambiguidades, conflitos ou decisões ainda abertas.

Não invente requisitos. Diferencie claramente fatos documentados, inferências e perguntas em aberto.
```

## Prompt 1.2 — Executar brainstorming focado

```text
Usando a skill `brainstorming`, transforme o context pack da issue <ISSUE_ID> em um design técnico implementável.

O produto, o escopo da v1.0 e as decisões vinculantes do ADR já estão definidos. Portanto:
- não repita a descoberta do produto;
- não substitua as tecnologias aprovadas;
- não amplie o escopo da issue;
- aplique YAGNI e prefira a solução mais simples compatível com os requisitos;
- apresente alternativas somente onde houver uma decisão genuinamente aberta;
- faça perguntas uma por vez apenas quando a resposta alterar materialmente o design.

O design deve cobrir, conforme aplicável:
1. responsabilidades e limites;
2. fluxo de dados e sequência operacional;
3. contratos e versionamento;
4. modelo de dados e migrações;
5. autorização, isolamento, fail-closed e egress;
6. erros, idempotência, retries e estados terminais;
7. observabilidade e redaction;
8. estratégia de testes;
9. rollout e rollback;
10. riscos e decisões humanas exigidas.

Apresente o design em seções curtas para validação. Não crie o plano de implementação nem escreva código antes da minha aprovação explícita.
```

## Prompt 1.3 — Corrigir o design após revisão

Use quantas vezes forem necessárias:

```text
Revise o design técnico da issue <ISSUE_ID> com estas decisões e correções:

<COLE_AQUI_O_FEEDBACK>

Mostre exatamente o que mudou, verifique novamente a aderência ao PRD, ADR, backlog e contratos existentes e reapresente as seções afetadas. Não implemente e não gere ainda o plano de execução.
```

## Prompt 1.4 — Aprovar e persistir o design

```text
O design técnico da issue <ISSUE_ID> está aprovado.

Salve-o em um arquivo Markdown versionável, em uma pasta de documentação de implementação coerente com a estrutura existente do repositório. Inclua:
- issue, marco, data e status;
- fontes de autoridade;
- decisões aprovadas;
- critérios de aceite cobertos;
- riscos e pendências explicitamente fora do escopo;
- rastreabilidade para requisitos e ADRs.

Não implemente código. Ao final, informe somente o caminho do arquivo criado, um resumo das decisões e eventuais pendências que impeçam o planejamento.
```

Após esse prompt, registre o caminho como `<ARQUIVO_DESIGN>` e limpe a sessão antes do Fluxo 2.

---

# Fluxo 2 — Criar o plano de implementação

Inicie uma sessão limpa. O design já deve estar aprovado e persistido.

## Prompt 2.1 — Gerar o plano com `writing-plans`

```text
Use a skill `writing-plans` para criar o plano de implementação da issue <ISSUE_ID> — <TITULO_ISSUE>.

Leia primeiro:
- o design aprovado em `<ARQUIVO_DESIGN>`;
- a definição da issue e suas dependências no backlog mestre;
- os arquivos e contratos do repositório citados pelo design.

Revise criticamente o design contra o estado atual do repositório. Se houver bloqueio, inconsistência ou decisão ausente que mude materialmente a implementação, pare e apresente a evidência antes de criar o plano. Não resolva divergências de arquitetura por conta própria.

Crie um plano executável, com tarefas pequenas, ordenadas e verificáveis. Para cada tarefa, informe:
1. objetivo e requisito atendido;
2. arquivos exatos a criar ou modificar;
3. teste a escrever primeiro;
4. comando que deve demonstrar o estado RED e falha esperada;
5. implementação mínima para GREEN;
6. comando de verificação e resultado esperado;
7. refatoração permitida;
8. verificações de segurança, contrato, observabilidade e documentação;
9. critério de conclusão;
10. ponto de revisão ou commit, quando apropriado.

Regras obrigatórias:
- aplicar TDD real, RED–GREEN–REFACTOR;
- manter TypeScript/Fastify e Python/FastAPI nas fronteiras aprovadas;
- preservar contratos OpenAPI, JSON Schema e AsyncAPI versionados;
- testar casos negativos e fail-closed nas capacidades P0;
- não introduzir dependências ou abstrações sem justificativa;
- não incluir trabalho fora do escopo da issue;
- incluir ao final a verificação integrada e a atualização da documentação;
- não implementar o plano nesta sessão.

Salve o plano como Markdown em uma pasta coerente com a documentação de implementação do repositório.
```

## Prompt 2.2 — Revisar o plano

```text
Faça uma revisão crítica do plano da issue <ISSUE_ID> antes de qualquer implementação.

Verifique:
- cobertura integral dos critérios de aceite;
- aderência ao design aprovado e ao ADR-001;
- ordem correta das dependências;
- granularidade executável;
- presença de RED, GREEN e REFACTOR em cada mudança comportamental;
- caminhos de arquivos e comandos plausíveis;
- testes negativos, de contrato e de isolamento necessários;
- riscos de segurança, migração, egress e vazamento em telemetria;
- ausência de escopo extra;
- possibilidade de rollback e verificação final.

Classifique problemas como bloqueadores, importantes ou sugestões. Se encontrar problemas, corrija o arquivo do plano sem iniciar a implementação e apresente um resumo do diff conceitual. Se não encontrar problemas, declare que o plano está pronto para aprovação humana.
```

## Prompt 2.3 — Aplicar feedback e congelar o plano

```text
Atualize o plano da issue <ISSUE_ID> com o seguinte feedback:

<COLE_AQUI_O_FEEDBACK>

Preserve a rastreabilidade com o design e os critérios de aceite. Após a atualização, faça uma última verificação de consistência. Não implemente código.
```

Depois da aprovação, registre o caminho como `<ARQUIVO_PLANO>` e limpe a sessão antes do Fluxo 3.

---

# Fluxo 3 — Preparar o ambiente isolado

## Prompt 3.1 — Criar ou validar worktree

```text
Use a skill `using-git-worktrees` para preparar um ambiente isolado para a issue <ISSUE_ID> — <TITULO_ISSUE>.

Plano aprovado: `<ARQUIVO_PLANO>`.
Nome sugerido: `<BRANCH_OU_WORKTREE>`.

Antes de alterar código:
- leia e respeite as instruções AGENTS.md aplicáveis;
- inspecione o estado do Git e preserve alterações preexistentes do usuário;
- escolha um local seguro e compatível com a gestão atual de worktrees;
- instale somente dependências já autorizadas pelo projeto;
- execute o baseline relevante de lint, typecheck, testes e build;
- registre comandos, versões e falhas preexistentes;
- confirme que nenhum segredo ou dado real entrou no ambiente.

Não comece a implementação se o baseline estiver quebrado de forma que impeça distinguir regressões da issue. Nesse caso, apresente a evidência e proponha o menor próximo passo seguro.
```

---

# Fluxo 4A — Executar com checkpoints humanos

Use este fluxo para M0, mudanças arquiteturais, migrações, policy, egress, budget, RLS/ACL, Action Gateway, segurança e demais issues de risco elevado.

## Prompt 4A.1 — Iniciar `executing-plans`

```text
Use a skill `executing-plans` para implementar o plano `<ARQUIVO_PLANO>` da issue <ISSUE_ID>.

Execute no ambiente isolado já preparado. Antes de começar, releia criticamente o plano e confirme sua compatibilidade com o estado atual do código. Não modifique o design aprovado silenciosamente.

Trabalhe em lotes pequenos, usando `test-driven-development` em cada mudança de comportamento:
1. escreva o teste;
2. execute-o e observe a falha esperada;
3. implemente o mínimo necessário;
4. execute-o e confirme sucesso;
5. refatore mantendo os testes verdes;
6. rode as verificações proporcionais ao risco.

Após cada lote, informe:
- tarefas concluídas;
- arquivos alterados;
- evidências RED e GREEN;
- comandos e resultados;
- decisões ou desvios;
- riscos e próximo lote.

Pare apenas em um checkpoint previsto, bloqueio real, falha persistente, conflito com a documentação de autoridade ou decisão humana necessária. Não declare a issue concluída antes do fluxo de revisão e verificação final.
```

## Prompt 4A.2 — Autorizar o próximo lote

```text
Checkpoint aprovado. Continue com o próximo lote do plano `<ARQUIVO_PLANO>`, preservando TDD, escopo e rastreabilidade. Não antecipe tarefas posteriores e interrompa se surgir um novo bloqueio ou divergência arquitetural.
```

Repita o Prompt 4A.2 até terminar todas as tarefas do plano.

---

# Fluxo 4B — Executar com subagentes

Use este fluxo somente quando as tarefas estiverem bem especificadas e puderem ser isoladas. Não o use para contornar gates humanos do backlog.

## Prompt 4B.1 — Iniciar `subagent-driven-development`

```text
Use a skill `subagent-driven-development` para executar o plano `<ARQUIVO_PLANO>` da issue <ISSUE_ID> no ambiente isolado já preparado.

Para cada tarefa do plano:
- forneça ao agente implementador apenas o context pack necessário;
- exija `test-driven-development` com evidência RED–GREEN–REFACTOR;
- preserve os arquivos e alterações preexistentes do usuário;
- não permita mudanças fora da tarefa;
- após a implementação, realize primeiro uma revisão independente de aderência à especificação;
- corrija todas as divergências de especificação;
- somente depois realize uma revisão independente de qualidade de código;
- corrija achados antes de marcar a tarefa como concluída.

Não execute em paralelo tarefas que compartilhem arquivos, contratos, migrations, estado de banco ou dependências ainda não estabilizadas. Não permita que um agente aprove a própria implementação.

Continue até concluir o plano ou encontrar um bloqueio real. Não declare a issue concluída antes da verificação integrada final e dos gates humanos aplicáveis.
```

---

# Fluxo 5 — Tratar falhas durante a implementação

Use este fluxo quando um teste, build ou comportamento falhar de forma não explicada pelo ciclo RED esperado.

## Prompt 5.1 — Depuração sistemática

```text
Use a skill `systematic-debugging` para investigar esta falha da issue <ISSUE_ID>:

<COLE_AQUI_A_FALHA_E_O_COMANDO>

Não aplique correções por tentativa e erro. Primeiro:
1. reproduza a falha;
2. separe causa de sintomas;
3. reúna evidências nos limites entre componentes;
4. compare o caminho quebrado com um caminho funcional, quando existir;
5. formule e teste uma hipótese por vez;
6. identifique a causa-raiz.

Depois de comprovada a causa, crie um teste de regressão que falhe pelo motivo correto, aplique a menor correção e execute as verificações relevantes. Informe causa-raiz, evidência, correção e riscos residuais. Não amplie o escopo da issue.
```

---

# Fluxo 6 — Revisar a entrega

Use depois que todas as tarefas do plano estiverem implementadas, mas antes de declarar conclusão.

## Prompt 6.1 — Revisão de aderência à especificação

```text
Realize uma revisão independente de aderência da implementação da issue <ISSUE_ID>.

Compare o diff e o comportamento implementado contra:
- a definição e os critérios de aceite da issue;
- o design aprovado em `<ARQUIVO_DESIGN>`;
- o plano em `<ARQUIVO_PLANO>`;
- PRD, ADR-001, contratos e Design System aplicáveis.

Verifique requisito por requisito. Procure também escopo extra, decisões silenciosas, critérios parcialmente atendidos e testes que passam sem provar o comportamento exigido.

Classifique os achados por severidade e cite arquivos e evidências. Corrija os achados confirmados seguindo TDD e execute novamente os testes afetados. Não faça ainda a revisão geral de qualidade.
```

## Prompt 6.2 — Revisão de qualidade e segurança

```text
Use a skill `requesting-code-review` para realizar a revisão de qualidade da implementação da issue <ISSUE_ID>, agora que a aderência à especificação foi validada.

Revise o diff completo quanto a:
- correção e simplicidade;
- segurança, autorização e comportamento fail-closed;
- isolamento de tenant/workspace e classificação;
- contratos e compatibilidade entre runtimes;
- tratamento de erros, concorrência e idempotência;
- migrações, integridade e rollback;
- redaction, logs, métricas e traces;
- acessibilidade e estados semânticos, quando aplicável;
- testes frágeis, lacunas e falsos positivos;
- dependências, duplicação e abstrações prematuras;
- documentação e operação.

Classifique achados como críticos, importantes ou sugestões. Para cada achado, mostre evidência concreta e uma correção recomendada. Não aprove a entrega enquanto houver achado crítico ou importante não resolvido.
```

## Prompt 6.3 — Processar o feedback da revisão

```text
Use a skill `receiving-code-review` para processar os seguintes achados da issue <ISSUE_ID>:

<COLE_AQUI_OS_ACHADOS>

Valide tecnicamente cada achado contra o código e a especificação. Não aceite nem rejeite feedback por deferência. Para achados válidos, aplique a correção mínima usando TDD e execute os testes relevantes. Para achados inválidos ou conflitantes, apresente evidência objetiva antes de descartá-los.

Ao final, liste achados corrigidos, rejeitados com justificativa e ainda pendentes.
```

Repita os Prompts 6.2 e 6.3 até não haver achados críticos ou importantes.

---

# Fluxo 7 — Verificação final

## Prompt 7.1 — Verificar antes de concluir

```text
Use a skill `verification-before-completion` para verificar a issue <ISSUE_ID>. Não confie em resultados antigos e não declare sucesso sem executar evidências atuais.

Partindo de um estado identificável do repositório:
1. execute os testes específicos da issue;
2. execute testes de contrato e integração afetados;
3. execute lint, formatação, typecheck e build aplicáveis;
4. execute casos negativos, fail-closed e isolamento aplicáveis;
5. verifique migrações e rollback, se houver;
6. verifique acessibilidade, se houver interface;
7. verifique ausência de segredos e dados sensíveis no diff e na telemetria;
8. confira cada critério de aceite com uma evidência correspondente;
9. inspecione o diff final e o estado do Git;
10. registre falhas preexistentes separadamente de regressões.

Se qualquer verificação necessária falhar, não declare conclusão. Investigue, corrija e repita a verificação relevante.

Produza um relatório final contendo:
- resumo da implementação;
- arquivos alterados;
- critérios de aceite e evidências;
- comandos executados e resultados;
- contratos e migrações afetados;
- revisões realizadas;
- riscos residuais e limitações;
- itens explicitamente fora do escopo;
- gates humanos ainda necessários.
```

## Prompt 7.2 — Gate humano

Use quando a issue estiver na lista de risco elevado ou tocar arquitetura, segurança, dados, UX crítica ou release:

```text
Prepare o pacote de gate humano da issue <ISSUE_ID> sem aprová-lo em nome dos responsáveis.

Identifique os papéis que precisam revisar a entrega conforme o backlog — Product, Arquitetura, Segurança, DBA, QA, UX, Finanças ou outro owner — e apresente para cada papel:
- decisões que exigem validação;
- evidências relevantes;
- riscos residuais;
- perguntas objetivas de aprovação;
- condição de Go/No-Go.

Não prossiga para merge, release ou ação externa até a aprovação humana exigida ser registrada.
```

---

# Fluxo 8 — Encerrar branch ou worktree

Use somente depois da verificação final e dos gates humanos necessários.

## Prompt 8.1 — Finalizar a branch de desenvolvimento

```text
Use a skill `finishing-a-development-branch` para finalizar a entrega da issue <ISSUE_ID>.

Antes de oferecer opções de integração:
- confirme novamente o estado dos testes essenciais;
- mostre o diff e commits pertencentes à issue;
- confirme que não há alterações alheias incluídas;
- confirme que documentação, decisões e evidências estão versionadas;
- informe gates humanos concluídos e pendentes.

Apresente as opções seguras suportadas pelo repositório, como manter a branch, abrir PR ou integrar conforme o fluxo autorizado. Não faça push, merge, exclusão de branch/worktree, publicação ou release sem autorização explícita.
```

## Prompt 8.2 — Preparar handoff da issue

```text
Prepare o handoff final da issue <ISSUE_ID> para o próximo ciclo de desenvolvimento.

Inclua:
- resultado entregue;
- commit, branch ou PR, se existente;
- design e plano utilizados;
- testes e verificações executados;
- decisões novas;
- riscos residuais;
- dependências desbloqueadas;
- próxima issue recomendada segundo o índice de execução.

Não inicie a próxima issue nesta sessão.
```

Depois desse prompt, limpe a sessão. Para a próxima issue, retorne ao Fluxo 1; ao iniciar uma nova onda, retorne ao Fluxo 0.

---

# Prompts auxiliares

Estes prompts não fazem parte do caminho feliz. Use-os apenas nas situações indicadas.

## A. Verificar impacto de uma mudança de requisito

```text
Analise esta proposta de mudança antes de alterar código ou documentação:

<DESCREVA_A_MUDANCA>

Rastreie o impacto no PRD, ADR, backlog, contratos, dados, segurança, Design System, testes, plano atual e issues dependentes. Diferencie correção da issue, mudança de escopo e nova decisão arquitetural. Recomende se devemos atualizar o design atual, criar uma ADR, alterar o backlog ou abrir uma nova issue. Não implemente a mudança sem aprovação.
```

## B. Recuperar uma execução interrompida

```text
Retome a issue <ISSUE_ID> a partir do repositório, sem presumir que o relato anterior está atualizado.

Leia `<ARQUIVO_DESIGN>` e `<ARQUIVO_PLANO>`, inspecione o estado do Git, diff, commits e resultados disponíveis. Reconstrua:
- tarefas concluídas com evidência;
- trabalho parcial;
- testes atualmente verdes e vermelhos;
- desvios do plano;
- próximo passo mínimo e seguro.

Não descarte alterações existentes e não repita tarefas comprovadamente concluídas. Antes de editar, apresente o estado recuperado.
```

## C. Avaliar trabalho fora do escopo descoberto durante a issue

```text
Durante a issue <ISSUE_ID> foi identificado este trabalho adicional:

<DESCREVA_O_TRABALHO>

Determine, com evidências, se ele é necessário para satisfazer os critérios atuais, uma dívida preexistente, uma dependência bloqueadora ou uma nova capacidade. Se não for estritamente necessário, não o implemente: proponha uma issue separada com objetivo, justificativa, dependências, risco e prioridade sugerida.
```

## D. Auditar a conclusão de uma onda

```text
Audite a conclusão da onda do marco <MARCO> usando o backlog mestre e o índice de execução.

Não altere arquivos nesta primeira etapa. Verifique:
- issues e critérios de saída;
- evidências de testes e gates;
- contratos e decisões produzidos;
- riscos e exceções pendentes;
- regressões cruzadas;
- prontidão para a próxima onda.

Apresente uma recomendação Go, Go condicionado ou No-Go, com justificativas e ações necessárias. Não inicie a próxima onda automaticamente.
```

---

# Sequência resumida para copiar durante o trabalho

```text
Nova onda:
0.1 → 0.2

Cada issue:
1.1 → 1.2 → [1.3, se necessário] → 1.4
LIMPAR SESSÃO
2.1 → 2.2 → [2.3, se necessário]
LIMPAR SESSÃO
3.1
4A.1 → [4A.2 por lote] OU 4B.1
[5.1 sempre que houver falha inesperada]
6.1 → 6.2 → [6.3 e nova revisão até resolver]
7.1 → [7.2 quando houver gate humano]
8.1 → 8.2
LIMPAR SESSÃO

Fim da onda:
D — Auditar a conclusão da onda
```

## Regra final

Nenhum prompt deste documento autoriza acesso autônomo a produção, uso de segredos, alteração de sistemas externos, merge, push, release ou aprovação em nome de responsáveis humanos. Essas ações exigem autorização explícita e devem respeitar os gates definidos no backlog do Domus Corp.
