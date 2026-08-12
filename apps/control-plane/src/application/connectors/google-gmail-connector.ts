import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GmailConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-gmail";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly executedKeys: Set<string> = new Set()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "gmail_search" || input.operation === "gmail_read_thread") {
      const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/messages`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "gmail_create_draft" || input.operation === "gmail_send_message") {
      const headers: Record<string, string> = {
        Authorization: `${cred.tokenType} ${cred.accessToken}`,
        "Content-Type": "application/json",
      };
      if (input.idempotencyKey) {
        headers["X-Idempotency-Key"] = input.idempotencyKey;
        this.executedKeys.add(input.idempotencyKey);
      }
      const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: "POST",
        headers,
        body: JSON.stringify(input.parameters),
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.executedKeys.has(idempotencyKey)) {
      return { executed: true, result: { status: "SENT", idempotencyKey } };
    }
    return { executed: false };
  }
}
