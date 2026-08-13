import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "../dist/app.js";
import { RolloutService } from "../dist/application/update-rollout/rollout-service.js";

test("GET /v1/updates/check returns update status", async () => {
  const rolloutService = new RolloutService();
  rolloutService.setRingRelease("stable", {
    version: "1.2.0",
    downloadUrl: "https://updates.domus.corp/app.asar",
    checksum: "checksum123",
    signature: "sig123",
    sbom: {},
    minSupportedVersion: "1.0.0",
    rolloutPercentage: 100,
    paused: false,
  });

  const app = buildApp(undefined, undefined, undefined, undefined, undefined, undefined, rolloutService);

  const res = await app.inject({
    method: "GET",
    url: "/v1/updates/check?clientVersion=1.0.0&ring=stable&deviceId=device1",
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, "UPDATE_AVAILABLE");
  assert.equal(body.release.version, "1.2.0");
});

test("POST /v1/admin/rollout/rings/:ring configures ring", async () => {
  const rolloutService = new RolloutService();
  const app = buildApp(undefined, undefined, undefined, undefined, undefined, undefined, rolloutService);

  const res = await app.inject({
    method: "POST",
    url: "/v1/admin/rollout/rings/canary",
    payload: {
      version: "2.0.0",
      downloadUrl: "https://updates.domus.corp/v2.0.0.asar",
      checksum: "hash200",
      signature: "sig200",
      minSupportedVersion: "1.5.0",
      rolloutPercentage: 50,
      paused: false,
    },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.success, true);

  const ringData = rolloutService.getRingRelease("canary");
  assert.equal(ringData.version, "2.0.0");
  assert.equal(ringData.rolloutPercentage, 50);
});
