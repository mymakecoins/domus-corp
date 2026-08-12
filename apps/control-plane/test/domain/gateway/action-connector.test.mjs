import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HttpActionConnector, McpProxyActionConnector } from "../../../dist/domain/gateway/action-connector.js";

describe("ActionConnectors", () => {
  it("HttpActionConnector executes HTTP request safely", async () => {
    let capturedUrl = "";
    let capturedOpts = null;

    const mockFetch = async (url, opts) => {
      capturedUrl = url;
      capturedOpts = opts;
      return {
        ok: true,
        json: async () => ({ status: "created" }),
      };
    };

    const connector = new HttpActionConnector(mockFetch);
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
    const mockFetch = async () => ({
      ok: false,
      status: 400,
    });

    const connector = new HttpActionConnector(mockFetch);
    await assert.rejects(
      async () => {
        await connector.execute({ url: "https://api.example.com/fail" });
      },
      (err) => {
        assert.equal(err.message, "HTTP_CONNECTOR_ERROR:400");
        return true;
      }
    );
  });

  it("McpProxyActionConnector delegates to McpProxyService", async () => {
    let capturedInput = null;
    const mockProxy = {
      executeTool: async (input) => {
        capturedInput = input;
        return { status: "SUCCESS", result: "ok" };
      },
    };

    const connector = new McpProxyActionConnector(mockProxy);
    const payload = {
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      serverId: "s-1",
      toolId: "tool-1",
      parameters: { key: "val" },
    };

    const res = await connector.execute(payload);
    assert.deepEqual(capturedInput, payload);
    assert.deepEqual(res, { status: "SUCCESS", result: "ok" });
  });
});
