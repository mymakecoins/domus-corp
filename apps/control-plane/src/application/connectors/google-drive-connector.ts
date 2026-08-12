import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GoogleDriveConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-drive";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "google_drive_search") {
      const q = encodeURIComponent(String(input.parameters?.query || ""));
      const response = await this.fetchImpl(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "google_drive_read_file") {
      const fileId = input.parameters?.fileId;
      const response = await this.fetchImpl(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }
}
