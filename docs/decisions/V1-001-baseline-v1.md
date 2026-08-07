# V1-001 — Baseline de escopo, objetivos e critérios de saída da v1.0

**Marco:** M0 — Fundação  
**Status:** Aprovado  
**Data:** 07/08/2026  
**Decisor:** Marcos Wasem  
**Papéis do decisor:** Product Owner, administrador do sistema, owner dos domínios e validador do piloto

## 1. Fontes de autoridade

Esta decisão aplica, sem substituir, as seguintes fontes:

1. [`PRD/ERS — Domus Corp`](../../.docs/research/PRD_ERS_%20Domus%20Corp%20%E2%80%94%20Plataforma%20de%20Intelig%C3%AAncia%20Corporativa%20com%20IA.md)
2. [`ADR-001 — Arquitetura Domus Corp`](../../.docs/research/ADR_001_ArquiteturaDomusCorp.md)
3. [`Backlog Mestre de Issues — Domus Corp v1.0`](../../.docs/research/backlog/Backlog_V1_DomusCorp.md)
4. [`Índice de Execução da v1.0`](../../.docs/research/backlog/Indice%20de%20Execu%C3%A7%C3%A3o%20da%20V1.0%20-%20Domus%20Corp.md)

Em caso de conflito, PRD, ADRs aprovados e decisões humanas registradas prevalecem sobre documentos derivados. Esta baseline não aprova a arquitetura proposta no ADR-001; essa aprovação pertence à V1-002.

## 2. Ata da decisão M0 — escopo de produto

Fica aprovada para a v1.0 a categoria **Plataforma de Inteligência Corporativa com IA**, tendo o harness corporativo como fundação de governança e execução.

A v1.0 deve entregar memória corporativa governada, inteligência fundamentada e ações controladas, sem substituir os sistemas transacionais da organização. Proveniência, vigência, autorização, classificação, custo, auditoria e responsabilidade humana são partes obrigatórias do produto.

## 3. Escopo do piloto

### 3.1. Domínios e responsabilidades

| Domínio | Owner provisório | Validador provisório |
|---|---|---|
| Produto | Marcos Wasem | Marcos Wasem |
| RH | Marcos Wasem | Marcos Wasem |
| Processos | Marcos Wasem | Marcos Wasem |
| Operações | Marcos Wasem | Marcos Wasem |
| Financeiro | Marcos Wasem | Marcos Wasem |

A concentração de papéis é provisória e deve poder ser alterada pela matriz de mudanças. A plataforma não deve codificar essa concentração como regra permanente de autorização.

### 3.2. Fontes iniciais previstas

Cada domínio poderá configurar:

- pastas locais;
- Google Drive.

Essas são categorias de fontes previstas, não caminhos, contas ou coleções predefinidos. A ativação ocorrerá durante o uso da ferramenta e exigirá configuração explícita da base de conhecimento.

Cada fonte deve registrar no mínimo owner, escopo, classificação, finalidade, SLA, estado, autorização e mecanismo de revogação. A previsão dessas fontes não autoriza ingestão universal ou automática.

### 3.3. Ingestão completa e governada

Todas as classificações de conteúdo podem ser elegíveis quando a autoridade efetiva permitir. A ingestão exige:

1. seleção e confirmação explícita do usuário;
2. validação server-side de identidade, tenant, workspace, policy e autorização;
3. registro auditável da fonte, escopo, classificação declarada, finalidade, decisão e instante;
4. bloqueio ou quarentena de conteúdo sem autorização, fora da policy ou sem classificação válida;
5. possibilidade de revogar a fonte e interromper sua sincronização;
6. telemetria e auditoria que não reproduzam conteúdo sensível desnecessariamente.

Credenciais, tokens, chaves privadas e segredos técnicos não são conteúdo elegível para ingestão. Confirmação do usuário não amplia sua alçada nem substitui policy corporativa.

### 3.4. SLA de frescor

O SLA será um parâmetro obrigatório da base de conhecimento ou fonte, configurado pelo administrador entre:

- diário;
- semanal;
- mensal.

Criação e alteração do SLA devem ser auditadas. Fonte fora do SLA deve apresentar estado explícito de obsolescência ou revisão pendente, conforme os contratos definidos nas issues posteriores.

## 4. Limites de autonomia

1. Consulta, busca, síntese e comparação podem ocorrer automaticamente dentro da policy efetiva.
2. Ingestão requer seleção e confirmação explícita.
3. Recomendação ou conteúdo derivado não se torna decisão institucional automaticamente.
4. Toda ação externa requer pré-visualização e confirmação.
5. Ações destrutivas, irreversíveis ou de alto risco requerem aprovação explícita adicional.
6. Escrita externa e ingestão agendada não operarão autonomamente no piloto.
7. Falha de identidade, policy, autorização, budget ou auditoria bloqueia a operação.

## 5. Provedores previstos

A v1.0 poderá oferecer adapters para:

- OpenAI;
- Anthropic;
- Google;
- Perplexity.

A inclusão nesta lista não habilita automaticamente todo modelo ou API do fornecedor. Cada capacidade depende de configuração administrativa, credencial exclusivamente server-side, catálogo permitido, policy, budget, classificação, redaction, auditoria, política de retenção e testes de falha.

## 6. Ambientes e dados

Devem existir ambientes separados de desenvolvimento, teste, staging e produção, com isolamento de configuração, identidade, credenciais e dados.

Dados e credenciais reais somente podem entrar em ambiente explicitamente autorizado. Protótipos e testes não recebem autorização implícita para usar dados corporativos reais.

## 7. Critérios de sucesso e saída

Os limiares definidos no PRD/ERS são a baseline quantitativa da v1.0. Em especial:

- zero exposição de segredo;
- zero bypass de policy, ACL ou budget nos testes aprovados;
- zero acesso cross-tenant ou cross-workspace;
- proveniência em pelo menos 99,9% das respostas elegíveis;
- validade de citação e groundedness de pelo menos 95%;
- pelo menos 95% das fontes críticas dentro do SLA;
- cobertura de pelo menos 80% das perguntas do piloto;
- zero duplicidade de ação ou custo;
- custos reconciliáveis por usuário, workspace, provedor e modelo;
- toda ação liberada com confirmação, idempotência e recibo;
- usuários capazes de distinguir fato, inferência, conflito, obsolescência, bloqueio e ausência de evidência;
- metas de latência, disponibilidade, recuperação, telemetria e rollback conforme o PRD.

### 7.1. Entrada do piloto

Aplicam-se integralmente os critérios de entrada do piloto definidos no PRD. Esta baseline não autoriza o início do piloto antes dos gates técnicos, de segurança e operação das ondas posteriores.

### 7.2. Saída do piloto

Aplicam-se integralmente os critérios de saída do piloto definidos no PRD. A expansão depende de evidência e decisão formal, não apenas de calendário ou demonstração manual.

## 8. Fora do escopo da v1.0

1. Substituir ERP, CRM, RH ou outros sistemas transacionais.
2. Ingerir conteúdo indiscriminadamente, sem seleção, confirmação, classificação e policy.
3. Permitir autonomia irrestrita ou ação externa sem confirmação.
4. Permitir egress direto para providers ou MCPs a partir do desktop ou de workers Python.
5. Adotar banco de grafo dedicado antes de evidência que justifique novo ADR.
6. Misturar memória pessoal local com conhecimento corporativo normativo.
7. Reter integralmente, por padrão, prompts, respostas, reuniões ou conteúdo sensível.
8. Introduzir terceira linguagem de produção sem novo ADR.
9. Prometer absorção completa ou automática do conhecimento da organização.
10. Incluir novos domínios, conectores ou capacidades sem decisão pela matriz de mudanças.

## 9. Protocolo de desenvolvimento assistido por IA

Claude, Gemini, Codex e Kimi podem atuar como copilotos, sujeitos às seguintes regras:

1. recebem somente o menor contexto necessário e nenhum segredo ou dado real não autorizado;
2. toda saída é proposta e exige validação humana;
3. um modelo não aprova sua própria saída;
4. mudanças P0 exigem testes proporcionais ao risco e aprovação humana explícita;
5. nenhum modelo possui acesso autônomo a produção, Vault, banco produtivo ou escrita externa;
6. cada issue registra contexto, modelos utilizados, decisões, alterações, testes, limitações e revisão;
7. M0 e demais gates críticos usam checkpoints humanos.

## 10. Governança unipessoal

O projeto possui atualmente um único responsável humano. Marcos Wasem acumula provisoriamente produto, administração, ownership e validação.

Para reduzir o risco de concentração:

- decisões e evidências permanecem rastreáveis;
- revisões de aderência e qualidade são realizadas separadamente;
- IA pode executar revisão técnica adversarial, sem ser caracterizada como revisora humana;
- decisões críticas recebem uma segunda análise em contexto separado;
- checklists, testes negativos e evidência verificável substituem aprovação informal;
- riscos residuais e exceções exigem aceite explícito de Marcos Wasem.

A ausência de segregação de funções é risco conhecido. A implementação não deve transformar essa condição provisória em modelo fixo de permissões.

## 11. Matriz de mudanças

Qualquer proposta de alteração da baseline deve registrar:

| Campo | Conteúdo obrigatório |
|---|---|
| Identificação | Título, data, solicitante e responsável pela decisão |
| Justificativa | Problema ou oportunidade que motivou a mudança |
| Impacto | Escopo, prazo, custo, risco e dependências |
| Rastreabilidade | PRD, ADR, contratos e issues afetados |
| Decisão | Incluir, adiar ou rejeitar |
| Entrega | Owner, marco e critérios de aceite, quando incluída |
| Reversibilidade | Rollback ou razão documentada para irreversibilidade |
| Arquitetura | Necessidade de novo ADR quando um invariante for alterado |

Mudanças não aprovadas não modificam a baseline nem entram na implementação.

## 12. Riscos e pendências

| Item | Tratamento |
|---|---|
| Concentração de papéis | Aceita provisoriamente com a governança unipessoal da seção 10 |
| Arquitetura ainda não aprovada | Resolver na V1-002 antes de contratos e implementação técnica |
| Threat model ausente | Produzir e aprovar na V1-002 |
| Contratos cross-runtime ausentes | Produzir na V1-003 após aprovação da V1-002 |
| Fontes concretas ainda não configuradas | Configurar durante o uso; nenhuma conta ou pasta é autorizada por esta decisão |
| Políticas específicas dos providers | Validar por adapter antes de habilitação |

## 13. Critérios de aceite da V1-001

| Critério do backlog | Evidência neste documento |
|---|---|
| Categoria, corte, fora do escopo e critérios de saída aprovados | Seções 2, 7 e 8 |
| Cinco domínios, owner, fonte inicial, classificação, SLA e validador | Seção 3 |
| Controle formal de mudança | Seção 11 |
| Ata de decisão | Seções 1, 2 e cabeçalho de aprovação |
| Mapa de stakeholders | Seções 3.1 e 10 |
| Backlog baseline | Escopo e sequência preservados pelas seções 1, 8 e 11 |
| Critérios de entrada e saída do piloto | Seção 7 |

## 14. Aprovação

Marcos Wasem aprovou as decisões desta baseline em 07/08/2026. A próxima issue elegível após esta aprovação é **V1-002 — Consolidar arquitetura C4, threat model e ADR de fronteiras**.

