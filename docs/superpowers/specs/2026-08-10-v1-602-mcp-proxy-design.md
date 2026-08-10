# V1-602 MCP Proxy e Credenciais Escopadas — Design Spec

**Data:** 2026-08-10  
**Issue:** V1-602  
**Status:** Aprovado pelo Usuário  
**Modulo:** `apps/control-plane` (TypeScript / Fastify)

---

## 1. Visão Geral e Objetivos

A issue **V1-602** implementa a camada de proxy seguro de execução de ferramentas MCP (Model Context Protocol) e gerenciamento de credenciais escopadas em `apps/control-plane`.

### Critérios de Aceite (Backlog V1-602)
1. **Reautorização Server-Side**: Toda chamada MCP encaminhada pelo proxy valida usuário, workspace, ferramenta, operação, recurso, classificação e token.
2. **Redaction Estrito**: Tokens OAuth, tokens Bearer e segredos encaminhados não aparecem em prompts, outputs, logs, traces ou recibos (`[REDACTED_OAUTH_TOKEN]`).
3. **Bloqueio Imediato e Auditoria**: Usuários, fontes ou integrações revogadas têm chamadas a ferramentas bloqueadas imediatamente (`CREDENTIAL_REVOKED`) e auditadas.

---

## 2. Arquitetura e Componentes

### 2.1 Modelo de Domínio

#### `apps/control-plane/src/domain/credentials/scoped-credential-vault.ts`
- **`ScopedOAuthToken`**:
  - `tokenId: string`
  - `tenantId: string`
  - `workspaceId: string`
  - `userId: string`
  - `providerKey: string`
  - `accessToken: string`
  - `refreshToken?: string`
  - `scopes: readonly string[]`
  - `expiresAt: string`
  - `status: "ACTIVE" | "EXPIRED" | "REVOKED"`
- **`resolveScopedToken(token, requiredScopes)`**: Valida se o token pertence ao tenant/workspace/usuário, se não está expirado ou revogado, e se cobre todos os escopos exigidos pela ferramenta MCP.

#### `apps/control-plane/src/domain/security/token-redactor.ts`
- **`redactText(input: string, tokensToScrub?: readonly string[]): string`**: Sanitiza tokens Bearer, OAuth e segredos em strings de texto e logs.
- **`redactObject<T>(obj: T): T`**: Oculta recursivamente propriedades sensíveis em objetos de entrada e saída.

---

### 2.2 Serviço de Aplicação

#### `apps/control-plane/src/application/mcp/mcp-proxy-service.ts`
Orquestra o fluxo de execução segura de ferramentas MCP:
1. **Catálogo**: Valida existência do servidor em `McpCatalogRepository`, status `APPROVED`, `enabled: true`, associação ao `workspaceId` e presença da ferramenta `toolId`.
2. **Políticas**: Valida via `PolicyEngine` (`composeEffectivePolicy`) permissões para `allowedTools` e classificação de risco.
3. **Credenciais**: Obtém token no `ScopedCredentialVault`, checa revogação de usuário/integração e valida escopos mínimos.
4. **Redaction**: Sanitiza parâmetros e garante que nenhum token seja enviado em payload não-autorizado.
5. **Transporte HTTP**: Executa `POST` no `endpointUrl` com `Authorization: Bearer <accessToken>`, timeout (5000ms) e retries em falhas 5xx transitórias.
6. **Redaction da Resposta**: Filtra a resposta com `TokenRedactor`.
7. **Auditoria**: Registra evento `MCP_TOOL_EXECUTION` sanitizado.

---

### 2.3 Interface HTTP

#### `apps/control-plane/src/interfaces/http/mcp/routes.ts`
- **Endpoint**: `POST /v1/mcp/tools/execute`
- **Erros Fail-Closed**:
  - `403 Forbidden`: Servidor pendente/revogado, ferramenta bloqueada por política ou credencial revogada (`CREDENTIAL_REVOKED`).
  - `404 Not Found`: Servidor ou ferramenta não cadastrados.
  - `504 Gateway Timeout`: Servidor MCP upstream indisponível ou lento.

---

## 3. Cobertura de Testes

- `mcp-proxy.test.ts`:
  - Execução bem-sucedida com injeção de token e redaction da resposta.
  - Bloqueio por tenant escape (workspace/tenant incorreto).
  - Bloqueio imediato por credencial/usuário revogado (`CREDENTIAL_REVOKED`).
  - Teste de redaction de tokens em logs e outputs.
  - Tratamento de timeout e erros transitórios.
