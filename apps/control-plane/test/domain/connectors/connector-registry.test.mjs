import { test } from "node:test";
import assert from "node:assert/strict";
import { ConnectorRegistryActionConnector } from "../../../dist/application/connectors/connector-registry.js";

class DummyConnector {
  constructor() {
    this.connectorId = "dummy-target";
  }
  async execute(input) {
    return { success: true, data: { ok: true, target: input.operation } };
  }
}

test("ConnectorRegistryActionConnector routes execute to registered connector", async () => {
  const registry = new ConnectorRegistryActionConnector();
  registry.register(new DummyConnector());

  const result = await registry.execute({
    target: "dummy-target",
    operation: "test_op",
    tenantId: "t1",
    workspaceId: "w1",
    userId: "u1",
    parameters: { foo: "bar" },
  });

  assert.deepEqual(result, { ok: true, target: "test_op" });
});
