export interface ConnectorExecutionInput<TParams = Record<string, unknown>> {
  tenantId: string;
  workspaceId: string;
  userId: string;
  operation: string;
  target?: string;
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
