import assert from "node:assert/strict";
import { test } from "node:test";
import { DataMigrationEngine } from "../dist/main/main/domain/data-migration.js";

test("DataMigrationEngine performs forward migration without erasing existing data", () => {
  const engine = new DataMigrationEngine();

  engine.registerMigration("1.1.0", {
    up: (state) => ({ ...state, theme: state.theme ?? "dark", schemaVersion: "1.1.0" }),
    down: (state) => {
      const { theme, ...rest } = state;
      return { ...rest, schemaVersion: "1.0.0" };
    },
  });

  const initialState = {
    userId: "user-123",
    localMemory: [{ id: "mem-1", text: "Secret local memory" }],
    schemaVersion: "1.0.0",
  };

  const migrated = engine.migrateForward(initialState, "1.0.0", "1.1.0");

  assert.equal(migrated.schemaVersion, "1.1.0");
  assert.equal(migrated.userId, "user-123");
  assert.equal(migrated.theme, "dark");
  // CRITICAL: Local user memory preserved!
  assert.deepEqual(migrated.localMemory, [{ id: "mem-1", text: "Secret local memory" }]);
});

test("DataMigrationEngine performs rollback migration without wiping local user memory", () => {
  const engine = new DataMigrationEngine();

  engine.registerMigration("1.1.0", {
    up: (state) => ({ ...state, theme: state.theme ?? "dark", schemaVersion: "1.1.0" }),
    down: (state) => ({ ...state, schemaVersion: "1.0.0" }), // Safe fallback preserving fields
  });

  const v11State = {
    userId: "user-123",
    localMemory: [{ id: "mem-1", text: "Secret local memory" }],
    theme: "light",
    schemaVersion: "1.1.0",
  };

  const rolledBack = engine.migrateRollback(v11State, "1.1.0", "1.0.0");

  assert.equal(rolledBack.schemaVersion, "1.0.0");
  assert.equal(rolledBack.userId, "user-123");
  // CRITICAL: Local memory is NOT erased!
  assert.deepEqual(rolledBack.localMemory, [{ id: "mem-1", text: "Secret local memory" }]);
});

test("DataMigrationEngine handles multi-step sequential migrations", () => {
  const engine = new DataMigrationEngine();

  engine.registerMigration("1.1.0", {
    up: (state) => ({ ...state, step1: true, schemaVersion: "1.1.0" }),
    down: (state) => ({ ...state, step1: false, schemaVersion: "1.0.0" }),
  });

  engine.registerMigration("1.2.0", {
    up: (state) => ({ ...state, step2: true, schemaVersion: "1.2.0" }),
    down: (state) => ({ ...state, step2: false, schemaVersion: "1.1.0" }),
  });

  const initial = { schemaVersion: "1.0.0", userHistory: ["msg1"] };

  const forwardResult = engine.migrateForward(initial, "1.0.0", "1.2.0");
  assert.equal(forwardResult.schemaVersion, "1.2.0");
  assert.equal(forwardResult.step1, true);
  assert.equal(forwardResult.step2, true);
  assert.deepEqual(forwardResult.userHistory, ["msg1"]);

  const rollbackResult = engine.migrateRollback(forwardResult, "1.2.0", "1.0.0");
  assert.equal(rollbackResult.schemaVersion, "1.0.0");
  assert.deepEqual(rollbackResult.userHistory, ["msg1"]);
});
