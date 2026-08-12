import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpActionConnector, McpProxyActionConnector } from "../../../dist/domain/gateway/action-connector.js";
import { McpProxyService, McpToolExecutionInput } from "../../../src/application/mcp/mcp-proxy-service.js";

describe("ActionConnectors", () => {
  it("HttpActionConnector executes HTTP request safely", async () => {
    let capturedUrl = "";
    let capturedOpts: any = null;

    const mockFetch = async (url: any, opts: any) => {
      capturedUrl = String(url);
      capturedOpts = opts;
      return {
        ok: true,
        json: async () => ({ status: "created" }),
      } as Response;
    };

    const connector = new HttpActionConnector(mockFetch as typeof fetch);
    const result = await connector.execute({
      url: "https://api.example.com/item",
      method: "POST",
      headers: { "X-Custom": "header-val" },
      body: { name: "test" },
    });

    assert.equal(capturedUrl, "https://api.example.com/item");
    assert.equal(capturedOpts.method, "POST");
    assert.equal(capturedOpts.headers["Content-Type"], "application/json");
    assert.equal(capturedOpts.headers["X-Custom"], "header-val");
    assert.equal(capturedOpts.body, JSON.stringify({ name: "test" }));
    assert.deepEqual(result, { status: "created" });
  });

  it("HttpActionConnector throws error on HTTP failure response", async () => {
    const mockFetch = async () =>
      ({
        ok: false,
        status: 400,
      }) as Response;

    const connector = new HttpActionConnector(mockFetch as typeof fetch);
    await assert.rejects(
      async () => {
        await connector.execute({ url: "https://api.example.com/fail" });
      },
      (err: any) => {
        assert.equal(err.message, "HTTP_CONNECTOR_ERROR:400");
        return true;
      }
    );
  });

  it("McpProxyActionConnector delegates to McpProxyService", async () => {
    let capturedInput: any = null;
    const mockProxy = {
      executeTool: async (input: McpToolExecutionInput) => {
        capturedInput = input;
        return { serverId: input.serverId, toolId: input.toolId, status: "SUCCESS", result: "ok", executedAt: "2026-08-12T12:00:00.000Z" };
      },
    };

    const connector = new McpProxyActionConnector(mockProxy as unknown as McpProxyService);
    const payload: McpToolExecutionInput = {
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      serverId: "s-1",
      toolId: "tool-1",
      parameters: { key: "val" },
    };

    const res = await connector.execute(payload);
    assert.deepEqual(capturedInput, payload);
    assert.deepEqual(res, { serverId: "s-1", toolId: "tool-1", status: "SUCCESS", result: "ok", executedAt: "2026-08-12T12:00:00.000Z" });
  });
});
