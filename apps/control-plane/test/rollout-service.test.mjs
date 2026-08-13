import assert from "node:assert/strict";
import { test } from "node:test";
import { RolloutService } from "../dist/application/update-rollout/rollout-service.js";

test("rollout service configures ring releases and checks client updates", async () => {
  const service = new RolloutService();

  service.setRingRelease("stable", {
    version: "1.2.0",
    downloadUrl: "https://updates.domus.corp/desktop/v1.2.0/app.asar",
    checksum: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
    signature: "signature-base64",
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", metadata: {}, components: [] },
    minSupportedVersion: "1.0.0",
    rolloutPercentage: 100,
    paused: false,
  });

  const check = service.checkClientUpdate({
    clientVersion: "1.1.0",
    ring: "stable",
    deviceId: "device-123",
  });

  assert.equal(check.status, "UPDATE_AVAILABLE");
  assert.equal(check.isBlocked, false);
  assert.equal(check.release.version, "1.2.0");
});

test("rollout service blocks client if client version is below minSupportedVersion", async () => {
  const service = new RolloutService();

  service.setRingRelease("stable", {
    version: "1.5.0",
    downloadUrl: "https://updates.domus.corp/desktop/v1.5.0/app.asar",
    checksum: "checksum123",
    signature: "sig123",
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", metadata: {}, components: [] },
    minSupportedVersion: "1.2.0",
    rolloutPercentage: 100,
    paused: false,
  });

  const check = service.checkClientUpdate({
    clientVersion: "1.0.0",
    ring: "stable",
    deviceId: "device-456",
  });

  assert.equal(check.status, "OUTDATED_BLOCKED");
  assert.equal(check.isBlocked, true);
  assert.equal(check.minVersion, "1.2.0");
});

test("rollout service respects paused ring status", async () => {
  const service = new RolloutService();

  service.setRingRelease("beta", {
    version: "2.0.0-beta.1",
    downloadUrl: "https://updates.domus.corp/desktop/v2.0.0-beta.1/app.asar",
    checksum: "checksum123",
    signature: "sig123",
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", metadata: {}, components: [] },
    minSupportedVersion: "1.0.0",
    rolloutPercentage: 100,
    paused: true,
  });

  const check = service.checkClientUpdate({
    clientVersion: "1.1.0",
    ring: "beta",
    deviceId: "device-789",
  });

  assert.equal(check.status, "PAUSED");
  assert.equal(check.isBlocked, false);
});

test("rollout service supports rollback of ring release", async () => {
  const service = new RolloutService();

  service.setRingRelease("canary", {
    version: "1.3.0",
    downloadUrl: "https://updates.domus.corp/desktop/v1.3.0/app.asar",
    checksum: "checksum130",
    signature: "sig130",
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", metadata: {}, components: [] },
    minSupportedVersion: "1.0.0",
    rolloutPercentage: 100,
    paused: false,
  });

  // Rollback canary to 1.2.0
  service.rollbackRing("canary", "1.2.0", "https://updates.domus.corp/desktop/v1.2.0/app.asar", "checksum120", "sig120");

  const check = service.checkClientUpdate({
    clientVersion: "1.3.0",
    ring: "canary",
    deviceId: "device-999",
  });

  assert.equal(check.status, "ROLLBACK_REQUIRED");
  assert.equal(check.targetVersion, "1.2.0");
  assert.equal(check.isBlocked, false);
});

test("rollout service handles percentage-based rollout targeting", async () => {
  const service = new RolloutService();

  service.setRingRelease("stable", {
    version: "1.4.0",
    downloadUrl: "https://updates.domus.corp/desktop/v1.4.0/app.asar",
    checksum: "checksum140",
    signature: "sig140",
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", metadata: {}, components: [] },
    minSupportedVersion: "1.0.0",
    rolloutPercentage: 0, // 0% rollout means nobody gets update yet
    paused: false,
  });

  const check = service.checkClientUpdate({
    clientVersion: "1.3.0",
    ring: "stable",
    deviceId: "device-xyz",
  });

  assert.equal(check.status, "UP_TO_DATE"); // Not included in 0% rollout
});
