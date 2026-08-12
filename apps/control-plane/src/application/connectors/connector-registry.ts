import { ActionConnector } from "../../domain/gateway/action-connector.js";
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";

export class ConnectorRegistryActionConnector implements ActionConnector {
  private readonly connectors = new Map<string, ExternalConnectorAdapter>();

  register(connector: ExternalConnectorAdapter): void {
    this.connectors.set(connector.connectorId, connector);
  }

  getConnector(connectorId: string): ExternalConnectorAdapter | undefined {
    return this.connectors.get(connectorId);
  }

  async execute(input: any): Promise<unknown> {
    const targetId = input.target || input.connectorId || "default";
    const connector = this.connectors.get(targetId);
    if (!connector) {
      throw new Error(`CONNECTOR_NOT_FOUND:${targetId}`);
    }

    const result = await connector.execute({
      tenantId: input.tenantId ?? "unknown",
      workspaceId: input.workspaceId ?? "unknown",
      userId: input.userId ?? "unknown",
      operation: input.operation ?? input.actionType ?? "execute",
      target: targetId,
      parameters: input.parameters ?? input,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.success) {
      const err = new Error(result.error?.message || "CONNECTOR_EXECUTION_FAILED");
      (err as any).code = result.error?.code;
      (err as any).isTransient = result.error?.isTransient;
      throw err;
    }

    return result.data;
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }> {
    for (const connector of this.connectors.values()) {
      if (connector.checkStatus) {
        const res = await connector.checkStatus(idempotencyKey);
        if (res.executed) return res;
      }
    }
    return { executed: false };
  }
}
