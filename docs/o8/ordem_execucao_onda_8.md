# Análise Detalhada da Sequência de Execução — Onda 8: E9 (Operação, Produção, Release e Piloto)

Este documento apresenta o detalhamento exato da ordem de execução, dependências e critérios de avanço para as **issues da Onda 8 (E9: Operação, produção, release e piloto)** do projeto **Domus Corp v1.0**.

Toda a análise contida neste documento foi extraída e correlacionada diretamente da documentação oficial do repositório, com referências explícitas aos arquivos fonte e suas respectivas faixas de linhas.

---

## 1. Fontes de Verdade e Arquivos de Referência

A arquitetura de planejamento e governança do projeto está estruturada nos seguintes arquivos principais:

1. **Índice de Execução da V1.0:**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice de Execução da V1.0 - Domus Corp.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md)
   * **Linha 33:** Definição da Onda 8 na Tabela Executiva (`Onda 8 — Produção e piloto | E9 + D6 | G8 — piloto aprovado ou rollback`).
   * **Linhas 214–231:** Detalhamento específico da Onda 8 — E9 (Produção, release e piloto), especificando a sequência de execução das issues (`V1-901` a `V1-904`), o pré-requisito estrito do **Gate G7** e as diretrizes de rollout por anéis.
   * **Linhas 259–270:** Critérios transversais de avanço entre ondas (Contrato, Segurança, Operação e Produto).
   * **Linhas 270–276:** Caminho crítico técnico mínimo (`E0 → E1/E7-inicial → E3 → E4 → E5 → E6 → E7-final/E8 → E9`).

2. **Backlog Detalhado em Markdown (Especificação Completa das Issues):**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md)
   * **Linhas 1946–2048:** Seção `E9 — Operação, release e piloto` (Issues `V1-901` a `V1-904`).
   * **Linhas 2050–2063:** Diagrama textual de dependências críticas e caminho crítico mínimo do sistema (`V1-702 → V1-901 → V1-902 → V1-808 → V1-904`).

3. **Matriz em CSV do Backlog Mestre:**
   * **Caminho do Arquivo:** [`/home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv)
   * **Linha 395 (`V1-901`):** Observabilidade, SLOs e resposta a incidentes.
   * **Linha 400 (`V1-902`):** Alta disponibilidade, degradação segura e recuperação do gateway.
   * **Linha 405 (`V1-903`):** Empacotamento, assinatura e atualização do cliente Electron por anéis.
   * **Linha 410 (`V1-904`):** Piloto controlled, suporte e rollout por ondas.

---

## 2. Conceito e Pré-requisitos de Transição para a Onda 8

De acordo com o **Índice de Execução** em [`Indice de Execução da V1.0 - Domus Corp.md:L218`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md#L218):

> *"E9 somente deve receber tráfego real depois de G7."*

A **Onda 8** representa o estágio final do ciclo de lançamento do Domus Corp v1.0. Ela é composta estritamente pelas issues do épico **E9 (Operação, release e piloto)**. Nenhuma requisição de produção ou usuário de piloto real pode interagir com o sistema sem que todas as salvaguardas de dados (E7) e os gates sistêmicos de QA/Red-Team/Acessibilidade (E8 / Gate G7) tenham sido 100% homologados.

A execução na Onda 8 garante que a infraestrutura esteja totalmente instrumentada para observabilidade em tempo real, que as falhas sejam tratadas de forma resiliente e *fail-closed*, que o cliente Desktop chegue assinado e verificável aos usuários, e que a expansão de uso ocorra em anéis progressivos controlados com capacidade imediata de contenção ou rollback.

---

## 3. Diagrama do Fluxo de Execução da Onda 8

```text
===========================================================================================================
                                       FLUXO DE EXECUÇÃO — ONDA 8
===========================================================================================================

  [ PRÉ-REQUISITO MANDATÓRIO ]
  └── Aprovação Formal do Gate G7 (V1-808) [Backlog_V1_DomusCorp.md:L1919-1943]
            │
            ▼
  [ BLOCO 1: Observabilidade e Telemetria Operacional ]
  └── 1. V1-901 (Observabilidade, SLOs e Resposta a Incidentes)      [Line 1948]
            │
            ▼
  [ BLOCO 2: Alta Disponibilidade e Degradação Segura ]
  └── 2. V1-902 (HA, Degradação Segura e Recuperação do Gateway)     [Line 1974]
            │
            ▼
  [ BLOCO 3: Empacotamento e Distribuição Desktop Segura ]
  └── 3. V1-903 (Empacotar, Assinar e Atualizar Cliente Electron)    [Line 1998]
            │
            ▼
  [ BLOCO 4: Operação do Piloto, Suporte e Rollout por Ondas ]
  └── 4. V1-904 (Piloto Controlado, Suporte e Rollout por Ondas)     [Line 2023] ──► Decisão Executiva (Gate G8)
```

---

## 4. Detalhamento Passo a Passo da Ordem de Execução

### ETAPA 1: Instrumentação de Observabilidade, Telemetria e Alertas (SRE & Operação)

Nesta etapa inicial da Onda 8, garante-se a visibilidade ponta a ponta sobre o funcionamento do gateway, barramento de políticas, orçamento, busca vetorial, ingestão, workers e conectores MCP.

#### 1º Passo — `V1-901`: Implantar observabilidade, SLOs e resposta a incidentes
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1948-1973`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1948-L1973) | [`Backlog_V1_DomusCorp.csv:L395`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L395)
* **Tipo / Marco:** SRE / Observabilidade | `M1–M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-301` (Gateway Fastify & Contratos), `V1-308` (Auditoria Correlacionada), `V1-411` (Retrieval Híbrido), `V1-609` (Telemetry & Action Receipts).
* **Por que executar primeiro nesta fase:** Nenhuma carga de piloto real pode ser disponibilizada sem que logs, traces e métricas (OpenTelemetry) estejam configurados com correlação de `request_id`, redação automatizada de PII/segredos, monitoramento de SLOs e alertas de incidentes para as equipes de SRE e Product Ops.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-901: Implantar observabilidade, SLOs e resposta a incidentes conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1948-1973. Instrumentar OpenTelemetry com correlação de request_id sem conteúdo sensível ou segredos nos logs, definir dashboards e alertas de violação de SLOs para gateway, streaming, retrieval, ingestão e ações, e implementar procedimentos auditáveis de resposta a incidentes e contenção.
  ```

---

### ETAPA 2: Alta Disponibilidade, Degradação Segura e Resiliência de Gateway (Infraestrutura & SRE)

Com o ecossistema de métricas e rastreabilidade ativo, o ambiente de produção/staging é configurado para resistir a falhas infraestruturais sem comprometer as regras de segurança.

#### 2º Passo — `V1-902`: Implementar alta disponibilidade, degradação segura e recuperação do gateway
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1974-1997`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1974-L1997) | [`Backlog_V1_DomusCorp.csv:L400`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L400)
* **Tipo / Marco:** Infraestrutura / SRE | `M5` | Prioridade: `P0`
* **Dependências Prévias:** `V1-301` (Gateway Core), `V1-307` (Gateway Fastify), `V1-308` (Auditoria), `V1-702` (Backup, Restore & DR), `V1-901` (Observabilidade).
* **Por que executar neste ponto:** Com a observabilidade implantada no passo anterior, valida-se o comportamento de Alta Disponibilidade (HA) do gateway, failover entre instâncias stateless, probes de saúde e o princípio fundamental de *fail-closed*: caso componentes críticos (Vault, Policy Engine, Budget Ledger) fiquem indisponíveis, as operações de IA e escrita externa devem ser bloqueadas imediatamente, impedindo qualquer bypass de segurança.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-902: Implementar alta disponibilidade, degradação segura e recuperação do gateway conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1974-1997. Configurar failover entre instâncias stateless preservando correlação e segredos, garantir comportamento fail-closed em caso de perda de autorização/Vault/budget/policy, e validar o plano de recuperação do gateway atendendo metas de RTO/RPO sem causar bypass de segurança.
  ```

---

### ETAPA 3: Empacotamento Assinado, Atualização e Distribuição Desktop (Release & DevOps)

Com os serviços backend prontos em modo de alta disponibilidade e observáveis, constrói-se e assina-se o cliente oficial de usuário.

#### 3º Passo — `V1-903`: Empacotar, assinar e atualizar o cliente Electron por anéis
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L1998-2022`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L1998-L2022) | [`Backlog_V1_DomusCorp.csv:L405`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L405)
* **Tipo / Marco:** Release / Desktop | `M5` | Prioridade: `P1`
* **Dependências Prévias:** `V1-201` (Shell Electron), `V1-206` (Estado/Sessão Local), `V1-007` (CI/CD Pipeline), `V1-808` (Gate G7 Sistêmico).
* **Por que executar neste ponto:** Garante que o artefato binário distribuído aos usuários do piloto seja criptograficamente assinado, possua manifesto SBOM, suporte atualização progressiva por anéis (canary/interno/piloto), obrigue versão mínima de segurança e permita rollback sem corromper ou apagar o armazenamento local do cliente.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-903: Empacotar, assinar e atualizar o cliente Electron por anéis conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L1998-2022. Automatizar o packaging assinado com verificação de checksum e SBOM, configurar servidor de atualizações com suporte a anéis de rollout, versão mínima obrigatória, migração de dados e rollback sem apagar a memória local do usuário.
  ```

---

### ETAPA 4: Operação do Piloto Controlado, Suporte e Avaliação de Expansão (Produto & CS)

Na etapa final da Onda 8, libera-se a utilização real para grupos controlados de usuários corporativos.

#### 4º Passo — `V1-904`: Conduzir piloto controlado, suporte e rollout por ondas
* **Localização no Backlog:** [`Backlog_V1_DomusCorp.md:L2023-2048`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L2023-L2048) | [`Backlog_V1_DomusCorp.csv:L410`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.csv#L410)
* **Tipo / Marco:** Produto / Operação / Adoção | `M5` | Prioridade: `P1`
* **Dependências Prévias:** `V1-001` (Escopo & Arquitetura), `V1-412` (Knowledge Workbench), `V1-508` (Briefings), `V1-510` (Intelligence Workbench), `V1-808` (Gate G7), `V1-902` (HA & Failover), `V1-903` (Electron Release).
* **Por que executar por último:** É o ápice do projeto v1.0. O piloto é iniciado em escopo reduzido (poucos workspaces, fontes de dados homologadas e owners estabelecidos). Monitora-se em tempo real a adoção, custo por tarefa, groundedness, latência e eficácia do suporte. Caso haja qualquer regressão, mecanismos de contenção (desligar conectores, reverter políticas, reduzir anel) são acionados antes de qualquer decisão executiva de expansão.
* **Prompt para Execução (Superpowers):**
  ```text
  /superpowers:test-driven-development implementar V1-904: Conduzir piloto controlado, suporte e rollout por ondas conforme a especificação em .docs/research/backlog/Backlog_V1_DomusCorp.md:L2023-2048. Estruturar o plano de piloto com grupos, fontes, owners e canais de suporte, instrumentar telemetria de adoção, custo por tarefa, groundedness e taxa de bloqueio, e estabelecer a matriz de kill-switches (desligar connector, reverter policy, reduzir anel) para a decisão executiva de expansão (Gate G8).
  ```

---

## 5. Critérios Oficiais de Aprovação da Onda 8 e Avaliação de Expansão (Gate G8)

Conforme estabelecido em [`Indice de Execução da V1.0 - Domus Corp.md:L233`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md#L233), a Onda 8 é concluída com sucesso e a **Decisão Executiva de Expansão (Gate G8)** é alcançada quando os seguintes critérios forem estritamente atendidos:

1. **Observabilidade Sem Redação Incompleta:** 100% dos serviços (gateway, retrieval, ingestão, workers, MCP) operam com OpenTelemetry ativo, traces correlacionados por `request_id` e zero ocorrências de vazamento de segredos, PII ou dados confidenciais nos logs.
2. **Resiliência e Fail-Closed Comprovados:** Testes de failover e destruição de instâncias stateless comprovam que o tráfego se recupera sem perda de estado; quedas no Vault, Budget Ledger ou Policy Engine resultam no bloqueio imediato das operações (*fail-closed*), sem bypass de segurança.
3. **Distribuição Electron Homologada:** Binários do cliente Electron estão empacotados, assinados digitalmente, validados com checksum/SBOM e o mecanismo de atualização automática por anéis funciona com suporte a versão mínima e rollback testado.
4. **Métricas de Piloto no Alvo:** O piloto controlado atinge as metas de groundedness, tempo de resposta (SLOs p95), custo por tarefa e aprovação de usabilidade/compreensão de risco sem ocorrência de incidentes de segurança P0.
5. **Decisão Go/No-Go Executiva (Gate G8):** O comitê executivo (Product, Security, SRE e Business Owners) assina a ata de encerramento do piloto, aprovando a expansão da escala de rollout ou determinando o acionamento de rollback planejado sem perda de evidências ou dados.

---

## 6. Rastreabilidade e Cadeia Crítica Final da Liberação

A cadeia técnica crítica para liberação de tráfego de produção do Domus Corp v1.0, conforme descrita em [`Backlog_V1_DomusCorp.md:L2061`](file:///home/mmc/00_code/domus-app-suite/domus-corp/.docs/research/backlog/Backlog_V1_DomusCorp.md#L2061), é representada por:

$$\text{V1-702} \longrightarrow \text{V1-901} \longrightarrow \text{V1-902} \longrightarrow \text{V1-808} \longrightarrow \text{V1-904}$$

Complementada pelo canal de distribuição Desktop:

$$(\text{V1-201}, \text{V1-206}, \text{V1-007}, \text{V1-808}) \longrightarrow \text{V1-903} \longrightarrow \text{V1-904}$$

O cumprimento rigoroso desta sequência assegura que o **Domus Corp v1.0** seja entregue como uma solução pronta para produção, altamente disponível, resiliente, segura e auditada de ponta a ponta.
