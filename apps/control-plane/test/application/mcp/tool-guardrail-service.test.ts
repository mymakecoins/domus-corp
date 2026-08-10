// apps/control-plane/test/application/mcp/tool-guardrail-service.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ToolGuardrailService } from "../../../src/application/mcp/tool-guardrail-service.js";

describe("ToolGuardrailService", () => {
  const guardrailService = new ToolGuardrailService();

  it("passes pre-execution for valid low-risk tool", () => {
    const res = guardrailService.validatePreExecution({
      toolId: "read_doc",
      riskLevel: "LOW",
      parameters: { path: "/workspace/docs/readme.md" },
      allowedPrefixes: ["/workspace/docs"],
    });
    assert.equal(res.allowed, true);
  });

  it("fails pre-execution on path traversal", () => {
    assert.throws(
      () =>
        guardrailService.validatePreExecution({
          toolId: "read_doc",
          riskLevel: "LOW",
          parameters: { path: "/workspace/docs/../../etc/passwd" },
          allowedPrefixes: ["/workspace/docs"],
        }),
      (err: any) => err.message === "MCP_PATH_FORBIDDEN"
    );
  });

  it("fails pre-execution on HIGH risk missing approval", () => {
    assert.throws(
      () =>
        guardrailService.validatePreExecution({
          toolId: "delete_db",
          riskLevel: "HIGH",
          parameters: {},
        }),
      (err: any) => err.message === "MCP_APPROVAL_REQUIRED"
    );
  });

  it("processes post-execution framing", () => {
    const res = guardrailService.processPostExecution({ result: "ok" }, "read_doc", "LOW");
    assert.ok(typeof res.framedOutput === "string");
  });
});
