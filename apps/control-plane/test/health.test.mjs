import assert from "node:assert/strict";
import { test } from "node:test";

import { buildApp } from "../dist/app.js";

test("GET /health reports a healthy control plane", async () => {
  const app = buildApp();
  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    service: "control-plane",
    status: "ok",
    version: "dev",
  });

  await app.close();
});
