import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";
import { ClientUpdater } from "../dist/main/main/domain/client-updater.js";
import {
  generateSBOM,
  computeArtifactChecksum,
  signReleaseArtifact,
} from "../dist/main/main/domain/packaging-release.js";
import { DataMigrationEngine } from "../dist/main/main/domain/data-migration.js";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

test("ClientUpdater checks and applies valid signed update with data migration", async () => {
  const artifactBuffer = Buffer.from("v1.2.0-binary-content");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const sbom = generateSBOM({ name: "domus-desktop", version: "1.2.0", dependencies: {} });
  const signature = signReleaseArtifact(checksum, privateKey);

  const fetchUpdateStatus = async () => ({
    status: "UPDATE_AVAILABLE",
    isBlocked: false,
    release: {
      version: "1.2.0",
      downloadUrl: "https://updates.domus.corp/app.asar",
      checksum,
      signature,
      sbom,
      minSupportedVersion: "1.0.0",
    },
  });

  const downloadArtifact = async () => artifactBuffer;

  const migrationEngine = new DataMigrationEngine();
  migrationEngine.registerMigration("1.2.0", {
    up: (state) => ({ ...state, schemaVersion: "1.2.0" }),
    down: (state) => ({ ...state, schemaVersion: "1.0.0" }),
  });

  let localStore = { schemaVersion: "1.0.0", userHistory: ["msg1"] };

  const updater = new ClientUpdater({
    currentVersion: "1.0.0",
    ring: "stable",
    deviceId: "device-123",
    publicKey,
    fetchUpdateStatus,
    downloadArtifact,
    migrationEngine,
    getLocalState: () => localStore,
    setLocalState: (newState) => {
      localStore = newState;
    },
  });

  const result = await updater.processUpdate();

  assert.equal(result.status, "UPDATED");
  assert.equal(result.newVersion, "1.2.0");
  assert.equal(localStore.schemaVersion, "1.2.0");
  assert.deepEqual(localStore.userHistory, ["msg1"]);
});

test("ClientUpdater rejects update with invalid digital signature", async () => {
  const artifactBuffer = Buffer.from("v1.2.0-tampered-content");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const sbom = generateSBOM({ name: "domus-desktop", version: "1.2.0", dependencies: {} });

  // Wrong private key signature
  const { privateKey: wrongKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const invalidSignature = signReleaseArtifact(checksum, wrongKey);

  const fetchUpdateStatus = async () => ({
    status: "UPDATE_AVAILABLE",
    isBlocked: false,
    release: {
      version: "1.2.0",
      downloadUrl: "https://updates.domus.corp/app.asar",
      checksum,
      signature: invalidSignature,
      sbom,
      minSupportedVersion: "1.0.0",
    },
  });

  let localStore = { schemaVersion: "1.0.0", userHistory: ["msg1"] };

  const updater = new ClientUpdater({
    currentVersion: "1.0.0",
    ring: "stable",
    deviceId: "device-123",
    publicKey,
    fetchUpdateStatus,
    downloadArtifact: async () => artifactBuffer,
    migrationEngine: new DataMigrationEngine(),
    getLocalState: () => localStore,
    setLocalState: (s) => {
      localStore = s;
    },
  });

  await assert.rejects(
    async () => {
      await updater.processUpdate();
    },
    (err) => {
      assert.equal(err.message.includes("INVALID_SIGNATURE"), true);
      return true;
    }
  );

  // Local store unchanged and preserved
  assert.equal(localStore.schemaVersion, "1.0.0");
  assert.deepEqual(localStore.userHistory, ["msg1"]);
});

test("ClientUpdater handles OUTDATED_BLOCKED without erasing local user memory", async () => {
  const fetchUpdateStatus = async () => ({
    status: "OUTDATED_BLOCKED",
    isBlocked: true,
    minVersion: "1.5.0",
    message: "Client is outdated and blocked from gateway",
  });

  let localStore = { schemaVersion: "1.0.0", secretLocalKeys: "key-data-123" };

  const updater = new ClientUpdater({
    currentVersion: "1.0.0",
    ring: "stable",
    deviceId: "device-123",
    publicKey,
    fetchUpdateStatus,
    downloadArtifact: async () => Buffer.from(""),
    migrationEngine: new DataMigrationEngine(),
    getLocalState: () => localStore,
    setLocalState: (s) => {
      localStore = s;
    },
  });

  const result = await updater.processUpdate();

  assert.equal(result.status, "BLOCKED_MANDATORY_UPGRADE");
  assert.equal(result.isGatewayAllowed, false);
  assert.equal(result.minVersion, "1.5.0");
  // CRITICAL ACCEPTANCE CRITERIA: User memory preserved!
  assert.equal(localStore.secretLocalKeys, "key-data-123");
});

test("ClientUpdater processes rollback safely with data migration while maintaining user local memory", async () => {
  const rollbackBuffer = Buffer.from("v1.0.0-rollback-binary");
  const checksum = computeArtifactChecksum(rollbackBuffer);
  const sbom = generateSBOM({ name: "domus-desktop", version: "1.0.0", dependencies: {} });
  const signature = signReleaseArtifact(checksum, privateKey);

  const fetchUpdateStatus = async () => ({
    status: "ROLLBACK_REQUIRED",
    isBlocked: false,
    targetVersion: "1.0.0",
    release: {
      version: "1.0.0",
      downloadUrl: "https://updates.domus.corp/v1.0.0.asar",
      checksum,
      signature,
      sbom,
      minSupportedVersion: "1.0.0",
    },
  });

  const migrationEngine = new DataMigrationEngine();
  migrationEngine.registerMigration("1.1.0", {
    up: (state) => ({ ...state, v11Feature: true }),
    down: (state) => {
      const { v11Feature, ...rest } = state;
      return { ...rest, schemaVersion: "1.0.0" };
    },
  });

  let localStore = { schemaVersion: "1.1.0", v11Feature: true, userMessages: ["hello"] };

  const updater = new ClientUpdater({
    currentVersion: "1.1.0",
    ring: "stable",
    deviceId: "device-123",
    publicKey,
    fetchUpdateStatus,
    downloadArtifact: async () => rollbackBuffer,
    migrationEngine,
    getLocalState: () => localStore,
    setLocalState: (s) => {
      localStore = s;
    },
  });

  const result = await updater.processUpdate();

  assert.equal(result.status, "ROLLED_BACK");
  assert.equal(result.targetVersion, "1.0.0");
  assert.equal(localStore.schemaVersion, "1.0.0");
  // User messages must be preserved!
  assert.deepEqual(localStore.userMessages, ["hello"]);
});
