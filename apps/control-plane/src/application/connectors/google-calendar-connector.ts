import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GoogleCalendarConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-calendar";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "calendar_list_events") {
      const response = await this.fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "calendar_create_event") {
      const response = await this.fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: "POST",
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(input.parameters),
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }
}
