# Especificação de Design — Issues V1-607 & V1-608: Conectores Externos Governação

**Data:** 12/08/2026  
**Status:** Em Revisão (Design Spec Atualizado)  
**Issues:**  
- **V1-607**: Conectores Google Drive, Gmail e Calendar (P1, M4)  
- **V1-608**: Conectores Gestão de Projetos & Tarefas — GitHub e Trello (P1, M4)  
**Autor:** Equipe de Arquitetura e Engenharia Domus Corp  

---

## 1. Visão Geral e Objetivos

Esta especificação define a arquitetura, as interfaces e a implementação dos conectores externos para o **Domus Corp v1.0**. Os conectores expandem as capacidades de integração do sistema permitindo:
1. **V1-607 (Google Workspace)**: Consulta a documentos no Google Drive, leitura e envio/rascunho de e-mails no Gmail, e gestão de reuniões/eventos no Google Calendar com escopos mínimos e ACL da origem.
2. **V1-608 (Gestão de Projetos e Repositórios - GitHub & Trello)**: Consulta de repositórios/issues/cards e criação ou atualização idempotente de tarefas com recibos auditáveis via `ActionGatewayService`.

---

## 2. Arquitetura de Conectores & Adapters MCP

### 2.1 Abstração `ExternalConnectorAdapter`
Todos os conectores externos implementam a interface comum `ExternalConnectorAdapter`:

```typescript
export interface ConnectorExecutionInput<TParams = Record<string, unknown>> {
  tenantId: string;
  workspaceId: string;
  userId: string;
  operation: string;
  parameters: TParams;
  idempotencyKey?: string;
  credentialRef?: string;
}

export interface ConnectorExecutionResult<TResult = unknown> {
  success: boolean;
  data?: TResult;
  error?: {
    code: string;
    message: string;
    isTransient?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface ExternalConnectorAdapter {
  readonly connectorId: string;
  execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult>;
  checkStatus?(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }>;
}
```

### 2.2 Roteamento no `ActionGatewayService`
- É criado o `ConnectorRegistryActionConnector`, que implementa a interface `ActionConnector`.
- Quando o `ActionGatewayService` recebe um `ActionRequestInput`, ele roteia a execução para o conector correspondente registrado no `ConnectorRegistry`.
- As operações registradas no catálogo MCP (`ManageMcpCatalogService`) definem os níveis de risco (`LOW`, `MEDIUM`, `HIGH`) e o suporte a guardrails (`ToolGuardrailService`).

---

## 3. Detalhamento das Operações por Conector

### 3.1 Google Workspace (V1-607)
1. **Google Drive Adapter (`google-drive`)**:
   - `google_drive_search`: Busca arquivos por nome, mimeType e escopo do usuário. Respeita a ACL de origem.
   - `google_drive_read_file`: Lê o conteúdo bruto de um arquivo autorizado.
   - **Escopos**: `https://www.googleapis.com/auth/drive.readonly`.
2. **Gmail Adapter (`google-gmail`)**:
   - `gmail_search`: Busca mensagens/threads por query (ex: `is:unread`, `from:user`).
   - `gmail_read_thread`: Obtém corpo e metadados de uma thread.
   - `gmail_create_draft`: Cria um rascunho de e-mail (Risco `MEDIUM`, exige confirmação).
   - `gmail_send_message`: Envia um e-mail (Risco `HIGH`, exige aprovação e token).
   - **Escopos**: `gmail.readonly`, `gmail.compose`, `gmail.send`.
3. **Google Calendar Adapter (`google-calendar`)**:
   - `calendar_list_events`: Lista eventos em um intervalo de datas.
   - `calendar_create_event`: Cria novo evento com participantes e link de reunião (Risco `MEDIUM`).
   - **Escopos**: `calendar.readonly`, `calendar.events`.

### 3.2 GitHub & Trello (V1-608)
1. **GitHub Adapter (`github`)**:
   - `github_search_issues`: Consulta issues e PRs via query de busca com escopo de repositório e organização.
   - `github_get_issue`: Obtém detalhes de uma issue ou PR por owner, repo e número da issue.
   - `github_create_issue`: Cria nova issue no repositório (Risco `MEDIUM`, idempotente).
   - `github_update_issue`: Atualiza título, corpo, estado (open/closed) ou assignees da issue.
2. **Trello Adapter (`trello`)**:
   - `trello_search_cards`: Consulta cartões em quadros ou listas do usuário.
   - `trello_get_card`: Obtém detalhes de um cartão pelo ID do cartão.
   - `trello_create_card`: Cria novo cartão na lista indicada (Risco `MEDIUM`, idempotente).
   - `trello_update_card`: Atualiza status, prazos, membros ou move de lista o cartão.

---

## 4. Gestão de Credenciais & Resolução Server-Side

- **`CredentialResolver`**:
  ```typescript
  export interface CredentialResolver {
    resolveCredential(tenantId: string, workspaceId: string, userId: string, connectorId: string): Promise<{
      tokenType: "Bearer" | "Basic" | "OAuth2";
      accessToken: string;
      refreshToken?: string;
      baseUrl?: string;
    }>;
  }
  ```
- **Ambientes e Testes**: Em produção/staging, o `CredentialResolver` lê referências do Vault/Keychain. Em dev e suítes de teste, o `MockCredentialResolver` provê tokens estáticos de teste sem vazar segredos nos logs de auditoria ou recibos.

---

## 5. Idempotência, Retries e Verificação de Status (`checkStatus`)

1. **Garantia Exactly-Once Lógica**:
   - Para chamadas de escrita (`create_issue`, `create_card`, `send_message`, `create_event`), a `idempotencyKey` é propagada em cabeçalhos HTTP da requisição ou metadados de referência para APIs externas.
2. **Verificação pós-Timeout (`checkStatus`)**:
   - Se ocorrer timeout pós-despacho (`POST_DISPATCH_TIMEOUT`), a função `checkStatus(idempotencyKey)` do conector consulta a API de origem (por exemplo, busca de issues no GitHub ou cards no Trello com a chave/tag de idempotência).
   - Se a ação foi concluída na origem, retorna `executed: true` e a resposta armazenada. Caso contrário, gera recibo com status `INCONCLUSIVE` sem tentar duplicar a criação.

---

## 6. Plano de Testes e Evidências (DoD)

1. **Testes Unitários de Conector**:
   - Cobertura individual para cada operação de Google Drive, Gmail, Calendar, GitHub e Trello usando mocks de fetch/HTTP.
2. **Testes de Integração com `ActionGatewayService`**:
   - Teste de fluxo completo de execução e emissão de `ActionReceipt` com status `SUCCESS`.
   - Teste de negação de política (`ACTION_POLICY_DENIED`).
   - Teste de bloqueio de guardrail (`MCP_APPROVAL_REQUIRED`).
   - Teste de retries e simulação de timeout com `checkStatus` retornando estado executado vs `INCONCLUSIVE`.
3. **Documentação Operacional**:
   - Registrar no catálogo MCP a lista de novas ferramentas registradas com schemas e níveis de risco.
