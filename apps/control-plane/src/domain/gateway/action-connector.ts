import { McpProxyService, McpToolExecutionInput, McpToolExecutionOutput } from "../../application/mcp/mcp-proxy-service.js";

export interface ActionConnector {
  execute(input: any): Promise<unknown>;
  checkStatus?(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }>;
}

export class HttpActionConnector implements ActionConnector {
  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async execute(input: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }): Promise<unknown> {
    const response = await this.fetchImpl(input.url, {
      method: input.method ?? "POST",
      headers: { "Content-Type": "application/json", ...(input.headers ?? {}) },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP_CONNECTOR_ERROR:${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
}

export class McpProxyActionConnector implements ActionConnector {
  constructor(private readonly proxyService: McpProxyService) {}

  async execute(input: McpToolExecutionInput): Promise<McpToolExecutionOutput> {
    return this.proxyService.executeTool(input);
  }
}
