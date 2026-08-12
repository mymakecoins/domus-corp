import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GitHubConnector implements ExternalConnectorAdapter {
  readonly connectorId = "github";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly createdIssues: Map<string, any> = new Map()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "github_search_issues" || input.operation === "github_get_issue") {
      const owner = input.parameters.owner || "default";
      const repo = input.parameters.repo || "default";
      const response = await this.fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        headers: { Authorization: `token ${cred.accessToken}`, "User-Agent": "DomusCorp" }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "github_create_issue" || input.operation === "github_update_issue") {
      const owner = input.parameters.owner || "default";
      const repo = input.parameters.repo || "default";
      const headers: Record<string, string> = {
        Authorization: `token ${cred.accessToken}`,
        "User-Agent": "DomusCorp",
        "Content-Type": "application/json"
      };
      if (input.idempotencyKey) {
        headers["X-Idempotency-Key"] = input.idempotencyKey;
      }
      const response = await this.fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify(input.parameters)
      });
      const data = await response.json();
      if (response.ok && input.idempotencyKey) {
        this.createdIssues.set(input.idempotencyKey, data);
      }
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.createdIssues.has(idempotencyKey)) {
      return { executed: true, result: this.createdIssues.get(idempotencyKey) };
    }
    return { executed: false };
  }
}
