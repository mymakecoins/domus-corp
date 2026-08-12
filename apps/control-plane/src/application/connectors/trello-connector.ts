import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class TrelloConnector implements ExternalConnectorAdapter {
  readonly connectorId = "trello";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly createdCards: Map<string, any> = new Map()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "trello_search_cards" || input.operation === "trello_get_card") {
      const response = await this.fetchImpl(`https://api.trello.com/1/search?query=${encodeURIComponent(String(input.parameters.query || ""))}`, {
        headers: { Authorization: `OAuth ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "trello_create_card" || input.operation === "trello_update_card") {
      const response = await this.fetchImpl(`https://api.trello.com/1/cards`, {
        method: "POST",
        headers: { Authorization: `OAuth ${cred.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(input.parameters)
      });
      const data = await response.json();
      if (response.ok && input.idempotencyKey) {
        this.createdCards.set(input.idempotencyKey, data);
      }
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.createdCards.has(idempotencyKey)) {
      return { executed: true, result: this.createdCards.get(idempotencyKey) };
    }
    return { executed: false };
  }
}
