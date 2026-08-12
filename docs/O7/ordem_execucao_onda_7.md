# Análise Detalhada da Sequência de Execução — Onda 7: E7 Final + E8 (Endurecimento e Gates de Qualidade)

Este documento apresenta o detalhamento exato da ordem de execução, dependências e critérios de avanço para as **issues da Onda 7 (E7 final + E8: Endurecimento e gates de qualidade)** do projeto **Domus Corp v1.0**.

Toda a análise contida neste documento foi extraída e correlacionada diretamente da documentação oficial do repositório, com referências explícitas aos arquivos fonte e suas respectivas faixas de linhas.

---

## 1. Fontes de Verdade e Arquivos de Referência

A arquitetura de planejamento do projeto está estruturada nos seguintes arquivos principais:

1. **Índice de Execução da V1.0:**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice de Execução da V1.0 - Domus Corp.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md)
   * **Linha 32:** Definição da Onda 7 na Tabela Executiva (`Onda 7 — Endurecimento | E7 final + E8 + D2/D6 | Gate G7`).
   * **Linhas 204–212:** Detalhamento específico da Onda 7 — E7 final + E8, incluindo escopo de issues (`V1-702` a `V1-705` e `V1-801` a `V1-808`), natureza transversal de E8 e critérios do **Gate G7**.
   * **Linhas 214–229:** Transição para a Onda 8 (E9: Produção, release e piloto) e pré-requisitos para tráfego real.
   * **Linhas 259–270:** Critérios transversais de avanço de ondas.

2. **Backlog Detalhado em Markdown (Especificação Completa das Issues):**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md)
   * **Linhas 1613–1738:** Seção `E7 — Dados, recuperação e continuidade` (Issues `V1-701` a `V1-705`).
   * **Linhas 1741–1943:** Seção `E8 — QA, segurança e avaliação` (Issues `V1-801` a `V1-808`).
   * **Linhas 2050–2063:** Diagrama textual de dependências críticas e caminho crítico mínimo do sistema.

3. **Matriz em CSV do Backlog Mestre:**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv)
   * **Linha 326 (`V1-701`):** Schema, migrações e RLS do PostgreSQL.
   * **Linha 331 (`V1-702`):** Backup, restore e DR de PostgreSQL, MinIO e Qdrant.
   * **Linha 336 (`V1-703`):** Retenção, particionamento e arquivamento de histórico.
   * **Linha 341 (`V1-704`):** Otimização do Qdrant, PostgreSQL e reindexação sem downtime.
   * **Linha 346 (`V1-705`):** Monitoramento DBA e runbooks.
   * **Linhas 352–388 (`V1-801` a `V1-808`):** Suíte completa de QA, segurança, evals de IA, carga, idempotência, red-team, acessibilidade e gate sistêmico de release.

---

## 2. Conceito de Transversalidade do Épico E8

De acordo com o **Índice de Execução** em [`Indice de Execução da V1.0 - Domus Corp.md:L208`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md#L208):

> *"O E8 é transversal: V1-801 acompanha E0; V1-802 acompanha E1/E3; V1-803 acompanha E4/E5; V1-805 acompanha E6. Não se deve esperar até o fim para descobrir que os contratos, ACLs ou respostas não são testáveis."*

Embora as suítes de teste de E8 sejam iniciadas de forma incremental ao longo das Ondas 0 a 6, é na **Onda 7** que todas se consolidam, combinadas com a execução avançada de **Carga/Chaos (`V1-804`)**, **Red-Team (`V1-806`)**, **Acessibilidade/UI Guardrails (`V1-807`)** e culminam no **Gate Sistêmico de Release (`V1-808`)**.

---

## 3. Diagrama do Fluxo de Execução da Onda 7

```text
===========================================================================================================
                                       FLUXO DE EXECUÇÃO — ONDA 7
===========================================================================================================

  [ BLOCO 1: Endurecimento E7 Final ]
  ├── 1. V1-704 (Otimização Qdrant/Postgres & Reindexação) [Line 1690]
  ├── 2. V1-702 (Backup, Restore e Disaster Recovery)     [Line 1640]
  ├── 3. V1-703 (Retenção, Particionamento e Arquivo)    [Line 1665]
  └── 4. V1-705 (Monitoramento de Saúde DBA & Runbooks)   [Line 1715]
            │
            ▼
  [ BLOCO 2: Suítes de Validação Específica E8 ]
  ├── 5. V1-803 (Evals de Groundedness, Citações e IA)     [Line 1793]
  ├── 6. V1-805 (Testes de Idempotência do Action Gateway) [Line 1843]
  └── 7. V1-807 (Acessibilidade, Usabilidade e UI Guard)   [Line 1893]
            │
            ▼
  [ BLOCO 3: Testes de Estresse, Concorrência e Red-Team ]
  ├── 8. V1-804 (Testes de Carga, Concorrência e Chaos)    [Line 1818]
  └── 9. V1-806 (Red-Team, Injeção e Threat Validation)    [Line 1868]
            │
            ▼
  [ BLOCO 4: Encerramento e Gate Sistêmico (Gate G7) ]
  └── 10. V1-808 (Gate Sistêmico e Prontidão de Release)  [Line 1919] ──► Autoriza Onda 8 (E9 / Piloto)
```

---

## 4. Detalhamento Passo a Passo da Ordem de Execução

### ETAPA 1: Endurecimento da Infraestrutura de Dados, Continuidade e Performance (E7 Final)

Nesta primeira etapa da Onda 7, finalizam-se as otimizações e garantias de recuperação do PostgreSQL, Qdrant e MinIO.

#### 1º Passo — `V1-704`: Otimizar Qdrant, PostgreSQL e reindexação sem downtime
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1690-1714`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1690-L1714) | [`Backlog_V1_DomusCorp.csv:L341`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L341)
* **Tipo / Marco:** Performance / Retrieval | `M2–M5` | Prioridade: `P0` (baseline) / `P1` (avançado)
* **Dependências Prévias:** `V1-410` (Qdrant & Vector Search), `V1-411` (Hybrid Retrieval), `V1-701` (Schema PostgreSQL).
* **Por que executar primeiro nesta fase:** Antes de executar testes de carga ou evals de qualidade, a infraestrutura de busca híbrida (HNSW, full-text) precisa passar por benchmark de performance (p50/p95) e ter seu mecanismo de reindexação sem downtime estabelecido.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-704: Otimizar Qdrant, PostgreSQL e reindexação sem downtime conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1690-1714. Garantir benchmarks de performance (p50/p95), indexação HNSW, full-text search, payload filters, suporte a reindexação paralela com zero downtime, cutover/rollback sem perda de estado do retrieval, preservando RLS e ACLs.
  ```

#### 2º Passo — `V1-702`: Implementar backup, restore e disaster recovery de PostgreSQL, MinIO e Qdrant
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1640-1664`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1640-L1664) | [`Backlog_V1_DomusCorp.csv:L331`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L331)
* **Tipo / Marco:** Infraestrutura / Continuidade | `M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-403` (Storage de Artefatos), `V1-701` (Schema PostgreSQL), `V1-902` (HA/Failover).
* **Por que executar neste ponto:** Estabelece rotinas de backup criptografado e plano de Disaster Recovery (DR) validando RTO/RPO para transações, objetos imutáveis e coleção vetorial antes do estresse de carga.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-702: Implementar backup, restore e disaster recovery de PostgreSQL, MinIO e Qdrant conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1640-1664. Criar rotinas automatizadas de backup criptografado, verificação de integridade/checksum, retenção isolada, plano de Disaster Recovery (DR) validando RTO/RPO para banco relacional, objetos imutáveis e coleção vetorial com alertas de falha.
  ```

#### 3º Passo — `V1-703`: Implementar retenção, particionamento e arquivamento de histórico
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1665-1689`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1665-L1689) | [`Backlog_V1_DomusCorp.csv:L336`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L336)
* **Tipo / Marco:** Dados / Privacidade / Performance | `M5` | Prioridade: `P1`
* **Dependências Prévias:** `V1-306` (Ledger de Custos), `V1-308` (Auditoria Correlacionada), `V1-701` (Schema PostgreSQL), `V1-702` (Backup & DR).
* **Por que executar neste ponto:** Com o backup e o schema consolidados, configura-se o particionamento automático de tabelas de alto volume (auditoria e ledger) e expurgo/arquivamento de histórico.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-703: Implementar retenção, particionamento e arquivamento de histórico conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1665-1689. Configurar particionamento automático por range/data de tabelas de alto volume (auditoria e ledger de custos), rotinas de purga/arquivamento seguro de histórico expirado mantendo rastreabilidade mínima e consulta assíncrona/auditada de dados arquivados.
  ```

#### 4º Passo — `V1-705`: Monitorar saúde do banco e manter runbooks DBA
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1715-1739`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1715-L1739) | [`Backlog_V1_DomusCorp.csv:L346`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L346)
* **Tipo / Marco:** Operação / Observabilidade | `M5` | Prioridade: `P1`
* **Dependências Prévias:** `V1-701` (Schema PostgreSQL), `V1-702` (Backup & DR), `V1-901` (Observabilidade e Alertas SRE).
* **Por que executar neste ponto:** Conclui a trilha de E7 disponibilizando dashboards de saúde do banco (locks, pool de conexões, I/O) e runbooks operacionais instrumentados para o time de DBA e SRE.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-705: Monitorar saúde do banco e manter runbooks DBA conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1715-1739. Instrumentar coleta de métricas/traces para locks, deadlocks, queries lentas, saturação de connection pools, I/O e disponibilidade de Qdrant, agregando mecanismos de backpressure (shedding) no gateway e documentando runbooks operacionais seguros.
  ```

---

### ETAPA 2: Suítes Específicas de Validação de Domínio e Experiência de Usuário (E8)

Com a infraestrutura de dados otimizada e segura, aplicam-se as suítes de validação automatizada de qualidade de IA, integridade de ações e design system/acessibilidade.

#### 5º Passo — `V1-803`: Criar framework de avaliação de groundedness, citações e qualidade
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1793-1817`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1793-L1817) | [`Backlog_V1_DomusCorp.csv:L362`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L362)
* **Tipo / Marco:** QA / Avaliação de IA | `M3–M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-411` (Retrieval Híbrido), `V1-501` (Grounding & Provenance), `V1-502` (Estados Semânticos), `V1-505` (Briefings).
* **Por que executar neste ponto:** Roda o pipeline de evals sobre datasets versionados para aferir Recall@K, precisão de evidências, citações corretas e ausência de alucinações antes das baterias de estresse de carga.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-803: Criar framework de avaliação de groundedness, citações e qualidade conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1793-1817. Construir pipeline automatizado de evals sobre datasets versionados para calcular Recall@K, precisão de evidência, validade de citações, groundedness, tratamento de ausência de evidência/estados semânticos e identificação de regressões entre versões de modelos/prompts.
  ```

#### 6º Passo — `V1-805`: Testar idempotência, aprovação e estados inconclusivos do Action Gateway
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1843-1867`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1843-L1867) | [`Backlog_V1_DomusCorp.csv:L372`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L372)
* **Tipo / Marco:** QA / Sistema / Confiabilidade | `M4–M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-604` (Action Gateway), `V1-605` (Action Review Dialog), `V1-606` (Idempotência e Recibos), `V1-607` e `V1-608` (Conectores).
* **Por que executar neste ponto:** Garante empiricamente que chamadas de escrita externa via Action Gateway exigem aprovação explícita, tratam estados inconclusivos e impedem duplicidade sob retries ou timeouts.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-805: Testar idempotência, aprovação e estados inconclusivos do Action Gateway conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1843-1867. Desenvolver suíte de testes de integração e resiliência cobrindo validação de aprovação explícita de ações externas, deduplicação por chave idempotente sob retries/replays/timeouts, e tratamento seguro de respostas ambíguas/inconclusivas.
  ```

#### 7º Passo — `V1-807`: Validar acessibilidade, usabilidade e compreensão de risco
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1893-1918`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1893-L1918) | [`Backlog_V1_DomusCorp.csv:L382`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L382)
* **Tipo / Marco:** QA / UX / Acessibilidade | `M2–M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-205` a `V1-207` (Interface Desktop/Chat), `V1-412` (Knowledge Workbench), `V1-510` (Intelligence Workbench), `V1-605` (Action Review).
* **Por que executar neste ponto:** Valida acessibilidade (axe-core, Playwright), navegação por teclado/leitor de tela, temas (`light`/`dark`), densidades (`default`/`compact`) e aplica o **Color Guard** automatizado (proibição do uso de Indigo/Violeta em componentes interativos `Button`).
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-807: Validar acessibilidade, usabilidade e compreensão de risco conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1893-1918. Implementar testes automatizados de acessibilidade WCAG (axe-core e Playwright), validação de navegação por teclado/leitor de tela nos temas light/dark e densidades default/compact, suíte de compreensão de risco de ações e o guardrail Color Guard (proibição de Indigo/Violeta em Buttons).
  ```

---

### ETAPA 3: Testes Adversariais, Estresse, Concorrência e Red-Team (E8 Avançado)

Com as validações funcionais e de experiência concluídas, a aplicação é submetida a cenários de alta concorrência e testes de penetração/ataque.

#### 8º Passo — `V1-804`: Executar testes de carga, concorrência e resiliência
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1818-1842`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1818-L1842) | [`Backlog_V1_DomusCorp.csv:L367`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L367)
* **Tipo / Marco:** QA / Performance / SRE | `M1–M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-305` (Reserva Atômica de Budget), `V1-307` (Gateway Fastify), `V1-410` (Qdrant), `V1-701` (PostgreSQL), `V1-901` (Observabilidade).
* **Por que executar neste ponto:** Submete o sistema à carga concorrente massiva de chat, ingestão e busca vetorial para comprovar resiliência, comportamento do ledger de budget sob disputa e observância aos SLOs definidos.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-804: Executar testes de carga, concorrência e resiliência conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1818-1842. Criar e executar cenários de carga simultânea de chat, retrieval e ingestão para validar SLOs de p95 e latência, concorrência na reserva atômica de saldo do ledger de budget, e resiliência fail-closed diante de falhas induzidas de dependências (chaos engineering).
  ```

#### 9º Passo — `V1-806`: Executar red-team, varredura de segredos e threat validation
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1868-1892`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1868-L1892) | [`Backlog_V1_DomusCorp.csv:L377`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L377)
* **Tipo / Marco:** Segurança / Red Team | `M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-304` (Vault & Credentials), `V1-406` (PII & Masking), `V1-603` (Guardrails & Sandbox), `V1-802` (Suíte de Policy), `V1-803` (Framework de Evals).
* **Por que executar neste ponto:** Execução de ataques adversariais complexos (prompt injection indireto, tentativas de tenant escape, exfiltração de dados, abuso de ferramentas e varredura automatizada contra vazamento de segredos).
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-806: Executar red-team, varredura de segredos e threat validation conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1868-1892. Desenvolver suíte automatizada de testes adversariais cobrindo injeção de prompt direta e indireta, tentativas de tenant escape e desvio de alçada/policy, e varredura rigorosa de vazamento de segredos (API keys, tokens OAuth, PII) em logs, artefatos e contêineres.
  ```

---

### ETAPA 4: Encerramento da Onda 7 e Consolidação do Gate Sistêmico (Gate G7)

#### 10º Passo — `V1-808`: Executar gate sistêmico de qualidade e prontidão de release
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1919-1943`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1919-L1943) | [`Backlog_V1_DomusCorp.csv:L388`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L388)
* **Tipo / Marco:** QA / Release Gate | `M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-801` a `V1-807`, `V1-702` (Restore/DR), `V1-903` (Electron Signature).
* **Função Final:** Consolida todo o dossiê de evidências do **Gate G7** ([`Indice de Execução da V1.0 - Domus Corp.md:L212`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md#L212)).
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-808: Executar gate sistêmico de qualidade e prontidão de release conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1919-1943. Consolidar o pipeline de validação e compilação do dossiê automatizado de evidências do Gate G7, verificando a matriz de rastreabilidade (RF → Issue → Teste), 100% das evidências P0, relatórios de evals, axe/Playwright, Color Guard e assinar a declaração Go/No-Go para autorização da Onda 8.
  ```

---

## 5. Critérios Oficiais de Aprovação do Gate G7

Conforme definido em [`Indice de Execução da V1.0 - Domus Corp.md:L212`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md#L212), a Onda 7 é concluída com sucesso e a **Onda 8 (E9: Produção, release e piloto)** só é autorizada quando os seguintes critérios forem atendidos:

1. **Evidência P0:** Todas as issues marcadas como P0 possuem evidência técnica e funcional auditada sem pendências abertas.
2. **Resultados de Red-Team:** Testes adversariais (`V1-806`) não registram achados de severidade crítica ou alta sem decisão executiva formal de mitigação.
3. **Qualidade e SLOs:** Limiares de groundedness (`V1-803`) e SLOs de latência/disponibilidade (`V1-804`) atingem as metas estabelecidas.
4. **DR e Restauração:** O procedimento de restore (`V1-702`) foi executado e validado em ambiente de staging.
5. **Idempotência de Ação:** O Action Gateway (`V1-805`) passou com sucesso por testes de retry, replay e resposta ambígua.
6. **Acessibilidade e Design System:** Acessibilidade (axe/Playwright), testes de compreensão de risco (`V1-807`), snapshots em visual `light`/`dark` e `default`/`compact`, e o guardrail de cores de botão (*Color Guard*) foram 100% aprovados no CI.

---

## 6. Rastreabilidade com a Onda 8 (Produção e Piloto)

Conforme a cadeia crítica explicitada em [`Backlog_V1_DomusCorp.md:L2061`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L2061):

$$\text{V1-702} \longrightarrow \text{V1-901} \longrightarrow \text{V1-902} \longrightarrow \text{V1-808} \longrightarrow \text{V1-904}$$

O encerramento formal de `V1-808` na Onda 7 é a **condição blocking obrigatoria** para a liberação de tráfego real no piloto da Onda 8 (`V1-904`), garantindo que nenhum ambiente produtivo receba usuários sem o devido suporte de observabilidade, HA e qualidade homologada.
